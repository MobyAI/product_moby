export async function parseScriptFromText(
    text: string
): Promise<any | null> {
    if (!text || !text.trim()) {
        console.error("parseScriptFromText: empty text");
        return null;
    }

    try {
        const res = await fetch("/api/fullParse", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Accept: "application/json",
            },
            body: JSON.stringify({ text }),
        });

        if (!res.ok) {
            console.error("Failed to parse script:", await res.text());
            return null;
        }

        const contentType = res.headers.get("content-type") ?? "";
        if (!contentType.includes("application/json")) {
            console.warn("Expected JSON response but got:", contentType);
            return null;
        }

        // Expected shape: { parsed: ParsedItem[] | string, parseId?: string }
        const data: unknown = await res.json();

        const parsed = normalizeParsedArray(data);
        if (!parsed) return null;

        return parsed;
    } catch (error) {
        console.error("Error parsing script:", error);
        return null;
    }
}

function isObjectArray(x: unknown): x is any {
    return Array.isArray(x) && x.every(v => v !== null && typeof v === "object" && !Array.isArray(v));
}

function normalizeParsedArray(data: unknown): any | null {
    // Primary: { parsed: [...] }
    let parsed: unknown = (data as any)?.parsed;

    // Back-compat: if server returned JSON string in `parsed`
    if (typeof parsed === "string") {
        try {
            parsed = JSON.parse(parsed);
        } catch (err) {
            const s = parsed;
            console.error("Failed to parse `parsed` JSON:", err);
            return null;
        }
    }

    // If parsed is valid array of objects, use it
    if (isObjectArray(parsed)) return parsed;

    // Fallback: some handlers might return the array directly (no `parsed` key)
    if (isObjectArray(data)) return data;

    console.error("Invalid `parsed` payload (expected array of objects)", {
        sample: Array.isArray(parsed) ? parsed.slice(0, 3) : parsed,
    });
    return null;
}