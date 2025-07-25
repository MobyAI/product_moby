'use client';

import { useEffect, useState, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { useHumeTTS, useElevenTTS } from '@/lib/api/tts';
import { useGoogleSTT } from '@/lib/google/speechToText';
import { useDeepgramSTT } from '@/lib/deepgram/speechToText';
import type { ScriptElement } from '@/types/script';
import { loadScript } from './loader';
import { restoreSession, saveSession } from './session';
import Deepgram from './deepgram';
import GoogleSTT from './google';
import { clear } from 'idb-keyval';

export default function RehearsalRoomPage() {
    const searchParams = useSearchParams();
    const userID = searchParams.get('userID');
    const scriptID = searchParams.get('scriptID');
    const advanceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    if (!userID || !scriptID) {
        console.log('no user or script id: ', userID, scriptID);
    }

    // Page setup
    const [loading, setLoading] = useState(false);
    const [loadStage, setLoadStage] = useState<string | null>(null);
    const [script, setScript] = useState<ScriptElement[] | null>(null);
    const [sttProvider, setSttProvider] = useState<'google' | 'deepgram'>('deepgram');

    // Rehearsal flow
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isWaitingForUser, setIsWaitingForUser] = useState(false);
    const [spokenWordMap, setSpokenWordMap] = useState<Record<number, number>>({});

    // Error handling
    const [storageError, setStorageError] = useState(false);
    const [embeddingError, setEmbeddingError] = useState(false);
    const [embeddingFailedLines, setEmbeddingFailedLines] = useState<number[]>([]);
    const [ttsLoadError, setTTSLoadError] = useState(false);
    const [ttsFailedLines, setTTSFailedLines] = useState<number[]>([]);

    useEffect(() => {
        if (!userID || !scriptID) return;

        const init = async () => {
            setLoading(true);
            await loadScript({
                userID,
                scriptID,
                setLoadStage,
                setScript,
                setStorageError,
                setEmbeddingError,
                setEmbeddingFailedLines,
                setTTSLoadError,
                setTTSFailedLines,
            });
            const restored = await restoreSession(scriptID);
            if (restored) {
                setCurrentIndex(restored.index ?? 0);
                setSpokenWordMap(restored.spokenWordMap ?? {});
            }
            setLoadStage('✅ Ready!');
            setLoading(false);
        };

        init();
    }, [userID, scriptID]);

    useEffect(() => {
        if (!scriptID) return;

        const timeout = setTimeout(() => {
            saveSession(scriptID, { index: currentIndex, spokenWordMap });
        }, 1000);

        return () => clearTimeout(timeout);
    }, [currentIndex, scriptID]);

    const retryLoadScript = async () => {
        if (!userID || !scriptID) return;

        await loadScript({
            userID,
            scriptID,
            setLoadStage,
            setScript,
            setStorageError,
            setEmbeddingError,
            setEmbeddingFailedLines,
            setTTSLoadError,
            setTTSFailedLines,
        });
    };

    // Handle script flow
    const current = script?.find((el) => el.index === currentIndex) ?? null;

    const prepareUserLine = (line: ScriptElement | undefined | null) => {
        if (line?.type === 'line' && line.role === 'user' && typeof line.text === 'string') {
            setCurrentLineText(line.text);
        }
    };

    useEffect(() => {
        if (!current || !isPlaying || isWaitingForUser) return;

        switch (current.type) {
            case 'scene':
            case 'direction':
                console.log(`[${current.type.toUpperCase()}]`, current.text);
                autoAdvance(2000);
                break;

            case 'line':
                if (current.role === 'user') {
                    console.log(`[USER LINE]`, current.text);
                    setIsWaitingForUser(true);
                }
                break;
        }
    }, [current, currentIndex, isPlaying, isWaitingForUser]);

    useEffect(() => {
        if (
            !current ||
            !isPlaying ||
            isWaitingForUser ||
            current.type !== 'line' ||
            current.role !== 'scene-partner' ||
            !current.ttsUrl
        ) {
            return;
        }

        const audio = new Audio(current.ttsUrl);
        console.log(`[SCENE PARTNER LINE]`, current.text);

        audio.play().catch((err) => {
            console.warn('⚠️ Failed to play TTS audio', err);
            autoAdvance(1000);
        });

        audio.onended = () => {
            autoAdvance(250);
        };

        return () => {
            audio.pause();
            audio.src = '';
        };
    }, [current, isPlaying, isWaitingForUser]);

    useEffect(() => {
        if (
            current?.type === 'line' &&
            current?.role === 'user' &&
            isPlaying &&
            !isWaitingForUser
        ) {
            startSTT();
        }
    }, [current, isPlaying, isWaitingForUser]);

    const autoAdvance = (delay = 1000) => {
        if (advanceTimeoutRef.current) clearTimeout(advanceTimeoutRef.current);

        advanceTimeoutRef.current = setTimeout(() => {
            const nextIndex = currentIndex + 1;
            const endOfScript = nextIndex >= (script?.length ?? 0);

            if (endOfScript) {
                console.log('🎬 Rehearsal complete — cleaning up STT');
                cleanupSTT();
                setIsPlaying(false);
                return;
            }

            const nextLine = script?.find((el) => el.index === nextIndex);
            prepareUserLine(nextLine);

            setCurrentIndex(nextIndex);
            advanceTimeoutRef.current = null;
        }, delay);
    };

    const handlePlay = async () => {
        await initializeSTT();
        const currentLine = script?.find(el => el.index === currentIndex);
        prepareUserLine(currentLine);
        setIsPlaying(true);
    };

    const handlePause = () => {
        setIsPlaying(false);
        setIsWaitingForUser(false);
        pauseSTT();

        if (advanceTimeoutRef.current) {
            clearTimeout(advanceTimeoutRef.current);
            advanceTimeoutRef.current = null;
        }
    };

    const handleNext = () => {
        setIsPlaying(false);
        setIsWaitingForUser(false);
        setCurrentIndex((i) => {
            const nextIndex = Math.min(i + 1, (script?.length ?? 1) - 1);
            const nextLine = script?.find((el) => el.index === nextIndex);
            prepareUserLine(nextLine);
            return nextIndex;
        });
    };

    const handlePrev = () => {
        setIsPlaying(false);
        setIsWaitingForUser(false);
        setCurrentIndex((i) => {
            const prevIndex = Math.max(i - 1, 0);
            const prevLine = script?.find((el) => el.index === prevIndex);
            setSpokenWordMap((prevMap) => {
                const newMap = { ...prevMap };
                delete newMap[prevIndex];
                return newMap;
            });
            prepareUserLine(prevLine);
            return prevIndex;
        });
    };

    const handleRestart = () => {
        setIsPlaying(false);
        setIsWaitingForUser(false);
        cleanupSTT();
        setCurrentIndex(0);
        setSpokenWordMap({});
        prepareUserLine(script?.find(el => el.index === 0));
    };

    const onUserLineMatched = () => {
        setIsWaitingForUser(false);

        setCurrentIndex((i) => {
            const nextIndex = i + 1;
            const endOfScript = nextIndex >= (script?.length ?? 0);

            if (endOfScript) {
                console.log('🎬 User finished final line — cleaning up STT');
                cleanupSTT();
                setIsPlaying(false);
                return i;
            }

            const nextLine = script?.find(el => el.index === nextIndex);
            prepareUserLine(nextLine);

            return nextIndex;
        });
    };

    // STT functions import
    function useSTT({
        provider,
        lineEndKeywords,
        expectedEmbedding,
        onCueDetected,
        onSilenceTimeout,
        onProgressUpdate,
    }: {
        provider: 'google' | 'deepgram';
        lineEndKeywords: string[];
        expectedEmbedding: number[];
        onCueDetected: () => void;
        onSilenceTimeout: () => void;
        onProgressUpdate?: (matchedCount: number) => void;
    }) {
        const google = useGoogleSTT({
            lineEndKeywords,
            expectedEmbedding,
            onCueDetected,
            onSilenceTimeout,
            onProgressUpdate,
        });

        const deepgram = useDeepgramSTT({
            lineEndKeywords,
            expectedEmbedding,
            onCueDetected,
            onSilenceTimeout,
            onProgressUpdate,
        });

        return provider === 'google' ? google : deepgram;
    }

    const {
        initializeSTT,
        startSTT,
        pauseSTT,
        cleanupSTT,
        setCurrentLineText,
    } = useSTT({
        provider: sttProvider,
        lineEndKeywords: current?.lineEndKeywords ?? [],
        expectedEmbedding: current?.expectedEmbedding ?? [],
        onCueDetected: onUserLineMatched,
        onSilenceTimeout: () => {
            console.log('⏱️ Timeout reached');
            setIsWaitingForUser(false);
        },
        onProgressUpdate: (count) => {
            if (current?.type === 'line' && current.role === 'user') {
                setSpokenWordMap(prev => ({ ...prev, [current.index]: count }));
            }
        },
    });

    // Google useSTT
    // const {
    //     initializeSTT,
    //     startSTT,
    //     pauseSTT,
    //     cleanupSTT,
    //     setCurrentLineText,
    // } = useGoogleSTT({
    //     lineEndKeywords: current?.lineEndKeywords ?? [],
    //     expectedEmbedding: current?.expectedEmbedding ?? [],
    //     onCueDetected: onUserLineMatched,
    //     onSilenceTimeout: () => {
    //         console.log('⏱️ Timeout reached');
    //         setIsWaitingForUser(false);
    //     },
    //     onProgressUpdate: setSpokenWordCount,
    // });

    // Deepgram useSTT
    // const {
    //     initializeSTT,
    //     startSTT,
    //     pauseSTT,
    //     cleanupSTT,
    // } = useDeepgramSTT({
    //     lineEndKeywords: current?.lineEndKeywords ?? [],
    //     expectedEmbedding: current?.expectedEmbedding ?? [],
    //     onCueDetected: onUserLineMatched,
    //     onSilenceTimeout: () => {
    //         console.log('⏱️ Timeout reached');
    //         setIsWaitingForUser(false);
    //     },
    // });

    useEffect(() => {
        const handleUnload = () => {
            cleanupSTT();
            console.log('🧹 STT cleaned up on unload');
        };

        window.addEventListener('beforeunload', handleUnload);

        return () => {
            cleanupSTT();
            window.removeEventListener('beforeunload', handleUnload);
            console.log('🧹 STT cleaned up on unmount');
        };
    }, []);

    // Testing TTS audio manually
    const loadElevenTTS = async ({
        text,
        voiceId = 'JBFqnCBsd6RMkjVDRZzb',
        stability = 0.3,
        similarityBoost = 0.8,
    }: {
        text: string;
        voiceId?: string;
        stability?: number;
        similarityBoost?: number;
    }) => {
        try {
            const blob = await useElevenTTS({
                text,
                voiceId,
                voiceSettings: {
                    stability,
                    similarityBoost,
                },
            });

            const url = URL.createObjectURL(blob);
            const audio = new Audio(url);
            await audio.play();

            audio.onended = () => {
                URL.revokeObjectURL(url);
            };
        } catch (err) {
            console.error('❌ Failed to load or play TTS audio:', err);
        }
    };

    const loadHumeTTS = async ({
        text,
        voiceId,
        voiceDescription,
        contextUtterance,
    }: {
        text: string;
        voiceId: string;
        voiceDescription: string;
        contextUtterance?: {
            text: string;
            description: string;
        }[];
    }) => {
        try {
            const blob = await useHumeTTS({
                text,
                voiceId,
                voiceDescription,
                contextUtterance,
            });

            const url = URL.createObjectURL(blob);

            const audio = new Audio(url);
            await audio.play();

            audio.onended = () => {
                URL.revokeObjectURL(url);
            };
        } catch (err) {
            console.error('❌ Failed to load or play Hume TTS audio:', err);
        }
    };

    if (loading) {
        return (
            <div className="p-6">
                <h1 className="text-xl font-bold">🎭 Rehearsal Room</h1>
                {loadStage && (
                    <div className="text-sm text-gray-600 italic">
                        {loadStage}
                    </div>
                )}
            </div>
        );
    };

    if (ttsLoadError || embeddingError) {
        return (
            <div className="p-6 text-red-600">
                <h1 className="text-xl font-bold">❌ Script Loading Failed</h1>
                <p className="mt-2">Some parts of the script could not be hydrated.</p>
                {ttsFailedLines.length > 0 && (
                    <p>Failed TTS lines: {ttsFailedLines.join(', ')}</p>
                )}
                {embeddingFailedLines.length > 0 && (
                    <p>Failed embedding lines: {embeddingFailedLines.join(', ')}</p>
                )}
                <button onClick={retryLoadScript} className="mt-4 px-4 py-2 bg-blue-500 text-white rounded">
                    🔄 Retry Loading
                </button>
            </div>
        );
    }

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
            {storageError && (
                <div className="mt-4">
                    <p className="text-red-600">🚫 Not enough space to store rehearsal data.</p>
                    <button
                        onClick={async () => {
                            await clear();
                            setStorageError(false);
                            await retryLoadScript();
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
                        {current.type === 'line' && (
                            <p className="text-green-600 text-xl font-bold mt-2">
                                {current.role === 'user'
                                    ? 'User Reading'
                                    : current.role === 'scene-partner'
                                        ? 'Scene Partner Speaking'
                                        : current.role}
                            </p>
                        )}
                        {current.type === 'line' && current.role === 'user' ? (
                            <p className="text-xl mt-2">
                                {current.text.split(/\s+/).map((word, i) => {
                                    const matched = spokenWordMap[current.index] ?? 0;
                                    return (
                                        <span
                                            key={i}
                                            className={i < matched ? 'font-bold' : 'text-gray-800'}
                                        >
                                            {word + ' '}
                                        </span>
                                    );
                                })}
                            </p>
                        ) : (
                            <p className="text-xl mt-2">{current.text}</p>
                        )}
                        {current.type === 'line' && current.character && (
                            <p className="text-sm text-gray-500">– {current.character} ({current.tone})</p>
                        )}
                    </div>
                ) : (
                    <p>🎉 End of script!</p>
                )}
                {
                    current?.type === 'line' && (
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

                                    loadElevenTTS({
                                        text: current.text,
                                        voiceId:
                                            current.gender === 'male'
                                                ? 's3TPKV1kjDlVtZbl4Ksh'
                                                : '56AoDkrOh6qfVPDXZ7Pt',
                                    });
                                }}
                            >
                                🔊 Eleven TTS
                            </button>
                            <br />
                            <button
                                onClick={() => {
                                    const voiceId =
                                        current.gender === 'male'
                                            ? '89989d92-1de8-4e5d-97e4-23cd363e9788'
                                            : current.gender === 'female'
                                                ? '5bbc32c1-a1f6-44e8-bedb-9870f23619e2'
                                                : 'c5be03fa-09cc-4fc3-8852-7f5a32b5606c'

                                    loadHumeTTS({
                                        text: current.text,
                                        voiceId: voiceId,
                                        voiceDescription: current.actingInstructions ?? '',
                                    });
                                }}
                            >
                                🔊 Hume TTS
                            </button>
                        </>
                    )
                }
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
                            {sttProvider === 'google' ? (
                                <GoogleSTT
                                    character={current.character}
                                    text={current.text}
                                    expectedEmbedding={current.expectedEmbedding}
                                    start={startSTT}
                                    stop={pauseSTT}
                                />
                            ) : (
                                <Deepgram
                                    character={current.character}
                                    text={current.text}
                                    expectedEmbedding={current.expectedEmbedding}
                                    start={startSTT}
                                    stop={pauseSTT}
                                />
                            )}
                        </>
                    )
                }
            </div>
        </div>
    );
}