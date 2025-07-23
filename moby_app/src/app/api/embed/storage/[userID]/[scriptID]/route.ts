import { NextRequest, NextResponse } from 'next/server';
import { saveEmbeddingBlob, getEmbeddingUrl, deleteEmbeddingBlob } from '@/server/embeddings';
type RouteParams = { userID: string; scriptID: string; };

export async function POST(req: NextRequest, { params }: { params: RouteParams }) {
    const { userID, scriptID } = await params;
    const formData = await req.formData();

    const index = Number(formData.get('index'));
    const file = formData.get('embedding') as Blob | null;

    if (!userID || !scriptID || isNaN(index) || !file) {
        return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    try {
        await saveEmbeddingBlob(userID, scriptID, index, file);
        return NextResponse.json({ success: true });
    } catch (err) {
        console.error(err);
        return NextResponse.json({ error: 'Failed to save embedding' }, { status: 500 });
    }
}

export async function GET(req: NextRequest, { params }: { params: RouteParams }) {
    const { userID, scriptID } = await params;
    const { searchParams } = new URL(req.url);
    const index = Number(searchParams.get('index'));

    if (!userID || !scriptID || isNaN(index)) {
        return NextResponse.json({ error: 'Missing required query params' }, { status: 400 });
    }

    try {
        const url = await getEmbeddingUrl(userID, scriptID, index);
        return NextResponse.json({ url });
    } catch (err) {
        console.error(err);
        return NextResponse.json({ error: 'Failed to fetch embedding URL' }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest, { params }: { params: RouteParams }) {
    const { userID, scriptID } = await params;
    const { searchParams } = new URL(req.url);
    const index = Number(searchParams.get('index'));

    if (!userID || !scriptID || isNaN(index)) {
        return NextResponse.json({ error: 'Missing required query params' }, { status: 400 });
    }

    try {
        await deleteEmbeddingBlob(userID, scriptID, index);
        return NextResponse.json({ success: true });
    } catch (err) {
        console.error(err);
        return NextResponse.json({ error: 'Failed to delete embedding' }, { status: 500 });
    }
}