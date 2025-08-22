export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { extractTextFromPDF } from '@/lib/extract/pdf';
import { extractTextFromDOCX } from '@/lib/extract/docx';
import { parseWithClaude } from '@/lib/claude/parse';
// import { getRolesWithClaude } from '@/lib/claude/extractRoles';

// export async function POST() {
//     return new Response(JSON.stringify({ message: "Temporarily disabled" }), {
//         status: 503,
//         headers: { 'Content-Type': 'application/json' }
//     });
// }

export async function POST(req: NextRequest) {
    const t0 = performance.now();

    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
        return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    const ext = file.name.split('.').pop()?.toLowerCase();
    const buffer = Buffer.from(await file.arrayBuffer());

    try {
        let text = '';

        if (ext === 'pdf') {
            try {
                text = await extractTextFromPDF(buffer);
            } catch (err) {
                console.error('Error inside extractTextFromPDF:', err);
            }
        } else if (ext === 'docx') {
            try {
                text = await extractTextFromDOCX(buffer);
            } catch (err) {
                console.error('Error inside extractTextFromDOCX:', err);
            }
        } else {
            return NextResponse.json({ error: 'Unsupported file type' }, { status: 400 });
        }

        // const response = await parseWithGPT(text);
        const response = await parseWithClaude(text);
        // const response = await getRolesWithClaude(text);

        console.log('parsed script: ', response);
        console.log(`✅ done | total ${Math.round(performance.now() - t0)}ms`);

        return NextResponse.json({ parsed: response });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: 'Failed to extract text from file' }, { status: 500 });
    }
}