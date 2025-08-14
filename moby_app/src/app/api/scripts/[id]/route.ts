import { NextRequest, NextResponse } from 'next/server';
import { getScript, updateScript, deleteScript } from '@/lib/firebase/scripts';

// userID sent in URL:
//
// fetch(`/api/scripts/${scriptId}?userID=${userId}`);
// fetch(`/api/scripts/${scriptId}?userID=${userId}`, {
//     method: 'DELETE',
// });
// fetch(`/api/scripts/${scriptId}?userID=${userId}`, {
//     method: 'PATCH',
//     headers: { 'Content-Type': 'application/json' },
//     body: JSON.stringify({ script }),
// });

type Context = { params: Promise<{ id: string }> };

// Get script by userID and scriptID
export async function GET(req: NextRequest, { params }: Context) {
    try {
        const { searchParams } = new URL(req.url);
        const userID = searchParams.get('userID');
        const { id } = await params;

        if (!userID) {
            return NextResponse.json({ error: 'Missing userID' }, { status: 400 });
        }

        const script = await getScript(userID, id);
        return NextResponse.json(script);
    } catch (err) {
        console.error('Error in GET /api/scripts/[id]:', err);
        return NextResponse.json({ error: 'Script not found' }, { status: 404 });
    }
}

// Update script by scriptID
export async function PATCH(req: NextRequest, { params }: Context) {
    try {
        const { searchParams } = new URL(req.url);
        const userID = searchParams.get('userID');
        const body = await req.json();
        const { id } = await params;

        if (!userID || !Array.isArray(body.script)) {
            return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
        }

        await updateScript(userID, id, body.script);
        return NextResponse.json({ success: true });
    } catch (err) {
        console.error('Error in PATCH /api/scripts/[id]:', err);
        return NextResponse.json({ error: 'Failed to update script' }, { status: 500 });
    }
}

// Delete script by scriptID
export async function DELETE(req: NextRequest, { params }: Context) {
    try {
        const { searchParams } = new URL(req.url);
        const userID = searchParams.get('userID');
        const { id } = await params;

        if (!userID) {
            return NextResponse.json({ error: 'Missing userID' }, { status: 400 });
        }

        await deleteScript(userID, id);
        return NextResponse.json({ success: true });
    } catch (err) {
        console.error('Error in DELETE /api/scripts/[id]:', err);
        return NextResponse.json({ error: 'Failed to delete script' }, { status: 500 });
    }
}