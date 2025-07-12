import { useRef, RefObject } from 'react';

interface UseDeepgramSTTProps {
    lineEndKeywords: string[];
    onCueDetected: (transcript: string) => void;
    onSilenceTimeout?: () => void;
}

export function useDeepgramSTT({
    lineEndKeywords,
    onCueDetected,
    onSilenceTimeout,
}: UseDeepgramSTTProps) {
    const wsRef = useRef<WebSocket | null>(null);
    const isActiveRef = useRef(false);
    const silenceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const micCleanupRef = useRef<(() => void) | null>(null);
    const audioCtxRef = useRef<AudioContext | null>(null);
    const fullTranscript = useRef<string[]>([]);
    const nextLineTriggeredRef = useRef(false);

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
            audioCtxRef.current = new AudioContext();
            await audioCtxRef.current.audioWorklet.addModule('/linearPCMProcessor.js');
        }

        const audioCtx = audioCtxRef.current!;
        console.log('🎛️ Sample Rate:', audioCtx.sampleRate);

        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const source = audioCtx.createMediaStreamSource(stream);
        const workletNode = new AudioWorkletNode(audioCtx, 'linear-pcm-processor');

        const onWorkletMessage = (e: MessageEvent<Float32Array>) => {
            const floatInput = e.data;
            console.log('📦 Sending buffered chunk:', floatInput.length);
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

    const startSTT = async () => {
        if (isActiveRef.current) return;
        isActiveRef.current = true;
        fullTranscript.current = [];
        nextLineTriggeredRef.current = false;

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
                console.log('🎙️ Transcript:', transcript);
                resetSilenceTimer();
            }

            if (data.is_final && transcript) {
                fullTranscript.current.push(transcript);
                console.log("Full transcription: ", fullTranscript);
                if (matchesEndPhrase(transcript, lineEndKeywords)) {
                    if (nextLineTriggeredRef.current) return;
                    nextLineTriggeredRef.current = true;
                    stopSTT();
                    onCueDetected(fullTranscript.current.join(' '));
                }
            }

            if (data.speech_final) {
                if (nextLineTriggeredRef.current) return;
                nextLineTriggeredRef.current = true;

                console.log('🟡 [speech_final=true] received.');
                stopSTT();
                // Placeholder: Add semantic similarity comparison here
                // e.g., compare lastFinalTranscript.current to expected script line
            }

            if (data.type === 'UtteranceEnd') {
                if (nextLineTriggeredRef.current) return;
                nextLineTriggeredRef.current = true;

                console.log('🟣 [UtteranceEnd] received at', data.last_word_end, 's');
                stopSTT();
                // Placeholder: Add semantic similarity comparison here
                // e.g., compare lastFinalTranscript.current to expected script line
            }
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
    };

    return { startSTT, stopSTT };
}

// Helpers
function normalize(text: string) {
    return text.toLowerCase().replace(/[.,!?']/g, '').trim();
}

function matchesEndPhrase(transcript: string, keywords: string[]) {
    const normTranscript = normalize(transcript);
    return keywords.some((kw) => normTranscript.endsWith(normalize(kw)));
}

function convertFloat32ToInt16(float32Array: Float32Array): ArrayBuffer {
    const len = float32Array.length;
    const int16Array = new Int16Array(len);
    for (let i = 0; i < len; i++) {
        let s = Math.max(-1, Math.min(1, float32Array[i]));
        int16Array[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
    }
    return int16Array.buffer;
}