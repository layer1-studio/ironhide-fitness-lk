import base64
import os
import time
from contextlib import closing

import cv2
import numpy as np
import psycopg2
import requests
from deepface import DeepFace
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from requests.auth import HTTPDigestAuth

load_dotenv()

app = FastAPI(title="IronHide Biometric API")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DATABASE_URL = os.getenv("DATABASE_URL")
DB_NAME = os.getenv("DB_NAME", "postgres")
DB_USER = os.getenv("DB_USER", "postgres")
DB_PASS = os.getenv("DB_PASS")
DB_HOST = os.getenv("DB_HOST", "localhost")
DB_PORT = os.getenv("DB_PORT", "5432")

HIKVISION_IP = os.getenv("HIKVISION_IP")
HIKVISION_USER = os.getenv("HIKVISION_USER")
HIKVISION_PASS = os.getenv("HIKVISION_PASS")
MATCH_THRESHOLD = 0.40


class EnrollRequest(BaseModel):
    firebase_uid: str
    image_base64: str


class VerifyRequest(BaseModel):
    gate_id: str
    image_base64: str


def get_db_connection():
    if DATABASE_URL:
        return psycopg2.connect(DATABASE_URL)
    if not DB_PASS:
        raise RuntimeError("Set DATABASE_URL or DB_PASS in the backend environment")
    return psycopg2.connect(
        dbname=DB_NAME,
        user=DB_USER,
        password=DB_PASS,
        host=DB_HOST,
        port=DB_PORT,
    )


def init_db():
    with closing(get_db_connection()) as conn:
        with conn.cursor() as cursor:
            cursor.execute("CREATE EXTENSION IF NOT EXISTS vector")
            cursor.execute("CREATE EXTENSION IF NOT EXISTS pgcrypto")
            cursor.execute(
                """
                CREATE TABLE IF NOT EXISTS users (
                    uid TEXT PRIMARY KEY,
                    full_name TEXT,
                    email TEXT,
                    phone TEXT,
                    role TEXT NOT NULL DEFAULT 'customer',
                    membership_tier TEXT,
                    membership_status TEXT,
                    membership_expiry TIMESTAMPTZ,
                    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
                )
                """
            )
            cursor.execute(
                """
                CREATE TABLE IF NOT EXISTS scans (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    uid TEXT NOT NULL REFERENCES users(uid) ON DELETE CASCADE,
                    scan_type TEXT NOT NULL DEFAULT 'face'
                        CHECK (scan_type IN ('face', 'body', 'other')),
                    points_3d JSONB,
                    point_count INTEGER GENERATED ALWAYS AS
                        (CASE WHEN points_3d IS NULL THEN NULL
                              ELSE jsonb_array_length(points_3d) END) STORED,
                    embedding vector(512),
                    device TEXT,
                    meta JSONB NOT NULL DEFAULT '{}'::jsonb,
                    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    CHECK (points_3d IS NOT NULL OR embedding IS NOT NULL)
                )
                """
            )
        conn.commit()


@app.on_event("startup")
def startup():
    try:
        init_db()
        print("Database users and scans tables are ready")
    except Exception as error:
        print(f"Database initialization failed: {error}")


def decode_base64_image(value: str):
    encoded = value.split(",", 1)[1] if "," in value else value
    try:
        image_bytes = base64.b64decode(encoded, validate=True)
    except Exception as error:
        raise ValueError("Invalid Base64 image") from error
    image = cv2.imdecode(np.frombuffer(image_bytes, np.uint8), cv2.IMREAD_COLOR)
    if image is None:
        raise ValueError("Could not decode image")
    return image


def get_face_embedding(image):
    try:
        result = DeepFace.represent(
            img_path=image,
            model_name="Facenet512",
            enforce_detection=True,
        )
        embedding = result[0]["embedding"]
        if len(embedding) != 512:
            raise ValueError("Face model returned an unexpected embedding size")
        return embedding
    except Exception as error:
        raise ValueError(f"Face detection failed: {error}") from error


