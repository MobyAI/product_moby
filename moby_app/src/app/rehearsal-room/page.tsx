'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { fetchScriptByID } from '@/lib/api/dbFunctions/scripts';
import { fetchEmbedding, addEmbeddingsToScript } from '@/lib/api/embed';
import { useTextToSpeech } from '@/lib/api/textToSpeech';
import type { ScriptElement } from '@/types/script';
import Deepgram from './deepgram';
import GoogleSTT from './google';
import { get, set, clear } from 'idb-keyval';

export default function RehearsalRoomPage() {
    const searchParams = useSearchParams();
    const userID = searchParams.get('userID');
    const scriptID = searchParams.get('scriptID');

    if (!userID || !scriptID) {
        console.log('no user or script id: ', userID, scriptID);
    }

    const [loading, setLoading] = useState(false);
    const [script, setScript] = useState<ScriptElement[] | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isWaitingForUser, setIsWaitingForUser] = useState(false);
    const [storageError, setStorageError] = useState(false);
    const [embeddingError, setEmbeddingError] = useState(false);
    const [sttProvider, setSttProvider] = useState<'google' | 'deepgram'>('google');

    // Session storage to track current index
    const storageKey = `rehearsal-cache:${scriptID}:index`;

    const [currentIndex, setCurrentIndex] = useState(() => {
        if (typeof window !== 'undefined') {
            const saved = sessionStorage.getItem(storageKey);
            return saved ? parseInt(saved, 10) : 0;
        }
        return 0;
    });

    // Stability check before storing current index
    useEffect(() => {
        const timeout = setTimeout(() => {
            sessionStorage.setItem(storageKey, currentIndex.toString());
        }, 300);

        return () => clearTimeout(timeout);
    }, [currentIndex, scriptID]);

    // Manual embedding storage
    // const [expectedEmbedding, setExpectedEmbedding] = useState<number[] | null>(null);

    // Fetch script
    const loadScript = async () => {
        if (!userID || !scriptID) return;

        setLoading(true);
        setEmbeddingError(false);
        const cacheKey = `script-cache:${userID}:${scriptID}`;

        try {
            const cached = await get(cacheKey);

            if (cached) {
                console.log('📦 Loaded script from IndexedDB cache');
                setScript(cached);
            } else {
                console.log('🌐 Fetching script from API');
                const data = await fetchScriptByID(userID, scriptID);
                const script = data.script;

                // Embed all user lines
                let embedded: any[];
                try {
                    embedded = await addEmbeddingsToScript(script);
                } catch (embedErr) {
                    console.error('❌ Failed to embed script:', embedErr);
                    setEmbeddingError(true);
                    return;
                }

                // Try storing
                try {
                    await set(cacheKey, embedded);
                    console.log('💾 Script cached successfully');
                } catch (err) {
                    console.warn('⚠️ Failed to store script in IndexedDB:', err);
                    if (isQuotaExceeded(err)) {
                        setStorageError(true);
                    }
                }

                setScript(embedded);
            }
        } catch (err) {
            console.error('❌ Error loading script:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadScript();
    }, [userID, scriptID]);

    // Current script element
    const current = script?.find((el) => el.index === currentIndex) ?? null;

    // Handle script flow
    useEffect(() => {
        if (!isPlaying || isWaitingForUser || !current) return;

        if (current.type === 'scene' || current.type === 'direction') {
            console.log(`[${current.type.toUpperCase()}]`, current.text);
            autoAdvance(1500);
        }

        if (current.type === 'line') {
            if (current.role === 'scene-partner') {
                console.log(`[SCENE PARTNER LINE]`, current.text);
                autoAdvance(1500);
            } else if (current.role === 'user') {
                console.log(`[USER LINE]`, current.text);
                setIsWaitingForUser(true);
            }
        }
    }, [currentIndex, isPlaying, isWaitingForUser, current]);

    const autoAdvance = (delay = 1000) => {
        setTimeout(() => {
            setCurrentIndex((i) => Math.min(i + 1, (script?.length ?? 1) - 1));
        }, delay);
    };

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleNext = () => setCurrentIndex((i) => Math.min(i + 1, (script?.length ?? 1) - 1));
    const handlePrev = () => setCurrentIndex((i) => Math.max(i - 1, 0));
    const handleRestart = () => setCurrentIndex(0);
    const onUserLineMatched = () => {
        setIsWaitingForUser(false);
        setCurrentIndex((i) => Math.min(i + 1, (script?.length ?? 1) - 1));
    };

    // Manual Embedding
    // const handleEmbedCurrentLine = async (current: { type: string; text: string }) => {
    //     if (current?.type !== "line") {
    //         console.log("🟡 Current item is not a line.");
    //         return;
    //     }

    //     const expectedLine = current.text;
    //     const embedding = await fetchEmbedding(expectedLine);

    //     if (embedding) {
    //         console.log("📐 Embedding for current line:", embedding);
    //         setExpectedEmbedding(embedding);
    //     } else {
    //         console.error("❌ Failed to fetch embedding for:", expectedLine);
    //     }
    // };

    const loadTTS = async (text: string, voiceId: string) => {
        try {
            const blob = await useTextToSpeech({ text, voiceId });

            const url = URL.createObjectURL(blob);
            const audio = new Audio(url);
            audio.play();
        } catch (err) {
            console.error('❌ Failed to fetch TTS:', err);
        }
    };

    const isQuotaExceeded = (error: any) => {
        return (
            error &&
            (error.name === 'QuotaExceededError' ||
                error.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
                error.message?.includes('maximum size'))
        );
    };

    if (loading) {
        return (
            <div className="p-6">
                <h1 className="text-xl font-bold">🎭 Rehearsal Room</h1>
                <p className="text-gray-500">Loading script...</p>
            </div>
        );
    };

    if (!script) {
        return (
            <div className="p-6">
                <h1 className="text-xl font-bold">🎭 Rehearsal Room</h1>
                <p className="text-gray-500">Select a script from db</p>
            </div>
        );
    };

    return (
        <div className="p-6 space-y-4">
            <h1 className="text-2xl font-bold">🎭 Rehearsal Room</h1>
            {embeddingError && (
                <div className="mt-4 text-red-600">
                    Failed to embed all lines. Some lines may be missing expected match behavior.
                    <br />
                    <button
                        className="mt-2 px-4 py-2 bg-red-600 text-white rounded"
                        onClick={() => window.location.reload()}
                    >
                        🔁 Retry Embedding All Lines
                    </button>
                </div>
            )}
            {storageError && (
                <div className="mt-4">
                    <p className="text-red-600">🚫 Not enough space to store rehearsal data.</p>
                    <button
                        onClick={async () => {
                            await clear();
                            setStorageError(false);
                            window.location.reload();
                        }}
                        className="mt-2 px-4 py-2 bg-red-600 text-white rounded"
                    >
                        Clear Local Storage & Retry
                    </button>
                </div>
            )}
            <div className="border p-4 rounded bg-gray-100 min-h-[120px]">
                {current ? (
                    <div>
                        <p className="text-gray-600 text-sm">#{current.index} — {current.type}</p>
                        <p className="text-xl mt-2">{current.text}</p>
                        {current.type === 'line' && current.character && (
                            <p className="text-sm text-gray-500">– {current.character} ({current.tone})</p>
                        )}
                    </div>
                ) : (
                    <p>🎉 End of script!</p>
                )}
            </div>
            <div className="flex items-center gap-4">
                <button onClick={handlePlay} className="px-4 py-2 bg-green-600 text-white rounded">Play</button>
                <button onClick={handlePause} className="px-4 py-2 bg-yellow-500 text-white rounded">Pause</button>
                <button onClick={handlePrev} className="px-4 py-2 bg-blue-500 text-white rounded">Back</button>
                <button onClick={handleNext} className="px-4 py-2 bg-blue-500 text-white rounded">Next</button>
                {currentIndex != 0 &&
                    <button onClick={handleRestart} className="px-4 py-2 bg-red-500 text-white rounded">Restart</button>
                }
            </div>
            <div>
                {
                    current?.type === 'line' &&
                    current?.role === 'user' &&
                    typeof current.character === 'string' &&
                    typeof current.text === 'string' &&
                    Array.isArray(current.lineEndKeywords) &&
                    Array.isArray(current.expectedEmbedding) && (
                        <>
                            <button
                                onClick={() => {
                                    const tonePrefix =
                                        typeof current.tone === 'string' && current.tone.trim().length > 0
                                            ? current.tone
                                                .trim()
                                                .split(/\s+/)
                                                .map((t) => `[${t}]`)
                                                .join(' ') + ' '
                                            : '';

                                    const textWithTone = tonePrefix + current.text;
                                    loadTTS(textWithTone, 'JBFqnCBsd6RMkjVDRZzb');
                                }}
                            >
                                🔊 Play TTS Audio
                            </button>
                            <br />
                            <br />
                            {/* <button onClick={() => handleEmbedCurrentLine(current)}>
                                🔍 Get Embedding
                            </button> */}
                            <div className="flex items-center gap-4 mb-4">
                                <label className="text-sm font-medium">STT Provider:</label>
                                <div className="flex border rounded overflow-hidden">
                                    <button
                                        onClick={() => setSttProvider('google')}
                                        className={`px-4 py-1 text-sm ${sttProvider === 'google' ? 'bg-green-600 text-white' : 'bg-white text-gray-600'}`}
                                    >
                                        Google
                                    </button>
                                    <button
                                        onClick={() => setSttProvider('deepgram')}
                                        className={`px-4 py-1 text-sm ${sttProvider === 'deepgram' ? 'bg-green-600 text-white' : 'bg-white text-gray-600'}`}
                                    >
                                        Deepgram
                                    </button>
                                </div>
                            </div>
                            {sttProvider === 'google' ? (
                                <GoogleSTT
                                    character={current.character}
                                    text={current.text}
                                    lineEndKeywords={current.lineEndKeywords}
                                    onLineMatched={onUserLineMatched}
                                    expectedEmbedding={current.expectedEmbedding}
                                />
                            ) : (
                                <Deepgram
                                    character={current.character}
                                    text={current.text}
                                    lineEndKeywords={current.lineEndKeywords}
                                    onLineMatched={onUserLineMatched}
                                    expectedEmbedding={current.expectedEmbedding}
                                />
                            )}
                        </>
                    )
                }
            </div>
        </div>
    );
}