'use client';

import { useState, useEffect } from 'react';
import UploadForm from './uploadFile';
import ParsedOutput from './parsedScript';
import VoiceLibrary from './voiceLibrary';
import { useRouter } from 'next/navigation';
import { saveScript } from '@/lib/api/dbFunctions/scripts';
import { fetchAllVoiceSamples } from '@/lib/api/dbFunctions/audio/tts';
import type { ScriptElement } from '@/types/script';
import { Layout } from '@/components/ui/Layout';
import { LogoutButton } from '@/components/ui/LogoutButton';

interface VoiceSample {
    name: string;
    description: string;
    url: string;
    voiceId: string;
}

type CharacterInfo = {
    character: string;
    voiceId: string;
    voiceName: string;
    role: 'user' | 'scene-partner';
}

export default function UploadPage() {
    const [loading, setLoading] = useState(false);
    const [parsedData, setParsedData] = useState<ScriptElement[] | null>(null);
    const [allCharacters, setAllCharacters] = useState<CharacterInfo[]>([]);

    // Voice library setup
    const [voiceSamples, setVoiceSamples] = useState<VoiceSample[] | null>(null);
    const [selectedCharacter, setSelectedCharacter] = useState<string | null>(null);

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
        const enrichedScript = parsedData?.map((item) => {
            if (item.type !== 'line') return item;

            const updatedCharacter = allCharacters.find((char) => char.character === item.character);
            if (!updatedCharacter) return item;

            return {
                ...item,
                role: updatedCharacter.role,
                voiceId: updatedCharacter.voiceId,
                voiceName: updatedCharacter.voiceName,
            };
        });

        console.log('enriched script: ', enrichedScript);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [allCharacters]);

    const router = useRouter();
    const userID = 'demo-user'; // Replace with real auth ID later

    async function handleParsedScript(script: ScriptElement[]) {
        try {
            setLoading(true);

            const enrichedScript = script.map((item) => {
                if (item.type !== 'line') return item;

                const updatedCharacter = allCharacters.find((char) => char.character === item.character);
                if (!updatedCharacter) return item;

                return {
                    ...item,
                    role: updatedCharacter.role,
                    voiceId: updatedCharacter.voiceId,
                    voiceName: updatedCharacter.voiceName,
                };
            });

            const scriptID = await saveScript(enrichedScript, userID);
            // router.push(`/rehearsal-room?userID=${userID}&scriptID=${scriptID}`);
            router.push(`/scripts/practice?userID=${userID}&scriptID=${scriptID}`);
        } catch (err) {
            console.error('Failed to save script:', err);
            alert('Failed to save script. Please try again.');
        } finally {
            setLoading(false);
        }
    }

    function assignCharacterDefaults(script: ScriptElement[]): ScriptElement[] {
        return script.map((item) => {
            if (item.type === 'line') {
                const defaultVoice =
                    item.gender === 'male'
                        ? {
                            voiceId: '89989d92-1de8-4e5d-97e4-23cd363e9788',
                            voiceName: 'Matt',
                        }
                        : item.gender === 'female'
                            ? {
                                voiceId: '5bbc32c1-a1f6-44e8-bedb-9870f23619e2',
                                voiceName: 'Rachel',
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

    function getUniqueCharacters(script: ScriptElement[]): CharacterInfo[] {
        const seen = new Set<string>();
        const result: CharacterInfo[] = [];

        for (const item of script) {
            if (
                item.type === 'line' &&
                item.character &&
                item.voiceId &&
                item.voiceName &&
                item.role
            ) {
                if (!seen.has(item.character)) {
                    seen.add(item.character);
                    result.push({
                        character: item.character,
                        voiceId: item.voiceId,
                        voiceName: item.voiceName,
                        role: item.role,
                    });
                }
            }
        }

        return result;
    }

    return (
        <Layout>
            <LogoutButton />
            {parsedData ? (
                <div className="h-screen bg-gray-50 flex overflow-hidden">
                    {/* Left sidebar for role select */}
                    <div className="w-80 h-screen overflow-y-auto p-6 pb-15 bg-white border-r border-gray-200">
                        <div className="space-y-6">
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
                                        {allCharacters.map(({ character, role, voiceName }) => {
                                            const isUser = role === 'user';

                                            return (
                                                <div key={character} className="space-y-1">
                                                    <button
                                                        onClick={() => {
                                                            const newRole = isUser ? 'scene-partner' : 'user';

                                                            updateCharacterRole(character, newRole);

                                                            setAllCharacters((prev) =>
                                                                prev.map((charInfo) =>
                                                                    charInfo.character === character
                                                                        ? { ...charInfo, role: newRole }
                                                                        : charInfo
                                                                )
                                                            );
                                                        }}
                                                        className={`w-full px-4 py-2 rounded-full border text-sm font-medium text-left transition ${isUser
                                                            ? 'bg-green-100 border-green-300 text-green-800'
                                                            : 'bg-blue-100 border-blue-300 text-blue-800'
                                                            }`}
                                                    >
                                                        {character}
                                                    </button>
                                                    {!isUser && (
                                                        selectedCharacter === character ? (
                                                            <div className="mt-4 border rounded-lg p-4 bg-gray-50">
                                                                <div className="flex justify-between items-center mb-2">
                                                                    <button
                                                                        onClick={() => setSelectedCharacter(null)}
                                                                        className="text-xs text-gray-500 hover:text-gray-700"
                                                                    >
                                                                        ❌ Close
                                                                    </button>
                                                                </div>
                                                                <VoiceLibrary
                                                                    samples={voiceSamples}
                                                                    selectedVoiceId={
                                                                        allCharacters.find((char) => char.character === character)?.voiceId ?? null
                                                                    }
                                                                    onSelectVoice={(voiceId, voiceName) => {
                                                                        setAllCharacters((prev) =>
                                                                            prev.map((charInfo) =>
                                                                                charInfo.character === character
                                                                                    ? { ...charInfo, voiceId, voiceName }
                                                                                    : charInfo
                                                                            )
                                                                        );
                                                                        setSelectedCharacter(null);
                                                                    }}
                                                                    onClose={() => setSelectedCharacter(null)}
                                                                />
                                                            </div>
                                                        ) : (
                                                            <div className="ml-2 text-sm text-gray-600 flex items-center gap-2">
                                                                <span>
                                                                    Played by
                                                                </span>
                                                                <button
                                                                    onClick={() => setSelectedCharacter(character)}
                                                                    className="px-4 py-2 rounded-full border text-xs font-medium text-left transition bg-blue-100 border-blue-300 text-blue-800"
                                                                    title="Change voice"
                                                                >
                                                                    <span>
                                                                        {voiceName}
                                                                    </span>
                                                                </button>
                                                            </div>
                                                        )
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Main content area - centered */}
                    <div className="flex-1 flex justify-center h-screen overflow-y-auto py-6 px-6 bg-gray-50">
                        <div className="w-full max-w-4xl px-6">
                            <ParsedOutput data={parsedData} />
                        </div>
                    </div>
                </div>
            ) : (
                <UploadForm
                    onParsed={(rawScript: ScriptElement[]) => {
                        const initialized = assignCharacterDefaults(rawScript);
                        setAllCharacters(getUniqueCharacters(initialized));
                        setParsedData(initialized);
                    }}
                />
            )}
        </Layout>
    );
}