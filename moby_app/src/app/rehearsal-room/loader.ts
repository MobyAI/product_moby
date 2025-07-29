import { get, set } from 'idb-keyval';
import type { ScriptElement } from '@/types/script';
import { addEmbedding } from '@/lib/api/embed';
import { addTTS, addTTSRegenerate } from '@/lib/api/tts';
import { fetchScriptByID } from '@/lib/api/dbFunctions/scripts';
import pLimit from 'p-limit';

const isQuotaExceeded = (error: any) =>
    error &&
    (error.name === 'QuotaExceededError' ||
        error.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
        error.message?.includes('maximum size'));

// export const loadScript = async ({
//     userID,
//     scriptID,
//     setLoadStage,
//     setScript,
//     setStorageError,
//     setEmbeddingError,
//     setEmbeddingFailedLines,
//     setTTSLoadError,
//     setTTSFailedLines,
// }: {
//     userID: string;
//     scriptID: string;
//     setLoadStage: (stage: string) => void;
//     setScript: (script: ScriptElement[]) => void;
//     setStorageError: (val: boolean) => void;
//     setEmbeddingError: (val: boolean) => void;
//     setEmbeddingFailedLines: (lines: number[]) => void;
//     setTTSLoadError: (val: boolean) => void;
//     setTTSFailedLines: (lines: number[]) => void;
// }) => {
//     if (!userID || !scriptID) return;

//     const start = performance.now();

//     // IndexedDB key
//     const scriptCacheKey = `script-cache:${userID}:${scriptID}`;

//     // Concurrent request limit
//     const limit = pLimit(3);

//     // Reset error states
//     setStorageError(false);
//     setEmbeddingError(false);
//     setEmbeddingFailedLines([]);
//     setTTSLoadError(false);
//     setTTSFailedLines([]);

//     try {
//         setLoadStage('🔍 Checking local cache...');
//         const cached = await get(scriptCacheKey);

//         if (cached) {
//             // Check if all TTS audio urls are in cache
//             const unhydratedTTSLines = cached
//                 .filter((element: ScriptElement) =>
//                     element.type === 'line' &&
//                     element.role === 'scene-partner' &&
//                     (typeof element.ttsUrl !== 'string' || element.ttsUrl.length === 0)
//                 )
//                 .map((element: ScriptElement) => element.index);


//             // Check if all embeddings are in cache
//             const unhydratedEmbeddingLines = cached
//                 .filter((element: ScriptElement) =>
//                     element.type === 'line' &&
//                     element.role === 'user' &&
//                     (!Array.isArray(element.expectedEmbedding) || element.expectedEmbedding.length === 0)
//                 )
//                 .map((element: ScriptElement) => element.index);


//             // If missing, attempt to add to cache
//             if (unhydratedTTSLines.length > 0 || unhydratedEmbeddingLines.length > 0) {
//                 let hydrated = cached;

//                 if (unhydratedTTSLines.length > 0) {
//                     setLoadStage('🔁 Hydrating TTS URLs from storage...');
//                     const ttsFailedIndexes: number[] = [];
//                     const unhydratedIndexes = new Set(unhydratedTTSLines);

//                     const updated: ScriptElement[] = await Promise.all(
//                         hydrated.map((element: ScriptElement) =>
//                             limit(async () => {
//                                 if (
//                                     element.type === 'line' &&
//                                     element.role === 'scene-partner' &&
//                                     unhydratedIndexes.has(element.index)
//                                 ) {
//                                     try {
//                                         const updatedElement = await addTTS(element, hydrated, userID, scriptID);
//                                         return updatedElement;
//                                     } catch (err) {
//                                         console.warn(`❌ addTTS failed for line ${element.index}`, err);
//                                         ttsFailedIndexes.push(element.index);
//                                         return element;
//                                     }
//                                 } else {
//                                     return element;
//                                 }
//                             })
//                         )
//                     );

//                     // Update hydrated
//                     hydrated = updated;

//                     // Retry
//                     if (ttsFailedIndexes.length > 0) {
//                         console.log('🔁 Retrying failed TTS hydration lines...');
//                         const retryFailed: number[] = [];
//                         const retryIndexes = new Set(ttsFailedIndexes);

