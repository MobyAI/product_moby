'use client';

import { useEffect, useState, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { fetchScriptByID } from '@/lib/api/dbFunctions/scripts';
import { fetchEmbedding, addEmbeddingsToScript } from '@/lib/api/embed';
import { fetchEmbeddingUrl, uploadEmbeddingBlob } from '@/lib/api/dbFunctions/embeddings';
import { useHumeTTS, useHumeTTSBatch } from '@/lib/api/humeTTS';
import { useElevenTTS } from '@/lib/api/elevenTTS';
import { useGoogleTTS } from '@/lib/api/googleTTS';
import { useVogentTTS } from '@/lib/api/vogentTTS';
import { useGoogleSTT } from '@/lib/google/speechToText';
import { useDeepgramSTT } from '@/lib/deepgram/speechToText';
import { uploadTTSAudioBlob, fetchTTSAudioBlob, fetchTTSAudioUrl } from '@/lib/api/dbFunctions/audio/tts';
import type { ScriptElement } from '@/types/script';
import Deepgram from './deepgram';
import GoogleSTT from './google';
import { get, set, clear } from 'idb-keyval';

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

        // IndexedDB key
        const scriptCacheKey = `script-cache:${userID}:${scriptID}`;

        setLoading(true);
        setStorageError(false);
        setEmbeddingError(false);
        setTTSLoadError(false);
        setTTSFailedLines([]);

        // Hume TTS + Firebase Storage
        const addTTS = async (
            script: ScriptElement[],
            userID: string,
            scriptID: string
        ): Promise<[ScriptElement[], number[]]> => {
            const failedIndexes: number[] = [];
            const withTTS: ScriptElement[] = [];

            for (let i = 0; i < script.length; i++) {
                const element = script[i];

                if (element.type === 'line' && element.role === 'scene-partner') {
                    const voiceId =
                        element.gender === 'male'
                            ? 'c5be03fa-09cc-4fc3-8852-7f5a32b5606c'
                            : '5bbc32c1-a1f6-44e8-bedb-9870f23619e2';

                    try {

                        try {
                            const existingUrl = await fetchTTSAudioUrl({
                                userID,
                                scriptID,
                                index: element.index,
                            });

                            if (existingUrl) {
                                console.log('Audio url found in storage! Skipping generation.');
                                withTTS.push({ ...element, ttsUrl: existingUrl });
                                continue;
                            }
                        } catch {
                            // Ignore and continue to generation
                            console.log('Audio url not found. Continuing to generation.');
                        }

                        // Build context
                        const contextUtterance = script
                            .slice(Math.max(0, i - 2), i)
                            .filter(
                                (l) =>
                                    l.type === 'line' &&
                                    typeof l.text === 'string' &&
                                    l.text.trim().length > 0
                            )
                            .map((l) => ({
                                text: l.text,
                                description: (l as any).actingInstructions || '',
                            }));

                        // Generate TTS audio
                        const blob = await useHumeTTS({
                            text: element.text,
                            voiceId,
                            voiceDescription: element.actingInstructions || '',
                            contextUtterance:
                                contextUtterance.length > 0 ? contextUtterance : undefined,
                        });

                        // Upload to Firebase
                        await uploadTTSAudioBlob({
                            userID,
                            scriptID,
                            index: element.index,
                            blob,
                        });

                        // Get the persistent Firebase URL
                        const url = await fetchTTSAudioUrl({
                            userID,
                            scriptID,
                            index: element.index,
                        });

                        withTTS.push({ ...element, ttsUrl: url });

                        await new Promise((res) => setTimeout(res, 100));
                    } catch (error) {
                        console.warn(`⚠️ Failed to generate or upload TTS for line ${element.index}`, error);
                        failedIndexes.push(element.index);
                        withTTS.push(element);
                    }
                } else {
                    withTTS.push(element);
                }
            }

            return [withTTS, failedIndexes];
        };

        const hydrateTTSUrls = async (
            script: ScriptElement[],
            userID: string,
            scriptID: string
        ): Promise<[ScriptElement[], number[]]> => {
            const hydrated: ScriptElement[] = [];
            const failedIndexes: number[] = [];

            for (let i = 0; i < script.length; i++) {
                const element = script[i];

                if (element.type === 'line' && element.role === 'scene-partner') {
                    const voiceId =
                        element.gender === 'male'
                            ? 'c5be03fa-09cc-4fc3-8852-7f5a32b5606c'
                            : '5bbc32c1-a1f6-44e8-bedb-9870f23619e2';

                    try {
                        let url: string | undefined;

                        // Try fetching URL from Firebase Storage
                        try {
                            url = await fetchTTSAudioUrl({ userID, scriptID, index: element.index });
                        } catch (fetchErr) {
                            console.warn(`💡 TTS audio missing for line ${element.index}, regenerating with Hume...`);
                        }

                        // If no URL, regenerate and upload
                        if (!url) {
                            const contextUtterance = script
                                .slice(Math.max(0, i - 2), i)
                                .filter((l) => l.type === 'line' && typeof l.text === 'string' && l.text.trim().length > 0)
                                .map((l) => ({
                                    text: l.text,
                                    description: (l as any).actingInstructions || '',
                                }));

                            const blob = await useHumeTTS({
                                text: element.text,
                                voiceId,
                                voiceDescription: element.actingInstructions || '',
                                contextUtterance: contextUtterance.length > 0 ? contextUtterance : undefined,
                            });

                            await uploadTTSAudioBlob({ userID, scriptID, index: element.index, blob });

                            const res = await fetchTTSAudioUrl({ userID, scriptID, index: element.index });
                            url = res;
                        }

                        hydrated.push({ ...element, ttsUrl: url });
                    } catch (err) {
                        console.warn(`❌ Failed to hydrate or regenerate TTS for line ${element.index}`, err);
                        failedIndexes.push(element.index);
                        hydrated.push(element);
                    }
                } else {
                    hydrated.push(element);
                }
            }

            return [hydrated, failedIndexes];
        };

        const hydrateEmbeddings = async (
            script: ScriptElement[],
            userID: string,
            scriptID: string
        ): Promise<[ScriptElement[], number[]]> => {
            const hydrated: ScriptElement[] = [];
            const failedIndexes: number[] = [];

            for (let i = 0; i < script.length; i++) {
                const element = script[i];

                if (element.type === 'line' && element.role === 'user') {
                    try {
                        let embedding: number[] | null = null;

                        // Try fetching from Firebase Storage
                        try {
                            const url = await fetchEmbeddingUrl({ userID, scriptID, index: element.index });
                            const res = await fetch(url);
                            const data = await res.json();
                            embedding = data.embedding;
                        } catch {
                            console.warn(`💡 Embedding missing for line ${element.index}, regenerating...`);
                        }

                        // Regenerate and upload to storage
                        if (!embedding) {
                            embedding = await fetchEmbedding(element.text);
                            if (!embedding) throw new Error('Embedding generation failed');

                            try {
                                const blob = new Blob([JSON.stringify({ embedding })], { type: 'application/json' });
                                await uploadEmbeddingBlob({ userID, scriptID, index: element.index, blob });
                            } catch (uploadErr) {
                                console.warn(`⚠️ Failed to upload embedding for line ${element.index}`, uploadErr);
                            }
                        }

                        hydrated.push({ ...element, expectedEmbedding: embedding });
                    } catch (err) {
                        console.warn(`❌ Failed to hydrate or regenerate embedding for line ${element.index}`, err);
                        failedIndexes.push(element.index);
                        hydrated.push(element);
                    }
                } else {
                    hydrated.push(element);
                }
            }

            return [hydrated, failedIndexes];
        };

        try {
            setLoadStage('🔍 Checking local cache...');
            const cached = await get(scriptCacheKey);

            if (cached) {
                // Check if all TTS audio urls are in cache
                const ttsFullyHydrated = cached.every((element: ScriptElement) =>
                    element.type === 'line' && element.role === 'scene-partner'
                        ? typeof element.ttsUrl === 'string' && element.ttsUrl.startsWith('https://')
                        : true
                );

                // Check if all embeddings are in cache
                const embeddingsFullyHydrated = cached.every((element: ScriptElement) =>
                    element.type === 'line' && element.role === 'user'
                        ? Array.isArray(element.expectedEmbedding) && element.expectedEmbedding.length > 0
                        : true
                );

                // If missing, attempt to add to cache
                if (!ttsFullyHydrated || !embeddingsFullyHydrated) {
                    let hydrated = cached;

                    if (!ttsFullyHydrated) {
                        setLoadStage('🔁 Hydrating TTS URLs from storage...');
                        let failedIndexes: number[] = [];

                        try {
                            [hydrated, failedIndexes] = await hydrateTTSUrls(hydrated, userID, scriptID);
                        } catch (ttsError) {
                            console.error('❌ Critical failure in addTTS:', ttsError);
                            setTTSLoadError(true);
                            setTTSFailedLines(cached
                                .filter((e: ScriptElement) => e.type === 'line' && e.role === 'scene-partner')
                                .map((e: ScriptElement) => e.index)
                            );
                        }

                        if (failedIndexes.length > 0) {
                            console.log('Error occurred hydrating TTS urls');
                            setTTSLoadError(true);
                            setTTSFailedLines(failedIndexes);
                        }
                    }

                    if (!embeddingsFullyHydrated) {
                        setLoadStage('🔁 Hydrating embeddings from storage...');
                        let failedIndexes: number[] = [];

                        try {
                            [hydrated, failedIndexes] = await hydrateEmbeddings(hydrated, userID, scriptID);
                        } catch (embedError) {
                            console.error('❌ Critical failure in adding embeddings:', embedError);
                            setEmbeddingError(true);
                            setEmbeddingFailedLines(cached
                                .filter((e: ScriptElement) => e.type === 'line' && e.role === 'user')
                                .map((e: ScriptElement) => e.index)
                            );
                        }

                        if (failedIndexes.length > 0) {
                            console.log('Error occurred hydrating embeddings');
                            setEmbeddingError(true);
                            setEmbeddingFailedLines(failedIndexes);
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
                    return;
                }

                setLoadStage('✅ Loaded fully hydrated script from cache');
                console.log('📦 Loaded fully hydrated script from cache');
                setScript(cached);
                return;
            } else {
                setLoadStage('🌐 Fetching script from Firestore...');
                console.log('🌐 Fetching script from Firestore');
                const data = await fetchScriptByID(userID, scriptID);
                const script = data.script;

                // Embed all user lines
                setLoadStage('📐 Embedding lines...');
                let embedded: any[];
                try {
                    embedded = await addEmbeddingsToScript(script, userID, scriptID);
                } catch (embedErr) {
                    console.error('❌ Failed to embed script:', embedErr);
                    setEmbeddingError(true);
                    return;
                }

                // Store failed embedding indexes for retry
                const failedEmbeddingIndexes = embedded
                    .filter((item) => item.type === 'line' && item.role === 'user' && !Array.isArray(item.expectedEmbedding))
                    .map((item) => item.index);

                if (failedEmbeddingIndexes.length > 0) {
                    setEmbeddingError(true);
                    setEmbeddingFailedLines(failedEmbeddingIndexes);
                }

                // Add TTS audio
                setLoadStage('🎤 Generating TTS...');
                let withTTS: ScriptElement[] = [];
                let failedIndexes: number[] = [];

                try {
                    [withTTS, failedIndexes] = await addTTS(embedded, userID, scriptID);
                } catch (ttsError) {
                    console.error('❌ Critical failure in addTTS:', ttsError);
                    setTTSLoadError(true);
                    setTTSFailedLines(script
                        .filter(e => e.type === 'line' && e.role === 'scene-partner')
                        .map(e => e.index)
                    );
                    withTTS = embedded;
                }

                // Store failed TTS line indexes for retry
                if (failedIndexes.length > 0) {
                    console.log('Error occurred adding TTS urls');
                    setTTSLoadError(true);
                    setTTSFailedLines(failedIndexes);
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

    const retryTTS = async (failedIndexes: number[]) => {
        if (!script || !userID || !scriptID) return;

        const updatedScript = [...script];
        const stillFailed: number[] = [];
        setTTSFailedLines([]);

        for (let i = 0; i < updatedScript.length; i++) {
            const element = updatedScript[i];

            if (
                element.type === 'line' &&
                element.role === 'scene-partner' &&
                failedIndexes.includes(element.index)
            ) {
                const voiceId =
                    element.gender === 'male'
                        ? 'c5be03fa-09cc-4fc3-8852-7f5a32b5606c'
                        : element.gender === 'female'
                            ? '5bbc32c1-a1f6-44e8-bedb-9870f23619e2'
                            : '5bbc32c1-a1f6-44e8-bedb-9870f23619e2';

                try {

                    try {
                        const existingUrl = await fetchTTSAudioUrl({
                            userID,
                            scriptID,
                            index: element.index,
                        });

                        if (existingUrl) {
                            updatedScript[i] = { ...element, ttsUrl: existingUrl };
                            continue;
                        }
                    } catch (urlError) {
                        console.warn(`🔁 No URL available for line ${element.index}, regenerating...`);
                    }

                    const contextUtterance = updatedScript
                        .slice(Math.max(0, i - 2), i)
                        .filter(
                            (l) =>
                                l.type === 'line' &&
                                typeof l.text === 'string' &&
                                l.text.trim().length > 0
                        )
                        .map((l) => ({
                            text: l.text,
                            description: (l as any).actingInstructions || '',
                        }));

                    const blob = await useHumeTTS({
                        text: element.text,
                        voiceId,
                        voiceDescription: element.actingInstructions || '',
                        contextUtterance: contextUtterance.length > 0 ? contextUtterance : undefined,
                    });

                    await uploadTTSAudioBlob({
                        userID,
                        scriptID,
                        index: element.index,
                        blob,
                    });

                    const newUrl = await fetchTTSAudioUrl({
                        userID,
                        scriptID,
                        index: element.index,
                    });

                    updatedScript[i] = { ...element, ttsUrl: newUrl };

                    await new Promise((res) => setTimeout(res, 100));
                } catch (err) {
                    console.warn(`❌ Failed to regenerate TTS for line ${element.index}`, err);
                    stillFailed.push(element.index);
                }
            }
        }

        setScript(updatedScript);
        setTTSFailedLines(stillFailed);
        setTTSLoadError(stillFailed.length > 0);
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

    const {
        initializeSTT,
        startSTT,
        pauseSTT,
        cleanupSTT,
    } = useGoogleSTT({
        lineEndKeywords: current?.lineEndKeywords ?? [],
        expectedEmbedding: current?.expectedEmbedding ?? [],
        onCueDetected: onUserLineMatched,
        onSilenceTimeout: () => {
            console.log('⏱️ Timeout reached');
            setIsWaitingForUser(false);
        },
    });

    // Deepgram useSTT import
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

    const getDefaultGoogleVoice = (gender: 'MALE' | 'FEMALE' | 'NEUTRAL' = 'MALE') => {
        switch (gender) {
            case 'FEMALE':
                return 'en-US-Wavenet-F';
            case 'NEUTRAL':
                return 'en-US-Wavenet-C';
            case 'MALE':
            default:
                return 'en-US-Wavenet-D';
        }
    };

    const normalizedGender = (current?.gender?.toUpperCase?.() || 'MALE') as 'MALE' | 'FEMALE' | 'NEUTRAL';

    const loadGoogleTTS = async ({
        text,
        voiceId = 'en-US-Wavenet-D',
        gender = 'NEUTRAL',
    }: {
        text: string;
        voiceId?: string;
        gender?: 'MALE' | 'FEMALE' | 'NEUTRAL';
    }) => {
        try {
            const blob = await useGoogleTTS({
                text,
                voiceId,
                gender,
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

    const loadVogentTTS = async ({
        text,
        voiceId = '36b87413-6d7b-421d-8745-bc0897770d1e',
    }: {
        text: string;
        voiceId?: string;
    }) => {
        try {
            const blob = await useVogentTTS({
                text,
                voiceId,
                temperature: 0.8,
            });

            const url = URL.createObjectURL(blob);
            const audio = new Audio(url);
            await audio.play();

            audio.onended = () => {
                URL.revokeObjectURL(url);
            };
        } catch (err) {
            console.error('❌ Failed to load or play Vogent TTS audio:', err);
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
                        🔁 Retry Embedding
                    </button>
                </div>
            )}
            {ttsLoadError && (
                <div className="warning">
                    ⚠️ Some lines failed to load TTS. You can still rehearse, but not all audio will play.
                    <button onClick={() => retryTTS(ttsFailedLines)}>Retry failed lines</button>
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
                                    const tonePrefix =
                                        typeof current.tone === 'string' && current.tone.trim().length > 0
                                            ? current.tone
                                                .trim()
                                                .split(/\s+/)
                                                .map((t) => `[${t}]`)
                                                .join(' ') + ' '
                                            : '';

                                    const textWithTone = tonePrefix + current.text;

                                    loadGoogleTTS({
                                        text: current.text,
                                        voiceId: getDefaultGoogleVoice(normalizedGender),
                                        gender: normalizedGender,
                                    });
                                }}
                            >
                                🔊 Google TTS
                            </button>
                            <br />
                            <button
                                onClick={() => {
                                    loadVogentTTS({
                                        text: current.text,
                                        voiceId: '94c32748-865f-42e1-bb1a-3a6b4abc7d11',
                                    });
                                }}
                            >
                                🔊 Vogent TTS
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