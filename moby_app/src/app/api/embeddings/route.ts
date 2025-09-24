import { NextResponse } from "next/server";
import { embedText } from "@/lib/openai/embed";
import { withAuth } from "@/lib/api/withAuth";

async function handler(req: any) {
    try {
        const { expectedLine } = await req.json();

        if (!expectedLine) {
            return NextResponse.json({ error: "Missing inputs" }, { status: 400 });
        }

        const expectedEmbedding = await embedText(expectedLine);

        return NextResponse.json({ expectedEmbedding });
    } catch (error) {
        console.error("Embedding error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

export const POST = withAuth(handler);