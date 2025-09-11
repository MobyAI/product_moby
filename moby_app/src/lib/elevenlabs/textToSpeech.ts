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
        languageCode,
        seed,
        applyTextNormalization = 'auto',
        outputFormat = 'mp3_44100_128',
    } = options;

    // Build the request parameters
    const requestParams: any = {
        text,
        model_id: modelId,
        output_format: outputFormat,
    };

    // Add voice settings if provided
    if (voiceSettings) {
        requestParams.voice_settings = {
            stability: voiceSettings.stability ?? 0.5,
            similarity_boost: voiceSettings.similarityBoost ?? 0.75, // Changed from 0.8
            style: voiceSettings.style ?? 0.5,
            use_speaker_boost: voiceSettings.useSpeakerBoost ?? false,
        };
    }

    // Add v3 specific parameters
    if (languageCode) {
        requestParams.language_code = languageCode;
    }
    if (seed !== undefined) {
        requestParams.seed = seed;
    }
    requestParams.apply_text_normalization = applyTextNormalization;

    // Generate the audio stream
    const stream = await elevenlabs.textToSpeech.convert(voiceId, requestParams);

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