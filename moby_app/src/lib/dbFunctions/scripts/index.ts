import type { ScriptElement } from '@/types/script';

// Save script
export async function saveScript(script: ScriptElement[], userID: string): Promise<string> {
    const res = await fetch('/api/scripts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userID, script }),
    });

    if (!res.ok) throw new Error('Failed to save script');

    const data = await res.json();
    return data.id;
}

// Fetch single script
export async function fetchScriptByID(userID: string, scriptID: string): Promise<{ script: ScriptElement[] }> {
    const res = await fetch(`/api/scripts/${scriptID}?userID=${userID}`);

    if (!res.ok) throw new Error('Failed to fetch script');

    return await res.json();
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