export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { synthesizeVogentSpeech } from '@/lib/vogent/textToSpeech';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { text, voiceId, voiceOptionValues } = body;

        if (!text || !voiceId) {
            return NextResponse.json({ error: 'Missing text or voiceId' }, { status: 400 });
        }

        const audioBuffer = await synthesizeVogentSpeech({
            text,
            voiceId,
            voiceOptionValues,
        });

        return new Response(audioBuffer, {
            headers: {
                'Content-Type': 'audio/mpeg',
                'Content-Disposition': 'inline; filename="speech.mp3"',
            },
        });
    } catch (err) {
        console.error('Vogent TTS Error:', err);
        return NextResponse.json({ error: 'TTS synthesis failed' }, { status: 500 });
    }
}