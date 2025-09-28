import { useRef, useEffect, useCallback } from "react";
import { fetchEmbedding, cosineSimilarity } from "@/lib/api/embeddings";
import { embeddingModel } from "@/lib/embeddings/modelManager";
import * as fuzz from "fuzzball";

//
// IMPORTANT: For openAI embedding: choose server near openAI's server for lower latency
//

interface UseDeepgramSTTProps {
    lineEndKeywords: string[];
    onCueDetected: (transcript: string) => void;
    onSilenceTimeout?: () => void;
    onProgressUpdate?: (matchedCount: number) => void;
    silenceTimers?: {
        /** When user is silent during their turn, auto-skip to next line */
        skipToNextMs?: number;
        /** When there is general inactivity, pause/cleanup the stream */
        inactivityPauseMs?: number;
    };
}

interface OptimizedMatchingState {
    normalizedScript: number[];
    matchedIndices: Set<number>;
    lastMatchedIndex: number;
    lastReportedCount: number;
    wordCache: Map<string, string>;
}

class OptimizedSTTMatcher {
    private state: OptimizedMatchingState;
    private originalWordCount: number = 0;
    private onProgressUpdate: (count: number) => void;
    private updateThrottleRef: ReturnType<typeof setTimeout> | null = null;
    private prevTranscriptWords: number[] = [];

    constructor(onProgressUpdate: (count: number) => void) {
        this.onProgressUpdate = onProgressUpdate;
        this.state = {
            normalizedScript: [],
            matchedIndices: new Set(),
            lastMatchedIndex: -1,
            lastReportedCount: 0,
            wordCache: new Map()
        };
    }

    setCurrentLineText(cleanedText: string, originalText?: string) {
        this.state.matchedIndices.clear();
        this.state.lastMatchedIndex = -1;
        this.state.lastReportedCount = 0;
        this.state.wordCache.clear();

        // Store original word count if provided
        if (originalText) {
            this.originalWordCount = originalText.trim().split(/\s+/).length;
        } else {
            this.originalWordCount = cleanedText.trim().split(/\s+/).length;
        }

        this.state.normalizedScript = cleanedText
            .trim()
            .split(/\s+/)
            .map(word => this.hashWord(this.normalizeWordCached(word)));

        this.prevTranscriptWords = [];
    }

    private normalizeWordCached(word: string): string {
        if (this.state.wordCache.has(word)) {
            return this.state.wordCache.get(word)!;
        }

        const normalized = word.toLowerCase().replace(/[^\w]/g, '');
        this.state.wordCache.set(word, normalized);
        return normalized;
    }

    private hashWord(word: string): number {
        let hash = 0;
        for (let i = 0; i < word.length; i++) {
            hash = ((hash << 5) - hash) + word.charCodeAt(i);
            hash |= 0;
        }
        return hash;
    }

    private optimizedProgressiveMatch(transcript: string): number {
        if (!this.state.normalizedScript.length) return 0;

        const transcriptWords = transcript
            .trim()
            .split(/\s+/)
            .map(word => this.hashWord(this.normalizeWordCached(word)))
            .filter(Boolean);

        if (!transcriptWords.length) return this.state.lastMatchedIndex + 1;

        let newWordsStartIndex = 0;

        while (
            newWordsStartIndex < transcriptWords.length &&
            newWordsStartIndex < this.prevTranscriptWords.length &&
            transcriptWords[newWordsStartIndex] === this.prevTranscriptWords[newWordsStartIndex]
        ) {
            newWordsStartIndex++;
        }

        const newWords = transcriptWords.slice(newWordsStartIndex);

        this.prevTranscriptWords = transcriptWords;

        let searchStartIndex = Math.max(0, this.state.lastMatchedIndex + 1);

        for (const spokenWord of newWords) {
            const windowEnd = Math.min(
                this.state.normalizedScript.length,
                searchStartIndex + 4
            );

            for (let i = searchStartIndex; i < windowEnd; i++) {
                if (
                    !this.state.matchedIndices.has(i) &&
                    this.state.normalizedScript[i] === spokenWord
                ) {
                    this.state.matchedIndices.add(i);
                    this.state.lastMatchedIndex = i;
                    searchStartIndex = i + 1;
                    break;
                }
            }
        }

        return this.state.lastMatchedIndex + 1;
    }

