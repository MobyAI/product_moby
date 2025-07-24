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