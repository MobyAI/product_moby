'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import type { ScriptElement } from '@/types/script';

export default function RehearsalRoomPage() {
    const searchParams = useSearchParams();
    const userID = searchParams.get('userID');
    const scriptID = searchParams.get('scriptID');

    const [script, setScript] = useState<ScriptElement[] | null>(null);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isWaitingForUser, setIsWaitingForUser] = useState(false);

    // Fetch script
    useEffect(() => {
        if (!userID || !scriptID) return;

        const fetchScript = async () => {
            try {
                const res = await fetch(`/api/scripts/${scriptID}?userID=${userID}`);
                if (!res.ok) throw new Error('Failed to fetch script');
                const data = await res.json();
                setScript(data.script);
            } catch (err) {
                console.error('Error loading script:', err);
            }
        };

        fetchScript();
    }, [userID, scriptID]);

    const current = script?.find((el) => el.index === currentIndex) ?? null;

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

    if (!script) {
        return (
            <div className="p-6">
                <h1 className="text-xl font-bold">🎭 Rehearsal Room</h1>
                <p className="text-gray-500">Loading script...</p>
            </div>
        );
    }

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
        </div>
    );
}