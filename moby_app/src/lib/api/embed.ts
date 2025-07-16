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

export async function addEmbeddingsToScript(script: any[]): Promise<any[]> {
    const modifiedScript = await Promise.all(
        script.map(async (item) => {
            if (item.type === 'line') {
                const embedding = await fetchEmbedding(item.text);
                if (!embedding) {
                    throw new Error(`Failed to fetch embedding for: "${item.text}"`);
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