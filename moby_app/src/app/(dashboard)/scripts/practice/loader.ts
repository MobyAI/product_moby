import { get, set } from "idb-keyval";
import type { ScriptElement } from "@/types/script";
import { addEmbedding } from "@/lib/api/embeddings";
import { addTTS, addTTSRegenerate } from "@/lib/api/tts";
import { getScript, updateScript } from "@/lib/firebase/client/scripts";
import { embeddingModel } from "@/lib/embeddings/modelManager";
import pLimit from "p-limit";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const isQuotaExceeded = (error: any) =>
    error &&
    (error.name === 'QuotaExceededError' ||
        error.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
        error.message?.includes('maximum size'));

const stripExpectedEmbeddings = (script: ScriptElement[]): ScriptElement[] => {
    return script.map((el) =>
        el.type === 'line' ? { ...el, expectedEmbedding: undefined } : el
    );
};

// Load script
export const loadScript = async ({
    userID,
    scriptID,
    setLoadStage,
    setStorageError,
    setScriptName,
}: {
    userID: string;
    scriptID: string;
    setLoadStage: (stage: string) => void;
    setStorageError: (val: boolean) => void;
    setScriptName: (name: string) => void;
}): Promise<ScriptElement[] | undefined> => {
    if (!userID || !scriptID) return;

    const start = performance.now();

    // IndexedDB key
    const scriptCacheKey = `script-cache:${userID}:${scriptID}`;
    const scriptNameKey = `script-name:${userID}:${scriptID}`;

    // Reset error state
    setStorageError(false);

    try {
        setLoadStage('🔍 Checking local cache...');
        const cachedScript = await get(scriptCacheKey);
        const scriptName = await get(scriptNameKey);

        if (cachedScript && scriptName) {
            const end = performance.now();
            console.log(`⏱️ Script loaded from cache in ${(end - start).toFixed(2)} ms`);

            setLoadStage('✅ Loaded fully hydrated script from cache');
            console.log('✅ Loaded fully hydrated script from cache');
            setScriptName(scriptName);

            return cachedScript;
        } else {
            setLoadStage('🌐 Fetching script from Firestore...');
            const data = await getScript(scriptID);
            const script = data.script;
            const name = data.name;

            // Attempt to cache
            setLoadStage('💾 Caching to IndexedDB...');
            console.log('💾 Caching to IndexedDB...');
            try {
                await set(scriptCacheKey, script);
                await set(scriptNameKey, name);
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
            setScriptName(name);

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
    onProgressUpdate,
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
    onProgressUpdate?: (hydratedCount: number, totalCount: number) => void,
}): Promise<boolean> => {
    if (!userID || !scriptID) return false;

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

    // Attempting to check if url is valid
    // const unhydratedTTSLines: number[] = [];
    // async function validateAudioUrl(url: string, index: number): Promise<boolean> {
    //     return new Promise((resolve) => {
    //         const audio = new Audio();

    //         audio.onloadstart = () => {
    //             console.log('audio check passed!', index);
    //             resolve(true);
    //         };  // Started loading = URL valid

    //         audio.onerror = () => {
    //             console.log('audio check failed...', index);
    //             resolve(false);
    //         };     // Failed = URL invalid

    //         audio.src = url;
    //     });
    // }
    // for (const element of script) {
    //     if (element.type !== 'line') continue;

    //     if (!element.ttsUrl || element.ttsUrl.length === 0) {
    //         unhydratedTTSLines.push(element.index);
    //         continue;
    //     }

    //     const isValid = await validateAudioUrl(element.ttsUrl, element.index);
    //     if (!isValid) {
    //         unhydratedTTSLines.push(element.index);
    //     }
    // }

    // Check if all embeddings are hydrated
    const unhydratedEmbeddingLines = script
        .filter((element: ScriptElement) =>
            element.type === 'line' &&
            (!Array.isArray(element.expectedEmbedding) || element.expectedEmbedding.length === 0)
        )
        .map((element: ScriptElement) => element.index);

    // If nothing needs hydration
    if (unhydratedTTSLines.length === 0 && unhydratedEmbeddingLines.length === 0) {
        console.log('✅ Script already fully hydrated, skipping hydration');

        // Still update TTS status for UI
        script.forEach(element => {
            if (element.type === 'line') {
                updateTTSHydrationStatus?.(element.index, 'ready');
            }
        });

        setLoadStage('✅ Script ready!');
        return false;
    }

    // Load progress setup
    const totalOperations = unhydratedEmbeddingLines.length + unhydratedTTSLines.length;
    let completedOperations = 0;

    try {
        // Embed user lines
        setLoadStage('✍️ Preparing lines');
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
                            completedOperations++;
                            onProgressUpdate?.(completedOperations, totalOperations);
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
            console.log('🔁 Retrying failed lines');
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
                return false;
            }
        }

        // Add TTS audio
        setLoadStage('🎤 Generating audio');
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
                                completedOperations++;
                                onProgressUpdate?.(completedOperations, totalOperations);
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
            console.log('🔁 Retrying failed audio');
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
                return false;
            }
        }

        // Attempt to cache
        setLoadStage('💾 Saving');
        try {
            await set(scriptCacheKey, withTTS);
            console.log('💾 Script cached successfully');
        } catch (err) {
            console.warn('⚠️ Failed to store script in IndexedDB:', err);
            if (isQuotaExceeded(err)) {
                setStorageError(true);
            }
        }

        // Attempt to save update
        setLoadStage('💾 Saving');
        const sanitizedScript = stripExpectedEmbeddings(withTTS);
        try {
            await updateScript(scriptID, sanitizedScript);
        } catch (err) {
            console.warn('⚠️ Failed to save update to database:', err)
        }

        const end = performance.now();
        console.log(`⏱️ Script hydrated in ${(end - start).toFixed(2)} ms`);

        setLoadStage('✅ Resources loaded!');
        setScript(withTTS);
        return true;
    } catch (err) {
        // Display load error page
        console.error('❌ Error loading script:', err);
        setLoadStage('❌ Unexpected error loading script');
        return false;
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

        // Attempt to cache
        try {
            await set(cacheKey, updatedScript);
            console.log('💾 Script cached successfully');
        } catch (err) {
            console.warn('⚠️ Failed to store script in IndexedDB:', err);
            if (isQuotaExceeded(err)) {
                setStorageError(true);
            }
        }

        // Attempt to save update
        const sanitizedScript = stripExpectedEmbeddings(updatedScript);
        try {
            await updateScript(scriptID, sanitizedScript);
        } catch (err) {
            console.warn('⚠️ Failed to save update to database:', err)
        }

        updateTTSHydrationStatus?.(line.index, 'ready');
        return updatedLine;
    } catch (err) {
        console.error(`❌ hydrateLineWithTTS failed for line ${line.index}`, err);
        updateTTSHydrationStatus?.(line.index, 'failed');
        return line;
    }
};

export const initializeEmbeddingModel = async ({
    setLoadStage,
    onProgressUpdate,
}: {
    setLoadStage?: (stage: string) => void;
    onProgressUpdate?: (progress: number) => void;
}): Promise<boolean> => {
    try {
        // Subscribe to model state changes
        const unsubscribe = embeddingModel.onStateChange((state) => {
            if (state.status === 'downloading' && setLoadStage) {
                setLoadStage(`🤖 Setting up for rehearsal (${state.progress}%)...`);
            }
            if (onProgressUpdate && state.status === 'downloading') {
                onProgressUpdate(state.progress);
            }
        });

        // Initialize the model
        await embeddingModel.initialize();

        // Clean up subscription
        unsubscribe();

        return true;
    } catch (error) {
        console.error('Failed to initialize embedding model:', error);
        if (setLoadStage) {
            setLoadStage('⚠️ AI model unavailable (using fallback)');
        }
        return false;
    }
};