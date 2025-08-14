import { NextRequest, NextResponse } from 'next/server';
import { addScript, getAllScripts } from '@/lib/firebase/scripts';

// Additional next step: Add security rules
// match / users / { userId } / scripts / { scriptId } {
//     allow read, write: if request.auth.uid == userId;
// }

// Add script to user's scripts collection
// Send userID inside req body
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { script, userID } = body;

        if (!userID || !Array.isArray(script)) {
            return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
        }

        const id = await addScript(script);
        return NextResponse.json({ id });
    } catch (err) {
        console.error('Error in POST /api/scripts:', err);
        return NextResponse.json({ error: 'Failed to save script' }, { status: 500 });
    }
}

// Get all scripts for user from search params
// await fetch(`/api/scripts?userID=${userID}`)
export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const userID = searchParams.get('userID');

        if (!userID) {
            return NextResponse.json({ error: 'Missing userID' }, { status: 400 });
        }

        const scripts = await getAllScripts();
        return NextResponse.json({ scripts });
    } catch (err) {
        console.error('Error in GET /api/scripts:', err);
        return NextResponse.json({ error: 'Failed to fetch scripts' }, { status: 500 });
    }
}