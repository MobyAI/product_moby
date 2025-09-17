declare global {
    interface Window {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        pdfjsLib: any;
    }
}

// Ensure PDF.js is loaded
let pdfJsLoaded = false;
async function ensurePdfJsLoaded(): Promise<void> {
    if (pdfJsLoaded || window.pdfjsLib) {
        pdfJsLoaded = true;
        return;
    }

    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
        script.async = true;

        script.onload = () => {
            window.pdfjsLib.GlobalWorkerOptions.workerSrc =
                'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
            pdfJsLoaded = true;
            resolve();
        };

        script.onerror = () => {
            reject(new Error('Failed to load PDF.js'));
        };

        document.body.appendChild(script);
    });
}

export async function extractTextFromPDFimg(
    file: File,
    onProgress?: (current: number, total: number, message: string) => void
): Promise<{ text: string; characters: string[] }> {
    // Ensure PDF.js is loaded
    await ensurePdfJsLoaded();

    const arrayBuffer = await file.arrayBuffer();
    const loadingTask = window.pdfjsLib.getDocument({
        data: arrayBuffer
    });

    const pdf = await loadingTask.promise;
    const totalPages = pdf.numPages;
    const base64Images: string[] = [];

    // First, convert all pages to images
    for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
        // Report progress if callback provided
        if (onProgress) {
            onProgress(pageNum, totalPages, `Converting page ${pageNum} of ${totalPages} to image...`);
        }

        const page = await pdf.getPage(pageNum);
        const viewport = page.getViewport({ scale: 2 });
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');

        if (!context) {
            throw new Error('Failed to create canvas context');
        }

        canvas.width = viewport.width;
        canvas.height = viewport.height;

        // Fill white background
        context.fillStyle = 'white';
        context.fillRect(0, 0, canvas.width, canvas.height);

        // Render the page
        await page.render({
            canvasContext: context,
            viewport: viewport,
        }).promise;

        // Convert to base64
        const dataUrl = canvas.toDataURL('image/png');
        const base64Image = dataUrl.split(',')[1];
        base64Images.push(base64Image);
    }

    await pdf.destroy();

    // Now send all images in one API call
    if (onProgress) {
        onProgress(totalPages, totalPages, 'Extracting text with AI vision (this may take a moment)...');
    }

    try {
        const response = await fetch('/api/extractFromImg', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                images: base64Images
            })
        });

        if (!response.ok) {
            throw new Error('Failed to extract text');
        }

        const data = await response.json();
        const screenplayData = JSON.parse(data.text);

        return {
            text: screenplayData.text.trim(),
            characters: screenplayData.characters || []
        };
    } catch (error) {
        console.error('Failed to extract text from images:', error);
        throw error;
    }
}