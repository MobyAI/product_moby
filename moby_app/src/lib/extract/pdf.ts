// @ts-ignore
import pdfParse from 'pdf-parse-fork';

export async function extractTextFromPDF(buffer: Buffer): Promise<string> {
    const data = await pdfParse(buffer);
    return data.text;
}