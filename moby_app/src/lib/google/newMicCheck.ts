import { useState, useEffect, useRef } from "react";

interface UseMicTestReturn {
    startMicTest: () => Promise<void>;
    stopMicTest: () => void;
    transcript: string;
    isListening: boolean;
    cleanup: () => void;
    error: string | null;
}

interface WebSocketMessage {
    channel?: {
        alternatives?: Array<{
            transcript?: string;
        }>;
    };
}

// Extend the global Window interface for the AudioWorklet
declare global {
    interface Window {
        AudioWorkletNode: typeof AudioWorkletNode;
    }
}

export const useMicCheck = (): UseMicTestReturn => {
    const wsRef = useRef<WebSocket | null>(null);
    const micStreamRef = useRef<MediaStream | null>(null);
    const audioCtxRef = useRef<AudioContext | null>(null);
    const isActiveRef = useRef<boolean>(false);
    const [transcript, setTranscript] = useState<string>('');
    const [isListening, setIsListening] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const micCleanupRef = useRef<(() => void) | null>(null);

    const convertFloat32ToInt16 = (float32Array: Float32Array): ArrayBuffer => {
        const len = float32Array.length;
        const int16Array = new Int16Array(len);
        for (let i = 0; i < len; i++) {
            const s = Math.max(-1, Math.min(1, float32Array[i]));
            int16Array[i] = Math.round(s * 32767);
        }
        return int16Array.buffer;
    };

    const startMicTest = async (): Promise<void> => {
        if (isActiveRef.current) return;

        try {
            setError(null);

            // Clean up any existing connections
            if (micCleanupRef.current) {
                micCleanupRef.current();
                micCleanupRef.current = null;
            }

            // Initialize AudioContext (let browser pick rate) ✅
            if (!audioCtxRef.current || audioCtxRef.current.state === "closed") {
                audioCtxRef.current = new AudioContext();
                console.log("AudioContext sampleRate:", audioCtxRef.current.sampleRate);
                try {
                    await audioCtxRef.current.audioWorklet.addModule("/linearPCMProcessor.js");
                } catch {
                    throw new Error("Failed to load audio worklet module. Please ensure linearPCMProcessor.js is available.");
                }
            }

            // Resume AudioContext if suspended
            if (audioCtxRef.current.state === "suspended") {
                await audioCtxRef.current.resume();
            }

            // Get microphone stream (Step 3: optional hints) ✅
            if (!micStreamRef.current) {
                try {
                    micStreamRef.current = await navigator.mediaDevices.getUserMedia({
                        audio: {
                            channelCount: 1,
                            // Hints only; browsers may ignore:
                            sampleRate: 48000,
                            echoCancellation: false,
                            noiseSuppression: false,
                            autoGainControl: false,
                        },
                    });
                } catch {
                    throw new Error("Microphone access denied. Please check your browser permissions.");
                }
            }

            // Set up audio routing
            const audioCtx = audioCtxRef.current!;
            const micStream = micStreamRef.current!;
            const source = audioCtx.createMediaStreamSource(micStream);

            const workletNode = new AudioWorkletNode(audioCtx, "linear-pcm-processor", {
                numberOfInputs: 1,
                numberOfOutputs: 1,
                channelCount: 1,
            });

            // Step 3 (optional): silent sink to keep the Worklet running without audible output ✅
            const sink = audioCtx.createGain();
            sink.gain.value = 0;

            source.connect(workletNode);
            workletNode.connect(sink);
            sink.connect(audioCtx.destination);

            // --- WebSocket with config handshake (Step 2) ✅ ---
            wsRef.current = new WebSocket("wss://google-stt.fly.dev");

            // gate sending until config is sent
            const pendingBuffers: ArrayBuffer[] = [];
            let configSent = false;

            wsRef.current.onopen = () => {
                const rate = audioCtx.sampleRate; // e.g., 48000 or 44100
                const cfg = {
                    type: "config",
                    encoding: "LINEAR16",
                    sampleRateHz: rate,
                    languageCode: "en-US",
                    punctuation: true,
                };
                wsRef.current!.send(JSON.stringify(cfg));
                configSent = true;

                // flush any audio we buffered while the socket was opening
                while (pendingBuffers.length) {
                    wsRef.current!.send(pendingBuffers.shift()!);
                }

                isActiveRef.current = true;
                setIsListening(true);
            };

            // Convert Float32 to PCM16 and send (buffer until config is sent) ✅
            workletNode.port.onmessage = (e: MessageEvent<Float32Array>) => {
                const floatInput = e.data; // at audioCtx.sampleRate
                const buffer = convertFloat32ToInt16(floatInput);
                const ws = wsRef.current;

                if (ws && ws.readyState === WebSocket.OPEN && configSent) {
                    ws.send(buffer);
                } else if (pendingBuffers.length < 40) {
                    pendingBuffers.push(buffer); // avoid unbounded growth
                }
            };

            // Transcript handling (unchanged)
            wsRef.current.onmessage = async (event: MessageEvent) => {
                try {
                    const text = event.data instanceof Blob ? await event.data.text() : event.data;
                    const data: WebSocketMessage = JSON.parse(text);
                    const newTranscript = data.channel?.alternatives?.[0]?.transcript || "";
                    if (newTranscript) setTranscript(newTranscript);
                } catch (err) {
                    console.warn("WebSocket data error:", err);
                }
            };

            wsRef.current.onerror = (e: Event) => {
                console.error("WebSocket error:", e);
                setError("Connection error. Please try again.");
                setIsListening(false);
            };

            wsRef.current.onclose = () => {
                pendingBuffers.length = 0; // drop anything queued
                setIsListening(false);
            };

            // Cleanup
            micCleanupRef.current = () => {
                workletNode.port.onmessage = null;
                try {
                    source.disconnect();
                    workletNode.disconnect();
                    sink.disconnect();
                } catch (err) {
                    console.warn("Error disconnecting audio nodes:", err);
                }
            };
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : "Failed to start microphone test";
            console.error("Failed to start mic test:", err);
            setError(errorMessage);
            setIsListening(false);
        }
    };

    const stopMicTest = (): void => {
        if (wsRef.current) {
            wsRef.current.close();
            wsRef.current = null;
        }

        if (micCleanupRef.current) {
            micCleanupRef.current();
            micCleanupRef.current = null;
        }

        isActiveRef.current = false;
        setIsListening(false);
    };

    const cleanup = (): void => {
        try {
            if (wsRef.current) {
                wsRef.current.close();
                wsRef.current = null;
            }

            if (micCleanupRef.current) {
                micCleanupRef.current();
                micCleanupRef.current = null;
            }

            if (micStreamRef.current) {
                micStreamRef.current.getTracks().forEach(track => {
                    if (track.readyState === "live") {
                        track.stop();
                    }
                });
                micStreamRef.current = null;
            }

            if (audioCtxRef.current) {
                audioCtxRef.current.close().catch(err =>
                    console.warn("Error closing AudioContext:", err)
                );
                audioCtxRef.current = null;
            }

            isActiveRef.current = false;
            setIsListening(false);
        } catch (err) {
            console.warn("Error during cleanup:", err);
        }
    };

    useEffect(() => {
        return cleanup;
    }, []);

    return { startMicTest, stopMicTest, transcript, isListening, cleanup, error };
};