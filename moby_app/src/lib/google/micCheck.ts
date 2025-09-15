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

    // Centralized WebSocket cleanup function
    const cleanupWebSocket = (): void => {
        if (wsRef.current) {
            console.log(`[MicCheck] Cleaning WebSocket (state: ${wsRef.current.readyState})`);

            // Remove all event listeners to prevent memory leaks
            wsRef.current.onopen = null;
            wsRef.current.onmessage = null;
            wsRef.current.onerror = null;
            wsRef.current.onclose = null;

            // Close if not already closed
            if (wsRef.current.readyState !== WebSocket.CLOSED &&
                wsRef.current.readyState !== WebSocket.CLOSING) {
                wsRef.current.close(1000, 'Cleanup');
            }

            wsRef.current = null;
        }
    };

    // Centralized audio cleanup function
    const cleanupAudio = (): void => {
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

        if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
            audioCtxRef.current.close().catch(err =>
                console.warn("Error closing AudioContext:", err)
            );
            audioCtxRef.current = null;
        }
    };

    const startMicTest = async (): Promise<void> => {
        if (isActiveRef.current) return;

        try {
            setError(null);

            // Clean up old WebSocket
            if (wsRef.current) {
                cleanupWebSocket();
            }

            // Clean up any existing connections
            if (micCleanupRef.current) {
                micCleanupRef.current();
                micCleanupRef.current = null;
            }

            // Small delay to ensure WebSocket cleanup completes
            await new Promise(resolve => setTimeout(resolve, 100));

            // Initialize AudioContext
            if (!audioCtxRef.current || audioCtxRef.current.state === 'closed') {
                // audioCtxRef.current = new AudioContext({ sampleRate: 44100 });
                audioCtxRef.current = new AudioContext();
                console.log("AudioContext sampleRate:", audioCtxRef.current.sampleRate);
                try {
                    await audioCtxRef.current.audioWorklet.addModule('/linearPCMProcessor.js');
                } catch {
                    throw new Error('Failed to load audio worklet module. Please ensure linearPCMProcessor.js is available.');
                }
            }

            // Resume AudioContext if suspended
            if (audioCtxRef.current.state === 'suspended') {
                await audioCtxRef.current.resume();
            }

            // Get microphone stream
            if (!micStreamRef.current) {
                try {
                    micStreamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true });
                } catch {
                    throw new Error('Microphone access denied. Please check your browser permissions.');
                }
            }

            // Set up audio routing
            const audioCtx = audioCtxRef.current;
            const micStream = micStreamRef.current;
            const source = audioCtx.createMediaStreamSource(micStream);

            const workletNode = new AudioWorkletNode(audioCtx, 'linear-pcm-processor', {
                numberOfInputs: 1,
                numberOfOutputs: 1,
                channelCount: 1,
            });

            // Create WebSocket connection

            // Fly.io
            // wsRef.current = new WebSocket('wss://deepgram-stt.fly.dev');

            // Render
            wsRef.current = new WebSocket('wss://deepgram-websocket-server.onrender.com');

            // Localhost
            // wsRef.current = new WebSocket('ws://localhost:3001');

            workletNode.port.onmessage = (e: MessageEvent) => {
                const message = e.data;

                if (message.type === 'audio') {
                    if (wsRef.current?.readyState === WebSocket.OPEN) {
                        wsRef.current.send(message.data);
                    }
                }
            };

            source.connect(workletNode);

            micCleanupRef.current = () => {
                workletNode.port.onmessage = null;
                try {
                    source.disconnect();
                    workletNode.disconnect();
                } catch (err) {
                    console.warn('Error disconnecting audio nodes:', err);
                }
            };

            wsRef.current.onmessage = async (event: MessageEvent) => {
                try {
                    const text = event.data instanceof Blob ? await event.data.text() : event.data;
                    const data: WebSocketMessage = JSON.parse(text);
                    const newTranscript = data.channel?.alternatives?.[0]?.transcript || '';
                    if (newTranscript) {
                        setTranscript(newTranscript);
                    }
                } catch (err) {
                    console.warn('WebSocket data error:', err);
                }
            };

            wsRef.current.onopen = () => {
                isActiveRef.current = true;
                setIsListening(true);
            };

            wsRef.current.onerror = (e: Event) => {
                console.error('WebSocket error:', e);
                setError('Connection error. Please try again.');
                setIsListening(false);
            };

            wsRef.current.onclose = () => {
                setIsListening(false);
            };

        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to start microphone test';
            console.error('Failed to start mic test:', err);
            setError(errorMessage);
            setIsListening(false);
        }
    };

    const stopMicTest = (): void => {
        console.log('[MicCheck] Stopping mic test');

        cleanupWebSocket();

        if (micCleanupRef.current) {
            micCleanupRef.current();
            micCleanupRef.current = null;
        }

        isActiveRef.current = false;
        setIsListening(false);
        setTranscript('');
    };

    const cleanup = (): void => {
        console.log('[MicCheck] Full cleanup initiated');

        try {
            cleanupWebSocket();
            cleanupAudio();

            isActiveRef.current = false;
            setIsListening(false);
            setTranscript('');
            setError(null);
        } catch (err) {
            console.warn("[MicCheck] Error during cleanup:", err);
        }
    };

    useEffect(() => {
        return () => {
            console.log('[MicCheck] Component unmounting, cleaning up');
            cleanup();
        };
    }, []);

    return { startMicTest, stopMicTest, transcript, isListening, cleanup, error };
};