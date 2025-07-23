import { storage } from '@/server/firebase/config';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';

//
// Storage Path: users/{userID}/scripts/{scriptID}/audio/{index}.mp3
//

export async function saveAudioBlob(userID: string, scriptID: string, index: number, blob: Blob) {
    const path = `users/${userID}/scripts/${scriptID}/tts-audio/${index}.mp3`;
    const audioRef = ref(storage, path);
    await uploadBytes(audioRef, blob);
}

export async function getAudioBlob(userID: string, scriptID: string, index: number): Promise<Blob> {
    const path = `users/${userID}/scripts/${scriptID}/tts-audio/${index}.mp3`;
    const audioRef = ref(storage, path);

    const url = await getDownloadURL(audioRef);

    const res = await fetch(url);
    if (!res.ok) throw new Error(`Failed to fetch blob from storage URL`);

    const arrayBuffer = await res.arrayBuffer();
    return new Blob([arrayBuffer], { type: 'audio/mpeg' });
}

export async function getAudioUrl(
    userID: string,
    scriptID: string,
    index: number
): Promise<string> {
    const path = `users/${userID}/scripts/${scriptID}/tts-audio/${index}.mp3`;
    const audioRef = ref(storage, path);

    const url = await getDownloadURL(audioRef);
    return url;
}

export async function deleteAudioBlob(userID: string, scriptID: string, index: number) {
    const path = `users/${userID}/scripts/${scriptID}/tts-audio/${index}.mp3`;
    const audioRef = ref(storage, path);
    await deleteObject(audioRef);
}