import { NextResponse } from 'next/server';
import { extractScriptFromImage } from '@/lib/openai/extract';
import { withAuth } from "@/lib/api/withAuth";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function handler(req: any) {
    try {
        const { images } = await req.json();

        if (!images || !Array.isArray(images)) {
            return NextResponse.json(
                { error: 'Invalid images array' },
                { status: 400 }
            );
        }

        // Process all images in one call
        const extractedText = await extractScriptFromImage(images);

        return NextResponse.json({
            success: true,
            text: extractedText
        });

    } catch (error) {
        console.error('Batch extraction error:', error);
        return NextResponse.json(
            { error: 'Failed to extract script from images' },
            { status: 500 }
        );
    }
}

export const POST = withAuth(handler);

// Optional: Add rate limiting or request size limits
export const runtime = 'nodejs'; // Use Node.js runtime
// export const maxDuration = 30; // Maximum function duration (30 seconds)