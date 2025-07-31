'use client';

import { useState, useEffect } from 'react';
import UploadForm from './UploadForm';
import ParsedOutput from './ParsedOutput';
import VoiceLibrary from './VoiceLibrary';
import { useRouter } from 'next/navigation';
import { saveScript } from '@/lib/api/dbFunctions/scripts';
import type { ScriptElement } from '@/types/script';
import { fetchAllVoiceSamples } from '@/lib/api/dbFunctions/audio/tts';

interface VoiceSample {
    name: string;
    description: string;
    url: string;
    voiceId: string;
}

type VoiceSelection = {
    voiceId: string;
    voiceName: string;
}

export default function UploadPage() {
    const [loading, setLoading] = useState(false);
    const [parsedData, setParsedData] = useState<ScriptElement[] | null>(null);
    const [allCharacters, setAllCharacters] = useState<string[]>([]);

    // Voice library setup
    const [voiceSamples, setVoiceSamples] = useState<VoiceSample[] | null>(null);
    const [selectedCharacter, setSelectedCharacter] = useState<string | null>(null);
    const [selectedVoices, setSelectedVoices] = useState<Record<string, VoiceSelection>>({});

    // Load voice library audio
    useEffect(() => {
        const loadVoiceSamples = async () => {
            try {
                const data = await fetchAllVoiceSamples();
                setVoiceSamples(data);
            } catch (err) {
                console.error('Failed to load voice samples:', err);
            }
        };

        loadVoiceSamples();
    }, []);

    // For testing
    useEffect(() => {
        console.log('updated script: ', parsedData);

        const enrichedScript = parsedData?.map((item) =>
            item.type === 'line' &&
                item.character &&
                selectedVoices[item.character]
                ? { ...item, voiceId: selectedVoices[item.character] }
                : item
        );

        console.log('enriched script: ', enrichedScript);
    }, [parsedData, selectedVoices]);

    // Save and go to rehearsal room
    const router = useRouter();
    const userID = 'demo-user'; // Replace with real auth ID later

    async function handleParsedScript(script: ScriptElement[]) {
        try {
            setLoading(true);

            const enrichedScript = script.map((item) =>
                item.type === 'line' &&
                    item.character &&
                    selectedVoices[item.character]
                    ? {
                        ...item,
                        voiceId: selectedVoices[item.character].voiceId,
                        voiceName: selectedVoices[item.character].voiceName,
                    }
                    : item
            );

            const scriptID = await saveScript(enrichedScript, userID);
            router.push(`/rehearsal-room?userID=${userID}&scriptID=${scriptID}`);
        } catch (err) {
            console.error('Failed to save script:', err);
            alert('Failed to save script. Please try again.');
        } finally {
            setLoading(false);
        }
    }

    // Character role selection
    function assignDefaultRoles(script: ScriptElement[]): ScriptElement[] {
        return script.map((item) => {
            if (item.type === 'line' && !item.role) {
                const defaultVoice =
                    item.gender === 'male'
                        ? {
                            voiceId: 'c5be03fa-09cc-4fc3-8852-7f5a32b5606c',
                            voiceName: 'Male Default',
                        }
                        : item.gender === 'female'
                            ? {
                                voiceId: '5bbc32c1-a1f6-44e8-bedb-9870f23619e2',
                                voiceName: 'Female Default',
                            }
                            : {
                                voiceId: '5bbc32c1-a1f6-44e8-bedb-9870f23619e2',
                                voiceName: 'Neutral Default',
                            };

                return {
                    ...item,
                    role: 'scene-partner',
                    voiceId: defaultVoice.voiceId,
                    voiceName: defaultVoice.voiceName,
                };
            }

            return item;
        });
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

    // Save edited line
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
                                        {currentRole === 'scene-partner' && (
                                            <button
                                                onClick={() => setSelectedCharacter(character)}
                                                className="text-sm text-purple-700 underline"
                                            >
                                                🗣️ Select Voice
                                            </button>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                    {selectedCharacter && (
                        <div className="mt-4 border rounded-lg p-4 bg-gray-50">
                            <div className="flex justify-between items-center mb-2">
                                <h3 className="text-md font-semibold">
                                    Select a Voice for <span className="text-blue-700">{selectedCharacter}</span>
                                </h3>
                                <button
                                    onClick={() => setSelectedCharacter(null)}
                                    className="text-xs text-gray-500 hover:text-gray-700"
                                >
                                    ❌ Close
                                </button>
                            </div>
                            <VoiceLibrary
                                samples={voiceSamples}
                                selectedVoiceId={selectedVoices[selectedCharacter].voiceId ?? null}
                                onSelectVoice={(voiceId, voiceName) => {
                                    setSelectedVoices((prev) => ({
                                        ...prev,
                                        [selectedCharacter]: { voiceId, voiceName },
                                    }));
                                }}
                                onClose={() => {
                                    setSelectedCharacter(null);
                                }}
                            />
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