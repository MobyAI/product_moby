import type { ScriptElement } from '@/types/script';

// Save script
export async function saveScript(script: ScriptElement[], userID: string): Promise<string> {
    const res = await fetch('/api/scripts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userID, script }),
    });

    if (!res.ok) throw new Error('Failed to save script');

    try {
        const contentType = res.headers.get('content-type');
        if (contentType?.includes('application/json')) {
            const data = await res.json();
            if (typeof data.id === 'string') return data.id;
        }
        console.warn('Unexpected response while saving script');
    } catch (err) {
        console.error('Error parsing save script response:', err);
    }

    throw new Error('Invalid save script response');
}

// Fetch single script
export async function fetchScriptByID(
    userID: string,
    scriptID: string
): Promise<{ script: ScriptElement[] }> {
    const res = await fetch(`/api/scripts/${scriptID}?userID=${userID}`);

    if (!res.ok) throw new Error('Failed to fetch script');

    try {
        const contentType = res.headers.get('content-type');
        if (contentType?.includes('application/json')) {
            const data = await res.json();
            if (Array.isArray(data?.script)) {
                return { script: data.script };
            }
        }
        console.warn('Unexpected script data structure');
    } catch (err) {
        console.error('Failed to parse fetched script:', err);
    }

    throw new Error('Invalid script response');
}

// Delete script
export async function deleteScriptByID(userID: string, scriptID: string): Promise<void> {
    const res = await fetch(`/api/scripts/${scriptID}?userID=${userID}`, { method: 'DELETE' });

    if (!res.ok) throw new Error('Failed to delete script');
}

// Update script
export async function updateScriptByID(userID: string, scriptID: string, newScript: ScriptElement[]): Promise<void> {
    const res = await fetch(`/api/scripts/${scriptID}?userID=${userID}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ script: newScript }),
    });

    if (!res.ok) throw new Error('Failed to update script');
}