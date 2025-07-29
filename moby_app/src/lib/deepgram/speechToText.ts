import { useRef } from 'react';
import { fetchSimilarity } from '@/lib/api/embed';

//
// IMPORTANT: For openAI embedding: choose server near openAI's server for lower latency
//

interface UseDeepgramSTTProps {
    lineEndKeywords: string[];
    onCueDetected: (transcript: string) => void;
    onSilenceTimeout?: () => void;
    expectedEmbedding: number[];
    onProgressUpdate?: (matchedCount: number) => void;
}

export function useDeepgramSTT({
    lineEndKeywords,
    onCueDetected,
    onSilenceTimeout,
    expectedEmbedding,
    onProgressUpdate,
}: UseDeepgramSTTProps) {
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
    const hasTriggeredRef = useRef(false);

    // Highlighting
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

    // STT helpers
    const triggerNextLine = (transcript: string) => {
        if (hasTriggeredRef.current) return false;
        hasTriggeredRef.current = true;
        pauseSTT();
        onCueDetected(transcript);
        return true;
    };

    const resetSilenceTimeout = () => {
        if (silenceTimeoutRef.current) clearTimeout(silenceTimeoutRef.current);
        silenceTimeoutRef.current = setTimeout(() => {
            console.log('🛑 Silence timeout — stopping Deepgram STT to save usage.');
            pauseSTT();
            onSilenceTimeout?.();
        }, 10000);
    };

    const handleFinalization = async (triggerSource: string) => {
        const spokenLine = fullTranscript.current.join(' ');

        if (!spokenLine) {
            console.warn("⚠️ Missing spoken line!");
            return;
        }

        const start = performance.now();

        console.log(`${triggerSource} received. Running match test now!`);

        if (matchesEndPhrase(spokenLine, lineEndKeywords)) {
            const end = performance.now();
            console.log("🔑 Keyword match detected!");
            console.log(`⚡ Total latency in this block: ${(end - start).toFixed(2)}ms`);
            console.log(`End timestamp: ${end.toFixed(2)}ms`);

            triggerNextLine(spokenLine);
            return;
        } else {
            console.log('🔑 Keyword match failed');
        }

        if (!expectedEmbedding || expectedEmbedding.length === 0) {
            console.warn("⚠️ Missing expected embedding — skipping similarity check.");
            return;
        }

        const similarity = await fetchSimilarity(spokenLine, expectedEmbedding);

        console.log(`🧠 Similarity: ${similarity}`);

        if (similarity && similarity > 0.80) {
            const end = performance.now();
            console.log("✅ Similarity test passed!");
            console.log(`⚡ Total latency in this block: ${(end - start).toFixed(2)}ms`);
            console.log(`End timestamp: ${end.toFixed(2)}ms`);

            triggerNextLine(spokenLine);
            return;
        } else {
            console.log("🔁 Similarity too low, not triggering cue.");
        }
    };

    const handleKeywordMatch = async (triggerSource: string) => {
        let spokenLine = fullTranscript.current.join(' ');

        if (!spokenLine && lastTranscriptRef.current) {
            console.warn("⚠️ No finalized spoken line. Falling back to last transcript chunk.");
            spokenLine = lastTranscriptRef.current;
        }

        if (!spokenLine) {
            console.warn("⚠️ Missing spoken line!");
            return;
        }

        const start = performance.now();

        console.log(`${triggerSource} received. Running match test now!`);

        if (matchesEndPhrase(spokenLine, lineEndKeywords)) {
            const end = performance.now();
            console.log("🔑 Keyword match detected!");
            console.log(`⚡ Total latency in this block: ${(end - start).toFixed(2)}ms`);
            console.log(`End timestamp: ${end.toFixed(2)}ms`);

            triggerNextLine(spokenLine);
            return;
        } else {
            console.log('🔑 Keyword match failed');
        }
    };

    const handleInterimKeywordMatch = async (triggerSource: string) => {
        const spokenLine = lastTranscriptRef.current;

        if (!spokenLine) {
            console.warn("⚠️ Missing spoken line!");
            return;
        }

        const start = performance.now();

        console.log(`${triggerSource} received. Running match test now!`);

        if (matchesEndPhrase(spokenLine, lineEndKeywords)) {
            const end = performance.now();
            console.log("🔑 Keyword match detected!");
            console.log(`⚡ Total latency in this block: ${(end - start).toFixed(2)}ms`);
            console.log(`End timestamp: ${end.toFixed(2)}ms`);

            triggerNextLine(spokenLine);
            return;
        } else {
            console.log('🔑 Keyword match failed');
        }
    };

    const initializeSTT = async () => {
        if (isInitializingRef.current) {
            console.warn('⏳ initializeSTT already in progress — skipping duplicate call');
            return;
        }
        isInitializingRef.current = true;

        try {
            if (micCleanupRef.current) {
                console.log('♻️ Cleaning up existing mic/processor before reinitializing');
                micCleanupRef.current();
                micCleanupRef.current = null;
            }

            if (!audioCtxRef.current || audioCtxRef.current.state === 'closed') {
                console.log('🎛️ Creating new AudioContext...');
                audioCtxRef.current = new AudioContext({ sampleRate: 44100 });
                await audioCtxRef.current.audioWorklet.addModule('/linearPCMProcessor.js');
                console.log('✅ AudioWorklet module loaded!');
            } else {
                console.log('🎛️ Reusing existing AudioContext');
            }

            if (!micStreamRef.current) {
                console.log('🎤 Requesting mic stream...');
                micStreamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true });
                console.log('✅ Mic stream obtained');
            } else {
                console.log('🎤 Reusing existing mic stream');
            }

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
            wsRef.current = new WebSocket('ws://localhost:3001');
        } else {
            console.warn('🔁 Reusing existing WebSocket');
        }

        wsRef.current.onmessage = async (event: MessageEvent) => {
            if (hasTriggeredRef.current) {
                console.log('⛔ Cue already triggered — skipping further STT events');
                return;
            }

            const raw = event.data;
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
                const repeatDuration = repeatStartTimeRef.current
                    ? now - repeatStartTimeRef.current
                    : 0;

                if (
                    repeatCountRef.current >= 2 &&
                    repeatDuration >= 400
                ) {
                    console.log('🟡 Repeated stable transcript detected — forcing keyword match');
                    await handleInterimKeywordMatch(`🔁 [interim stability heuristic] @ ${performance.now().toFixed(2)}ms`);
                    repeatCountRef.current = 0;
                    repeatStartTimeRef.current = null;
                }
            }

            if (data.is_final && transcript) {
                fullTranscript.current.push(transcript);
                console.log(`!!!! Is Final detected !!!! @ ${performance.now().toFixed(2)}ms`);
                await handleKeywordMatch(`🟡 [is_final=true] @ ${performance.now().toFixed(2)}ms`);
            }

            if (data.speech_final) {
                console.log(`!!!! Speech final detected !!!! @ ${performance.now().toFixed(2)}ms`);
                await handleFinalization(`🟡 [speech_final=true] @ ${performance.now().toFixed(2)}ms`);
            }

            // Utterance end too slow. Minimum 1000ms threshold.
            if (data.type === "UtteranceEnd") {
                console.log(`!!!! Utterance end detected !!!! @ ${performance.now().toFixed(2)}ms`);
                await handleFinalization(`🟣 [UtteranceEnd] @ ${performance.now().toFixed(2)}ms`);
            }
        };

        wsRef.current.onopen = async () => {
            if (!isActiveRef.current) return;
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

        if (wsRef.current) {
            wsRef.current.close();
            wsRef.current = null;
        }

        if (silenceTimeoutRef.current) {
            clearTimeout(silenceTimeoutRef.current);
            silenceTimeoutRef.current = null;
        }

        isActiveRef.current = false;
    };

    const cleanupSTT = () => {
        pauseSTT();

        if (micCleanupRef.current) {
            micCleanupRef.current();
            micCleanupRef.current = null;
        }

        if (micStreamRef.current) {
            micStreamRef.current.getTracks().forEach((track) => track.stop());
            micStreamRef.current = null;
        }

        if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
            audioCtxRef.current.close().catch((err) => {
                console.warn('⚠️ Error closing AudioContext:', err);
            });
            audioCtxRef.current = null;
        }
    };

    return { startSTT, pauseSTT, initializeSTT, cleanupSTT, setCurrentLineText };
}

