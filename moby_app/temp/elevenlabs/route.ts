import { NextResponse } from 'next/server';
import { fetchTTSBlob } from '@/lib/elevenlabs/textToSpeech';

export async function POST(req: Request) {
    try {
        const { text, voiceId, modelId, voiceSettings } = await req.json();

        if (!text || !voiceId) {
            return NextResponse.json({ error: 'Missing required parameters: text, voiceId' }, { status: 400 });
        }

        const blob = await fetchTTSBlob({ text, voiceId, modelId, voiceSettings });
        const arrayBuffer = await blob.arrayBuffer();

        return new Response(arrayBuffer, {
            status: 200,
            headers: {
                'Content-Type': 'audio/mpeg',
                'Content-Disposition': 'inline; filename="tts.mp3"',
            },
        });
    } catch (err) {
        console.error('TTS API error:', err);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}