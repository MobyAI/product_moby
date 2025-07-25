'use client';

import { useState, useEffect } from 'react';
import UploadForm from './UploadForm';
import ParsedOutput from './ParsedOutput';
import { useRouter } from 'next/navigation';
import { saveScript } from '@/lib/api/dbFunctions/scripts';
import type { ScriptElement } from '@/types/script';

export default function UploadPage() {
    const [loading, setLoading] = useState(false);
    const [parsedData, setParsedData] = useState<ScriptElement[] | null>(null);
    const [allCharacters, setAllCharacters] = useState<string[]>([]);

    const router = useRouter();
    const userID = 'demo-user'; // Replace with real auth ID later

    useEffect(() => {
        console.log('updated script: ', parsedData);
    }, [parsedData]);

    async function handleParsedScript(script: ScriptElement[]) {
        try {
            setLoading(true);

            const scriptID = await saveScript(script, userID);
            router.push(`/rehearsal-room?userID=${userID}&scriptID=${scriptID}`);
        } catch (err) {
            console.error('Failed to save script:', err);
            alert('Failed to save script. Please try again.');
        } finally {
            setLoading(false);
        }
    }

    function assignDefaultRoles(script: ScriptElement[]): ScriptElement[] {
        return script.map((item) =>
            item.type === 'line' && !item.role
                ? { ...item, role: 'scene-partner' }
                : item
        );
    }

    function getUniqueCharacters(script: ScriptElement[]) {
        const characters = new Set<string>();
        for (const item of script) {
            if (item.type === 'line' && typeof item.character === 'string') {
                characters.add(item.character);
            }
        }
        return Array.from(characters);
    }

    function updateCharacterRole(character: string, role: 'user' | 'scene-partner') {
        if (!parsedData) return;

        const updated = parsedData.map((item) =>
            item.type === 'line' && item.character === character
                ? { ...item, role }
                : item
        );

        setParsedData(updated);
    }

    function handleLineUpdate(index: number, updated: ScriptElement) {
        if (!parsedData) return;

        // Extract line end kw and remove punctuation
        const words = updated.text.trim().split(/\s+/);

        const clean = (word: string) =>
            word.replace(/[^\w'-]/g, '').replace(/^['"]+|['"]+$/g, '');

        const lastWords = words
            .slice(-2)
            .map(clean)
            .filter(Boolean);

        const updatedItem: ScriptElement = {
            ...parsedData[index],
            ...updated,
            text: updated.text,
            lineEndKeywords: lastWords,
        };

        const newData = [...parsedData];
        newData[index] = updatedItem;
        setParsedData(newData);
    }

    return (
        <div className="p-6 space-y-6">
            <h1 className="text-xl font-bold">Upload Your Script</h1>
            <UploadForm
                onParsed={(rawScript: ScriptElement[]) => {
                    const initialized = assignDefaultRoles(rawScript);
                    setAllCharacters(getUniqueCharacters(initialized));
                    setParsedData(initialized);
                }}
            />
            {parsedData && (
                <div className="space-y-4">
                    <button
                        onClick={() => handleParsedScript(parsedData)}
                        disabled={loading}
                        className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
                    >
                        {loading ? 'Saving...' : 'Save and Rehearse'}
                    </button>
                    {allCharacters.length > 0 && (
                        <div className="space-y-4">
                            <h2 className="text-lg font-semibold mb-4">Role Select:</h2>
                            {allCharacters.map((character) => {
                                const currentRole = parsedData?.find(
                                    (line) => line.type === 'line' && line.character === character
                                )?.role;

                                return (
                                    <div key={character} className="flex items-center gap-4">
                                        <span className="font-medium">{character}</span>
                                        <button
                                            onClick={() =>
                                                updateCharacterRole(
                                                    character,
                                                    currentRole === 'user' ? 'scene-partner' : 'user'
                                                )
                                            }
                                            className={`text-xs px-2 py-1 rounded border ${currentRole === 'user'
                                                ? 'bg-green-100 border-green-300 text-green-800'
                                                : 'bg-blue-100 border-blue-300 text-blue-800'
                                                }`}
                                        >
                                            {currentRole === 'user' ? '🙋 You' : '🤖 Scene Partner'}
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                    <ParsedOutput
                        data={parsedData}
                        onUpdateLine={handleLineUpdate}
                    />
                </div>
            )}
        </div>
    );
}