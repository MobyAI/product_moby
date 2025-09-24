import { NextResponse } from "next/server";
import { embedText, cosineSimilarity } from "@/lib/openai/embed";
import { withAuth } from "@/lib/api/withAuth";

async function handler(req: any) {
    try {
        let spokenLine: string;
        let expectedEmbedding: number[];

        try {
            const body = await req.json();
            spokenLine = body.spokenLine;
            expectedEmbedding = body.expectedEmbedding;
        } catch (err) {
            console.error("Invalid JSON body:", err);
            return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
        }

        if (
            typeof spokenLine !== 'string' ||
            !Array.isArray(expectedEmbedding)
        ) {
            return NextResponse.json({ error: "Invalid input types" }, { status: 400 });
        }

        const spokenEmbedding = await embedText(spokenLine);
        const similarity = cosineSimilarity(spokenEmbedding, expectedEmbedding);

        return NextResponse.json({ similarity });
    } catch (err: unknown) {
        console.error("Embedding error:", err instanceof Error ? err.message : err);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

export const POST = withAuth(handler);