//                         const retried: ScriptElement[] = await Promise.all(
//                             hydrated.map((element: ScriptElement) =>
//                                 limit(async () => {
//                                     if (
//                                         element.type === 'line' &&
//                                         element.role === 'scene-partner' &&
//                                         retryIndexes.has(element.index)
//                                     ) {
//                                         try {
//                                             const updatedElement = await addTTS(element, hydrated, userID, scriptID);
//                                             return updatedElement;
//                                         } catch (err) {
//                                             console.warn(`❌ Retry failed for TTS line ${element.index}`, err);
//                                             retryFailed.push(element.index);
//                                             return element;
//                                         }
//                                     } else {
//                                         return element;
//                                     }
//                                 })
//                             )
//                         );

//                         hydrated = retried;

//                         if (retryFailed.length > 0) {
//                             console.log('❌ Retry still failed for some TTS lines');
//                             setTTSLoadError(true);
//                             setTTSFailedLines(retryFailed);
//                         }
//                     }
//                 }

//                 if (unhydratedEmbeddingLines.length > 0) {
//                     setLoadStage('🔁 Hydrating embeddings from storage...');
//                     const embeddingFailedIndexes: number[] = [];
//                     const unhydratedIndexes = new Set(unhydratedEmbeddingLines);

//                     const updated: ScriptElement[] = await Promise.all(
//                         hydrated.map((element: ScriptElement) =>
//                             limit(async () => {
//                                 if (
//                                     element.type === 'line' &&
//                                     element.role === 'user' &&
//                                     unhydratedIndexes.has(element.index)
//                                 ) {
//                                     try {
//                                         const updatedElement = await addEmbedding(element, userID, scriptID);
//                                         return updatedElement;
//                                     } catch (err) {
//                                         console.warn(`❌ addEmbedding failed for line ${element.index}`, err);
//                                         embeddingFailedIndexes.push(element.index);
//                                         return element;
//                                     }
//                                 } else {
//                                     return element;
//                                 }
//                             })
//                         )
//                     );

//                     hydrated = updated;

//                     // Retry
//                     if (embeddingFailedIndexes.length > 0) {
//                         console.log('🔁 Retrying failed embedding hydration lines...');
//                         const retryFailed: number[] = [];
//                         const retryIndexes = new Set(embeddingFailedIndexes);

//                         const retried: ScriptElement[] = await Promise.all(
//                             hydrated.map((element: ScriptElement) =>
//                                 limit(async () => {
//                                     if (
//                                         element.type === 'line' &&
//                                         element.role === 'user' &&
//                                         retryIndexes.has(element.index)
//                                     ) {
//                                         try {
//                                             const updatedElement = await addEmbedding(element, userID, scriptID);
//                                             return updatedElement;
//                                         } catch (err) {
//                                             console.warn(`❌ Retry failed for embedding line ${element.index}`, err);
//                                             retryFailed.push(element.index);
//                                             return element;
//                                         }
//                                     } else {
//                                         return element;
//                                     }
//                                 })
//                             )
//                         );

//                         hydrated = retried;

//                         if (retryFailed.length > 0) {
//                             console.log('❌ Retry still failed for some embeddings');
//                             setEmbeddingError(true);
//                             setEmbeddingFailedLines(retryFailed);
//                         }
//                     }
//                 }

//                 // Attempt to cache
//                 setLoadStage('💾 Caching to IndexedDB...');
//                 try {
//                     await set(scriptCacheKey, hydrated);
//                     console.log('💾 Script cached successfully');
//                 } catch (err) {
//                     console.warn('⚠️ Failed to store script in IndexedDB:', err);
//                     if (isQuotaExceeded(err)) {
//                         setStorageError(true);
//                     }
//                 }

//                 setLoadStage('✅ Loaded and hydrated script from cache');
//                 console.log('📦 Loaded and hydrated script from cache');
//                 setScript(hydrated);
//                 const end = performance.now();
//                 console.log(`⏱️ Script loaded from cache in ${(end - start).toFixed(2)} ms`);
//                 return;
//             }

