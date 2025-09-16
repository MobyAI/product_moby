// @ts-expect-error - pdf-parse-fork doesn't have type definitions
import pdfParse from 'pdf-parse-fork';
import * as pdfjsLib from 'pdfjs-dist';
import { createWorker, Worker } from 'tesseract.js';
import { createCanvas, Canvas } from 'canvas';

// Set up PDF.js worker for Next.js
pdfjsLib.GlobalWorkerOptions.workerSrc = require('pdfjs-dist/build/pdf.worker.entry.js');

// Cache for multiple language workers
const tesseractWorkers: Map<string, Worker> = new Map();

async function initTesseract(language: string = 'eng'): Promise<Worker> {
    if (!tesseractWorkers.has(language)) {
        const worker = await createWorker(language);
        tesseractWorkers.set(language, worker);
    }
    return tesseractWorkers.get(language)!;
}

export async function cleanupOCR(): Promise<void> {
    for (const [, worker] of tesseractWorkers) {
        await worker.terminate();
    }
    tesseractWorkers.clear();
}

async function renderPageToCanvas(page: any, scale: number = 2.0): Promise<Buffer> {
    // Get page viewport with specified scale
    const viewport = page.getViewport({ scale });

    // Create canvas with page dimensions
    const canvas = createCanvas(viewport.width, viewport.height);
    const context = canvas.getContext('2d');

    // Render PDF page to canvas
    // Cast the context to 'any' to avoid type mismatch
    const renderContext = {
        canvasContext: context as any,
        viewport: viewport,
    };

    await page.render(renderContext).promise;

    // Convert canvas to buffer (PNG format)
    return canvas.toBuffer('image/png');
}

export async function extractTextFromPDF(buffer: Buffer): Promise<string> {
    const data = new Uint8Array(buffer);

    const loadingTask = pdfjsLib.getDocument({
        data: data,
        disableFontFace: true,
        useSystemFonts: true,
    });

    const pdfDocument = await loadingTask.promise;
    const numPages = pdfDocument.numPages;
    let fullText = '';
    let isScannedPDF = true;

    // First pass: Try to extract native text
    for (let pageNum = 1; pageNum <= numPages; pageNum++) {
        const page = await pdfDocument.getPage(pageNum);
        const textContent = await page.getTextContent();

        // Check if page has extractable text
        if (textContent.items.length > 0) {
            isScannedPDF = false;

            // Extract text normally
            let lastY: number | null = null;
            let pageText = '';

            for (const item of textContent.items) {
                if ('str' in item && item.str) {
                    // Type assertion for transform array
                    const transform = (item as any).transform;
                    if (lastY !== null && Math.abs(lastY - transform[5]) > 1) {
                        pageText += '\n';
                    }
                    pageText += item.str;
                    lastY = transform[5];
                }
            }

            fullText += pageText;

            if (pageNum < numPages) {
                fullText += '\n\n';
            }
        }
    }

    // If no text was extracted, use OCR
    if (isScannedPDF || fullText.trim().length === 0) {
        console.log('No native text found, using OCR...');
        fullText = '';

        // Initialize Tesseract worker
        const worker = await initTesseract();

        for (let pageNum = 1; pageNum <= numPages; pageNum++) {
            console.log(`Processing page ${pageNum}/${numPages} with OCR...`);

            const page = await pdfDocument.getPage(pageNum);

            // Render page to image buffer
            const imageBuffer = await renderPageToCanvas(page);

            // Perform OCR on the image
            const { data: { text } } = await worker.recognize(imageBuffer);

            fullText += text;

            // Add page separator
            if (pageNum < numPages) {
                fullText += '\n\n';
            }
        }
    }

    // Clean up
    await pdfDocument.destroy();

    return fullText;
}

export async function extractTextFromPDFWithOptions(
    buffer: Buffer,
    options?: {
        forceOCR?: boolean;  // Force OCR even if native text exists
        ocrLanguage?: string; // Language for OCR (default: 'eng')
        ocrScale?: number;    // Scale factor for rendering (default: 2.0)
        pageNumbers?: number[]; // Specific pages to process
    }
): Promise<string> {
    const {
        forceOCR = false,
        ocrLanguage = 'eng',
        ocrScale = 2.0,
        pageNumbers
    } = options || {};

    const data = new Uint8Array(buffer);

    const loadingTask = pdfjsLib.getDocument({
        data: data,
        disableFontFace: true,
        useSystemFonts: true,
    });

    const pdfDocument = await loadingTask.promise;
    const numPages = pdfDocument.numPages;
    let fullText = '';

    // Determine which pages to process
    const pagesToProcess = pageNumbers ||
        Array.from({ length: numPages }, (_, i) => i + 1);

    // Try native text extraction first (unless forced OCR)
    if (!forceOCR) {
        for (const pageNum of pagesToProcess) {
            if (pageNum > numPages) continue;

            const page = await pdfDocument.getPage(pageNum);
            const textContent = await page.getTextContent();

            if (textContent.items.length > 0) {
                // Extract native text
                let lastY: number | null = null;
                let pageText = '';

                for (const item of textContent.items) {
                    if ('str' in item && item.str) {
                        const transform = (item as any).transform;
                        if (lastY !== null && Math.abs(lastY - transform[5]) > 1) {
                            pageText += '\n';
                        }
                        pageText += item.str;
                        lastY = transform[5];
                    }
                }

                fullText += pageText;

                const pageIndex = pagesToProcess.indexOf(pageNum);
                if (pageIndex < pagesToProcess.length - 1) {
                    fullText += '\n\n';
                }
            }
        }
    }

    // Use OCR if forced or no text found
    if (forceOCR || fullText.trim().length === 0) {
        console.log('Using OCR for text extraction...');
        fullText = '';

        // Initialize or get cached worker with specified language
        const worker = await initTesseract(ocrLanguage);

        for (const pageNum of pagesToProcess) {
            if (pageNum > numPages) continue;

            console.log(`OCR processing page ${pageNum}...`);

            const page = await pdfDocument.getPage(pageNum);

            // Use the helper function with custom scale
            const imageBuffer = await renderPageToCanvas(page, ocrScale);

            // Perform OCR
            const { data: { text } } = await worker.recognize(imageBuffer);

            fullText += text;

            const pageIndex = pagesToProcess.indexOf(pageNum);
            if (pageIndex < pagesToProcess.length - 1) {
                fullText += '\n\n';
            }
        }

        // Note: We're NOT terminating the worker here since it's cached
        // User should call cleanupOCR() when completely done
    }

    await pdfDocument.destroy();

    return fullText;
}

// export async function extractTextFromPDF(buffer: Buffer): Promise<string> {
//     const data = await pdfParse(buffer);
//     return data.text;
// }