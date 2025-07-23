import { NextRequest, NextResponse } from 'next/server';
import { saveEmbeddingBatchBlob, getEmbeddingBatchBlob } from '@/server/embeddings';

type RouteParams = { userID: string; scriptID: string };

export async function POST(req: NextRequest, { params }: { params: RouteParams }) {
    const { userID, scriptID } = params;
    const json = await req.json();

    if (!userID || !scriptID || typeof json !== 'object') {
        return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    try {
        await saveEmbeddingBatchBlob(userID, scriptID, json);
        return NextResponse.json({ success: true });
    } catch (err) {
        console.error(err);
        return NextResponse.json({ error: 'Failed to save embedding batch' }, { status: 500 });
    }
}

export async function GET(_: NextRequest, { params }: { params: RouteParams }) {
    const { userID, scriptID } = params;

    try {
        const batch = await getEmbeddingBatchBlob(userID, scriptID);
        return NextResponse.json(batch);
    } catch (err) {
        console.error(err);
        return NextResponse.json({ error: 'Failed to fetch embedding batch' }, { status: 500 });
    }
}