//             setLoadStage('✅ Loaded fully hydrated script from cache');
//             console.log('📦 Loaded fully hydrated script from cache');
//             setScript(cached);
//             const end = performance.now();
//             console.log(`⏱️ Script loaded from cache in ${(end - start).toFixed(2)} ms`);
//             return;
//         } else {
//             setLoadStage('🌐 Fetching script from Firestore...');
//             console.log('🌐 Fetching script from Firestore');
//             const data = await fetchScriptByID(userID, scriptID);
//             const script = data.script;

//             // Embed all user lines
//             setLoadStage('📐 Embedding lines...');
//             let embedded: ScriptElement[];
//             const embeddingFailedIndexes: number[] = [];

//             embedded = await Promise.all(
//                 script.map((element: ScriptElement) =>
//                     limit(async () => {
//                         if (element.type === 'line' && element.role === 'user') {
//                             try {
//                                 const updated = await addEmbedding(element, userID, scriptID);
//                                 return updated;
//                             } catch (err) {
//                                 console.warn(`❌ addEmbedding failed for line ${element.index}`, err);
//                                 embeddingFailedIndexes.push(element.index);
//                                 return element;
//                             }
//                         }
//                         return element;
//                     })
//                 )
//             );

//             // Retry
//             if (embeddingFailedIndexes.length > 0) {
//                 console.log('🔁 Retrying failed embedding lines...');
//                 const retryFailed: number[] = [];
//                 const retryIndexes = new Set(embeddingFailedIndexes);

//                 embedded = await Promise.all(
//                     embedded.map((element: ScriptElement) =>
//                         limit(async () => {
//                             if (
//                                 element.type === 'line' &&
//                                 element.role === 'user' &&
//                                 retryIndexes.has(element.index)
//                             ) {
//                                 try {
//                                     const updated = await addEmbedding(element, userID, scriptID);
//                                     if (
//                                         !Array.isArray(updated.expectedEmbedding) ||
//                                         updated.expectedEmbedding.length === 0
//                                     ) {
//                                         retryFailed.push(element.index);
//                                     }
//                                     return updated;
//                                 } catch (err) {
//                                     console.warn(`❌ Retry failed for embedding line ${element.index}`, err);
//                                     retryFailed.push(element.index);
//                                     return element;
//                                 }
//                             }
//                             return element;
//                         })
//                     )
//                 );

//                 if (retryFailed.length > 0) {
//                     console.error('❌ Retry still failed for some embeddings');
//                     setEmbeddingError(true);
//                     setEmbeddingFailedLines(retryFailed);
//                     return;
//                 }
//             }

//             // Add TTS audio
//             setLoadStage('🎤 Generating TTS...');
//             let withTTS: ScriptElement[] = [];
//             const ttsFailedIndexes: number[] = [];

//             withTTS = await Promise.all(
//                 embedded.map((element: ScriptElement) =>
//                     limit(async () => {
//                         if (element.type === 'line' && element.role === 'scene-partner') {
//                             try {
//                                 const updated = await addTTS(element, embedded, userID, scriptID);
//                                 return updated;
//                             } catch (err) {
//                                 console.warn(`❌ addTTS failed for line ${element.index}`, err);
//                                 ttsFailedIndexes.push(element.index);
//                                 return element;
//                             }
//                         }
//                         return element;
//                     })
//                 )
//             );

//             // Retry once if any failed
//             if (ttsFailedIndexes.length > 0) {
//                 console.log('🔁 Retrying failed TTS lines...');
//                 const retryFailed: number[] = [];
//                 const retryIndexes = new Set(ttsFailedIndexes);

//                 withTTS = await Promise.all(
//                     withTTS.map((element: ScriptElement) =>
//                         limit(async () => {
//                             if (
//                                 element.type === 'line' &&
//                                 element.role === 'scene-partner' &&
//                                 retryIndexes.has(element.index)
//                             ) {
//                                 try {
//                                     const updated = await addTTS(element, withTTS, userID, scriptID);
//                                     return updated;
//                                 } catch (err) {
//                                     console.warn(`❌ Retry failed for TTS line ${element.index}`, err);
//                                     retryFailed.push(element.index);
//                                     return element;
//                                 }
//                             }
//                             return element;
//                         })
//                     )
//                 );

//                 if (retryFailed.length > 0) {
//                     console.error('❌ Retry still failed for some TTS lines');
//                     setTTSLoadError(true);
//                     setTTSFailedLines(retryFailed);
//                 }
//             }

