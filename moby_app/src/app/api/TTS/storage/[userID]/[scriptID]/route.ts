import { NextRequest, NextResponse } from 'next/server';
import { saveAudioBlob, getAudioBlob, deleteAudioBlob } from '@/server/audio/tts';

type RouteParams = {
    userID: string;
    scriptID: string;
};

export async function POST(req: NextRequest, { params }: { params: RouteParams }) {
    const { userID, scriptID } = params;
    const formData = await req.formData();

    const index = Number(formData.get('index'));
    const file = formData.get('audio') as Blob | null;

    if (!userID || !scriptID || isNaN(index) || !file) {
        return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    try {
        await saveAudioBlob(userID, scriptID, index, file);
        return NextResponse.json({ success: true });
    } catch (err) {
        console.error(err);
        return NextResponse.json({ error: 'Failed to save audio' }, { status: 500 });
    }
}

export async function GET(req: NextRequest, { params }: { params: RouteParams }) {
    const { userID, scriptID } = params;
    const { searchParams } = new URL(req.url);
    const index = Number(searchParams.get('index'));

    if (!userID || !scriptID || isNaN(index)) {
        return NextResponse.json({ error: 'Missing required query params' }, { status: 400 });
    }

    try {
        const blob = await getAudioBlob(userID, scriptID, index);
        return new NextResponse(blob, {
            headers: {
                'Content-Type': 'audio/mpeg',
            },
        });
    } catch (err) {
        console.error(err);
        return NextResponse.json({ error: 'Failed to fetch audio' }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest, { params }: { params: RouteParams }) {
    const { userID, scriptID } = params;
    const { searchParams } = new URL(req.url);
    const index = Number(searchParams.get('index'));

    if (!userID || !scriptID || isNaN(index)) {
        return NextResponse.json({ error: 'Missing required query params' }, { status: 400 });
    }

    try {
        await deleteAudioBlob(userID, scriptID, index);
        return NextResponse.json({ success: true });
    } catch (err) {
        console.error(err);
        return NextResponse.json({ error: 'Failed to delete audio' }, { status: 500 });
    }
}