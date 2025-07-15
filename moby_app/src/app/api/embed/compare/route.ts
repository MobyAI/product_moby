import { NextResponse } from "next/server";
import { embedText, cosineSimilarity } from "@/lib/openai/embed";

export async function POST(req: Request) {
    try {
        const { spokenLine, expectedEmbedding } = await req.json();

        if (!spokenLine || !expectedEmbedding) {
            return NextResponse.json({ error: "Missing inputs" }, { status: 400 });
        }

        const spokenEmbedding = await embedText(spokenLine);
        const similarity = cosineSimilarity(spokenEmbedding, expectedEmbedding);

        return NextResponse.json({ similarity });
    } catch (error) {
        console.error("Embedding error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}