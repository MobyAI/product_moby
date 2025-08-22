export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { parseWithClaude } from '@/lib/claude/parse';

type Payload = { text: string; parseId?: string };

export async function POST(req: NextRequest) {
    const t0 = performance.now();

    try {
        const { text, parseId }: Payload = await req.json();

        if (typeof text !== 'string' || !text.trim()) {
            return NextResponse.json({ error: 'Missing or empty `text`' }, { status: 400 });
        }

        const response = await parseWithClaude(text);

        console.log('parsed script:', response);
        console.log(`✅ done | total ${Math.round(performance.now() - t0)}ms`);

        // keep the same shape you had before; include parseId if you pass it through
        return NextResponse.json({ parsed: response, parseId });
    } catch (error) {
        console.error('fullParse error:', error);
        return NextResponse.json({ error: 'Failed to parse script' }, { status: 500 });
    }
}