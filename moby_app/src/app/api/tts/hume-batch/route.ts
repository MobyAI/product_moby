import { NextResponse } from 'next/server';
import { fetchTTSBatch } from '@/lib/hume/textToSpeech';

export async function POST(req: Request) {
    try {
        const { lines } = await req.json();

        if (!Array.isArray(lines) || lines.length === 0) {
            return NextResponse.json({ error: 'Missing or invalid lines array' }, { status: 400 });
        }

        const audioList = await fetchTTSBatch({ lines });

        return NextResponse.json({ audioList });
    } catch (err) {
        console.error('[HUME TTS BATCH ERROR]', err);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}