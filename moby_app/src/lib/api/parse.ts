// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function parseScriptFile(file: File): Promise<any | null> {
    const formData = new FormData();
    formData.append("file", file);

    try {
        const res = await fetch("/api/parse", {
            method: "POST",
            body: formData,
        });

        if (!res.ok) {
            console.error("Failed to parse script:", await res.text());
            return null;
        }

        const contentType = res.headers.get("content-type");
        if (!contentType?.includes("application/json")) {
            console.warn("Expected JSON response but got:", contentType);
            return null;
        }

        let data: any = {};
        try {
            data = await res.json();
        } catch (err) {
            console.error("Failed to parse response JSON:", err);
            return null;
        }

        try {
            return JSON.parse(data.parsed);
        } catch (err) {
            console.log("🧩 Slice near error:", data.parsed.slice(12960, 13030));
            console.log("📜 Full length:", data.parsed.length);
            console.error("Failed to parse `data.parsed` JSON:", err);
            return null;
        }
    } catch (error) {
        console.error("Error parsing script:", error);
        return null;
    }
}