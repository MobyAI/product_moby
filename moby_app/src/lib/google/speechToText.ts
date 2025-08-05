import { useRef, useEffect, useCallback } from 'react';
import { fetchSimilarity } from '@/lib/api/embed';
import * as fuzz from 'fuzzball';

//
// IMPORTANT: For openAI embedding: choose server near openAI's server for lower latency
//

interface UseGoogleSTTProps {
    lineEndKeywords: string[];
    onCueDetected: (transcript: string) => void;
    onSilenceTimeout?: () => void;
    expectedEmbedding: number[];
    onProgressUpdate?: (matchedCount: number) => void;
}

// ========================================
// OPTIMIZATION: Add the matcher class
// ========================================
interface OptimizedMatchingState {
    normalizedScript: string[];
    matchedIndices: Set<number>;
    lastMatchedIndex: number;
    lastReportedCount: number;
    wordCache: Map<string, string>;
}

class OptimizedSTTMatcher {
    private state: OptimizedMatchingState;
    private onProgressUpdate: (count: number) => void;
    private updateThrottleRef: ReturnType<typeof setTimeout> | null = null;

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
            .map(word => this.normalizeWordCached(word));
    }

    private normalizeWordCached(word: string): string {
        if (this.state.wordCache.has(word)) {
            return this.state.wordCache.get(word)!;
        }

        const normalized = word.toLowerCase().replace(/[^\w]/g, '');
        this.state.wordCache.set(word, normalized);
        return normalized;
    }

    private optimizedProgressiveMatch(transcript: string): number {
        if (!this.state.normalizedScript.length) return 0;

        const transcriptWords = transcript
            .trim()
            .split(/\s+/)
            .map(word => this.normalizeWordCached(word))
            .filter(word => word.length > 0);

        if (!transcriptWords.length) return this.state.lastMatchedIndex + 1;

        let searchStartIndex = Math.max(0, this.state.lastMatchedIndex + 1);

        console.log('progressive match start: ', transcriptWords);

        for (const spokenWord of transcriptWords) {
            // Use smaller window (2) for better performance than your original 3
            const windowEnd = Math.min(
                this.state.normalizedScript.length,
                searchStartIndex + 3
            );

            for (let i = searchStartIndex; i < windowEnd; i++) {
                if (!this.state.matchedIndices.has(i) &&
                    this.state.normalizedScript[i] === spokenWord) {
                    console.log('match found!');

                    this.state.matchedIndices.add(i);
                    this.state.lastMatchedIndex = Math.max(this.state.lastMatchedIndex, i);
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
        }, 30); // Fast updates for real-time feel
    }

    processTranscript(transcript: string, isInterim: boolean = false) {
        const matchCount = this.optimizedProgressiveMatch(transcript);
        console.log('new match count: ', matchCount);

        if (isInterim) {
            console.log('throttling update...');
            this.throttledUpdate(matchCount);
        } else {
            console.log('updating progress...');
            if (matchCount > this.state.lastReportedCount) {
                console.log('progress updated!');
                this.state.lastReportedCount = matchCount;
                this.onProgressUpdate(matchCount);
            }
        }
    }

    // Method to complete the line (for when line is finished)
    completeCurrentLine() {
        if (this.state.normalizedScript.length > 0) {
            this.state.lastReportedCount = this.state.normalizedScript.length;
            this.onProgressUpdate(this.state.normalizedScript.length);
        }
    }

    // Public method to get the normalized script for length checks
    getNormalizedScript(): string[] {
        return this.state.normalizedScript;
    }
}

