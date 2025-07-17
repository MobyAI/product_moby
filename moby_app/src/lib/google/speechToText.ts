import { useRef, RefObject } from 'react';
import { fetchSimilarity } from '@/lib/api/embed';

interface UseGoogleSTTProps {
    lineEndKeywords: string[];
    onCueDetected: (transcript: string) => void;
    onSilenceTimeout?: () => void;
    expectedEmbedding: number[];
}

export function useGoogleSTT({
    lineEndKeywords,
    onCueDetected,
    onSilenceTimeout,
    expectedEmbedding,
}: UseGoogleSTTProps) {
    const wsRef = useRef<WebSocket | null>(null);
    const isActiveRef = useRef(false);
    const silenceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const micCleanupRef = useRef<(() => void) | null>(null);
    const audioCtxRef = useRef<AudioContext | null>(null);
    const fullTranscript = useRef<string[]>([]);
    const nextLineTriggeredRef = useRef(false);
    const lastTranscriptRef = useRef<string | null>(null);
    const repeatCountRef = useRef<number>(0);
    const repeatStartTimeRef = useRef<number | null>(null);
    const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const resetSilenceTimeout = () => {
        if (silenceTimeoutRef.current) clearTimeout(silenceTimeoutRef.current);
        silenceTimeoutRef.current = setTimeout(() => {
            console.log('🛑 Silence timeout — stopping Google STT to save usage.');
            stopSTT();
            onSilenceTimeout?.();
        }, 10000);
    };

    const resetSilenceTimer = (spokenLine: string) => {
        if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);

        silenceTimerRef.current = setTimeout(() => {
            console.log('⏳ Silence timer triggered. Running finalization...');
            handleFinalization(spokenLine);
        }, 800);
    };

    const streamMic = async (wsRef: RefObject<WebSocket | null>) => {
        if (!audioCtxRef.current || audioCtxRef.current.state === 'closed') {
            audioCtxRef.current = new AudioContext({ sampleRate: 44100 });
            await audioCtxRef.current.audioWorklet.addModule('/linearPCMProcessor.js');
        }

        const audioCtx = audioCtxRef.current!;
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const source = audioCtx.createMediaStreamSource(stream);
        const workletNode = new AudioWorkletNode(audioCtx, 'linear-pcm-processor');

        workletNode.port.onmessage = (e: MessageEvent<Float32Array>) => {
            const floatInput = e.data;
            const buffer = convertFloat32ToInt16(floatInput);
            if (wsRef.current?.readyState === WebSocket.OPEN) {
                wsRef.current.send(buffer);
            }
        };

        source.connect(workletNode);
        workletNode.connect(audioCtx.destination);

        return () => {
            workletNode.port.onmessage = null;
            source.disconnect();
            workletNode.disconnect();
            stream.getTracks().forEach((track) => track.stop());
        };
    };

    const stopSTT = () => {
        if (wsRef.current) wsRef.current.close();
        if (silenceTimeoutRef.current) clearTimeout(silenceTimeoutRef.current);
        if (micCleanupRef.current) micCleanupRef.current();
        if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
            audioCtxRef.current.close();
            audioCtxRef.current = null;
        }
        isActiveRef.current = false;
    };

    const matchesEndPhrase = (transcript: string, keywords: string[]) => {
        const normalize = (text: string) =>
            text.toLowerCase().replace(/[\s.,!?'"“”\-]+/g, ' ').trim();
        const normTranscript = normalize(transcript);
        return keywords.some((kw) => normTranscript.includes(normalize(kw)));
    };

    const handleFinalization = async (spokenLine: string) => {
        const start = performance.now();

        if (matchesEndPhrase(spokenLine, lineEndKeywords)) {
            const end = performance.now();
            console.log(`⚡ Total latency in this block: ${(end - start).toFixed(2)}ms`);
            console.log(`End timestamp: ${end.toFixed(2)}ms`);

            console.log("🔑 Keyword match detected (Google)!");
            nextLineTriggeredRef.current = true;
            stopSTT();
            onCueDetected(spokenLine);
            return;
        } else {
            console.log('🔑 Keyword match failed');
        }

        if (expectedEmbedding?.length) {
            const similarity = await fetchSimilarity(spokenLine, expectedEmbedding);

            const end = performance.now();
            console.log(`⚡ Total latency in this block: ${(end - start).toFixed(2)}ms`);
            console.log(`End timestamp: ${end.toFixed(2)}ms`);

            console.log(`🧠 Google Similarity: ${similarity}`);
            if (similarity && similarity > 0.80) {
                console.log("✅ Similarity test passed (Google)!");
                nextLineTriggeredRef.current = true;
                stopSTT();
                onCueDetected(spokenLine);
            } else {
                console.log("🔁 Similarity too low, not triggering cue.");
            }
        }
    };

    const handleKeywordMatch = async (spokenLine: string) => {
        const start = performance.now();

        if (matchesEndPhrase(spokenLine, lineEndKeywords)) {
            const end = performance.now();
            console.log(`⚡ Total latency in this block: ${(end - start).toFixed(2)}ms`);
            console.log(`End timestamp: ${end.toFixed(2)}ms`);

            console.log("🔑 Keyword match detected (Google)!");
            nextLineTriggeredRef.current = true;
            stopSTT();
            onCueDetected(spokenLine);
            return;
        } else {
            console.log('🔑 Keyword match failed')
        }
    };

    const startSTT = async () => {
        if (isActiveRef.current) return;
        isActiveRef.current = true;
        fullTranscript.current = [];
        nextLineTriggeredRef.current = false;

        const ws = new WebSocket('ws://localhost:3001');
        wsRef.current = ws;

        ws.onmessage = async (event: MessageEvent) => {
            if (nextLineTriggeredRef.current) return;

            const raw = event.data;
            let data: any;

            try {
                const text = raw instanceof Blob ? await raw.text() : raw;
                data = JSON.parse(text);
                console.log('data final?', data.is_final);
            } catch (err) {
                console.warn('❌ Could not parse WebSocket data:', err);
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
                }

                lastTranscriptRef.current = transcript;
                resetSilenceTimeout();

                const now = performance.now();
                const repeatDuration = repeatStartTimeRef.current
                    ? now - repeatStartTimeRef.current
                    : 0;

                if (
                    repeatCountRef.current >= 2 &&
                    repeatDuration >= 400 &&
                    !nextLineTriggeredRef.current
                ) {
                    console.log('🟡 Google: Stable interim — forcing early match');
                    await handleKeywordMatch(transcript);
                    repeatCountRef.current = 0;
                    repeatStartTimeRef.current = null;
                }
            }

            if (isFinal && transcript) {
                fullTranscript.current.push(transcript);
                console.log(`!!!! Is Final detected !!!! @ ${performance.now().toFixed(2)}ms`);
                console.log(`🎯 Google Final transcript: ${transcript}`);
                handleFinalization(transcript);
            }
        };

        ws.onopen = async () => {
            micCleanupRef.current = await streamMic(wsRef);
            resetSilenceTimeout();
        };
    };

    return { startSTT, stopSTT };
}

// PCM conversion helper
function convertFloat32ToInt16(float32Array: Float32Array): ArrayBuffer {
    const len = float32Array.length;
    const int16Array = new Int16Array(len);
    for (let i = 0; i < len; i++) {
        let s = Math.max(-1, Math.min(1, float32Array[i]));
        int16Array[i] = Math.round(s * 32767);
    }
    return int16Array.buffer;
}