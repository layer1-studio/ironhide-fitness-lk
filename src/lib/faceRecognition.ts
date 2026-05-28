// STUB — wire to gym hardware API when available
export async function enrollFaceWithHardware(_uid: string, _photoUrl: string): Promise<void> {
  // TODO: POST to gym face recognition hardware API
  // await fetch('HARDWARE_API_ENDPOINT/enroll', {
  //   method: 'POST',
  //   body: JSON.stringify({ uid, photoUrl }),
  // });
  console.log('[FaceRecognition] Stub: enrollFaceWithHardware called — wire to hardware API');
}

export async function revokeFaceAccess(_uid: string): Promise<void> {
  // TODO: POST to gym face recognition hardware API
  console.log('[FaceRecognition] Stub: revokeFaceAccess called — wire to hardware API');
}