export function useGoogleSTT({
    lineEndKeywords,
    onCueDetected,
    onSilenceTimeout,
    expectedEmbedding,
    onProgressUpdate,
}: UseGoogleSTTProps) {
    // STT setup
    const wsRef = useRef<WebSocket | null>(null);
    const micStreamRef = useRef<MediaStream | null>(null);
    const isActiveRef = useRef(false);
    const isInitializingRef = useRef(false);
    const silenceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const micCleanupRef = useRef<(() => void) | null>(null);
    const audioCtxRef = useRef<AudioContext | null>(null);

    // Cue detection
    const fullTranscript = useRef<string[]>([]);
    const lastTranscriptRef = useRef<string | null>(null);
    const repeatCountRef = useRef<number>(0);
    const repeatStartTimeRef = useRef<number | null>(null);
    const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const hasTriggeredRef = useRef(false);

    // OPTIMIZATION: Replace your old highlighting refs with the matcher
    const matcherRef = useRef<OptimizedSTTMatcher | null>(null);
    const currentLineTextRef = useRef<string>("");

    // Initialize matcher when onProgressUpdate is available
    useEffect(() => {
        if (onProgressUpdate) {
            matcherRef.current = new OptimizedSTTMatcher(onProgressUpdate);
            console.log('[Matcher] initialized (reinit)!');
    
            // Restore line text immediately after reinitializing!
            if (currentLineTextRef.current) {
                matcherRef.current.setCurrentLineText(currentLineTextRef.current);
                console.log('[Matcher] Restored line text after reinit:', currentLineTextRef.current);
            }
        }
    }, [onProgressUpdate]);

    // OPTIMIZATION: Replace your old setCurrentLineText function
    const setCurrentLineText = useCallback((text: string) => {
        currentLineTextRef.current = text;  // 👈 Save current text here
        if (matcherRef.current) {
            matcherRef.current.setCurrentLineText(text);
            console.log('[Matcher] Line text set:', text);
        } else {
            console.warn('[Matcher] matcherRef.current is NULL!');
        }
    }, []);

    // STT helpers
    const triggerNextLine = (transcript: string) => {
        if (hasTriggeredRef.current) return false;
        hasTriggeredRef.current = true;

        // OPTIMIZATION: Complete the line highlighting when triggered
        if (matcherRef.current) {
            matcherRef.current.completeCurrentLine();
        }

        pauseSTT();
        onCueDetected(transcript);
        return true;
    };

    const resetSilenceTimeout = () => {
        if (silenceTimeoutRef.current) clearTimeout(silenceTimeoutRef.current);
        silenceTimeoutRef.current = setTimeout(() => {
            console.log('🛑 Silence timeout — stopping Google STT to save usage.');
            pauseSTT();
            onSilenceTimeout?.();
        }, 10000);
    };

    const resetSilenceTimer = (spokenLine: string) => {
        if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = setTimeout(() => {
            if (hasTriggeredRef.current) return;
            console.log('⏳ Silence timer triggered. Running finalization...');
            handleFinalization(spokenLine);
        }, 1000);
    };

    const matchesEndPhrase = (transcript: string, keywords: string[]) => {
        const normalize = (text: string) =>
            text.toLowerCase().replace(/[\s.,!?'"“”\-]+/g, ' ').trim();

        const normTranscript = normalize(transcript);

        return keywords.every((kw) =>
            normTranscript.includes(normalize(kw))
        );
    };

    const handleFinalization = async (spokenLine: string) => {
        const start = performance.now();

        if (matchesEndPhrase(spokenLine, lineEndKeywords)) {
            const end = performance.now();
            console.log(`⚡ Keyword match passed in: ${(end - start).toFixed(2)}ms`);
            triggerNextLine(spokenLine);
            return;
        }

        if (fuzzyMatchEndKeywords(spokenLine, lineEndKeywords)) {
            const end = performance.now();
            console.log(`🤏 Fuzzy match passed in ${(end - start).toFixed(2)}ms`);
            triggerNextLine(spokenLine);
            return;
        }

        if (expectedEmbedding?.length) {
            const similarity = await fetchSimilarity(spokenLine, expectedEmbedding);
            console.log('Similarity: ', similarity);
            if (similarity && similarity > 0.80) {
                console.log("✅ Similarity passed (Google)!");
                triggerNextLine(spokenLine);
            } else {
                console.log("🔁 Similarity too low.");
            }
        }
    };

    const handleKeywordMatch = async (spokenLine: string) => {
        const start = performance.now();

        if (matchesEndPhrase(spokenLine, lineEndKeywords)) {
            const end = performance.now();
            console.log(`⚡ Keyword match passed in: ${(end - start).toFixed(2)}ms`);
            triggerNextLine(spokenLine);
        }

        if (fuzzyMatchEndKeywords(spokenLine, lineEndKeywords)) {
            const end = performance.now();
            console.log(`🤏 Fuzzy match passed in ${(end - start).toFixed(2)}ms`);
            triggerNextLine(spokenLine);
            return;
        }
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
        threshold = 70
    ): boolean => {
        // const lastSentence = normalize(extractLastSentence(transcript));
        // const words = lastSentence.split(/\s+/);

        // console.log('fuzzy match last sentence: ', lastSentence);

        const normTranscript = normalize(transcript);
        const words = normTranscript.split(/\s+/);

        return keywords.every((kw) => {
            const normKw = normalize(kw);
            return words.some((w) => {
                const score = fuzz.ratio(normKw, w);
                console.log(`🔍 Comparing "${normKw}" with "${w}" → Score: ${score}`);
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
                console.log('🎛️ Creating new AudioContext...');
                audioCtxRef.current = new AudioContext({ sampleRate: 44100 });
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

            workletNode.port.onmessage = (e: MessageEvent<Float32Array>) => {
                const floatInput = e.data;
                const buffer = convertFloat32ToInt16(floatInput);
                if (wsRef.current?.readyState === WebSocket.OPEN) {
                    wsRef.current.send(buffer);
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
        isActiveRef.current = true;
        hasTriggeredRef.current = false;
        fullTranscript.current = [];

        await resumeAudioContext();

        if (!audioCtxRef.current || !micStreamRef.current) {
            console.warn('⚠️ STT not initialized — call initializeSTT() first');
            return;
        }

        if (wsRef.current) {
            wsRef.current.onmessage = null;
            wsRef.current.onopen = null;
            wsRef.current.onerror = null;
            wsRef.current.onclose = null;
        }

        if (!wsRef.current || wsRef.current.readyState === WebSocket.CLOSED) {
            wsRef.current = new WebSocket('wss://google-stt.fly.dev');
        } else {
            console.warn('🔁 Reusing existing WebSocket');
        }

        console.log('startSTT triggered');

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

                    // Use optimized matcher for highlighting
                    if (matcherRef.current && !hasTriggeredRef.current) {
                        matcherRef.current.processTranscript(transcript, !isFinal);
                    }
                }

                lastTranscriptRef.current = transcript;

                const now = performance.now();
                const repeatDuration = now - (repeatStartTimeRef.current ?? now);

                if (repeatCountRef.current >= 2 && repeatDuration >= 400) {
                    console.log('🟡 Stable interim — forcing early match');
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

                const isLongEnough = expectedWords && spokenWords.length >= Math.floor(expectedWords.length * 0.75);

                if (isLongEnough) {
                    console.log(`🟡 Google Final transcript accepted @ ${performance.now().toFixed(2)}ms! Handling finalization...`);
                    await handleFinalization(fullTranscript.current.join(' '));
                } else {
                    console.log(`⏹️ Google Final transcript too short — skipping!`);
                }
            }
        };

        wsRef.current.onopen = async () => {
            if (!isActiveRef.current) return;

            // micCleanupRef.current = await streamMic(wsRef);

            resetSilenceTimeout();
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
            wsRef.current.close();
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

function convertFloat32ToInt16(float32Array: Float32Array): ArrayBuffer {
    const len = float32Array.length;
    const int16Array = new Int16Array(len);
    for (let i = 0; i < len; i++) {
        const s = Math.max(-1, Math.min(1, float32Array[i]));
        int16Array[i] = Math.round(s * 32767);
    }
    return int16Array.buffer;
}