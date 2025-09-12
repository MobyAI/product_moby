import 'server-only';
import { ElevenLabsClient } from '@elevenlabs/elevenlabs-js';
import type { TTSOptions } from '@/types/elevenlabs';

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

export async function fetchTTSBlob(options: TTSOptions): Promise<Blob> {
    const {
        text,
        voiceId,
        modelId = 'eleven_v3', // Default to v3
        voiceSettings,
        // languageCode,
        // seed,
        applyTextNormalization = 'auto',
    } = options;

    // Generate the audio stream
    const stream = await elevenlabs.textToSpeech.convert(voiceId, {
        text: text,
        modelId: modelId,
        voiceSettings: voiceSettings ? {
            stability: voiceSettings.stability ?? 0.5,
            similarityBoost: voiceSettings.similarityBoost ?? 0.75,
            style: voiceSettings.style ?? 0.5,
            useSpeakerBoost: voiceSettings.useSpeakerBoost ?? false,
        } : undefined,
        outputFormat: 'mp3_44100_128',
        // languageCode: languageCode,
        // seed: seed,
        applyTextNormalization: applyTextNormalization,
    });

    return await streamToBlob(stream);
}

// Helper function to format text with v3 audio tags
export function formatTextWithAudioTags(
    text: string,
    tags?: {
        emotion?: 'happy' | 'sad' | 'angry' | 'excited' | 'whispering' | 'shouting' | 'sorrowful';
        action?: 'sighs' | 'laughs' | 'giggle' | 'coughs' | 'clears throat';
        pace?: 'slow' | 'fast' | 'normal';
    }
): string {
    if (!tags) return text;

    let formattedText = text;

    // Add emotion tags
    if (tags.emotion) {
        formattedText = `[${tags.emotion}] ${formattedText}`;
    }

    // Add action tags
    if (tags.action) {
        formattedText = `${formattedText} [${tags.action}]`;
    }

    // Add pace tags
    if (tags.pace && tags.pace !== 'normal') {
        formattedText = `[${tags.pace}] ${formattedText}`;
    }

    return formattedText;
}

// export async function fetchTTSBlob({
//     text,
//     voiceId,
//     modelId = 'eleven_multilingual_v2',
//     voiceSettings,
// }: {
//     text: string;
//     voiceId: string;
//     modelId?: string;
//     voiceSettings?: {
//         stability?: number;
//         similarityBoost?: number;
//     };
// }): Promise<Blob> {
//     const stream = await elevenlabs.textToSpeech.convert(voiceId, {
//         text,
//         modelId,
//         outputFormat: 'mp3_44100_128',
//         voiceSettings,
//     });

//     return await streamToBlob(stream);
// }