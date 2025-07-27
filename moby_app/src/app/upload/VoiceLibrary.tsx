'use client';

import { useState, useRef, useEffect } from 'react';

interface VoiceSample {
    name: string;
    description: string;
    url: string;
    filename: string;
}

interface VoiceLibraryProps {
    samples: VoiceSample[] | null;
    onClose?: () => void;
}

export default function VoiceLibrary({ samples, onClose }: VoiceLibraryProps) {
    const [playingUrl, setPlayingUrl] = useState<string | null>(null);
    const audioRef = useRef<HTMLAudioElement | null>(null);

    const handlePlay = (url: string) => {
        if (playingUrl === url) {
            audioRef.current?.pause();
            setPlayingUrl(null);
            audioRef.current = null;
        } else {
            audioRef.current?.pause();

            const audio = new Audio(url);
            audioRef.current = audio;
            setPlayingUrl(url);
            audio.play();

            audio.onended = () => {
                setPlayingUrl(null);
                audioRef.current = null;
            };
        }
    };

    useEffect(() => {
        return () => {
            audioRef.current?.pause();
            audioRef.current = null;
        };
    }, []);

    if (!samples) {
        return (
            <div className="space-y-4">
                <h2 className="text-xl font-semibold">Voice Library Loading...</h2>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <h2 className="text-xl font-semibold">Voice Library</h2>
            {samples.map((sample) => {
                const isPlaying = playingUrl === sample.url;

                return (
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
                            className="text-blue-600 hover:underline text-sm"
                        >
                            {isPlaying ? '⏸️ Pause' : '🔊 Play'}
                        </button>
                    </div>
                );
            })}
        </div>
    );
}