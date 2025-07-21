import { NextResponse } from 'next/server';
import { fetchTTSBlob } from '@/lib/hume/textToSpeech';

export async function POST(req: Request) {
    try {
        const { text, voiceId, voiceDescription, contextUtterance } = await req.json();

        if (!text || !voiceId || !voiceDescription) {
            return NextResponse.json(
                { error: 'Missing required fields: text, voiceName, voiceDescription' },
                { status: 400 }
            );
        }

        const blob = await fetchTTSBlob({
            text,
            voiceId,
            voiceDescription,
            contextUtterance,
        });

        const arrayBuffer = await blob.arrayBuffer();

        return new Response(arrayBuffer, {
            status: 200,
            headers: {
                'Content-Type': 'audio/mpeg',
                'Content-Disposition': 'inline; filename="hume-tts.mp3"',
            },
        });
    } catch (err) {
        console.error('[HUME TTS ERROR]', err);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}