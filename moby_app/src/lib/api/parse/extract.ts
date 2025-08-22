export async function extractScriptText(file: File): Promise<{
    parseId: string;
    name: string;
    ext?: string;
    text: string;
}> {
    const fd = new FormData();
    fd.append("file", file);

    const res = await fetch("/api/extract", { method: "POST", body: fd });
    if (!res.ok) throw new Error(`Extract failed: ${res.status}`);
    return res.json();
}  