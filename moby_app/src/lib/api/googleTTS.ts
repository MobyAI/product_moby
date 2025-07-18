export async function useGoogleTTS({
    text,
    voiceId = 'en-US-Wavenet-D',
    gender = 'MALE',
}: {
    text: string;
    voiceId?: string;
    gender?: 'MALE' | 'FEMALE' | 'NEUTRAL';
}): Promise<Blob> {
    const res = await fetch('/api/TTS/google', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text, voice: voiceId, gender }),
    });

    if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        throw new Error(error?.error || 'Google TTS API request failed');
    }

    return await res.blob();
}  