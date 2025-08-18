export async function fetchEmbedding(expectedLine: string): Promise<number[] | null> {
    const res = await fetch("/api/embeddings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ expectedLine }),
    });

    if (!res.ok) {
        console.error("Failed to fetch embedding:", await res.text());
        return null;
    }

    try {
        const contentType = res.headers.get("content-type");
        if (contentType?.includes("application/json")) {
            const data = await res.json();
            return Array.isArray(data?.expectedEmbedding) ? data.expectedEmbedding : null;
        } else {
            console.warn("Unexpected response content type:", contentType);
            return null;
        }
    } catch (err) {
        console.error("Failed to parse embedding JSON:", err);
        return null;
    }
}