def open_hikvision_gate():
    if not all((HIKVISION_IP, HIKVISION_USER, HIKVISION_PASS)):
        return False
    try:
        response = requests.put(
            f"http://{HIKVISION_IP}/ISAPI/AccessControl/RemoteControl/door/1",
            auth=HTTPDigestAuth(HIKVISION_USER, HIKVISION_PASS),
            data="<RemoteControlDoor><cmd>open</cmd></RemoteControlDoor>",
            headers={"Content-Type": "application/xml"},
            timeout=3,
        )
        return response.status_code == 200
    except requests.RequestException:
        return False


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/api/enroll")
def enroll_face(request: EnrollRequest):
    try:
        embedding = get_face_embedding(decode_base64_image(request.image_base64))
        with closing(get_db_connection()) as conn:
            with conn.cursor() as cursor:
                # Upsert user stub so enrollment works even if the
                # Firestore-to-Postgres sync function has not fired yet.
                cursor.execute(
                    """
                    INSERT INTO users (uid)
                    VALUES (%s)
                    ON CONFLICT (uid) DO NOTHING
                    """,
                    (request.firebase_uid,),
                )
                cursor.execute(
                    """
                    INSERT INTO scans (uid, scan_type, embedding, meta)
                    VALUES (%s, 'face', %s::vector, %s::jsonb)
                    """,
                    (
                        request.firebase_uid,
                        str(embedding),
                        '{"model":"Facenet512","source":"biometric-api"}',
                    ),
                )
            conn.commit()
        return {"status": "success", "message": "Face enrolled successfully"}
    except HTTPException:
        raise
    except ValueError as error:
        raise HTTPException(status_code=422, detail=str(error)) from error
    except Exception as error:
        raise HTTPException(status_code=500, detail="Face enrollment failed") from error


@app.post("/api/verify")
def verify_face(request: VerifyRequest):
    try:
        embedding = get_face_embedding(decode_base64_image(request.image_base64))
        with closing(get_db_connection()) as conn:
            with conn.cursor() as cursor:
                cursor.execute(
                    """
                    SELECT
                        s.uid,
                        s.embedding <=> %s::vector AS distance,
                        u.membership_status,
                        u.membership_expiry
                    FROM scans AS s
                    INNER JOIN users AS u ON u.uid = s.uid
                    WHERE s.scan_type = 'face' AND s.embedding IS NOT NULL
                    ORDER BY distance ASC
                    LIMIT 1
                    """,
                    (str(embedding),),
                )
                result = cursor.fetchone()

        if not result:
            return {
                "access_granted": False,
                "message": "No faces registered in the database.",
                "firebase_uid": None,
                "distance_score": None,
                "membership_status": None,
                "membership_expiry": None,
                "payment_status": None,
            }

        uid, distance, membership_status, membership_expiry = result
        membership_is_current = (
            membership_status == "active"
            and membership_expiry is not None
            and membership_expiry.timestamp() >= time.time()
        )
        access_granted = float(distance) < MATCH_THRESHOLD and membership_is_current
        gate_triggered = open_hikvision_gate() if access_granted else False
        return {
            "access_granted": access_granted,
            "message": (
                "Face verified and membership is active."
                if access_granted
                else "Face or active membership could not be verified."
            ),
            "firebase_uid": uid if access_granted else None,
            "distance_score": float(distance),
            "membership_status": membership_status,
            "membership_expiry": membership_expiry.isoformat() if membership_expiry else None,
            "payment_status": "confirmed" if membership_is_current else None,
            "gate_triggered": gate_triggered,
        }
    except HTTPException:
        raise
    except ValueError as error:
        raise HTTPException(status_code=422, detail=str(error)) from error
    except Exception as error:
        raise HTTPException(status_code=500, detail="Face verification failed") from error
