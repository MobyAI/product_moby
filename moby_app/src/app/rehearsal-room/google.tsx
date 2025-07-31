'use client';

import React, { useState } from 'react';

interface GoogleSTTProps {
    character: string;
    text: string;
    expectedEmbedding: number[] | null;
    start: () => void;
    stop: () => void;
}

export default function GoogleSTT({
    character,
    text,
    expectedEmbedding,
    start,
    stop,
}: GoogleSTTProps) {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [log, setLog] = useState<string[]>([]);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [hasTimedOut, setHasTimedOut] = useState(false);

    if (!expectedEmbedding) {
        console.warn("⚠️ No expected embedding provided. Cue detection may fail.");
    }

    return (
        <div className="p-4 space-y-2">
            <h2 className="text-xl font-bold">🎙️ Google Listening</h2>
            <p className="text-base">Your line: <strong>{text}</strong></p>
            <p className="text-sm text-gray-500">Character: {character}</p>
            <div className="flex gap-2 mt-4">
                <button onClick={start} className="px-4 py-2 bg-green-600 text-white rounded">▶️ Start STT</button>
                <button onClick={stop} className="px-4 py-2 bg-red-600 text-white rounded">⏹ Stop STT</button>
                {hasTimedOut && (
                    <button onClick={start} className="px-4 py-2 bg-blue-600 text-white rounded">🔄 Resume</button>
                )}
            </div>
            <div className="bg-gray-100 p-2 mt-4 rounded">
                <h3 className="font-semibold">Cue Detection Log</h3>
                <ul>{log.map((entry, i) => <li key={i}>{entry}</li>)}</ul>
            </div>
        </div>
    );
}