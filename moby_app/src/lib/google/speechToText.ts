import { useRef, useEffect, useCallback } from "react";
import { fetchEmbedding, cosineSimilarity } from "@/lib/api/embeddings";
import { embeddingModel } from "@/lib/embeddings/modelManager";
import * as fuzz from "fuzzball";

//
// IMPORTANT: For openAI embedding: choose server near openAI's server for lower latency
//

interface UseGoogleSTTProps {
    lineEndKeywords: string[];
    onCueDetected: (transcript: string) => void;
    onSilenceTimeout?: () => void;
    expectedEmbedding?: number[];
    onProgressUpdate?: (matchedCount: number) => void;
    silenceTimers?: {
        /** When user is silent during their turn, auto-skip to next line */
        skipToNextMs?: number;
        /** When there is general inactivity, pause/cleanup the stream */
        inactivityPauseMs?: number;
    };
    onError?: (error: {
        type: 'websocket' | 'microphone' | 'audio-context' | 'network';
        message1: string;
        message2: string;
        recoverable: boolean;
    }) => void;
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
    private onProgressUpdate: (count: number) => void;
    private updateThrottleRef: ReturnType<typeof setTimeout> | null = null;
    private prevTranscriptWords: number[] = [];
    public originalWordCount: number = 0;

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

