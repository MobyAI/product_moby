import { storage } from '@/lib/firebase/config/client';
import {
    ref,
    uploadBytes,
    getDownloadURL,
    deleteObject,
    getMetadata,
    listAll,
} from 'firebase/storage';

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

// Voice samples
interface VoiceSample {
    name: string;
    description: string;
    url: string;
    voiceId: string;
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

            const titleCase = (str: string) =>
                str
                    .split(' ')
                    .map(word =>
                        word.charAt(0).toUpperCase() + word.slice(1)
                    )
                    .join(' ');

            const nameRaw = metadata.customMetadata?.name || fileRef.name.replace(".mp3", "");
            const name = titleCase(nameRaw);
            const description = metadata.customMetadata?.description || "Description unavailable.";
            const voiceId = metadata.customMetadata?.voiceId || "";

            return {
                name,
                description,
                url,
                voiceId,
            };
        });

        return await Promise.all(samplePromises);
    } catch (error) {
        console.error("Error fetching voice samples:", error);
        return [];
    }
}

export async function saveVoiceSampleBlob(
    voiceId: string,
    voiceName: string,
    blob: Blob,
    description: string
): Promise<void> {
    const safeVoiceName = voiceName.toLowerCase().replace(/\s+/g, '-').replace(/[^\w\-]/g, '');
    const path = `voice-samples/${safeVoiceName}.mp3`;

    const audioRef = ref(storage, path);

    const metadata = {
        customMetadata: {
            voiceId,
            name: voiceName,
            description,
        },
        contentType: 'audio/mpeg',
    };

    await uploadBytes(audioRef, blob, metadata);
}