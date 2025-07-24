'use client';

import { useEffect, useState, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { fetchScriptByID } from '@/lib/api/dbFunctions/scripts';
import { addEmbedding } from '@/lib/api/embed';
import { addTTS, useHumeTTS, useElevenTTS } from '@/lib/api/tts';
import { useGoogleSTT } from '@/lib/google/speechToText';
import { useDeepgramSTT } from '@/lib/deepgram/speechToText';
import type { ScriptElement } from '@/types/script';
import Deepgram from './deepgram';
import GoogleSTT from './google';
import { get, set, clear } from 'idb-keyval';
import pLimit from 'p-limit';

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
    const [sttProvider, setSttProvider] = useState<'google' | 'deepgram'>('google');

    // Rehearsal flow
    const [isPlaying, setIsPlaying] = useState(false);
    const [isWaitingForUser, setIsWaitingForUser] = useState(false);

    // Error handling
    const [storageError, setStorageError] = useState(false);
    const [embeddingError, setEmbeddingError] = useState(false);
    const [embeddingFailedLines, setEmbeddingFailedLines] = useState<number[]>([]);
    const [ttsLoadError, setTTSLoadError] = useState(false);
    const [ttsFailedLines, setTTSFailedLines] = useState<number[]>([]);

    // Track current index in session storage
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

    // Fetch script
    const loadScript = async () => {
        if (!userID || !scriptID) return;

        const start = performance.now();

        // IndexedDB key
        const scriptCacheKey = `script-cache:${userID}:${scriptID}`;

        // Concurrent request limit
        const limit = pLimit(3);

        // Reset error states
        setLoading(true);
        setStorageError(false);
        setEmbeddingError(false);
        setEmbeddingFailedLines([]);
        setTTSLoadError(false);
        setTTSFailedLines([]);

        try {
            setLoadStage('🔍 Checking local cache...');
            const cached = await get(scriptCacheKey);

            if (cached) {
                // Check if all TTS audio urls are in cache
                const unhydratedTTSLines = cached
                    .filter((element: ScriptElement) =>
                        element.type === 'line' &&
                        element.role === 'scene-partner' &&
                        (typeof element.ttsUrl !== 'string' || element.ttsUrl.length === 0)
                    )
                    .map((element: ScriptElement) => element.index);


                // Check if all embeddings are in cache
                const unhydratedEmbeddingLines = cached
                    .filter((element: ScriptElement) =>
                        element.type === 'line' &&
                        element.role === 'user' &&
                        (!Array.isArray(element.expectedEmbedding) || element.expectedEmbedding.length === 0)
                    )
                    .map((element: ScriptElement) => element.index);


                // If missing, attempt to add to cache
                if (unhydratedTTSLines.length > 0 || unhydratedEmbeddingLines.length > 0) {
                    let hydrated = cached;

                    if (unhydratedTTSLines.length > 0) {
                        setLoadStage('🔁 Hydrating TTS URLs from storage...');
                        const ttsFailedIndexes: number[] = [];
                        const unhydratedIndexes = new Set(unhydratedTTSLines);

                        const updated: ScriptElement[] = await Promise.all(
                            hydrated.map((element: ScriptElement) =>
                                limit(async () => {
                                    if (
                                        element.type === 'line' &&
                                        element.role === 'scene-partner' &&
                                        unhydratedIndexes.has(element.index)
                                    ) {
                                        try {
                                            const updatedElement = await addTTS(element, hydrated, userID, scriptID);
                                            return updatedElement;
                                        } catch (err) {
                                            console.warn(`❌ addTTS failed for line ${element.index}`, err);
                                            ttsFailedIndexes.push(element.index);
                                            return element;
                                        }
                                    } else {
                                        return element;
                                    }
                                })
                            )
                        );

                        // Update hydrated
                        hydrated = updated;

                        // Retry
                        if (ttsFailedIndexes.length > 0) {
                            console.log('🔁 Retrying failed TTS hydration lines...');
                            const retryFailed: number[] = [];
                            const retryIndexes = new Set(ttsFailedIndexes);

                            const retried: ScriptElement[] = await Promise.all(
                                hydrated.map((element: ScriptElement) =>
                                    limit(async () => {
                                        if (
                                            element.type === 'line' &&
                                            element.role === 'scene-partner' &&
                                            retryIndexes.has(element.index)
                                        ) {
                                            try {
                                                const updatedElement = await addTTS(element, hydrated, userID, scriptID);
                                                return updatedElement;
                                            } catch (err) {
                                                console.warn(`❌ Retry failed for TTS line ${element.index}`, err);
                                                retryFailed.push(element.index);
                                                return element;
                                            }
                                        } else {
                                            return element;
                                        }
                                    })
                                )
                            );

                            hydrated = retried;

                            if (retryFailed.length > 0) {
                                console.log('❌ Retry still failed for some TTS lines');
                                setTTSLoadError(true);
                                setTTSFailedLines(retryFailed);
                            }
                        }
                    }

                    if (unhydratedEmbeddingLines.length > 0) {
                        setLoadStage('🔁 Hydrating embeddings from storage...');
                        const embeddingFailedIndexes: number[] = [];
                        const unhydratedIndexes = new Set(unhydratedEmbeddingLines);

                        const updated: ScriptElement[] = await Promise.all(
                            hydrated.map((element: ScriptElement) =>
                                limit(async () => {
                                    if (
                                        element.type === 'line' &&
                                        element.role === 'user' &&
                                        unhydratedIndexes.has(element.index)
                                    ) {
                                        try {
                                            const updatedElement = await addEmbedding(element, userID, scriptID);
                                            return updatedElement;
                                        } catch (err) {
                                            console.warn(`❌ addEmbedding failed for line ${element.index}`, err);
                                            embeddingFailedIndexes.push(element.index);
                                            return element;
                                        }
                                    } else {
                                        return element;
                                    }
                                })
                            )
                        );

                        hydrated = updated;

                        // Retry
                        if (embeddingFailedIndexes.length > 0) {
                            console.log('🔁 Retrying failed embedding hydration lines...');
                            const retryFailed: number[] = [];
                            const retryIndexes = new Set(embeddingFailedIndexes);

                            const retried: ScriptElement[] = await Promise.all(
                                hydrated.map((element: ScriptElement) =>
                                    limit(async () => {
                                        if (
                                            element.type === 'line' &&
                                            element.role === 'user' &&
                                            retryIndexes.has(element.index)
                                        ) {
                                            try {
                                                const updatedElement = await addEmbedding(element, userID, scriptID);
                                                return updatedElement;
                                            } catch (err) {
                                                console.warn(`❌ Retry failed for embedding line ${element.index}`, err);
                                                retryFailed.push(element.index);
                                                return element;
                                            }
                                        } else {
                                            return element;
                                        }
                                    })
                                )
                            );

                            hydrated = retried;

                            if (retryFailed.length > 0) {
                                console.log('❌ Retry still failed for some embeddings');
                                setEmbeddingError(true);
                                setEmbeddingFailedLines(retryFailed);
                            }
                        }
                    }

                    // Attempt to cache
                    setLoadStage('💾 Caching to IndexedDB...');
                    try {
                        await set(scriptCacheKey, hydrated);
                        console.log('💾 Script cached successfully');
                    } catch (err) {
                        console.warn('⚠️ Failed to store script in IndexedDB:', err);
                        if (isQuotaExceeded(err)) {
                            setStorageError(true);
                        }
                    }

                    setLoadStage('✅ Loaded and hydrated script from cache');
                    console.log('📦 Loaded and hydrated script from cache');
                    setScript(hydrated);
                    const end = performance.now();
                    console.log(`⏱️ Script loaded from cache in ${(end - start).toFixed(2)} ms`);
                    return;
                }

                setLoadStage('✅ Loaded fully hydrated script from cache');
                console.log('📦 Loaded fully hydrated script from cache');
                setScript(cached);
                const end = performance.now();
                console.log(`⏱️ Script loaded from cache in ${(end - start).toFixed(2)} ms`);
                return;
            } else {
                setLoadStage('🌐 Fetching script from Firestore...');
                console.log('🌐 Fetching script from Firestore');
                const data = await fetchScriptByID(userID, scriptID);
                const script = data.script;

                // Embed all user lines
                setLoadStage('📐 Embedding lines...');
                let embedded: ScriptElement[];
                const embeddingFailedIndexes: number[] = [];

                embedded = await Promise.all(
                    script.map((element: ScriptElement) =>
                        limit(async () => {
                            if (element.type === 'line' && element.role === 'user') {
                                try {
                                    const updated = await addEmbedding(element, userID, scriptID);
                                    return updated;
                                } catch (err) {
                                    console.warn(`❌ addEmbedding failed for line ${element.index}`, err);
                                    embeddingFailedIndexes.push(element.index);
                                    return element;
                                }
                            }
                            return element;
                        })
                    )
                );

                // Retry
                if (embeddingFailedIndexes.length > 0) {
                    console.log('🔁 Retrying failed embedding lines...');
                    const retryFailed: number[] = [];
                    const retryIndexes = new Set(embeddingFailedIndexes);

                    embedded = await Promise.all(
                        embedded.map((element: ScriptElement) =>
                            limit(async () => {
                                if (
                                    element.type === 'line' &&
                                    element.role === 'user' &&
                                    retryIndexes.has(element.index)
                                ) {
                                    try {
                                        const updated = await addEmbedding(element, userID, scriptID);
                                        if (
                                            !Array.isArray(updated.expectedEmbedding) ||
                                            updated.expectedEmbedding.length === 0
                                        ) {
                                            retryFailed.push(element.index);
                                        }
                                        return updated;
                                    } catch (err) {
                                        console.warn(`❌ Retry failed for embedding line ${element.index}`, err);
                                        retryFailed.push(element.index);
                                        return element;
                                    }
                                }
                                return element;
                            })
                        )
                    );

                    if (retryFailed.length > 0) {
                        console.error('❌ Retry still failed for some embeddings');
                        setEmbeddingError(true);
                        setEmbeddingFailedLines(retryFailed);
                        return;
                    }
                }

                // Add TTS audio
                setLoadStage('🎤 Generating TTS...');
                let withTTS: ScriptElement[] = [];
                const ttsFailedIndexes: number[] = [];

                withTTS = await Promise.all(
                    embedded.map((element: ScriptElement) =>
                        limit(async () => {
                            if (element.type === 'line' && element.role === 'scene-partner') {
                                try {
                                    const updated = await addTTS(element, embedded, userID, scriptID);
                                    return updated;
                                } catch (err) {
                                    console.warn(`❌ addTTS failed for line ${element.index}`, err);
                                    ttsFailedIndexes.push(element.index);
                                    return element;
                                }
                            }
                            return element;
                        })
                    )
                );

                // Retry once if any failed
                if (ttsFailedIndexes.length > 0) {
                    console.log('🔁 Retrying failed TTS lines...');
                    const retryFailed: number[] = [];
                    const retryIndexes = new Set(ttsFailedIndexes);

                    withTTS = await Promise.all(
                        withTTS.map((element: ScriptElement) =>
                            limit(async () => {
                                if (
                                    element.type === 'line' &&
                                    element.role === 'scene-partner' &&
                                    retryIndexes.has(element.index)
                                ) {
                                    try {
                                        const updated = await addTTS(element, withTTS, userID, scriptID);
                                        return updated;
                                    } catch (err) {
                                        console.warn(`❌ Retry failed for TTS line ${element.index}`, err);
                                        retryFailed.push(element.index);
                                        return element;
                                    }
                                }
                                return element;
                            })
                        )
                    );

                    if (retryFailed.length > 0) {
                        console.error('❌ Retry still failed for some TTS lines');
                        setTTSLoadError(true);
                        setTTSFailedLines(retryFailed);
                    }
                }

                // Attempt to cache
                setLoadStage('💾 Caching to IndexedDB...');
                try {
                    await set(scriptCacheKey, withTTS);
                    console.log('💾 Script cached successfully');
                } catch (err) {
                    console.warn('⚠️ Failed to store script in IndexedDB:', err);
                    if (isQuotaExceeded(err)) {
                        setStorageError(true);
                    }
                }

                setLoadStage('✅ Script ready!');
                setScript(withTTS);
                const end = performance.now();
                console.log(`⏱️ Script loaded from cache in ${(end - start).toFixed(2)} ms`);
                return;
            }
        } catch (err) {
            // Display load error page
            console.error('❌ Error loading script:', err);
            setLoadStage('❌ Unexpected error loading script');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        setLoadStage(null);
        loadScript();
    }, [userID, scriptID]);

    const isQuotaExceeded = (error: any) => {
        return (
            error &&
            (error.name === 'QuotaExceededError' ||
                error.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
                error.message?.includes('maximum size'))
        );
    };

    // Handle script flow
    const current = script?.find((el) => el.index === currentIndex) ?? null;

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
            setCurrentIndex((i) => {
                const nextIndex = i + 1;
                const endOfScript = nextIndex >= (script?.length ?? 0);

                if (endOfScript) {
                    console.log('🎬 Rehearsal complete — cleaning up STT');
                    cleanupSTT();
                    setIsPlaying(false);
                    return i;
                }

                return nextIndex;
            });

            advanceTimeoutRef.current = null;
        }, delay);
    };

    const handlePlay = async () => {
        await initializeSTT();
        setIsPlaying(true);
    };
    const handlePause = () => {
        pauseSTT();
        setIsWaitingForUser(false);
        setIsPlaying(false);

        if (advanceTimeoutRef.current) {
            clearTimeout(advanceTimeoutRef.current);
            advanceTimeoutRef.current = null;
        }
    };
    const handleNext = () => {
        setIsWaitingForUser(false);
        setCurrentIndex((i) => Math.min(i + 1, (script?.length ?? 1) - 1));
        setIsPlaying(false);
    };
    const handlePrev = () => {
        setIsWaitingForUser(false);
        setCurrentIndex((i) => Math.max(i - 1, 0));
        setIsPlaying(false);
    };
    const handleRestart = () => {
        cleanupSTT();
        setIsWaitingForUser(false);
        setCurrentIndex(0);
        setIsPlaying(false);
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
    }: {
        provider: 'google' | 'deepgram';
        lineEndKeywords: string[];
        expectedEmbedding: number[];
        onCueDetected: () => void;
        onSilenceTimeout: () => void;
    }) {
        const google = useGoogleSTT({
            lineEndKeywords,
            expectedEmbedding,
            onCueDetected,
            onSilenceTimeout,
        });

        const deepgram = useDeepgramSTT({
            lineEndKeywords,
            expectedEmbedding,
            onCueDetected,
            onSilenceTimeout,
        });

        return provider === 'google' ? google : deepgram;
    }

    const {
        initializeSTT,
        startSTT,
        pauseSTT,
        cleanupSTT,
    } = useSTT({
        provider: sttProvider,
        lineEndKeywords: current?.lineEndKeywords ?? [],
        expectedEmbedding: current?.expectedEmbedding ?? [],
        onCueDetected: onUserLineMatched,
        onSilenceTimeout: () => {
            console.log('⏱️ Timeout reached');
            setIsWaitingForUser(false);
        },
    });

    // Google useSTT
    // const {
    //     initializeSTT,
    //     startSTT,
    //     pauseSTT,
    //     cleanupSTT,
    // } = useGoogleSTT({
    //     lineEndKeywords: current?.lineEndKeywords ?? [],
    //     expectedEmbedding: current?.expectedEmbedding ?? [],
    //     onCueDetected: onUserLineMatched,
    //     onSilenceTimeout: () => {
    //         console.log('⏱️ Timeout reached');
    //         setIsWaitingForUser(false);
    //     },
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
                <button onClick={loadScript} className="mt-4 px-4 py-2 bg-blue-500 text-white rounded">
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
                            await loadScript();
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
                        <p className="text-xl mt-2">{current.text}</p>
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
                            {/* <div className="flex items-center gap-4 mb-4">
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
                            </div> */}
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