// Helpers
function normalize(text: string) {
    return text.toLowerCase().replace(/[.,!?']/g, '').trim();
}

function splitIntoSentences(text: string): string[] {
    const abbreviations = /\b(Mr|Mrs|Ms|Dr|Prof|Sr|Jr|St|Mt|etc)\.$/;
    const parts = text
        .split(/(?<=[.?!])\s+(?=[A-Z])/)
        .filter(Boolean)
        .map((s) => s.trim());

    const sentences: string[] = [];
    for (let i = 0; i < parts.length; i++) {
        if (i > 0 && abbreviations.test(parts[i - 1])) {
            sentences[sentences.length - 1] += ' ' + parts[i];
        } else {
            sentences.push(parts[i]);
        }
    }

    return sentences;
}

function matchesEndPhrase(transcript: string, keywords: string[]): boolean {
    const normalize = (text: string) =>
        text.toLowerCase().replace(/[\s.,!?'"“”\-]+/g, ' ').trim();

    const normalizedTranscript = normalize(transcript);

    return keywords.every((kw) =>
        normalizedTranscript.includes(normalize(kw))
    );
}

// function convertFloat32ToInt16(float32Array: Float32Array): ArrayBuffer {
//     const len = float32Array.length;
//     const int16Array = new Int16Array(len);
//     for (let i = 0; i < len; i++) {
//         let s = Math.max(-1, Math.min(1, float32Array[i]));
//         int16Array[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
//     }
//     return int16Array.buffer;
// }

// Testing Math.round for better accuracy
function convertFloat32ToInt16(float32Array: Float32Array): ArrayBuffer {
    const len = float32Array.length;
    const int16Array = new Int16Array(len);
    for (let i = 0; i < len; i++) {
        let s = Math.max(-1, Math.min(1, float32Array[i]));
        int16Array[i] = Math.round(s * 32767);
    }
    return int16Array.buffer;
}