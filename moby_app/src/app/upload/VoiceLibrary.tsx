'use client';

import React, { useEffect, useState } from 'react';
import { fetchAllVoiceSamples } from '@/lib/api/dbFunctions/audio/tts';

interface VoiceSample {
    name: string;
    description: string;
    url: string;
    filename: string;
}

export default function VoiceLibrary() {
    const [samples, setSamples] = useState<VoiceSample[]>([]);
    const [playingUrl, setPlayingUrl] = useState<string | null>(null);

    useEffect(() => {
        const loadSamples = async () => {
            try {
                const data = await fetchAllVoiceSamples();
                setSamples(data);
            } catch (err) {
                console.error('Failed to load voice samples:', err);
            }
        };

        loadSamples();
    }, []);

    const handlePlay = (url: string) => {
        if (playingUrl === url) {
            setPlayingUrl(null);
        } else {
            setPlayingUrl(url);
            const audio = new Audio(url);
            audio.play();
        }
    };

    return (
        <div className="space-y-4">
            <h2 className="text-xl font-semibold">Voice Library</h2>
            {samples.map((sample) => (
                <div
                    key={sample.filename}
                    className="border p-4 rounded-xl shadow-sm bg-white flex justify-between items-center"
                >
                    <div>
                        <p className="font-medium">{sample.name}</p>
                        <p className="text-sm text-gray-500">{sample.description}</p>
                    </div>
                    <button
                        onClick={() => handlePlay(sample.url)}
                        className="text-blue-600 hover:underline"
                    >
                        🔊 Play
                    </button>
                </div>
            ))}
        </div>
    );
}