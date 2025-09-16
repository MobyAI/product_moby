export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { extractTextFromPDF, extractTextFromPDFWithOptions, cleanupOCR } from "@/lib/extract/pdf";
import { extractTextFromDOCX } from "@/lib/extract/docx";

const normalize = (s: string) =>
    s.replace(/\r\n/g, "\n")
        .replace(/[ \t]+/g, " ")
        .replace(/\n{3,}/g, "\n\n")
        .trim();

export async function POST(req: NextRequest) {
    // Expect multipart/form-data with a "file" field
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
        return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    // Optional: basic size guard (adjust to your needs)
    // if (file.size > 25 * 1024 * 1024) { // 25 MB
    //     return NextResponse.json({ error: "File too large" }, { status: 413 });
    // }

    const name = file.name ?? "upload";
    const ext = name.split(".").pop()?.toLowerCase();

    try {
        const buf = Buffer.from(await file.arrayBuffer());

        let rawText = "";

        if (ext === "pdf") {
            // rawText = await extractTextFromPDF(buf);
            rawText = await extractTextFromPDFWithOptions(buf, {
                forceOCR: true,
                ocrLanguage: 'eng',
                ocrScale: 2.0,
                // pageNumbers is omitted, so it processes all pages by default
            });

            console.log('OCR text: ', rawText);

            // This works but defeats the purpose of caching
            // await cleanupOCR();
        } else if (ext === "docx") {
            rawText = await extractTextFromDOCX(buf);
        } else {
            return NextResponse.json({ error: "Unsupported file type" }, { status: 400 });
        }

        const text = normalize(rawText);
        if (!text) {
            return NextResponse.json({ error: "No text found in file" }, { status: 422 });
        }

        return new NextResponse(
            JSON.stringify({
                name,
                ext,
                text,
            })
        );
    } catch (err) {
        console.error("extract error:", err);
        return NextResponse.json({ error: "Failed to extract text" }, { status: 500 });
    }
}