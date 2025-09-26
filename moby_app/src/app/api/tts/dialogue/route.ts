import { NextResponse } from 'next/server';
import { fetchDialogueTTSBlob } from '@/lib/elevenlabs/dialogueMode';
import { withAuth } from "@/lib/api/withAuth";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function handler(req: any) {
    try {
        const body = await req.json();
        const { dialogue, modelId, applyTextNormalization } = body;

        const audioBlob = await fetchDialogueTTSBlob({
            dialogue,
            modelId,
            applyTextNormalization
        });

        // Convert blob to buffer for response
        const arrayBuffer = await audioBlob.arrayBuffer();

        return new NextResponse(arrayBuffer, {
            headers: {
                'Content-Type': 'audio/mpeg',
            },
        });
    } catch (error) {
        console.error('Dialogue TTS error:', error);
        return NextResponse.json(
            { error: 'Failed to generate dialogue' },
            { status: 500 }
        );
    }
}

export const POST = withAuth(handler);