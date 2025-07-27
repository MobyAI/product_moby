import { storage } from '@/server/firebase/config';
import {
    ref,
    uploadBytes,
    getDownloadURL,
    deleteObject,
    getMetadata,
    listAll
} from 'firebase/storage';

//
// Storage Path: users/{userID}/scripts/{scriptID}/audio/{index}.mp3
//

interface VoiceSample {
    name: string;
    description: string;
    url: string;
    filename: string;
}

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

export async function getAllVoiceSamples(): Promise<VoiceSample[]> {
    const path = "voice-samples";
    const folderRef = ref(storage, path);

    try {
        const result = await listAll(folderRef);
        const files = result.items;

        const samplePromises = files.map(async (fileRef) => {
            const [metadata, url] = await Promise.all([
                getMetadata(fileRef),
                getDownloadURL(fileRef),
            ]);

            const name = metadata.customMetadata?.name || fileRef.name.replace(".mp3", "");
            const description = metadata.customMetadata?.description || "";

            return {
                name,
                description,
                url,
                filename: fileRef.name,
            };
        });

        return await Promise.all(samplePromises);
    } catch (error) {
        console.error("Error fetching voice samples:", error);
        return [];
    }
}