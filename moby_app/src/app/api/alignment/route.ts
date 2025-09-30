import { NextResponse } from 'next/server';
import { getForcedAlignment } from '@/lib/elevenlabs/forcedAlignment';
import { withAuth } from "@/lib/api/withAuth";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function handler(req: any) {
  console.log('Alignment API hit, body size:', req.headers.get('content-length'));

  // Also log in MB for easier reading
  const sizeInBytes = parseInt(req.headers.get('content-length') || '0');
  console.log(`Request size: ${(sizeInBytes / 1024 / 1024).toFixed(2)}MB`);

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