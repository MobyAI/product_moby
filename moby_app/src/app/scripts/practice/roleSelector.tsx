import { useMemo, useRef } from 'react';
import { updateScript } from '@/lib/firebase/scripts';
import { set } from 'idb-keyval';
import type { ScriptElement } from '@/types/script';

export function RoleSelector({
    script,
    onRolesUpdated,
    userID,
    scriptID,
}: {
    script: ScriptElement[];
    onRolesUpdated: (updatedScript: ScriptElement[]) => void;
    userID: string;
    scriptID: string;
}) {
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const latestScriptRef = useRef<ScriptElement[] | null>(null);

    const characterRoles = useMemo(() => getCharacterRoles(script), [script]);

    const debounceSave = (updatedScript: ScriptElement[]) => {
        latestScriptRef.current = updatedScript;

        if (debounceRef.current) {
            clearTimeout(debounceRef.current);
        }

        debounceRef.current = setTimeout(async () => {
            if (!latestScriptRef.current) return;

            const sanitizedScript = latestScriptRef.current.map((el) =>
                el.type === 'line'
                    ? { ...el, expectedEmbedding: undefined }
                    : el
            );

            try {
                await updateScript(scriptID, sanitizedScript);
                console.log('📤 Saved latest script to Firestore');
            } catch (err) {
                console.error('❌ Failed to save script:', err);
            }

            try {
                await set(`script-cache:${userID}:${scriptID}`, latestScriptRef.current);
                console.log('💾 Script cached successfully');
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            } catch (err) {
                console.warn('⚠️ Failed to cache script');
            }

            debounceRef.current = null;
        }, 1000);
    };

    const toggleCharacterRole = (charName: string) => {
        const currentRole = characterRoles[charName];
        const newRole: 'user' | 'scene-partner' = currentRole === 'user' ? 'scene-partner' : 'user';

        const updatedScript = script.map((el) =>
            el.type === 'line' && el.character === charName
                ? { ...el, role: newRole }
                : el
        );

        onRolesUpdated(updatedScript);
        debounceSave(updatedScript);
    };

    return (
        <div className="flex gap-2 flex-wrap">
            {Object.entries(characterRoles).map(([char, role]) => (
                <button
                    key={char}
                    onClick={() => toggleCharacterRole(char)}
                    className={`inline-block px-3 py-1 rounded-full text-sm font-semibold ${role === 'user'
                        ? 'bg-blue-600 text-white'
                        : 'bg-purple-600 text-white'
                        }`}
                >
                    {char}
                </button>
            ))}
        </div>
    );
}

function getCharacterRoles(script: ScriptElement[]): Record<string, 'user' | 'scene-partner'> {
    const roleMap: Record<string, 'user' | 'scene-partner'> = {};

    for (const item of script) {
        if (item.type === 'line' && typeof item.character === 'string') {
            if (!(item.character in roleMap)) {
                roleMap[item.character] = item.role ?? 'scene-partner';
            }
        }
    }

    return roleMap;
}