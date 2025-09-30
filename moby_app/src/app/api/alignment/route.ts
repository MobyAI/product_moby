import { NextResponse } from 'next/server';
import { getForcedAlignment } from '@/lib/elevenlabs/forcedAlignment';
import { withAuth } from "@/lib/api/withAuth";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function handler(req: any) {
    const formData = await req.formData();
    const audioFile = formData.get('audio') as File;
    const transcript = formData.get('transcript') as string;

    // Validate inputs
    if (!audioFile || !transcript) {
      return NextResponse.json(
        { error: 'Missing required fields: audio file and transcript' },
        { status: 400 }
      );
    }

    const audioBlob = new Blob([await audioFile.arrayBuffer()], {
        type: audioFile.type
    });

    const alignmentData = await getForcedAlignment(audioBlob, transcript);
    return NextResponse.json(alignmentData);
}

export const POST = withAuth(handler);