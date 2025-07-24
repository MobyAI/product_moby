import { uploadEmbeddingBlob, fetchEmbeddingUrl } from '@/lib/api/dbFunctions/embeddings';
import type { ScriptElement } from '@/types/script';

export async function fetchSimilarity(spokenLine: string, expectedEmbedding: number[]) {
    const res = await fetch("/api/embed/compare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ spokenLine, expectedEmbedding }),
    });

    if (!res.ok) {
        console.error("Failed to fetch similarity:", await res.text());
        return null;
    }

    const { similarity } = await res.json();
    return similarity as number;
}

export async function fetchEmbedding(expectedLine: string): Promise<number[] | null> {
    const res = await fetch("/api/embed", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ expectedLine }),
    });

    if (!res.ok) {
        console.error("Failed to fetch embedding:", await res.text());
        return null;
    }

    const { expectedEmbedding } = await res.json();
    return expectedEmbedding as number[];
}

export async function addEmbeddingsToScript(
    script: any[],
    userID: string,
    scriptID: string
): Promise<any[]> {
    const modifiedScript = await Promise.all(
        script.map(async (item) => {
            if (item.type === 'line' && item.role === 'user') {
                let embedding: number[] | null = null;

                // Check Firebase Storage first
                try {
                    const url = await fetchEmbeddingUrl({ userID, scriptID, index: item.index });
                    const res = await fetch(url);

                    if (!res.ok) {
                        throw new Error(`Failed to fetch embedding JSON from storage`);
                    }

                    embedding = await res.json();
                } catch (err) {
                    console.warn(`⚠️ No embedding in storage for line ${item.index}, generating...`, err);
                }

                // If no embedding from storage, use make api call
                if (!embedding) {
                    embedding = await fetchEmbedding(item.text);
                    if (!embedding) {
                        throw new Error(`Failed to generate embedding for: "${item.text}"`);
                    }

                    // Attempt to save to Firebase Storage
                    try {
                        const blob = new Blob([JSON.stringify(embedding)], { type: 'application/json' });
                        await uploadEmbeddingBlob({ userID, scriptID, index: item.index, blob });
                    } catch (uploadErr) {
                        console.warn(`⚠️ Failed to upload embedding for line ${item.index}`, uploadErr);
                    }
                }

                return {
                    ...item,
                    expectedEmbedding: embedding,
                };
            }

            return item;
        })
    );

    return modifiedScript;
}

export async function addEmbedding(
    element: ScriptElement,
    userID: string,
    scriptID: string
): Promise<ScriptElement> {
    if (element.type !== 'line') return element;

    let embedding: number[] | null = null;

    // Check Firebase Storage first
    try {
        const url = await fetchEmbeddingUrl({ userID, scriptID, index: element.index });
        const res = await fetch(url);
        if (!res.ok) throw new Error('Failed to fetch embedding from storage');
        embedding = await res.json();
    } catch (err) {
        console.warn(`⚠️ No embedding in storage for line ${element.index}, generating...`, err);
    }

    // If not found, generate
    if (!embedding) {
        embedding = await fetchEmbedding(element.text);
        if (!embedding) throw new Error(`Embedding generation failed for: "${element.text}"`);

        try {
            const blob = new Blob([JSON.stringify(embedding)], { type: 'application/json' });
            await uploadEmbeddingBlob({ userID, scriptID, index: element.index, blob });
        } catch (uploadErr) {
            console.warn(`⚠️ Failed to upload embedding for line ${element.index}`, uploadErr);
        }
    }

    return { ...element, expectedEmbedding: embedding };
}