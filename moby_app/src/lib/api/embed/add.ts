import { uploadEmbeddingBlob, fetchEmbeddingFromStorage } from '@/lib/api/dbFunctions/embeddings';
import { fetchEmbedding } from '@/lib/api/embed';
import type { ScriptElement } from '@/types/script';

export async function addEmbedding(
    element: ScriptElement,
    userID: string,
    scriptID: string
): Promise<ScriptElement> {
    if (element.type !== 'line') return element;

    let embedding: number[] | null = null;

    // Check Firebase Storage first
    try {
        embedding = await fetchEmbeddingFromStorage({ userID, scriptID, index: element.index });
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