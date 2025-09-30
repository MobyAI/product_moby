import 'server-only';
import type { AlignmentData } from "@/types/alignment";

export async function getForcedAlignment(
    audioBlob: Blob,
    transcript: string
): Promise<AlignmentData> {
    const apiKey = process.env.ELEVENLABS_API_KEY;

    if (!apiKey) {
        throw new Error('ELEVENLABS_API_KEY is not configured');
    }

    const formData = new FormData();
    formData.append('file', audioBlob, 'audio.mp3');
    formData.append('text', transcript);

    const response = await fetch('https://api.elevenlabs.io/v1/forced-alignment', {
        method: 'POST',
        headers: {
            'xi-api-key': apiKey
        },
        body: formData
    });

    if (!response.ok) {
        throw new Error(`Forced alignment failed: ${response.status}`);
    }

    return await response.json();
}