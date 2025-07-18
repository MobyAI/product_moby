export async function useElevenTTS({
    text,
    voiceId,
    modelId,
    voiceSettings,
}: {
    text: string;
    voiceId: string;
    modelId?: string;
    voiceSettings?: {
        stability?: number;
        similarityBoost?: number;
    };
}): Promise<Blob> {
    const res = await fetch('/api/TTS/elevenlabs', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text, voiceId, modelId, voiceSettings }),
    });

    if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        throw new Error(error?.error || 'TTS API request failed');
    }

    return await res.blob();
}