    setCurrentLineText(text: string) {
        this.state.matchedIndices.clear();
        this.state.lastMatchedIndex = -1;
        this.state.lastReportedCount = 0;
        this.state.wordCache.clear();

        this.state.normalizedScript = text
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
        // Use the original word count if available, otherwise fall back to sanitized count
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

export function useGoogleSTT({
    lineEndKeywords,
    onCueDetected,
    onSilenceTimeout,
    // expectedEmbedding,
    onProgressUpdate,
    silenceTimers,
    onError,
}: UseGoogleSTTProps) {
    // STT setup
    const wsRef = useRef<WebSocket | null>(null);
    const micStreamRef = useRef<MediaStream | null>(null);
    const isActiveRef = useRef(false);
    const isInitializingRef = useRef(false);
    const silenceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const micCleanupRef = useRef<(() => void) | null>(null);
    const audioCtxRef = useRef<AudioContext | null>(null);
    const DEFAULT_TIMERS = useRef({ skipToNextMs: 4000, inactivityPauseMs: 15000 });
    const timersRef = useRef({
        ...DEFAULT_TIMERS.current,
        ...(silenceTimers ?? {}),
    });

    // Cue detection
    const fullTranscript = useRef<string[]>([]);
    const lastTranscriptRef = useRef<string | null>(null);
    const repeatCountRef = useRef<number>(0);
    const repeatStartTimeRef = useRef<number | null>(null);
    const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const hasTriggeredRef = useRef(false);

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
        // Store the original text for word count purposes
        const originalWords = text.trim().split(/\s+/);
        const originalWordCount = originalWords.length;

        // Remove all content within brackets including the brackets
        const sanitized = text.replace(/\[.*?\]/g, '').trim();

        // Clean up any double spaces that might result from removal
        const cleaned = sanitized.replace(/\s+/g, ' ');

        currentLineTextRef.current = cleaned;

        // If matcher doesn't exist yet, create it
        if (!matcherRef.current && onProgressUpdate) {
            console.log('[Matcher] Creating matcher on-demand');
            matcherRef.current = new OptimizedSTTMatcher(onProgressUpdate);
        }

        if (matcherRef.current) {
            matcherRef.current.setCurrentLineText(text);
            matcherRef.current.originalWordCount = originalWordCount;
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

        pauseSTT();
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
            console.log('🛑 Silence timeout. Pausing audio stream.');
            pauseSTT();
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

    const initializeSTT = async () => {
        if (isInitializingRef.current) {
            console.warn('⏳ initializeSTT already in progress — skipping duplicate call');
            return;
        }

        isInitializingRef.current = true;

        try {
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

    // Original version (may be broken)
    // const startSTT = async () => {
    //     if (isActiveRef.current) return;

    //     isActiveRef.current = true;
    //     hasTriggeredRef.current = false;
    //     fullTranscript.current = [];

    //     await resumeAudioContext();

    //     if (!audioCtxRef.current || !micStreamRef.current) {
    //         console.warn('⚠️ STT not initialized — call initializeSTT() first');
    //         return;
    //     }

    //     if (wsRef.current) {
    //         wsRef.current.onmessage = null;
    //         wsRef.current.onopen = null;
    //         wsRef.current.onerror = null;
    //         wsRef.current.onclose = null;
    //     }

    //     // Clean up old WebSocket
    //     if (wsRef.current) {
    //         console.log('Cleaning old WebSocket');
    //         wsRef.current.close();
    //     }

    //     try {
    //         wsRef.current = new WebSocket('wss://google-stt.fly.dev');
    //         console.log('New WebSocket created successfully');
    //     } catch (err) {
    //         console.error('ERROR creating WebSocket:', err);
    //         return;
    //     }

    //     wsRef.current.onmessage = async (event: MessageEvent) => {
    //         if (hasTriggeredRef.current) return;

    //         const raw = event.data;
    //         // eslint-disable-next-line @typescript-eslint/no-explicit-any
    //         let data: any;

    //         try {
    //             const text = raw instanceof Blob ? await raw.text() : raw;
    //             data = JSON.parse(text);
    //         } catch (err) {
    //             console.warn('❌ WebSocket data error:', err);
    //             return;
    //         }

    //         const transcript: string = data.channel?.alternatives?.[0]?.transcript || '';
    //         const isFinal = data.is_final;

    //         if (transcript) {
    //             console.log(`[🎙️] Transcript chunk at ${performance.now().toFixed(2)}ms:`, transcript);
    //             resetSilenceTimeout();
    //             resetSilenceTimer(transcript);

    //             if (transcript === lastTranscriptRef.current) {
    //                 repeatCountRef.current += 1;
    //                 if (!repeatStartTimeRef.current) {
    //                     repeatStartTimeRef.current = performance.now();
    //                 }
    //             } else {
    //                 repeatCountRef.current = 1;
    //                 repeatStartTimeRef.current = performance.now();

    //                 if (matcherRef.current && !hasTriggeredRef.current) {
    //                     matcherRef.current.processTranscript(transcript, !isFinal);
    //                 }
    //             }

    //             lastTranscriptRef.current = transcript;

    //             const now = performance.now();
    //             const repeatDuration = now - (repeatStartTimeRef.current ?? now);

    //             if (repeatCountRef.current >= 2 && repeatDuration >= 400) {
    //                 console.log('🟡 Stable transcript detected — forcing early match');
    //                 await handleKeywordMatch(transcript);
    //                 repeatCountRef.current = 0;
    //                 repeatStartTimeRef.current = null;
    //             }
    //         }

    //         if (isFinal && transcript) {
    //             console.log(`🟡 Google is_final detected @ ${performance.now().toFixed(2)}ms: ${transcript}`);

    //             fullTranscript.current.push(transcript);

    //             const fullSpokenLine = fullTranscript.current.join(' ');
    //             const expectedWords = matcherRef.current?.getNormalizedScript();
    //             const spokenWords = fullSpokenLine.trim().split(/\s+/);

    //             if (expectedWords && spokenWords.length >= expectedWords.length) {
    //                 console.log("✅ Full line spoken — triggering next line automatically.");
    //                 triggerNextLine(fullSpokenLine);
    //                 return;
    //             }

    //             const isLongEnough = expectedWords && spokenWords.length >= Math.floor(expectedWords.length * 0.75);
    //             const lengthRatio = expectedWords && spokenWords.length / expectedWords.length;
    //             // const isLongEnough = expectedWords && spokenWords.length >= expectedWords.length;
    //             console.log('Long enough?', lengthRatio);

    //             if (isLongEnough) {
    //                 console.log(`🟡 Google Final transcript accepted @ ${performance.now().toFixed(2)}ms! Handling finalization...`);
    //                 await handleFinalization(fullSpokenLine);
    //             } else {
    //                 console.log(`⏹️ Google Final transcript too short — skipping!`);
    //             }
    //         }
    //     };

    //     wsRef.current.onopen = async () => {
    //         if (!isActiveRef.current) return;

    //         // micCleanupRef.current = await streamMic(wsRef);

    //         resetSilenceTimeout();
    //     };

    //     wsRef.current.onerror = (e) => {
    //         console.warn('❌ WebSocket error:', e);
    //     };

    //     wsRef.current.onclose = (e) => {
    //         console.log('🔌 WebSocket closed:', e.code, e.reason);
    //     };
    // };

    // New version (attempted fix)
    const startSTT = async () => {
        console.log('1. startSTT called');

        if (isActiveRef.current) return;
        console.log('2. Not active, proceeding');

        isActiveRef.current = true;
        hasTriggeredRef.current = false;
        fullTranscript.current = [];
        console.log('3. Refs set to true');

        await resumeAudioContext();
        console.log('4. Audio context resumed');

        if (!audioCtxRef.current || !micStreamRef.current) {
            console.warn('⚠️ STT not initialized — call initializeSTT() first');
            isActiveRef.current = false;
            return;
        }
        console.log('5. Audio initialized OK');

        // Clean up old WebSocket
        if (wsRef.current) {
            console.log('6. Cleaning old WebSocket');
            wsRef.current.close();
        }

        // More thorough WebSocket cleanup
        // if (wsRef.current) {
        //     console.log(`6. Cleaning old WebSocket (state: ${wsRef.current.readyState})`);

        //     // Remove all event listeners first to prevent them from firing
        //     wsRef.current.onopen = null;
        //     wsRef.current.onmessage = null;
        //     wsRef.current.onerror = null;
        //     wsRef.current.onclose = null;

        //     // Force close if not already closed
        //     if (wsRef.current.readyState !== WebSocket.CLOSED) {
        //         wsRef.current.close(1000, 'Starting new connection');
        //     }

        //     wsRef.current = null;

        //     // Small delay to ensure cleanup completes
        //     await new Promise(resolve => setTimeout(resolve, 100));
        // }

        console.log('7. Creating new WebSocket...');
        wsRef.current = new WebSocket('wss://google-stt.fly.dev');

        wsRef.current.onopen = async () => {
            if (!isActiveRef.current) return;
            // micCleanupRef.current = await streamMic(wsRef);
            console.log('8. WebSocket opened!');
            resetSilenceTimeout();
        };

        wsRef.current.onmessage = async (event: MessageEvent) => {
            if (hasTriggeredRef.current) return;

            const raw = event.data;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            let data: any;

            try {
                const text = raw instanceof Blob ? await raw.text() : raw;
                data = JSON.parse(text);
            } catch (err) {
                console.warn('❌ WebSocket data error:', err);
                return;
            }

            const transcript: string = data.channel?.alternatives?.[0]?.transcript || '';
            const isFinal = data.is_final;

            if (transcript) {
                console.log(`[🎙️] Transcript chunk at ${performance.now().toFixed(2)}ms:`, transcript);
                resetSilenceTimeout();
                resetSilenceTimer(transcript);

                if (transcript === lastTranscriptRef.current) {
                    repeatCountRef.current += 1;
                    if (!repeatStartTimeRef.current) {
                        repeatStartTimeRef.current = performance.now();
                    }
                } else {
                    repeatCountRef.current = 1;
                    repeatStartTimeRef.current = performance.now();

                    if (matcherRef.current && !hasTriggeredRef.current) {
                        matcherRef.current.processTranscript(transcript, !isFinal);
                    }
                }

                lastTranscriptRef.current = transcript;

                const now = performance.now();
                const repeatDuration = now - (repeatStartTimeRef.current ?? now);

                if (repeatCountRef.current >= 2 && repeatDuration >= 400) {
                    console.log('🟡 Stable transcript detected — forcing early match');
                    await handleKeywordMatch(transcript);
                    repeatCountRef.current = 0;
                    repeatStartTimeRef.current = null;
                }
            }

            if (isFinal && transcript) {
                console.log(`🟡 Google is_final detected @ ${performance.now().toFixed(2)}ms: ${transcript}`);

                fullTranscript.current.push(transcript);

                const fullSpokenLine = fullTranscript.current.join(' ');
                const expectedWords = matcherRef.current?.getNormalizedScript();
                const spokenWords = fullSpokenLine.trim().split(/\s+/);

                // Auto trigger at 100% or more
                if (expectedWords && spokenWords.length >= expectedWords.length) {
                    console.log("✅ Full line spoken — triggering next line automatically.");
                    triggerNextLine(fullSpokenLine);
                    return;
                }

                const isLongEnough = expectedWords && spokenWords.length >= Math.floor(expectedWords.length * 0.75);
                const lengthRatio = expectedWords && spokenWords.length / expectedWords.length;
                console.log('Long enough?', lengthRatio);

                if (isLongEnough) {
                    console.log(`🟡 Google Final transcript accepted @ ${performance.now().toFixed(2)}ms! Handling finalization...`);
                    await handleFinalization(fullSpokenLine);
                } else {
                    console.log(`⏹️ Google Final transcript too short — skipping!`);
                }
            }
        };

        wsRef.current.onerror = (e) => {
            console.warn('❌ WebSocket error:', e);
        };

        wsRef.current.onclose = (e) => {
            console.log('🔌 WebSocket closed:', e.code, e.reason);
        };
    };

    const pauseSTT = () => {
        const end = performance.now();
        console.log(`⏸️ pauseSTT triggered @ ${end}`);

        // 🧹 Stop WebSocket
        if (wsRef.current) {
            wsRef.current.close(1000, 'Pausing STT');
            wsRef.current = null;
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

        isActiveRef.current = false;
    };

    const cleanupSTT = () => {
        pauseSTT();

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

// Not used anymore - Saving just in case
// function convertFloat32ToInt16(float32Array: Float32Array): ArrayBuffer {
//     const len = float32Array.length;
//     const int16Array = new Int16Array(len);
//     for (let i = 0; i < len; i++) {
//         const s = Math.max(-1, Math.min(1, float32Array[i]));
//         int16Array[i] = Math.round(s * 32767);
//     }
//     return int16Array.buffer;
// }