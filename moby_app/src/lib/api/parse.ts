export async function parseScriptFile(file: File): Promise<any | null> {
    const formData = new FormData();
    formData.append('file', file);

    try {
        const res = await fetch('/api/parse', {
            method: 'POST',
            body: formData,
        });

        if (!res.ok) {
            console.error('Failed to parse script:', await res.text());
            return null;
        }

        const data = await res.json();
        return JSON.parse(data.parsed);
    } catch (error) {
        console.error('Error parsing script:', error);
        return null;
    }
}