'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { fetchScriptByID } from '@/lib/api/dbFunctions/scripts';
import { fetchEmbedding, addEmbeddingsToScript } from '@/lib/api/embed';
import { useTextToSpeech } from '@/lib/api/textToSpeech';
import type { ScriptElement } from '@/types/script';
import Deepgram from './deepgram';
import GoogleSTT from './google';

export default function RehearsalRoomPage() {
    const searchParams = useSearchParams();
    const userID = searchParams.get('userID');
    const scriptID = searchParams.get('scriptID');

    const [loading, setLoading] = useState(false);
    const [script, setScript] = useState<ScriptElement[] | null>(null);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isWaitingForUser, setIsWaitingForUser] = useState(false);

    // TEMP for testing
    const [expectedEmbedding, setExpectedEmbedding] = useState<number[] | null>(null);

    // Fetch script
    useEffect(() => {
        if (!userID || !scriptID) return;

        const fetchScript = async () => {
            try {
                setLoading(true);
                const data = await fetchScriptByID(userID, scriptID);
                // const modifiedScript = await addEmbeddingsToScript(data.script);
                // console.log('modifiedScript: ', JSON.stringify(modifiedScript, null, 2));
                // setScript(modifiedScript);
                setScript(data.script);
            } catch (err) {
                console.error('Error loading script:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchScript();
    }, [userID, scriptID]);

    // Current script element
    const current = script?.find((el) => el.index === currentIndex) ?? null;

    // Handle script flow
    useEffect(() => {
        if (!isPlaying || isWaitingForUser || !current) return;

        if (current.type === 'scene' || current.type === 'direction') {
            console.log(`[${current.type.toUpperCase()}]`, current.text);
            autoAdvance(1500);
        }

        if (current.type === 'line') {
            if (current.role === 'ai') {
                console.log(`[AI LINE]`, current.text);
                autoAdvance(1500);
            } else if (current.role === 'user') {
                console.log(`[USER LINE]`, current.text);
                setIsWaitingForUser(true);
            }
        }
    }, [currentIndex, isPlaying, isWaitingForUser, current]);

    const autoAdvance = (delay = 1000) => {
        setTimeout(() => {
            setCurrentIndex((i) => Math.min(i + 1, (script?.length ?? 1) - 1));
        }, delay);
    };

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleNext = () => setCurrentIndex((i) => Math.min(i + 1, (script?.length ?? 1) - 1));
    const handlePrev = () => setCurrentIndex((i) => Math.max(i - 1, 0));
    const onUserLineMatched = () => {
        setIsWaitingForUser(false);
        setCurrentIndex((i) => Math.min(i + 1, (script?.length ?? 1) - 1));
    };

    async function handleEmbedCurrentLine(current: { type: string; text: string }) {
        if (current?.type !== "line") {
            console.log("🟡 Current item is not a line.");
            return;
        }

        const expectedLine = current.text;
        const embedding = await fetchEmbedding(expectedLine);

        if (embedding) {
            console.log("📐 Embedding for current line:", embedding);
            setExpectedEmbedding(embedding);
        } else {
            console.error("❌ Failed to fetch embedding for:", expectedLine);
        }
    };

    async function loadTTS(text: string, voiceId: string) {
        try {
            const blob = await useTextToSpeech({ text, voiceId });

            const url = URL.createObjectURL(blob);
            const audio = new Audio(url);
            audio.play();
        } catch (err) {
            console.error('❌ Failed to fetch TTS:', err);
        }
    }

    if (loading) {
        return (
            <div className="p-6">
                <h1 className="text-xl font-bold">🎭 Rehearsal Room</h1>
                <p className="text-gray-500">Loading script...</p>
            </div>
        );
    };

    if (!script) {
        return (
            <div className="p-6">
                <h1 className="text-xl font-bold">🎭 Rehearsal Room</h1>
                <p className="text-gray-500">Select a script from db</p>
            </div>
        );
    };

    return (
        <div className="p-6 space-y-4">
            <h1 className="text-2xl font-bold">🎭 Rehearsal Room</h1>

            <div className="border p-4 rounded bg-gray-100 min-h-[120px]">
                {current ? (
                    <div>
                        <p className="text-gray-600 text-sm">#{current.index} — {current.type}</p>
                        <p className="text-xl mt-2">{current.text}</p>
                        {current.type === 'line' && current.character && (
                            <p className="text-sm text-gray-500">– {current.character} ({current.tone})</p>
                        )}
                    </div>
                ) : (
                    <p>🎉 End of script!</p>
                )}
            </div>

            <div className="flex items-center gap-4">
                <button onClick={handlePlay} className="px-4 py-2 bg-green-600 text-white rounded">Play</button>
                <button onClick={handlePause} className="px-4 py-2 bg-yellow-500 text-white rounded">Pause</button>
                <button onClick={handlePrev} className="px-4 py-2 bg-blue-500 text-white rounded">Back</button>
                <button onClick={handleNext} className="px-4 py-2 bg-blue-500 text-white rounded">Next</button>
            </div>
            <div>
                {
                    current?.type === 'line' &&
                    typeof current.character === 'string' &&
                    typeof current.text === 'string' &&
                    Array.isArray(current.lineEndKeywords) &&
                    /* Array.isArray(current.expectedEmbedding) && */ (
                        <>
                            <button
                                onClick={() => {
                                    const tonePrefix =
                                        typeof current.tone === 'string' && current.tone.trim().length > 0
                                            ? current.tone
                                                .trim()
                                                .split(/\s+/)
                                                .map((t) => `[${t}]`)
                                                .join(' ') + ' '
                                            : '';

                                    const textWithTone = tonePrefix + current.text;
                                    loadTTS(textWithTone, 'JBFqnCBsd6RMkjVDRZzb');
                                }}
                            >
                                🔊 Play TTS Audio
                            </button>
                            <br />
                            <button onClick={() => handleEmbedCurrentLine(current)}>
                                🔍 Get Embedding
                            </button>
                            <GoogleSTT
                                character={current.character}
                                text={current.text}
                                lineEndKeywords={current.lineEndKeywords}
                                onLineMatched={onUserLineMatched}
                                // expectedEmbedding={expectedEmbedding}
                                expectedEmbedding={current.expectedEmbedding || expectedEmbedding}
                            />
                            <Deepgram
                                character={current.character}
                                text={current.text}
                                lineEndKeywords={current.lineEndKeywords}
                                onLineMatched={onUserLineMatched}
                                // expectedEmbedding={expectedEmbedding}
                                expectedEmbedding={current.expectedEmbedding || expectedEmbedding}
                            />
                        </>
                    )
                }
            </div>
        </div>
    );
}