import { useRef, RefObject } from 'react';
import { fetchSimilarity } from '@/lib/api/embed';

interface UseGoogleSTTProps {
    lineEndKeywords: string[];
    onCueDetected: (transcript: string) => void;
    onSilenceTimeout?: () => void;
    expectedEmbedding: number[];
    onProgressUpdate?: (matchedCount: number) => void;
}

export function useGoogleSTT({
    lineEndKeywords,
    onCueDetected,
    onSilenceTimeout,
    expectedEmbedding,
    onProgressUpdate,
}: UseGoogleSTTProps) {
    const wsRef = useRef<WebSocket | null>(null);
    const micStreamRef = useRef<MediaStream | null>(null);
    const isActiveRef = useRef(false);
    const isInitializingRef = useRef(false);
    const silenceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const micCleanupRef = useRef<(() => void) | null>(null);
    const audioCtxRef = useRef<AudioContext | null>(null);
    const fullTranscript = useRef<string[]>([]);
    const lastTranscriptRef = useRef<string | null>(null);
    const repeatCountRef = useRef<number>(0);
    const repeatStartTimeRef = useRef<number | null>(null);
    const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const hasTriggeredRef = useRef(false);
    const expectedScriptTokenIDsRef = useRef<number[] | null>(null);
    const matchedScriptIndices = useRef<Set<number>>(new Set());
    const expectedScriptWordsRef = useRef<string[] | null>(null);
    const lastReportedCount = useRef(0);

    // Highlighting helper functions
    const normalizeWord = (word: string) =>
        word.toLowerCase().replace(/[^\w]/g, '');

    const getTokenID = (() => {
        const map = new Map<string, number>();
        let nextID = 1;

        return (word: string) => {
            const norm = normalizeWord(word);
            if (!map.has(norm)) map.set(norm, nextID++);
            return map.get(norm)!;
        };
    })();

    // Highlighting setup
    const setCurrentLineText = (text: string) => {
        matchedScriptIndices.current = new Set();
        lastReportedCount.current = 0;

        const normalizedWords = text.trim().split(/\s+/).map(normalizeWord);
        expectedScriptWordsRef.current = normalizedWords;

        const tokenIDs = normalizedWords.map(getTokenID);
        expectedScriptTokenIDsRef.current = tokenIDs;
    };

    // Match word to highlight
    const progressiveWordMatch = (
        scriptWords: string[],
        transcript: string,
        used: Set<number>
    ): number => {
        const transcriptWords = transcript.trim().split(/\s+/).map(w => w.toLowerCase().replace(/[^\w]/g, ''));

        let highest = -1;
        let matchStartIndex = 0;

        for (const word of transcriptWords) {
            for (let i = matchStartIndex; i < scriptWords.length; i++) {
                if (!used.has(i) && scriptWords[i] === word) {
                    used.add(i);
                    if (i > highest) highest = i;
                    matchStartIndex = i + 1;
                    break;
                }
            }
        }

        return highest + 1;
    };

    // STT helper functions
    const triggerNextLine = (transcript: string) => {
        if (hasTriggeredRef.current) return false;
        hasTriggeredRef.current = true;

        if (expectedScriptWordsRef.current && onProgressUpdate) {
            onProgressUpdate(expectedScriptWordsRef.current.length);
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
            console.log(`⚡ Total latency: ${(end - start).toFixed(2)}ms`);
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
            console.log(`⚡ Match latency: ${(end - start).toFixed(2)}ms`);
            triggerNextLine(spokenLine);
        }
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
            const workletNode = new AudioWorkletNode(audioCtx, 'linear-pcm-processor');

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

    // const streamMic = async (wsRef: RefObject<WebSocket | null>) => {
    //     if (!audioCtxRef.current || audioCtxRef.current.state === 'closed') {
    //         audioCtxRef.current = new AudioContext({ sampleRate: 44100 });
    //         await audioCtxRef.current.audioWorklet.addModule('/linearPCMProcessor.js');
    //     }

    //     if (!micStreamRef.current) {
    //         micStreamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true });
    //     }

    //     const audioCtx = audioCtxRef.current!;
    //     const source = audioCtx.createMediaStreamSource(micStreamRef.current);
    //     const workletNode = new AudioWorkletNode(audioCtx, 'linear-pcm-processor');

    //     workletNode.port.onmessage = (e: MessageEvent<Float32Array>) => {
    //         const floatInput = e.data;
    //         const buffer = convertFloat32ToInt16(floatInput);
    //         if (wsRef.current?.readyState === WebSocket.OPEN) {
    //             wsRef.current.send(buffer);
    //         }
    //     };

    //     try {
    //         source.connect(workletNode);
    //         workletNode.connect(audioCtx.destination);
    //     } catch (err) {
    //         console.error('⚠️ Failed to connect audio nodes:', err);
    //     }

    //     return () => {
    //         workletNode.port.onmessage = null;
    //         source.disconnect();
    //         workletNode.disconnect();
    //     };
    // };

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
            wsRef.current = new WebSocket('ws://localhost:3002');
        } else {
            console.warn('🔁 Reusing existing WebSocket');
        }

        console.log('startSTT triggered');

        wsRef.current.onmessage = async (event: MessageEvent) => {
            if (hasTriggeredRef.current) return;

            const raw = event.data;
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

                if (onProgressUpdate && transcript) {
                    const scriptWords = expectedScriptWordsRef.current;

                    if (scriptWords && !hasTriggeredRef.current) {
                        const matchCount = progressiveWordMatch(scriptWords, transcript, matchedScriptIndices.current);

                        if (matchCount > lastReportedCount.current) {
                            lastReportedCount.current = matchCount;
                            onProgressUpdate(matchCount);
                        }
                    }
                }

                if (transcript === lastTranscriptRef.current) {
                    repeatCountRef.current += 1;
                    if (!repeatStartTimeRef.current) {
                        repeatStartTimeRef.current = performance.now();
                    }
                } else {
                    repeatCountRef.current = 1;
                    repeatStartTimeRef.current = performance.now();
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
                console.log(`!!!! Is Final detected !!!! @ ${performance.now().toFixed(2)}ms`);
                console.log(`🎯 Google Final transcript: ${transcript}`);
                fullTranscript.current.push(transcript);
                await handleFinalization(transcript);
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