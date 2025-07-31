'use client';

import { useState } from 'react';
import UploadForm from './uploadFile';
import ParsedOutput from './parsedScript';
import { useRouter } from 'next/navigation';
import { saveScript } from '@/lib/api/dbFunctions/scripts';
// import { fetchEmbedding } from '@/lib/api/embed';
import type { ScriptElement } from '@/types/script';
import { Layout } from '@/components/ui/Layout';

export default function UploadPage() {
    const [loading, setLoading] = useState(false);
    const [parsedData, setParsedData] = useState<ScriptElement[] | null>(null);
    const [allCharacters, setAllCharacters] = useState<string[]>([]);

    const router = useRouter();
    const userID = 'demo-user'; // Replace with real auth ID later

    async function handleParsedScript(script: ScriptElement[]) {
        try {
            setLoading(true);

            const scriptID = await saveScript(script, userID);
            // router.push(`/rehearsal-room?userID=${userID}&scriptID=${scriptID}`);
            router.push(`/scripts/practice?userID=${userID}&scriptID=${scriptID}`);
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
    
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    function handleRoleChange(index: number, role: 'user' | 'scene-partner') {
        if (!parsedData) return;
        const updated = parsedData.map((item, i) =>
            i === index && item.type === 'line'
                ? { ...item, role }
                : item
        );
        setParsedData(updated);
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

    function getUniqueCharacters(script: ScriptElement[]) {
        const characters = new Set<string>();
        for (const item of script) {
            if (item.type === 'line' && typeof item.character === 'string') {
                characters.add(item.character);
            }
        }
        return Array.from(characters);
    }

    return (
        <Layout>
            {parsedData ? (
                <div className="min-h-screen bg-gray-50 flex">
                    {/* Left sidebar for role select */}
                    <div className="w-80 p-6 bg-white border-r border-gray-200">
                        <div className="sticky top-6 space-y-6">
                            <button
                                onClick={() => handleParsedScript(parsedData)}
                                disabled={loading}
                                className="w-full bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
                            >
                                {loading ? 'Saving...' : 'Save and Rehearse'}
                            </button>
                            {allCharacters.length > 0 && (
                                <div className="space-y-4">
                                    <h2 className="text-lg font-semibold mb-4 text-black">Select Your Role:</h2>
                                    <div className="flex flex-col gap-2">
                                        {allCharacters.map((character) => {
                                            const currentRole = parsedData?.find(
                                            (line) => line.type === 'line' && line.character === character
                                            )?.role;

                                            const isUser = currentRole === 'user';

                                            return (
                                                <button
                                                    key={character}
                                                    onClick={() =>
                                                    updateCharacterRole(character, currentRole === 'user' ? 'scene-partner' : 'user')
                                                    }
                                                    className={`w-full px-4 py-2 rounded-full border text-sm font-medium text-left transition ${
                                                    isUser
                                                        ? 'bg-green-100 border-green-300 text-green-800'
                                                        : 'bg-blue-100 border-blue-300 text-blue-800'
                                                    }`}
                                                >
                                                    {character}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                    
                    {/* Main content area - centered */}
                    <div className="flex-1 flex justify-center py-6">
                        <div className="w-full max-w-4xl px-6">
                            <ParsedOutput data={parsedData} />
                        </div>
                    </div>
                </div>
            ) : (
                <UploadForm
                    onParsed={(rawScript: ScriptElement[]) => {
                        const initialized = assignDefaultRoles(rawScript);
                        setAllCharacters(getUniqueCharacters(initialized));
                        setParsedData(initialized);
                    }}
                />
            )}
        </Layout>
    );
}