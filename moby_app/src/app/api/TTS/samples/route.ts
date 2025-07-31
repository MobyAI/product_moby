import { NextRequest, NextResponse } from 'next/server';
import { getAllVoiceSamples } from '@/server/audio/tts';

export async function GET(_req: NextRequest) {
    try {
        const samples = await getAllVoiceSamples();
        return NextResponse.json({ samples });
    } catch (err) {
        console.error('Failed to fetch voice samples:', err);
        return NextResponse.json({ error: 'Failed to fetch voice samples' }, { status: 500 });
    }
}