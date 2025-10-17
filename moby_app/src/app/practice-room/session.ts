import { get, set } from 'idb-keyval';

interface SessionState {
    index: number;
    isDarkMode?: boolean;
    customStartIndex?: number;
    customEndIndex?: number;
}

export const getSessionKey = (scriptID: string) => `rehearsal-room-cache:${scriptID}:session`;

export const restoreSession = async (scriptID: string): Promise<SessionState | undefined> => {
    const key = getSessionKey(scriptID);
    return await get(key);
};

export const saveSession = async (
    scriptID: string,
    state: SessionState
) => {
    const key = getSessionKey(scriptID);
    try {
        await set(key, state);
        console.log('💾 Saved state to IndexedDB:', state);
    } catch (err) {
        console.warn('⚠️ Failed to save rehearsal state:', err);
    }
};