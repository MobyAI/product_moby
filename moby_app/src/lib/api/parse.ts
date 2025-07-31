// eslint-disable-next-line @typescript-eslint/no-explicit-any
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

        try {
            return JSON.parse(data.parsed);
        } catch (err) {
            console.log('🧩 Slice near error:', data.parsed.slice(12960, 13030));
            console.log('📜 Full length:', data.parsed.length);

            throw err;
        }
    } catch (error) {
        console.error('Error parsing script:', error);
        return null;
    }
}