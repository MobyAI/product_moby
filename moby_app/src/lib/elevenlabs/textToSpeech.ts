import { ElevenLabsClient } from '@elevenlabs/elevenlabs-js';

const elevenlabs = new ElevenLabsClient({
    apiKey: process.env.ELEVENLABS_API_KEY,
});

async function streamToBlob(stream: ReadableStream<Uint8Array>): Promise<Blob> {
    const reader = stream.getReader();
    const chunks: Uint8Array[] = [];

    while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value) chunks.push(value);
    }

    const blob = new Blob(chunks, { type: 'audio/mpeg' });
    return blob;
}

export async function fetchTTSBlob({
    text,
    voiceId,
    modelId = 'eleven_multilingual_v2',
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
    const stream = await elevenlabs.textToSpeech.convert(voiceId, {
        text,
        modelId,
        outputFormat: 'mp3_44100_128',
        voiceSettings,
    });

    return await streamToBlob(stream);
}