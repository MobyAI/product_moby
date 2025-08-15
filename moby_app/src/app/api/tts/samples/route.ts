import { NextRequest, NextResponse } from 'next/server';
import { getAllVoiceSamples, saveVoiceSampleBlob } from '@/lib/firebase/tts';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function GET(_req: NextRequest) {
    try {
        const samples = await getAllVoiceSamples();
        return NextResponse.json({ samples });
    } catch (err) {
        console.error('Failed to fetch voice samples:', err);
        return NextResponse.json({ error: 'Failed to fetch voice samples' }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();

        const file = formData.get('file') as Blob | null;
        const voiceId = formData.get('voiceId') as string | null;
        const voiceName = formData.get('voiceName') as string | null;
        const description = formData.get('description') as string | null;

        if (!file || !voiceId || !voiceName || !description) {
            return NextResponse.json(
                { error: 'Missing required fields' },
                { status: 400 }
            );
        }

        await saveVoiceSampleBlob(voiceId, voiceName, file, description);

        return NextResponse.json({ message: 'Voice sample uploaded successfully' });
    } catch (err) {
        console.error('Failed to upload voice sample:', err);
        return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
    }
}