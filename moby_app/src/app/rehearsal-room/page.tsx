'use client';

import { useEffect, useState, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { fetchScriptByID } from '@/lib/api/dbFunctions/scripts';
import { fetchEmbedding, addEmbeddingsToScript } from '@/lib/api/embed';
import { useHumeTTS, useHumeTTSBatch } from '@/lib/api/humeTTS';
import { useElevenTTS } from '@/lib/api/elevenTTS';
import { useGoogleTTS } from '@/lib/api/googleTTS';
import { useVogentTTS } from '@/lib/api/vogentTTS';
import { useGoogleSTT } from '@/lib/google/speechToText';
import { useDeepgramSTT } from '@/lib/deepgram/speechToText';
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
    const [sttProvider, setSttProvider] = useState<'google' | 'deepgram'>('deepgram');

    // Rehearsal flow
    const [isPlaying, setIsPlaying] = useState(false);
    const [isWaitingForUser, setIsWaitingForUser] = useState(false);

    // Error handling
    const [storageError, setStorageError] = useState(false);
    const [embeddingError, setEmbeddingError] = useState(false);
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

        setLoading(true);
        setEmbeddingError(false);
        setTTSLoadError(false);

        // Hume TTS -- No Batch + Context Utterances
        const addTTS = async (script: ScriptElement[]): Promise<[ScriptElement[], number[]]> => {
            const failedIndexes: number[] = [];
            const withTTS: ScriptElement[] = [];

            for (let i = 0; i < script.length; i++) {
                const element = script[i];

                if (element.type === 'line' && element.role === 'scene-partner') {
                    const ttsCacheKey = `tts:${userID}:${scriptID}:${element.index}`;
                    const voiceId =
                        element.gender === 'male'
                            ? 'c5be03fa-09cc-4fc3-8852-7f5a32b5606c'
                            : '5bbc32c1-a1f6-44e8-bedb-9870f23619e2';

                    try {
                        const cached = await get(ttsCacheKey);
                        if (cached) {
                            const url = URL.createObjectURL(cached);
                            withTTS.push({ ...element, ttsUrl: url });
                            continue;
                        }

                        // 🔁 Use previous 2 lines as context utterances
                        const contextUtterance = script
                            .slice(Math.max(0, i - 2), i)
                            .filter(l => l.type === 'line' && typeof l.text === 'string' && l.text.trim().length > 0)
                            .map(l => ({
                                text: l.text,
                                description: (l as any).actingInstructions || '',
                            }));

                        const blob = await useHumeTTS({
                            text: element.text,
                            voiceId,
                            voiceDescription: element.actingInstructions || '',
                            contextUtterance: contextUtterance.length > 0 ? contextUtterance : undefined
                        });

                        try {
                            await set(ttsCacheKey, blob);
                        } catch (setErr) {
                            console.warn(`⚠️ Failed to store TTS blob in IndexedDB for line ${element.index}`, setErr);
                        }

                        const url = URL.createObjectURL(blob);
                        withTTS.push({ ...element, ttsUrl: url });

                        await new Promise((res) => setTimeout(res, 100));
                    } catch (err) {
                        console.warn(`⚠️ Failed to generate Hume TTS for line ${element.index}`, err);
                        failedIndexes.push(element.index);
                        withTTS.push(element);
                    }
                } else {
                    withTTS.push(element);
                }
            }

            return [withTTS, failedIndexes];
        };

        const hydrateTTSUrls = async (script: ScriptElement[]): Promise<[ScriptElement[], number[]]> => {
            const hydrated: ScriptElement[] = [];
            const failedIndexes: number[] = [];

            for (let i = 0; i < script.length; i++) {
                const element = script[i];

                if (element.type === 'line' && element.role === 'scene-partner') {
                    const ttsCacheKey = `tts:${userID}:${scriptID}:${element.index}`;
                    const voiceId =
                        element.gender === 'male'
                            ? 'c5be03fa-09cc-4fc3-8852-7f5a32b5606c'
                            : '5bbc32c1-a1f6-44e8-bedb-9870f23619e2';

                    try {
                        let blob: Blob | undefined;

                        // Try loading from cache
                        try {
                            blob = await get(ttsCacheKey);
                        } catch (getErr) {
                            console.warn(`⚠️ Failed to read cache for line ${element.index}`, getErr);
                        }

                        // If missing, regenerate with context
                        if (!blob) {
                            console.warn(`💡 TTS blob missing for line ${element.index}, regenerating with Hume...`);

                            // Grab up to 2 previous lines as context
                            const contextUtterance = script
                                .slice(Math.max(0, i - 2), i)
                                .filter((l) => l.type === 'line' && typeof l.text === 'string' && l.text.trim().length > 0)
                                .map((l) => ({
                                    text: l.text,
                                    description: (l as any).actingInstructions || '',
                                }));

                            blob = await useHumeTTS({
                                text: element.text,
                                voiceId,
                                voiceDescription: element.actingInstructions || '',
                                contextUtterance: contextUtterance.length > 0 ? contextUtterance : undefined,
                            });

                            try {
                                await set(ttsCacheKey, blob);
                            } catch (setErr) {
                                console.warn(`⚠️ Failed to cache regenerated blob for line ${element.index}`, setErr);
                            }
                        }

                        const url = URL.createObjectURL(blob);
                        hydrated.push({ ...element, ttsUrl: url });
                    } catch (err) {
                        console.warn(`❌ Failed to hydrate or regenerate Hume TTS for line ${element.index}`, err);
                        failedIndexes.push(element.index);
                        hydrated.push(element);
                    }
                } else {
                    hydrated.push(element);
                }
            }

            return [hydrated, failedIndexes];
        };

        // // Hume TTS -- No Batch + No Context Utterances

        // const createHumeBatches = (lines: ScriptElement[]): ScriptElement[][] => {
        //     const batches: ScriptElement[][] = [];
        //     let currentBatch: ScriptElement[] = [];
        //     let currentLength = 0;

        //     for (const line of lines) {
        //         const textLength = line.text.length;
        //         const wouldExceedCharLimit = currentLength + textLength > 5000;
        //         const wouldExceedBatchSize = currentBatch.length >= 5;

        //         if (wouldExceedCharLimit || wouldExceedBatchSize) {
        //             batches.push(currentBatch);
        //             currentBatch = [];
        //             currentLength = 0;
        //         }

        //         currentBatch.push(line);
        //         currentLength += textLength;
        //     }

        //     if (currentBatch.length > 0) {
        //         batches.push(currentBatch);
        //     }

        //     return batches;
        // };

        // const addTTS = async (script: ScriptElement[]): Promise<[ScriptElement[], number[]]> => {
        //     const failedIndexes: number[] = [];
        //     const withTTS: ScriptElement[] = [];

        //     for (const element of script) {
        //         if (element.type === 'line' && element.role === 'scene-partner') {
        //             const ttsCacheKey = `tts:${userID}:${scriptID}:${element.index}`;
        //             const voiceId =
        //                 element.gender === 'male'
        //                     ? 'c5be03fa-09cc-4fc3-8852-7f5a32b5606c'
        //                     : element.gender === 'female'
        //                         ? '5bbc32c1-a1f6-44e8-bedb-9870f23619e2'
        //                         : '5bbc32c1-a1f6-44e8-bedb-9870f23619e2';

        //             try {
        //                 const cached = await get(ttsCacheKey);
        //                 if (cached) {
        //                     const url = URL.createObjectURL(cached);
        //                     withTTS.push({ ...element, ttsUrl: url });
        //                     continue;
        //                 }

        //                 const blob = await useHumeTTS({
        //                     text: element.text,
        //                     voiceId,
        //                     voiceDescription: element.actingInstructions || '',
        //                 });

        //                 try {
        //                     await set(ttsCacheKey, blob);
        //                 } catch (setErr) {
        //                     console.warn(`⚠️ Failed to store TTS blob in IndexedDB for line ${element.index}`, setErr);
        //                 }

        //                 const url = URL.createObjectURL(blob);
        //                 withTTS.push({ ...element, ttsUrl: url });

        //                 await new Promise((res) => setTimeout(res, 100)); // Optional throttle
        //             } catch (err) {
        //                 console.warn(`⚠️ Failed to generate Hume TTS for line ${element.index}`, err);
        //                 failedIndexes.push(element.index);
        //                 withTTS.push(element);
        //             }
        //         } else {
        //             withTTS.push(element);
        //         }
        //     }

        //     return [withTTS, failedIndexes];
        // };

        // const hydrateTTSUrls = async (script: ScriptElement[]): Promise<[ScriptElement[], number[]]> => {
        //     const hydrated: ScriptElement[] = [];
        //     const failedIndexes: number[] = [];

        //     for (const element of script) {
        //         if (element.type === 'line' && element.role === 'scene-partner') {
        //             const ttsCacheKey = `tts:${userID}:${scriptID}:${element.index}`;
        //             const voiceId =
        //                 element.gender === 'male'
        //                     ? 'c5be03fa-09cc-4fc3-8852-7f5a32b5606c'
        //                     : '5bbc32c1-a1f6-44e8-bedb-9870f23619e2';

        //             try {
        //                 let blob: Blob | undefined;

        //                 // 🧪 Try loading from cache
        //                 try {
        //                     blob = await get(ttsCacheKey);
        //                 } catch (getErr) {
        //                     console.warn(`⚠️ Failed to read cache for line ${element.index}`, getErr);
        //                 }

        //                 // 🔁 If missing, regenerate
        //                 if (!blob) {
        //                     console.warn(`💡 TTS blob missing for line ${element.index}, regenerating with Hume...`);

        //                     blob = await useHumeTTS({
        //                         text: element.text,
        //                         voiceId,
        //                         voiceDescription: element.actingInstructions || '',
        //                     });

        //                     try {
        //                         await set(ttsCacheKey, blob);
        //                     } catch (setErr) {
        //                         console.warn(`⚠️ Failed to cache regenerated blob for line ${element.index}`, setErr);
        //                     }
        //                 }

        //                 const url = URL.createObjectURL(blob);
        //                 hydrated.push({ ...element, ttsUrl: url });
        //             } catch (err) {
        //                 console.warn(`❌ Failed to hydrate or regenerate Hume TTS for line ${element.index}`, err);
        //                 failedIndexes.push(element.index);
        //                 hydrated.push(element);
        //             }
        //         } else {
        //             hydrated.push(element);
        //         }
        //     }

        //     return [hydrated, failedIndexes];
        // };

        // // Hume TTS -- Batch
        // const addTTS = async (script: ScriptElement[]): Promise<[ScriptElement[], number[]]> => {
        //     const failedIndexes: number[] = [];
        //     const withTTS: ScriptElement[] = [];

        //     const linesToBatch: { line: ScriptElement; ttsCacheKey: string; voiceId: string }[] = [];

        //     // First pass: check cache or mark for batching
        //     for (const element of script) {
        //         if (element.type === 'line' && element.role === 'scene-partner') {
        //             const ttsCacheKey = `tts:${userID}:${scriptID}:${element.index}`;
        //             const voiceId = element.gender === 'male'
        //                 ? 'c5be03fa-09cc-4fc3-8852-7f5a32b5606c'
        //                 : element.gender === 'female'
        //                     ? '5bbc32c1-a1f6-44e8-bedb-9870f23619e2'
        //                     : '5bbc32c1-a1f6-44e8-bedb-9870f23619e2';

        //             try {
        //                 const cached = await get(ttsCacheKey);
        //                 if (cached) {
        //                     const url = URL.createObjectURL(cached);
        //                     withTTS.push({ ...element, ttsUrl: url });
        //                 } else {
        //                     linesToBatch.push({ line: element, ttsCacheKey, voiceId });
        //                 }
        //             } catch (err) {
        //                 console.warn(`⚠️ Error checking cache for line ${element.index}`, err);
        //                 linesToBatch.push({ line: element, ttsCacheKey, voiceId });
        //             }
        //         } else {
        //             withTTS.push(element);
        //         }
        //     }

        //     // Create batches from cache-missing lines
        //     const batches = createHumeBatches(linesToBatch.map(({ line }) => line));

        //     for (const batch of batches) {
        //         const payload = batch.map((line) => {
        //             const original = linesToBatch.find((item) => item.line.index === line.index);
        //             return {
        //                 text: line.text,
        //                 description: line.actingInstructions || undefined,
        //                 voiceId: original?.voiceId!,
        //             };
        //         });

        //         try {
        //             const blobs = await useHumeTTSBatch(payload);

        //             for (let i = 0; i < batch.length; i++) {
        //                 const element = batch[i];
        //                 const blob = blobs[i];

        //                 if (!blob) {
        //                     failedIndexes.push(element.index);
        //                     withTTS.push(element);
        //                     continue;
        //                 }

        //                 const ttsCacheKey = `tts:${userID}:${scriptID}:${element.index}`;
        //                 const url = URL.createObjectURL(blob);
        //                 withTTS.push({ ...element, ttsUrl: url });

        //                 try {
        //                     await set(ttsCacheKey, blob);
        //                 } catch (err) {
        //                     console.warn(`⚠️ Failed to cache line ${element.index}`, err);
        //                 }
        //             }
        //         } catch (err) {
        //             console.warn('❌ Failed Hume TTS batch', err);
        //             for (const line of batch) {
        //                 failedIndexes.push(line.index);
        //                 withTTS.push(line);
        //             }
        //         }
        //     }

        //     return [withTTS.sort((a, b) => a.index - b.index), failedIndexes];
        // };

        // const hydrateTTSUrls = async (script: ScriptElement[]): Promise<[ScriptElement[], number[]]> => {
        //     const hydrated: ScriptElement[] = [];
        //     const failedIndexes: number[] = [];

        //     const linesToBatch: { line: ScriptElement; ttsCacheKey: string; voiceId: string }[] = [];

        //     // First pass: try loading from cache
        //     for (const element of script) {
        //         if (element.type === 'line' && element.role === 'scene-partner') {
        //             const ttsCacheKey = `tts:${userID}:${scriptID}:${element.index}`;
        //             const voiceId = element.gender === 'male'
        //                 ? '5bbc32c1-a1f6-44e8-bedb-9870f23619e2'
        //                 : element.gender === 'female'
        //                     ? '5bbc32c1-a1f6-44e8-bedb-9870f23619e2'
        //                     : '5bbc32c1-a1f6-44e8-bedb-9870f23619e2';

        //             try {
        //                 const cached = await get(ttsCacheKey);
        //                 if (cached) {
        //                     const url = URL.createObjectURL(cached);
        //                     hydrated.push({ ...element, ttsUrl: url });
        //                 } else {
        //                     linesToBatch.push({ line: element, ttsCacheKey, voiceId });
        //                 }
        //             } catch (err) {
        //                 console.warn(`⚠️ Cache read error for line ${element.index}`, err);
        //                 linesToBatch.push({ line: element, ttsCacheKey, voiceId });
        //             }
        //         } else {
        //             hydrated.push(element);
        //         }
        //     }

        //     // Regenerate any missing lines in batches
        //     const batches = createHumeBatches(linesToBatch.map(({ line }) => line));

        //     for (const batch of batches) {
        //         const payload = batch.map((line) => {
        //             const original = linesToBatch.find((item) => item.line.index === line.index);
        //             return {
        //                 text: line.text,
        //                 description: line.actingInstructions || undefined,
        //                 voiceId: original?.voiceId!,
        //             };
        //         });

        //         try {
        //             const blobs = await useHumeTTSBatch(payload);

        //             for (let i = 0; i < batch.length; i++) {
        //                 const element = batch[i];
        //                 const blob = blobs[i];

        //                 if (!blob) {
        //                     failedIndexes.push(element.index);
        //                     hydrated.push(element);
        //                     continue;
        //                 }

        //                 const ttsCacheKey = `tts:${userID}:${scriptID}:${element.index}`;
        //                 const url = URL.createObjectURL(blob);
        //                 hydrated.push({ ...element, ttsUrl: url });

        //                 try {
        //                     await set(ttsCacheKey, blob);
        //                 } catch (err) {
        //                     console.warn(`⚠️ Failed to cache blob for line ${element.index}`, err);
        //                 }
        //             }
        //         } catch (err) {
        //             console.warn('❌ Failed Hume TTS batch during hydration:', err);
        //             for (const line of batch) {
        //                 failedIndexes.push(line.index);
        //                 hydrated.push(line);
        //             }
        //         }
        //     }

        //     return [hydrated.sort((a, b) => a.index - b.index), failedIndexes];
        // };

        // 11labs -- Limited to 1 request at a time
        // const addTTS = async (script: ScriptElement[]): Promise<[ScriptElement[], number[]]> => {
        //     const failedIndexes: number[] = [];
        //     const withTTS: ScriptElement[] = [];

        //     for (const element of script) {
        //         if (element.type === 'line' && element.role === 'scene-partner') {
        //             const ttsCacheKey = `tts:${userID}:${scriptID}:${element.index}`;

        //             try {
        //                 const cachedAudio = await get(ttsCacheKey);

        //                 if (cachedAudio) {
        //                     const url = URL.createObjectURL(cachedAudio);
        //                     withTTS.push({ ...element, ttsUrl: url });
        //                     continue;
        //                 }

        //                 const voiceId =
        //                     element.gender === 'male'
        //                         ? 'FIsP50cHv9JY47BkNVR7'
        //                         : '56AoDkrOh6qfVPDXZ7Pt'

        //                 const blob = await useElevenTTS({
        //                     text: element.text,
        //                     voiceId,
        //                     voiceSettings: {
        //                         stability: 0.1,
        //                         similarityBoost: 0.7,
        //                     }
        //                 });

        //                 // Try storing the blob
        //                 try {
        //                     await set(ttsCacheKey, blob);
        //                 } catch (setErr) {
        //                     console.warn(`⚠️ Failed to store TTS blob in IndexedDB for line ${element.index}`, setErr);
        //                 }

        //                 const url = URL.createObjectURL(blob);
        //                 withTTS.push({ ...element, ttsUrl: url });

        //                 // Optional throttle
        //                 await new Promise((res) => setTimeout(res, 100));
        //             } catch (err) {
        //                 console.warn(`⚠️ Failed to preload TTS for line ${element.index}`, err);
        //                 failedIndexes.push(element.index);
        //                 withTTS.push(element); // push original element without ttsUrl
        //             }
        //         } else {
        //             withTTS.push(element);
        //         }
        //     }

        //     return [withTTS, failedIndexes];
        // };

        // const hydrateTTSUrls = async (script: ScriptElement[]): Promise<[ScriptElement[], number[]]> => {
        //     const hydrated: ScriptElement[] = [];
        //     const failedIndexes: number[] = [];

        //     for (const element of script) {
        //         if (element.type === 'line' && element.role === 'scene-partner') {
        //             const ttsCacheKey = `tts:${userID}:${scriptID}:${element.index}`;
        //             try {
        //                 let blob: Blob | undefined;

        //                 // Try to load cached blob
        //                 try {
        //                     blob = await get(ttsCacheKey);
        //                 } catch (getErr) {
        //                     console.warn(`⚠️ Failed to read from IndexedDB for line ${element.index}`, getErr);
        //                 }

        //                 // If no blob, regenerate
        //                 if (!blob) {
        //                     console.warn(`💡 TTS blob missing for line ${element.index}, regenerating...`);

        //                     const voiceId =
        //                         element.gender === 'male'
        //                             ? 'FIsP50cHv9JY47BkNVR7'
        //                             : '56AoDkrOh6qfVPDXZ7Pt'

        //                     blob = await useElevenTTS({
        //                         text: element.text,
        //                         voiceId,
        //                         voiceSettings: {
        //                             stability: 0.1,
        //                             similarityBoost: 0.7,
        //                         }
        //                     });

        //                     // Try to cache regenerated blob
        //                     try {
        //                         await set(ttsCacheKey, blob);
        //                     } catch (setErr) {
        //                         console.warn(`⚠️ Failed to store blob to IndexedDB for line ${element.index}`, setErr);
        //                         // Proceed without storage — we still have the blob
        //                     }
        //                 }

        //                 const url = URL.createObjectURL(blob);
        //                 hydrated.push({ ...element, ttsUrl: url });
        //             } catch (err) {
        //                 console.warn(`❌ Failed to hydrate or regenerate TTS for line ${element.index}`, err);
        //                 failedIndexes.push(element.index);
        //                 hydrated.push(element); // fallback to line without ttsUrl
        //             }
        //         } else {
        //             hydrated.push(element);
        //         }
        //     }

        //     return [hydrated, failedIndexes];
        // };

        const scriptCacheKey = `script-cache:${userID}:${scriptID}`;

        try {
            setLoadStage('🔍 Checking local cache...');
            const cached = await get(scriptCacheKey);

            if (cached) {
                setLoadStage('🔁 Hydrating TTS URLs from cached audio blobs...');
                const [hydrated, failedIndexes] = await hydrateTTSUrls(cached);

                if (failedIndexes.length > 0) {
                    setTTSLoadError(true);
                    setTTSFailedLines(failedIndexes);
                }

                setLoadStage('✅ Loaded from cache');
                console.log('📦 Loaded script from IndexedDB cache');
                setScript(hydrated);
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
                    embedded = await addEmbeddingsToScript(script);
                } catch (embedErr) {
                    console.error('❌ Failed to embed script:', embedErr);
                    setEmbeddingError(true);
                    return;
                }

                // Add TTS audio
                setLoadStage('🎤 Generating TTS...');
                const [withTTS, failedIndexes] = await addTTS(embedded);

                if (failedIndexes.length > 0) {
                    setTTSLoadError(true);
                    setTTSFailedLines(failedIndexes);
                    return;
                }

                // Try storing
                setLoadStage('💾 Caching to IndexedDB...');
                try {
                    await set(scriptCacheKey, withTTS);
                    console.log('💾 Script cached successfully');
                } catch (err) {
                    console.warn('⚠️ Failed to store script in IndexedDB:', err);
                    if (isQuotaExceeded(err)) {
                        setStorageError(true);
                    }
                    return;
                }

                setLoadStage('✅ Script ready!');
                setScript(withTTS);
            }
        } catch (err) {
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
                const ttsCacheKey = `tts:${userID}:${scriptID}:${element.index}`;
                const voiceId =
                    element.gender === 'male'
                        ? 'c5be03fa-09cc-4fc3-8852-7f5a32b5606c'
                        : '5bbc32c1-a1f6-44e8-bedb-9870f23619e2';

                try {
                    let blob: Blob | undefined;

                    // Try to load from cache
                    try {
                        blob = await get(ttsCacheKey);
                    } catch (getErr) {
                        console.warn(`⚠️ Failed to get blob from IndexedDB for line ${element.index}`, getErr);
                    }

                    // If no blob, regenerate
                    if (!blob) {
                        console.warn(`🔁 No blob available for line ${element.index}, regenerating...`);

                        // Provide up to 2 lines of context
                        const contextUtterance = updatedScript
                            .slice(Math.max(0, i - 2), i)
                            .filter((l) => l.type === 'line' && typeof l.text === 'string' && l.text.trim().length > 0)
                            .map((l) => ({
                                text: l.text,
                                description: (l as any).actingInstructions || '',
                            }));

                        try {
                            blob = await useHumeTTS({
                                text: element.text,
                                voiceId,
                                voiceDescription: element.actingInstructions || '',
                                contextUtterance: contextUtterance.length > 0 ? contextUtterance : undefined,
                            });
                        } catch (ttsErr) {
                            console.warn(`❌ TTS generation failed for line ${element.index}`, ttsErr);
                            stillFailed.push(element.index);
                            continue;
                        }

                        // Store regenerated blob
                        try {
                            await set(ttsCacheKey, blob);
                        } catch (setErr) {
                            console.warn(`⚠️ Failed to save blob to IndexedDB for line ${element.index}`, setErr);
                        }
                    }

                    const url = URL.createObjectURL(blob);
                    updatedScript[i] = { ...element, ttsUrl: url };

                    await new Promise((res) => setTimeout(res, 100)); // throttle
                } catch (err) {
                    console.warn(`❌ Final fallback failed for line ${element.index}`, err);
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
                <div className="text-red-600 space-y-2">
                    <p>Some lines failed to load TTS: {ttsFailedLines.join(', ')}</p>
                    <button
                        className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
                        onClick={() => retryTTS(ttsFailedLines)}
                    >
                        Retry Failed Lines
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