import { get, set } from 'idb-keyval';

export const getSessionKey = (scriptID: string) => `rehearsal-room-cache:${scriptID}:session`;

export const restoreSession = async (scriptID: string) => {
    const key = getSessionKey(scriptID);
    return await get(key);
};

export const saveSession = async (
    scriptID: string,
    state: { index: number }
) => {
    const key = getSessionKey(scriptID);
    try {
        await set(key, state);
        console.log('💾 Saved state to IndexedDB');
    } catch (err) {
        console.warn('⚠️ Failed to save rehearsal state:', err);
    }
};