export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { getRolesWithClaude } from '@/lib/claude/extractRoles';
import { withAuth } from "@/lib/api/withAuth";

type Payload = {
    text: string;
    parseId?: string;
};

async function handler(req: any) {
    const t0 = performance.now();

    try {
        const { text, parseId }: Payload = await req.json();

        if (typeof text !== 'string' || !text.trim()) {
            return NextResponse.json({ error: 'Missing or empty `text`' }, { status: 400 });
        }

        const response = await getRolesWithClaude(text);

        console.log('parsed roles:', response);
        console.log(`✅ done | total ${Math.round(performance.now() - t0)}ms`);

        return NextResponse.json({ roles: response, parseId });
    } catch (error) {
        console.error('roles parse error:', error);
        return NextResponse.json({ error: 'Failed to parse roles' }, { status: 500 });
    }
}

export const POST = withAuth(handler);