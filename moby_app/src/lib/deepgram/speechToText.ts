import { useRef, RefObject } from 'react';
import { fetchSimilarity } from '@/lib/api/embed';

interface UseDeepgramSTTProps {
    lineEndKeywords: string[];
    onCueDetected: (transcript: string) => void;
    onSilenceTimeout?: () => void;
    expectedEmbedding: number[];
}

export function useDeepgramSTT({
    lineEndKeywords,
    onCueDetected,
    onSilenceTimeout,
    expectedEmbedding,
}: UseDeepgramSTTProps) {
    const wsRef = useRef<WebSocket | null>(null);
    const isActiveRef = useRef(false);
    const silenceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const micCleanupRef = useRef<(() => void) | null>(null);
    const audioCtxRef = useRef<AudioContext | null>(null);
    const fullTranscript = useRef<string[]>([]);
    const nextLineTriggeredRef = useRef(false);
    const lastSpokenLineRef = useRef<string | null>(null);
    const finalStartTimeRef = useRef<number | null>(null);
    const finalizationIdRef = useRef(0);
    const triggerDelay = 0;

    const resetSilenceTimer = () => {
        if (silenceTimeoutRef.current) clearTimeout(silenceTimeoutRef.current);
        silenceTimeoutRef.current = setTimeout(() => {
            console.log('🛑 Silence timeout — stopping STT to save usage.');
            stopSTT();
            onSilenceTimeout?.();
        }, 10000);
    };

    const streamMic = async (wsRef: RefObject<WebSocket | null>) => {
        if (!audioCtxRef.current || audioCtxRef.current.state === 'closed') {
            audioCtxRef.current = new AudioContext({ sampleRate: 44100 });
            await audioCtxRef.current.audioWorklet.addModule('/linearPCMProcessor.js');
        }

        const audioCtx = audioCtxRef.current!;
        // const actualSampleRate = audioCtx.sampleRate;
        // console.log('🎛️ Actual Sample Rate:', actualSampleRate);

        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const source = audioCtx.createMediaStreamSource(stream);
        const workletNode = new AudioWorkletNode(audioCtx, 'linear-pcm-processor');

        const onWorkletMessage = (e: MessageEvent<Float32Array>) => {
            const floatInput = e.data;
            // console.log('📦 Sending buffered chunk:', floatInput.length);
            const buffer = convertFloat32ToInt16(floatInput);
            if (wsRef.current?.readyState === WebSocket.OPEN) {
                wsRef.current.send(buffer);
            }
        };

        workletNode.port.onmessage = onWorkletMessage;
        source.connect(workletNode);
        workletNode.connect(audioCtx.destination);

        return () => {
            console.log('🧹 Cleaning up audio resources');
            workletNode.port.onmessage = null;
            source.disconnect();
            workletNode.disconnect();
            stream.getTracks().forEach((track) => track.stop());
        };
    };

    const destroyAudioContext = () => {
        if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
            console.log('🧨 Destroying AudioContext');
            audioCtxRef.current.close();
            audioCtxRef.current = null;
        }
    };

    const handleFinalization = async (triggerSource: string) => {
        const spokenLine = fullTranscript.current.join(' ');

        if (!spokenLine) {
            console.warn("⚠️ Missing spoken line!");
            return;
        }

        if (spokenLine === lastSpokenLineRef.current) {
            console.log("🔁 Duplicate spoken line detected. Skipping re-evaluation.");
            return;
        }

        lastSpokenLineRef.current = spokenLine;

        const start = performance.now();

        console.log(`${triggerSource} received. Running match test now!`);

        const currentFinalizationId = finalizationIdRef.current;
        console.log('current finalization ID: ', currentFinalizationId);

        await new Promise(res => setTimeout(res, triggerDelay));
        if (currentFinalizationId !== finalizationIdRef.current) {
            console.log("🛑 New speech detected during delay — canceling trigger.");
            return;
        }

        if (matchesEndPhrase(spokenLine, lineEndKeywords)) {
            const end = performance.now();
            console.log(`⚡ Total latency in this block: ${(end - start).toFixed(2)}ms`);

            console.log("🔑 Keyword match detected!");
            stopSTT();
            onCueDetected(spokenLine);
            return;
        }

        //
        // IMPORTANT: For openAI embedding: choose server near openAI's server for lower latency
        //

        if (!expectedEmbedding || expectedEmbedding.length === 0) {
            console.warn("⚠️ Missing expected embedding — skipping similarity check.");
            return;
        }

        const similarity = await fetchSimilarity(spokenLine, expectedEmbedding);
        const end = performance.now();

        console.log(`🧠 Similarity: ${similarity}`);
        console.log(`⚡ Total latency in this block: ${(end - start).toFixed(2)}ms`);

        if (similarity && similarity > 0.80) {

            console.log("✅ Similarity test passed!");
            stopSTT();
            onCueDetected(spokenLine);
        } else {
            console.log("🔁 Similarity too low, not triggering cue.");
        }
    };

    const startSTT = async () => {
        if (isActiveRef.current) return;
        isActiveRef.current = true;
        fullTranscript.current = [];

        // const sampleRate = audioCtxRef.current?.sampleRate ?? 44100;
        // const ws = new WebSocket(`ws://localhost:3001?sample_rate=${sampleRate}`);
        const ws = new WebSocket('ws://localhost:3001');
        wsRef.current = ws;

        ws.onmessage = async (event: MessageEvent) => {
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
                resetSilenceTimer();
                finalizationIdRef.current += 1;
                console.log('finalization ID: ', finalizationIdRef);
            }

            if (data.is_final && transcript) {
                fullTranscript.current.push(transcript);
                console.log(`[🎙️] FULL transcript at ${performance.now().toFixed(2)}ms::`, fullTranscript);
                // await handleFinalization(`🟡 [data.is_final] @ ${performance.now().toFixed(2)}ms`);
                finalStartTimeRef.current = performance.now();
            }

            if (data.speech_final && !nextLineTriggeredRef.current) {
                const start = finalStartTimeRef.current ?? performance.now();
                await handleFinalization(`🟡 [speech_final=true] @ ${performance.now().toFixed(2)}ms`);
                const end = performance.now();
                console.log(`⏱️ Time from is_final to post-finalization: ${(end - start).toFixed(2)}ms`);
            }

            //
            // Utterance end too slow. Minimum 1000ms threshold.
            //
            // if (data.type === "UtteranceEnd" && !nextLineTriggeredRef.current) {
            //     await handleFinalization(`🟣 [UtteranceEnd] @ ${performance.now().toFixed(2)}ms`);
            // }

            // if (data.speech_final) {
            //     if (nextLineTriggeredRef.current) return;
            //     nextLineTriggeredRef.current = true;

            //     const spokenLine = fullTranscript.current.join(' ');

            //     // ✅ Prevent duplicate processing
            //     if (spokenLine === lastSpokenLineRef.current) {
            //         console.log("🔁 Duplicate spoken line detected. Skipping re-evaluation.");
            //         return;
            //     }

            //     lastSpokenLineRef.current = spokenLine;
            //     const start = performance.now();

            //     console.log('🟡 [speech_final=true] received.');

            //     if (matchesEndPhrase(spokenLine, lineEndKeywords)) {
            //         console.log("🔑 Keyword match detected!");
            //         stopSTT();
            //         onCueDetected(spokenLine);
            //         return;
            //     }

            //     //
            //     // IMPORTANT: For openAI embedding: choose server near openAI's server for lower latency
            //     //

            //     const similarity = await fetchSimilarity(spokenLine, expectedEmbedding);

            //     const end = performance.now();
            //     console.log('🟣 [Speech Final] received at', data.last_word_end, 's');
            //     console.log(`⚡ Total latency in this block: ${(end - start).toFixed(2)}ms`);
            //     console.log(`⚡ Total latency since last word: ${(end - (data.last_word_end * 1000)).toFixed(2)}ms`);

            //     console.log('🟡 spoken line:', spokenLine);
            //     console.log('🟡 [speech_final=true] received. Similarity:', similarity);

            //     if (similarity && similarity > 0.8) {
            //         console.log("Similarity test passed!");

            //         stopSTT();
            //         onCueDetected(spokenLine);
            //     } else {
            //         console.log("🔁 Similarity too low, not triggering cue.");
            //     }
            // }

            // if (data.type === 'UtteranceEnd') {
            //     if (nextLineTriggeredRef.current) return;
            //     nextLineTriggeredRef.current = true;

            //     const spokenLine = fullTranscript.current.join(' ');

            //     // ✅ Prevent duplicate processing
            //     if (spokenLine === lastSpokenLineRef.current) {
            //         console.log("🔁 Duplicate spoken line detected. Skipping re-evaluation.");
            //         return;
            //     }

            //     lastSpokenLineRef.current = spokenLine;
            //     const start = performance.now();

            //     console.log('🟡 [speech_final=true] received.');

            //     if (matchesEndPhrase(spokenLine, lineEndKeywords)) {
            //         console.log("🔑 Keyword match detected!");
            //         stopSTT();
            //         onCueDetected(spokenLine);
            //         return;
            //     }

            //     //
            //     // IMPORTANT: For openAI embedding: choose server near openAI's server for lower latency
            //     //

            //     const similarity = await fetchSimilarity(spokenLine, expectedEmbedding);

            //     const end = performance.now();
            //     console.log('🟣 [Speech Final] received at', data.last_word_end, 's');
            //     console.log(`⚡ Total latency in this block: ${(end - start).toFixed(2)}ms`);
            //     console.log(`⚡ Total latency since last word: ${(end - (data.last_word_end * 1000)).toFixed(2)}ms`);

            //     console.log('🟡 spoken line:', spokenLine);
            //     console.log('🟡 [speech_final=true] received. Similarity:', similarity);

            //     if (similarity && similarity > 0.8) {
            //         console.log("Similarity test passed!");

            //         stopSTT();
            //         onCueDetected(spokenLine);
            //     } else {
            //         console.log("🔁 Similarity too low, not triggering cue.");
            //     }
            // }
        };

        ws.onopen = async () => {
            micCleanupRef.current = await streamMic(wsRef);
            resetSilenceTimer();
        };
    };

    const stopSTT = () => {
        if (wsRef.current) wsRef.current.close();
        if (silenceTimeoutRef.current) clearTimeout(silenceTimeoutRef.current);
        if (micCleanupRef.current) micCleanupRef.current();
        destroyAudioContext();
        isActiveRef.current = false;
        finalizationIdRef.current = 0;
    };

    return { startSTT, stopSTT };
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

    const normTranscript = normalize(transcript);

    // Split into sentences and grab the last one
    const sentences = splitIntoSentences(normTranscript);
    const lastSentence = sentences[sentences.length - 1]?.trim();

    if (!lastSentence) return false;

    // Check that all keywords appear somewhere in the last sentence
    return keywords.every((kw) => lastSentence.includes(normalize(kw)));
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