export async function useTextToSpeech({
    text,
    voiceId,
    modelId,
}: {
    text: string;
    voiceId: string;
    modelId?: string;
}): Promise<Blob> {
    const res = await fetch('/api/TTS', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text, voiceId, modelId }),
    });

    if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        throw new Error(error?.error || 'TTS API request failed');
    }

    return await res.blob();
}