import { storage } from '@/server/firebase/config';
import { ref, uploadBytes, getBlob, deleteObject } from 'firebase/storage';

//
// Storage Path: users/{userID}/scripts/{scriptID}/audio/{index}.mp3
//

export async function saveAudioBlob(userID: string, scriptID: string, index: number, blob: Blob) {
    const path = `users/${userID}/scripts/${scriptID}/audio/${index}.mp3`;
    const audioRef = ref(storage, path);
    await uploadBytes(audioRef, blob);
}

export async function getAudioBlob(userID: string, scriptID: string, index: number): Promise<Blob> {
    const path = `users/${userID}/scripts/${scriptID}/audio/${index}.mp3`;
    const audioRef = ref(storage, path);
    return await getBlob(audioRef);
}

export async function deleteAudioBlob(userID: string, scriptID: string, index: number) {
    const path = `users/${userID}/scripts/${scriptID}/audio/${index}.mp3`;
    const audioRef = ref(storage, path);
    await deleteObject(audioRef);
}