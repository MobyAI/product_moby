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