//             // Attempt to cache
//             setLoadStage('💾 Caching to IndexedDB...');
//             try {
//                 await set(scriptCacheKey, withTTS);
//                 console.log('💾 Script cached successfully');
//             } catch (err) {
//                 console.warn('⚠️ Failed to store script in IndexedDB:', err);
//                 if (isQuotaExceeded(err)) {
//                     setStorageError(true);
//                 }
//             }

//             setLoadStage('✅ Script ready!');
//             setScript(withTTS);
//             const end = performance.now();
//             console.log(`⏱️ Script loaded from cache in ${(end - start).toFixed(2)} ms`);
//             return;
//         }
//     } catch (err) {
//         // Display load error page
//         console.error('❌ Error loading script:', err);
//         setLoadStage('❌ Unexpected error loading script');
//     }
// };

// Load script
export const loadScript = async ({
    userID,
    scriptID,
    setLoadStage,
    setStorageError,
}: {
    userID: string;
    scriptID: string;
    setLoadStage: (stage: string) => void;
    setStorageError: (val: boolean) => void;
}): Promise<ScriptElement[] | undefined> => {
    if (!userID || !scriptID) return;

    const start = performance.now();

    // IndexedDB key
    const scriptCacheKey = `script-cache:${userID}:${scriptID}`;

    // Reset error state
    setStorageError(false);

    try {
        setLoadStage('🔍 Checking local cache...');
        const cached = await get(scriptCacheKey);

        if (cached) {
            const end = performance.now();
            console.log(`⏱️ Script loaded from cache in ${(end - start).toFixed(2)} ms`);

            setLoadStage('✅ Loaded fully hydrated script from cache');
            console.log('✅ Loaded fully hydrated script from cache');

            return cached;
        } else {
            setLoadStage('🌐 Fetching script from Firestore...');
            const data = await fetchScriptByID(userID, scriptID);
            const script = data.script;

            // Attempt to cache
            setLoadStage('💾 Caching to IndexedDB...');
            console.log('💾 Caching to IndexedDB...');
            try {
                await set(scriptCacheKey, script);
                console.log('💾 Script cached successfully');
            } catch (err) {
                console.warn('⚠️ Failed to store script in IndexedDB:', err);
                if (isQuotaExceeded(err)) {
                    setStorageError(true);
                }
            }

            const end = performance.now();
            console.log(`⏱️ Script loaded from cache in ${(end - start).toFixed(2)} ms`);

            setLoadStage('✅ Script ready!');

            return script;
        }
    } catch (err) {
        // Display load error page
        console.error('❌ Error loading script:', err);
        setLoadStage('❌ Unexpected error loading script');
    }
};

