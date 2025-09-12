export async function fetchSimilarity(spokenLine: string, expectedEmbedding: number[]) {
    const res = await fetch("/api/embeddings/compare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ spokenLine, expectedEmbedding }),
    });

    if (!res.ok) {
        console.error("Failed to fetch similarity:", await res.text());
        return null;
    }

    let similarity: number | null = null;
    try {
        const contentType = res.headers.get("content-type");
        if (contentType?.includes("application/json")) {
            const data = await res.json();
            similarity = data?.similarity ?? null;
        } else {
            console.warn("Expected JSON but got:", contentType);
        }
    } catch (err) {
        console.error("Failed to parse similarity JSON:", err);
    }

    return similarity;
}

export function cosineSimilarity(a: number[], b: number[]): number {
    const dot = a.reduce((sum, val, i) => sum + val * b[i], 0);
    const magA = Math.sqrt(a.reduce((sum, val) => sum + val ** 2, 0));
    const magB = Math.sqrt(b.reduce((sum, val) => sum + val ** 2, 0));
    return dot / (magA * magB);
}