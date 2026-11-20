# ironhide-fitness-lk

## Biometric API

The web app calls the FastAPI service at `VITE_BIOMETRIC_API_URL` (default:
`/biometric-api`). The Vite development server proxies this path to
`http://127.0.0.1:8000/api`.

For Vercel deployments, set `VITE_BIOMETRIC_API_URL=/biometric-api` and deploy
the repository with `main.py` available at the root. `vercel.json` forwards
`/biometric-api/enroll` and `/biometric-api/verify` to dedicated FastAPI
serverless entries. Both endpoints receive a Firebase ID token in the
`Authorization: Bearer <token>` header.

The `/verify` response must include `access_granted`, `message`,
`firebase_uid`, `distance_score`, `membership_status`, `membership_expiry`,
and `payment_status`. Access is shown only when `access_granted` is true,
`membership_status` is `active`, `membership_expiry` is in the future, and
`payment_status` is `confirmed`. The API must enforce these checks server-side
as well; the browser checks are only a second safety layer.
