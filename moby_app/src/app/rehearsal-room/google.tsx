'use client';

import React, { useState } from 'react';
import { useGoogleSTT } from '@/lib/google/speechToText';

interface GoogleSTTProps {
    character: string;
    text: string;
    lineEndKeywords: string[];
    onLineMatched: (transcript: string) => void;
    expectedEmbedding: number[] | null;
}

const GoogleSTT: React.FC<GoogleSTTProps> = ({
    character,
    text,
    lineEndKeywords,
    onLineMatched,
    expectedEmbedding,
}) => {
    const [log, setLog] = useState<string[]>([]);
    const [hasTimedOut, setHasTimedOut] = useState(false);

    if (!expectedEmbedding) {
        console.warn("⚠️ No expected embedding provided. Cue detection may fail.");
    }

    const { startSTT, stopSTT } = useGoogleSTT({
        lineEndKeywords,
        onCueDetected: (transcript: string) => {
            setLog((prev) => [...prev, `✅ Cue detected: ${transcript}`]);
            setHasTimedOut(false);
            onLineMatched(transcript);
        },
        onSilenceTimeout: () => {
            setLog((prev) => [...prev, '🛑 Silence timeout — session ended.']);
            setHasTimedOut(true);
        },
        expectedEmbedding: expectedEmbedding ?? [],
    });

    const handleRetry = () => {
        setLog((prev) => [...prev, '🔁 Retrying line...']);
        setHasTimedOut(false);
        startSTT();
    };

    return (
        <div className="p-4 space-y-2">
            <h2 className="text-xl font-bold">🎙️ Google Listening</h2>
            <p className="text-base">
                Your line: <strong>{text}</strong>
            </p>
            <p className="text-sm text-gray-500">Character: {character}</p>

            <div className="flex gap-2 mt-4">
                <button onClick={startSTT} className="px-4 py-2 bg-green-600 text-white rounded">
                    ▶️ Start STT
                </button>
                <button onClick={stopSTT} className="px-4 py-2 bg-red-600 text-white rounded">
                    ⏹ Stop STT
                </button>
                {hasTimedOut && (
                    <>
                        <button onClick={startSTT} className="px-4 py-2 bg-blue-600 text-white rounded">
                            🔄 Resume
                        </button>
                        <button onClick={handleRetry} className="px-4 py-2 bg-yellow-600 text-white rounded">
                            🔁 Retry
                        </button>
                    </>
                )}
            </div>

            <div className="bg-gray-100 p-2 mt-4 rounded">
                <h3 className="font-semibold">Cue Detection Log</h3>
                <ul>
                    {log.map((entry, i) => (
                        <li key={i}>{entry}</li>
                    ))}
                </ul>
            </div>
        </div>
    );
};

export default GoogleSTT;