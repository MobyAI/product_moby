export async function useHumeTTS({
    text,
    voiceId,
    voiceDescription,
    contextUtterance,
}: {
    text: string;
    voiceId: string;
    voiceDescription: string;
    contextUtterance?: {
        text: string;
        description: string;
    }[];
}): Promise<Blob> {
    const res = await fetch('/api/tts/hume', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text, voiceId, voiceDescription, contextUtterance }),
    });

    if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        throw new Error(error?.error || 'Hume TTS request failed');
    }

    return await res.blob();
}

export async function useHumeTTSBatch(lines: {
    text: string;
    voiceId: string;
    description?: string;
}[]): Promise<Blob[]> {
    const res = await fetch('/api/TTS/hume-batch', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ lines }),
    });

    if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        throw new Error(error?.error || 'Hume batch TTS request failed');
    }

    const { audioList } = await res.json();

    return audioList.map((base64: string) => {
        const binary = atob(base64);
        const audioBytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
            audioBytes[i] = binary.charCodeAt(i);
        }
        return new Blob([audioBytes], { type: 'audio/mpeg' });
    });
}

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
    const res = await fetch('/api/tts/elevenlabs', {
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