// Hydrate script
export const hydrateScript = async ({
    script,
    userID,
    scriptID,
    setLoadStage,
    setScript,
    setStorageError,
    setEmbeddingError,
    setEmbeddingFailedLines,
    setTTSLoadError,
    setTTSFailedLines,
    updateTTSHydrationStatus,
    getScriptLine,
}: {
    script: ScriptElement[];
    userID: string;
    scriptID: string;
    setLoadStage: (stage: string) => void;
    setScript: (script: ScriptElement[]) => void;
    setStorageError: (val: boolean) => void;
    setEmbeddingError: (val: boolean) => void;
    setEmbeddingFailedLines: (lines: number[]) => void;
    setTTSLoadError: (val: boolean) => void;
    setTTSFailedLines: (lines: number[]) => void;
    updateTTSHydrationStatus?: (index: number, status: 'pending' | 'ready' | 'failed') => void;
    getScriptLine: (index: number) => ScriptElement | undefined;
}) => {
    if (!userID || !scriptID) return;

    const start = performance.now();

    // IndexedDB key
    const scriptCacheKey = `script-cache:${userID}:${scriptID}`;

    // Concurrent request limit
    const limit = pLimit(3);

    // Reset error states
    setStorageError(false);
    setEmbeddingError(false);
    setEmbeddingFailedLines([]);
    setTTSLoadError(false);
    setTTSFailedLines([]);

    // Check if all TTS audio urls are hydrated
    const unhydratedTTSLines = script
        .filter((element: ScriptElement) =>
            element.type === 'line' &&
            (typeof element.ttsUrl !== 'string' || element.ttsUrl.length === 0)
        )
        .map((element: ScriptElement) => element.index);


    // Check if all embeddings are hydrated
    const unhydratedEmbeddingLines = script
        .filter((element: ScriptElement) =>
            element.type === 'line' &&
            (!Array.isArray(element.expectedEmbedding) || element.expectedEmbedding.length === 0)
        )
        .map((element: ScriptElement) => element.index);


    try {
        // Embed user lines
        setLoadStage('📐 Embedding lines...');
        let embedded: ScriptElement[];
        const embeddingFailedIndexes: number[] = [];
        const unhydratedEmbeddings = new Set(unhydratedEmbeddingLines);

        embedded = await Promise.all(
            script.map((element: ScriptElement) =>
                limit(async () => {
                    if (
                        element.type === 'line' &&
                        unhydratedEmbeddings.has(element.index)
                    ) {
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
        const unhydratedTTS = new Set(unhydratedTTSLines);

        withTTS = await Promise.all(
            embedded.map((element: ScriptElement) =>
                limit(async () => {
                    if (element.type === 'line') {
                        const needsHydration = unhydratedTTS.has(element.index);

                        if (needsHydration) {
                            updateTTSHydrationStatus?.(element.index, 'pending');

                            try {
                                const updated = await addTTS(element, embedded, userID, scriptID, getScriptLine);
                                updateTTSHydrationStatus?.(element.index, 'ready');
                                return updated;
                            } catch (err) {
                                console.warn(`❌ addTTS failed for line ${element.index}`, err);
                                ttsFailedIndexes.push(element.index);
                                return element;
                            }
                        } else {
                            updateTTSHydrationStatus?.(element.index, 'ready');
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
                            retryIndexes.has(element.index)
                        ) {
                            try {
                                const updated = await addTTS(element, withTTS, userID, scriptID, getScriptLine);
                                updateTTSHydrationStatus?.(element.index, 'ready');
                                return updated;
                            } catch (err) {
                                console.warn(`❌ Retry failed for TTS line ${element.index}`, err);

                                retryFailed.push(element.index);
                                updateTTSHydrationStatus?.(element.index, 'failed');

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

        const end = performance.now();
        console.log(`⏱️ Script hydrated in ${(end - start).toFixed(2)} ms`);

        setLoadStage('✅ Script ready!');
        setScript(withTTS);
    } catch (err) {
        // Display load error page
        console.error('❌ Error loading script:', err);
        setLoadStage('❌ Unexpected error loading script');
    }
};

export const hydrateLine = async ({
    line,
    script,
    userID,
    scriptID,
    updateTTSHydrationStatus,
    setStorageError,
}: {
    line: ScriptElement;
    script: ScriptElement[];
    userID: string;
    scriptID: string;
    updateTTSHydrationStatus?: (index: number, status: 'pending' | 'updating' | 'ready' | 'failed') => void;
    setStorageError: (val: boolean) => void;
}): Promise<ScriptElement> => {
    const cacheKey = `script-cache:${userID}:${scriptID}`;

    if (
        line.type !== 'line' ||
        typeof line.text !== 'string' ||
        line.text.trim().length === 0
    ) {
        console.warn(`⚠️ hydrateLineWithTTS: invalid line ${line.index}`);
        return line;
    }

    updateTTSHydrationStatus?.(line.index, 'updating');

    try {
        const updatedLine = await addTTSRegenerate(line, script, userID, scriptID);

        // Update the script with the new line
        const updatedScript = script.map((el) =>
            el.index === updatedLine.index ? updatedLine : el
        );

        // Cache to IndexedDB
        try {
            await set(cacheKey, updatedScript);
            console.log('💾 Script cached successfully');
        } catch (err) {
            console.warn('⚠️ Failed to store script in IndexedDB:', err);
            if (isQuotaExceeded(err)) {
                setStorageError(true);
            }
        }

        updateTTSHydrationStatus?.(line.index, 'ready');
        return updatedLine;
    } catch (err) {
        console.error(`❌ hydrateLineWithTTS failed for line ${line.index}`, err);
        updateTTSHydrationStatus?.(line.index, 'failed');
        return line;
    }
};