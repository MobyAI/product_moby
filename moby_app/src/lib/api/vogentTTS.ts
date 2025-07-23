export async function useVogentTTS({
    text,
    voiceId,
    temperature = 0.7,
}: {
    text: string;
    voiceId: string;
    temperature?: number;
}): Promise<Blob> {
    const res = await fetch('/api/tts/vogent', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            text,
            voiceId,
            voiceOptionValues: [
                {
                    optionId: 'temperature',
                    value: temperature.toFixed(3),
                },
            ],
        }),
    });

    if (!res.ok) {
        const errorText = await res.text().catch(() => '');
        throw new Error(errorText || 'Vogent TTS API request failed');
    }

    return await res.blob();
}  