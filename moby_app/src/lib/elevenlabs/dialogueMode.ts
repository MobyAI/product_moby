import 'server-only';
import { ElevenLabsClient } from '@elevenlabs/elevenlabs-js';

const elevenlabs = new ElevenLabsClient({
    apiKey: process.env.ELEVENLABS_API_KEY,
});

interface DialogueEntry {
    text: string;
    voiceId: string;
    voiceSettings?: {
        stability?: number;
        similarityBoost?: number;
        style?: number;
        useSpeakerBoost?: boolean;
    };
}

interface DialogueOptions {
    dialogue: DialogueEntry[];
    modelId?: string;
    applyTextNormalization?: 'auto' | 'on' | 'off';
}

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

export async function fetchDialogueTTSBlob(options: DialogueOptions): Promise<Blob> {
    const {
        dialogue,
        modelId = 'eleven_v3',
        applyTextNormalization = 'auto',
    } = options;

    const formattedInputs = dialogue.map(entry => ({
        text: entry.text,
        voiceId: entry.voiceId,
    }));

    // Use the textToDialogue.convert method
    const stream = await elevenlabs.textToDialogue.convert({
        modelId: modelId,
        inputs: formattedInputs,
        outputFormat: 'mp3_44100_128',
        applyTextNormalization: applyTextNormalization,
    });

    return await streamToBlob(stream);
}