    private throttledUpdate(count: number) {
        if (this.updateThrottleRef) {
            clearTimeout(this.updateThrottleRef);
        }

        this.updateThrottleRef = setTimeout(() => {
            if (count > this.state.lastReportedCount) {
                this.state.lastReportedCount = count;
                this.onProgressUpdate(count);
            }
            this.updateThrottleRef = null;
        }, 50);
    }

    processTranscript(transcript: string, isInterim: boolean = false) {
        const matchCount = this.optimizedProgressiveMatch(transcript);

        if (isInterim) {
            this.throttledUpdate(matchCount);
        } else {
            if (matchCount > this.state.lastReportedCount) {
                this.state.lastReportedCount = matchCount;
                this.onProgressUpdate(matchCount);
            }
        }
    }

    completeCurrentLine() {
        const totalWords = this.originalWordCount || this.state.normalizedScript.length;

        if (totalWords > 0) {
            this.state.lastReportedCount = totalWords;
            this.onProgressUpdate(totalWords);
        }

        this.prevTranscriptWords = [];
    }

    getNormalizedScript(): number[] {
        return this.state.normalizedScript;
    }
}

export function useDeepgramSTT({
    lineEndKeywords,
    onCueDetected,
    onSilenceTimeout,
    onProgressUpdate,
    silenceTimers,
}: UseDeepgramSTTProps) {
    // STT setup
    const wsRef = useRef<WebSocket | null>(null);
    const micStreamRef = useRef<MediaStream | null>(null);
    const isActiveRef = useRef(false);
    const isInitializingRef = useRef(false);
    const silenceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const pauseTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const micCleanupRef = useRef<(() => void) | null>(null);
    const audioCtxRef = useRef<AudioContext | null>(null);
    const DEFAULT_TIMERS = useRef({ skipToNextMs: 4000, inactivityPauseMs: 15000 });
    const timersRef = useRef({
        ...DEFAULT_TIMERS.current,
        ...(silenceTimers ?? {}),
    });
    const sttControlRef = useRef({
        processTranscripts: false
    });
    const connectionStateRef = useRef({
        reconnectAttempts: 0,
        maxReconnectAttempts: 3
    });

    // Cue detection
    const fullTranscript = useRef<string[]>([]);
    const lastTranscriptRef = useRef<string | null>(null);
    const repeatCountRef = useRef<number>(0);
    const repeatStartTimeRef = useRef<number | null>(null);
    const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const hasTriggeredRef = useRef(false);
    const processingState = useRef({
        lastProcessedTranscript: '',
        isProcessing: false,
        lastSpeechFinalTime: 0,
        utteranceEndTimeout: null as ReturnType<typeof setTimeout> | null
    });

    // Initialize matcher
    const matcherRef = useRef<OptimizedSTTMatcher | null>(null);
    const currentLineTextRef = useRef<string>("");

    useEffect(() => {
        if (onProgressUpdate) {
            matcherRef.current = new OptimizedSTTMatcher(onProgressUpdate);

            if (currentLineTextRef.current) {
                matcherRef.current.setCurrentLineText(currentLineTextRef.current);
            }
        }
    }, [onProgressUpdate]);

    const setCurrentLineText = useCallback((text: string) => {
        // Remove all content within brackets and parenthesis
        const sanitized = text
            .replace(/\[.*?\]/g, '')   // remove [ ... ]
            .replace(/\(.*?\)/g, '')   // remove ( ... )
            .trim();

        // Clean up any double spaces that might result from removal
        const cleaned = sanitized.replace(/\s+/g, ' ');

        currentLineTextRef.current = cleaned;

        // If matcher doesn't exist yet, create it
        if (!matcherRef.current && onProgressUpdate) {
            console.log('[Matcher] Creating matcher on-demand');
            matcherRef.current = new OptimizedSTTMatcher(onProgressUpdate);
        }

        if (matcherRef.current) {
            matcherRef.current.setCurrentLineText(cleaned, text);
        } else {
            console.warn('[Matcher] matcherRef.current is NULL!');
        }
    }, [onProgressUpdate]);

    // STT helpers
    const triggerNextLine = (transcript: string) => {
        if (hasTriggeredRef.current) return false;
        hasTriggeredRef.current = true;

        if (matcherRef.current) {
            matcherRef.current.completeCurrentLine();
        }

        pauseSTT(false);
        onCueDetected(transcript);
        return true;
    };

    useEffect(() => {
        timersRef.current = {
            ...DEFAULT_TIMERS.current,
            ...(silenceTimers ?? {}),
        };
    }, [silenceTimers]);

    const resetSilenceTimeout = () => {
        if (silenceTimeoutRef.current) clearTimeout(silenceTimeoutRef.current);
        silenceTimeoutRef.current = setTimeout(() => {
            console.log('🛑 Silence timeout — stopping Deepgram STT to save usage.');
            cleanupSTT();
            onSilenceTimeout?.();
        }, timersRef.current.inactivityPauseMs);
    };

    const resetSilenceTimer = (spokenLine: string) => {
        if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = setTimeout(() => {
            if (hasTriggeredRef.current) return;
            console.log('⏳ Silence timer triggered. Skipping to next line.');
            triggerNextLine(spokenLine);
        }, timersRef.current.skipToNextMs);
    };

    // Helper functions
    const matchesEndPhrase = (transcript: string, keywords: string[]) => {
        const normalize = (text: string) =>
            text.toLowerCase().replace(/[\s.,!?'"“”\-]+/g, ' ').trim();

        const normTranscript = normalize(transcript);

        return keywords.every((kw) =>
            normTranscript.includes(normalize(kw))
        );
    };

    function tokens(s: string) {
        return s.trim().split(/\s+/).filter(Boolean);
    }

    function tailText(s: string, W: number) {
        const t = tokens(s);
        return t.slice(-W).join(" ");
    }

    const TAIL_WINDOWS = [6, 10, 15];
    const LOCAL_SIM_THRESHOLD = 0.8;
    const API_SIM_THRESHOLD = 0.8;

    const handleFinalization = async (spokenLine: string) => {
        const start = performance.now();

        // 1) Exact keyword
        if (matchesEndPhrase(spokenLine, lineEndKeywords)) {
            const end = performance.now();
            console.log(`⚡ Keyword match passed in: ${(end - start).toFixed(2)}ms`);
            triggerNextLine(spokenLine);
            return;
        }

        // 2) Fuzzy keyword match
        if (fuzzyMatchEndKeywords(spokenLine, lineEndKeywords)) {
            const end = performance.now();
            console.log(`🤏 Fuzzy match passed in ${(end - start).toFixed(2)}ms`);
            triggerNextLine(spokenLine);
            return;
        }

        // 3) Semantic (sliding tail windows with multi-window max)
        const expectedLine = currentLineTextRef.current;
        if (!expectedLine) return;

        try {
            if (embeddingModel.isReady()) {
                // Local model path — compute similarity for each W, take the max
                const sims = await Promise.all(
                    TAIL_WINDOWS.map(async (W) => {
                        const sTail = tailText(spokenLine, W);
                        const eTail = tailText(expectedLine, W);
                        const sim = await embeddingModel.getSimilarity(sTail, eTail);
                        return { W, sim };
                    })
                );

                const best = sims.reduce((a, b) => (b.sim > a.sim ? b : a));
                console.log("🧩 Tail sims (local):", sims, "best:", best);

                if (best.sim >= LOCAL_SIM_THRESHOLD) {
                    const end = performance.now();
                    console.log(`✅ Semantic similarity (local) passed in ${(end - start).toFixed(2)}ms`);

                    triggerNextLine(spokenLine);
                    return;
                }
            } else {
                // Fallback to api call if model isn't ready
                console.log("Using fallback for similarity...");

                const [spokenEmbedding, expectedEmbedding] = await Promise.all([
                    fetchEmbedding(spokenLine),
                    fetchEmbedding(expectedLine),
                ]);

                if (spokenEmbedding && expectedEmbedding) {
                    const similarity = cosineSimilarity(spokenEmbedding, expectedEmbedding);
                    console.log("Similarity (API):", similarity);

                    if (similarity > API_SIM_THRESHOLD) {
                        console.log("✅ Similarity passed (API)!");
                        triggerNextLine(spokenLine);
                        return;
                    }
                }
            }
        } catch (error) {
            console.error("Similarity check failed:", error);
        }
    };

    const handleKeywordMatch = async (spokenLine: string) => {
        const start = performance.now();

        if (matchesEndPhrase(spokenLine, lineEndKeywords)) {
            const end = performance.now();
            console.log(`⚡ Keyword match passed in: ${(end - start).toFixed(2)}ms`);
            triggerNextLine(spokenLine);
        } else {
            console.log('Keyword match failed.');
        }

        // if (fuzzyMatchEndKeywords(spokenLine, lineEndKeywords)) {
        //     const end = performance.now();
        //     console.log(`🤏 Fuzzy match passed in ${(end - start).toFixed(2)}ms`);
        //     triggerNextLine(spokenLine);
        //     return;
        // }
    };

    const normalize = (text: string) =>
        text.toLowerCase().replace(/[\s.,!?'"“”\-]+/g, ' ').trim();

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const extractLastSentence = (text: string): string => {
        const sentences = text.split(/(?<=[.!?])\s+/);
        return sentences[sentences.length - 1] ?? text;
    };

    const fuzzyMatchEndKeywords = (
        transcript: string,
        keywords: string[],
        threshold = 80
    ): boolean => {
        const normTranscript = normalize(transcript);
        const words = normTranscript.split(/\s+/);

        return keywords.every((kw) => {
            const normKw = normalize(kw);
            return words.some((w) => {
                const score = fuzz.ratio(normKw, w);
                // console.log(`🔍 Comparing "${normKw}" with "${w}" → Score: ${score}`);
                return score >= threshold;
            });
        });
    };

    // Helper functions
    function shouldProcessTranscript(fullSpokenLine: string) {
        // Prevent duplicate processing of same transcript
        if (fullSpokenLine === processingState.current.lastProcessedTranscript) {
            console.log('⏭️ Duplicate transcript - skipping');
            return false;
        }

        // Prevent concurrent processing
        if (processingState.current.isProcessing) {
            console.log('⏭️ Already processing - skipping');
            return false;
        }

        const expectedWords = matcherRef.current?.getNormalizedScript();
        const spokenWords = fullSpokenLine.trim().split(/\s+/);

        if (!expectedWords) return false;

        return spokenWords.length >= Math.floor(expectedWords.length * 0.80);
    }

    async function processTranscript(fullSpokenLine: string, trigger: string) {
        // Mark as processing
        processingState.current.isProcessing = true;
        processingState.current.lastProcessedTranscript = fullSpokenLine;

        const expectedWords = matcherRef.current?.getNormalizedScript();
        const spokenWords = fullSpokenLine.trim().split(/\s+/);

        try {
            // Auto trigger at 100% or more
            if (expectedWords && spokenWords.length >= expectedWords.length) {
                console.log(`✅ [${trigger}] Full line spoken — triggering next line automatically.`);
                triggerNextLine(fullSpokenLine);
                return;
            }

            console.log(`🟡 [${trigger}] transcript accepted! Handling finalization...`);
            await handleFinalization(fullSpokenLine);

        } finally {
            // Always clear processing flag
            processingState.current.isProcessing = false;
        }
    }

    const initializeSTT = async () => {
        if (isInitializingRef.current) {
            console.warn('⏳ initializeSTT already in progress — skipping duplicate call');
            return;
        }
        isInitializingRef.current = true;

        if (!sttControlRef.current) {
            sttControlRef.current = {
                processTranscripts: false
            };
        }

        try {
            if (!wsRef.current || wsRef.current.readyState === WebSocket.CLOSED) {
                console.log('🔌 Creating WebSocket connection...');
                wsRef.current = new WebSocket('wss://deepgram-websocket-server.onrender.com');


                wsRef.current.onmessage = async (event: MessageEvent) => {
                    if (!sttControlRef.current.processTranscripts) {
                        return; // Silently ignore when not user's turn
                    }

                    if (hasTriggeredRef.current) {
                        console.log('⛔ Cue already triggered — skipping further STT events');
                        return;
                    }

                    const raw = event.data;
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    let data: any;

                    try {
                        const text = raw instanceof Blob ? await raw.text() : raw;
                        data = JSON.parse(text);
                    } catch (err) {
                        console.warn('❌ Could not parse WebSocket data:', err);
                        return;
                    }

                    const transcript: string = data.channel?.alternatives?.[0]?.transcript || '';

                    if (transcript) {
                        console.log(`[🎙️] Transcript chunk at ${performance.now().toFixed(2)}ms:`, transcript);
                        resetSilenceTimeout();
                        resetSilenceTimer(transcript);

                        // if (onProgressUpdate && transcript) {
                        //     const scriptWords = expectedScriptWordsRef.current;

                        //     if (scriptWords && !hasTriggeredRef.current) {
                        //         const matchCount = progressiveWordMatch(scriptWords, transcript, matchedScriptIndices.current);

                        //         if (matchCount > lastReportedCount.current) {
                        //             lastReportedCount.current = matchCount;
                        //             onProgressUpdate(matchCount);
                        //         }
                        //     }
                        // }

                        if (transcript === lastTranscriptRef.current) {
                            repeatCountRef.current += 1;
                            if (!repeatStartTimeRef.current) {
                                repeatStartTimeRef.current = performance.now();
                            }
                        } else {
                            repeatCountRef.current = 1;
                            repeatStartTimeRef.current = performance.now();

                            if (matcherRef.current && !hasTriggeredRef.current) {
                                matcherRef.current.processTranscript(transcript);
                            }
                        }

                        lastTranscriptRef.current = transcript;

                        const now = performance.now();
                        const repeatDuration = now - (repeatStartTimeRef.current ?? now);

                        if (
                            repeatCountRef.current >= 2 &&
                            repeatDuration >= 400
                        ) {
                            console.log('🟡 Stable transcript detected — forcing early match');
                            await handleKeywordMatch(transcript);
                            repeatCountRef.current = 0;
                            repeatStartTimeRef.current = null;
                        }
                    }

                    if (data.channel && transcript) {
                        // Only process is_final if speech_final is NOT true
                        // (speech_final always includes is_final)
                        if (data.is_final && !data.speech_final) {
                            console.log(`🟡 [is_final only] detected @ ${performance.now().toFixed(2)}ms`);

                            fullTranscript.current.push(transcript);
                            const fullSpokenLine = fullTranscript.current.join(' ');

                            console.log('Processing is: ', fullSpokenLine);
                            if (shouldProcessTranscript(fullSpokenLine)) {
                                await handleKeywordMatch(fullSpokenLine);
                            }
                        }

                        // speech_final is the primary trigger
                        if (data.speech_final) {
                            console.log(`🟡 [speech_final] detected @ ${performance.now().toFixed(2)}ms`);

                            // Mark that we got a speech_final
                            processingState.current.lastSpeechFinalTime = Date.now();

                            fullTranscript.current.push(transcript);
                            const fullSpokenLine = fullTranscript.current.join(' ');

                            // Clear any pending utteranceEnd timeout since speech_final handled it
                            if (processingState.current.utteranceEndTimeout) {
                                clearTimeout(processingState.current.utteranceEndTimeout);
                                processingState.current.utteranceEndTimeout = null;
                            }

                            console.log('Processing speech_final: ', fullSpokenLine);
                            if (shouldProcessTranscript(fullSpokenLine)) {
                                await processTranscript(fullSpokenLine, 'speech_final');
                            } else {
                                console.log('❌ Should Process Transcript Failed');
                            }
                        }
                    }

                    // UtteranceEnd as fallback only
                    if (data.type === "UtteranceEnd") {
                        console.log(`🟣 [utterance_end] detected @ ${performance.now().toFixed(2)}ms`);

                        // Check if speech_final just fired (within last 500ms)
                        const timeSinceSpeechFinal = Date.now() - processingState.current.lastSpeechFinalTime;

                        if (timeSinceSpeechFinal < 500) {
                            console.log(`⏭️ Ignoring UtteranceEnd - speech_final just fired ${timeSinceSpeechFinal}ms ago`);
                            return;
                        }

                        // Delay slightly to see if speech_final is coming
                        processingState.current.utteranceEndTimeout = setTimeout(async () => {
                            const fullSpokenLine = fullTranscript.current.join(' ');

                            if (shouldProcessTranscript(fullSpokenLine)) {
                                await processTranscript(fullSpokenLine, 'utterance_end');
                            }
                        }, 100); // Small delay to let speech_final win if it's coming
                    }
                };

                wsRef.current.onopen = () => {
                    console.log('✅ WebSocket connected to Deepgram');
                    resetSilenceTimeout();
                    connectionStateRef.current.reconnectAttempts = 0;
                };

                wsRef.current.onerror = (e) => {
                    console.warn('❌ WebSocket error:', e);
                };

                wsRef.current.onclose = (e) => {
                    console.log('🔌 WebSocket closed:', e.code, e.reason);

                    // Determine if we should reconnect based on close code
                    let shouldReconnect = false;
                    let reconnectDelay = 1000;

                    switch (e.code) {
                        case 1000: // Normal closure
                            // Could be idle timeout - maybe reconnect
                            shouldReconnect = isActiveRef.current; // Only if we're supposed to be active
                            break;

                        case 1001: // Going away (page closing)
                            shouldReconnect = false;
                            break;

                        case 1006: // Abnormal closure (no close frame)
                            // Almost always a network issue - definitely reconnect
                            shouldReconnect = true;
                            break;

                        case 1011: // Server error
                            shouldReconnect = true;
                            reconnectDelay = 3000; // Wait longer for server issues
                            break;

                        case 1012: // Service restart
                        case 1013: // Try again later
                            shouldReconnect = true;
                            reconnectDelay = 5000;
                            break;

                        default:
                            if (e.code >= 3000 && e.code < 4000) {
                                // Library/framework specific codes - usually don't reconnect
                                shouldReconnect = false;
                            } else if (e.code >= 4000 && e.code < 5000) {
                                // Application errors - often temporary
                                shouldReconnect = true;
                            }
                    }

                    if (shouldReconnect && connectionStateRef.current.reconnectAttempts < connectionStateRef.current.maxReconnectAttempts) {
                        const attemptNumber = connectionStateRef.current.reconnectAttempts + 1;
                        console.log(`🔄 Will reconnect in ${reconnectDelay}ms (attempt ${attemptNumber}/${connectionStateRef.current.maxReconnectAttempts})`);

                        setTimeout(() => {
                            // Double-check we still should reconnect (component might have unmounted)
                            if (audioCtxRef.current) {
                                connectionStateRef.current.reconnectAttempts++;
                                wsRef.current = null;
                                initializeSTT();
                            }
                        }, reconnectDelay);
                    } else if (shouldReconnect) {
                        console.log('❌ Max reconnection attempts reached');
                    }
                };
            } else {
                console.log('🔌 Reusing existing WebSocket connection');
            }

            // ✅ Clean up any existing worklet/mic routing
            if (micCleanupRef.current) {
                console.log('♻️ Cleaning up existing mic/processor before reinitializing');
                micCleanupRef.current();
                micCleanupRef.current = null;
            }

            // 🎛️ AudioContext
            if (!audioCtxRef.current || audioCtxRef.current.state === 'closed') {
                audioCtxRef.current = new AudioContext();
                console.log("🎛️ Creating new AudioContext - sampleRate:", audioCtxRef.current.sampleRate);
                try {
                    await audioCtxRef.current.audioWorklet.addModule('/linearPCMProcessor.js');
                    console.log('✅ AudioWorklet module loaded!');
                } catch (err) {
                    console.error('❌ Failed to load AudioWorklet module:', err);
                    return;
                }
            } else {
                console.log('🎛️ Reusing existing AudioContext');
            }

            // 🎤 Microphone
            if (!micStreamRef.current) {
                try {
                    console.log('🎤 Requesting mic stream...');
                    micStreamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true });
                    console.log('✅ Mic stream obtained');
                } catch (err) {
                    console.error('❌ Failed to get mic stream:', err);
                    return;
                }
            } else {
                console.log('🎤 Reusing existing mic stream');
            }

            // 🔗 Audio routing
            const audioCtx = audioCtxRef.current!;
            const micStream = micStreamRef.current!;
            const source = audioCtx.createMediaStreamSource(micStream);

            const workletNode = new AudioWorkletNode(audioCtx, 'linear-pcm-processor', {
                numberOfInputs: 1,
                numberOfOutputs: 1,
                channelCount: 1,
            });

            workletNode.port.onmessage = (e: MessageEvent) => {
                const message = e.data;

                if (message.type === 'audio') {
                    if (wsRef.current?.readyState === WebSocket.OPEN) {
                        wsRef.current.send(message.data);
                    }
                }
            };

            try {
                source.connect(workletNode);
                workletNode.connect(audioCtx.destination);
            } catch (err) {
                console.error('⚠️ Failed to connect audio nodes:', err);
            }

            micCleanupRef.current = () => {
                console.log('🧹 Disconnecting mic and worklet');
                workletNode.port.onmessage = null;
                source.disconnect();
                workletNode.disconnect();
            };

            console.log('✅ STT initialized — mic and worklet connected');
        } finally {
            isInitializingRef.current = false;
        }
    };

    const resumeAudioContext = async () => {
        try {
            if (audioCtxRef.current?.state === 'suspended') {
                await audioCtxRef.current.resume();
            }
        } catch (err) {
            console.warn('⚠️ Failed to resume AudioContext:', err);
        }
    };

    const startSTT = async () => {
        if (isActiveRef.current) return;

        // Clear pause timeout since we're resuming
        if (pauseTimeoutRef.current) {
            clearTimeout(pauseTimeoutRef.current);
            pauseTimeoutRef.current = null;
        }

        isActiveRef.current = true;
        sttControlRef.current.processTranscripts = true;
        hasTriggeredRef.current = false;
        fullTranscript.current = [];

        await resumeAudioContext();

        if (!audioCtxRef.current || !micStreamRef.current || !wsRef.current) {
            console.warn('⚠️ STT not initialized — call initializeSTT() first');
            return;
        }
    };

    const pauseSTT = (isManualPause = false) => {
        const end = performance.now();
        console.log(`⏸️ pauseSTT triggered @ ${end}`);

        // Disable transcript processing
        sttControlRef.current.processTranscripts = false;

        // Only start pause timeout for manual pauses
        if (isManualPause) {
            if (pauseTimeoutRef.current) {
                clearTimeout(pauseTimeoutRef.current);
            }
            pauseTimeoutRef.current = setTimeout(() => {
                console.log('⏰ Pause timeout - cleaning up after extended pause');
                cleanupSTT();
            }, 60000);    // Cleanup and close websocket if paused for over 60 seconds
        }

        // ⏲️ Clear silence timeout
        if (silenceTimeoutRef.current) {
            clearTimeout(silenceTimeoutRef.current);
            silenceTimeoutRef.current = null;
        }

        // ⏲️ Clear silence detection timer
        if (silenceTimerRef.current) {
            clearTimeout(silenceTimerRef.current);
            silenceTimerRef.current = null;
        }

        // Clear processing state timeout
        if (processingState.current.utteranceEndTimeout) {
            clearTimeout(processingState.current.utteranceEndTimeout);
            processingState.current.utteranceEndTimeout = null;
        }

        isActiveRef.current = false;
    };

    const cleanupSTT = () => {
        pauseSTT(false);

        // Clear pause timeout if it exists
        if (pauseTimeoutRef.current) {
            clearTimeout(pauseTimeoutRef.current);
            pauseTimeoutRef.current = null;
        }

        // 🔌 Close WebSocket connection
        if (wsRef.current) {
            console.log('🔌 Closing WebSocket connection...');

            // Clear handlers BEFORE closing to prevent any final events
            wsRef.current.onmessage = null;
            wsRef.current.onopen = null;
            wsRef.current.onerror = null;
            wsRef.current.onclose = null;

            // Only close if not already closed/closing
            if (wsRef.current.readyState === WebSocket.OPEN ||
                wsRef.current.readyState === WebSocket.CONNECTING) {
                try {
                    wsRef.current.close(1000, 'Cleaning up STT');
                } catch (err) {
                    console.warn('⚠️ Error closing WebSocket:', err);
                }
            }

            wsRef.current = null;
        }

        // 💥 Disconnect audio routing
        if (micCleanupRef.current) {
            micCleanupRef.current();
            micCleanupRef.current = null;
        }

        // 💥 Stop mic stream
        if (micStreamRef.current) {
            micStreamRef.current.getTracks().forEach((track) => track.stop());
            micStreamRef.current = null;
        }

        // 💥 Close AudioContext
        if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
            audioCtxRef.current.close().catch((err) => {
                console.warn('⚠️ Error closing AudioContext:', err);
            });
            audioCtxRef.current = null;
        }
    };

    return { startSTT, pauseSTT, initializeSTT, cleanupSTT, setCurrentLineText };
}