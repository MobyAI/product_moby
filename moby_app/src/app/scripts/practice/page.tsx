'use client';

import { useEffect, useState, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { fetchScriptByID } from '@/lib/api/dbFunctions/scripts';
import { addEmbeddingsToScript } from '@/lib/api/embed';
import { useHumeTTS } from '@/lib/api/humeTTS';
import { useGoogleSTT } from '@/lib/google/speechToText';
import type { ScriptElement } from '@/types/script';
import Deepgram from '../../rehearsal-room/deepgram';
import GoogleSTT from '../../rehearsal-room/google';
import { get, set, clear } from 'idb-keyval';

export default function RehearsalRoomPage() {
    const searchParams = useSearchParams();
    const userID = searchParams.get('userID');
    const scriptID = searchParams.get('scriptID');
    const advanceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const currentLineRef = useRef<HTMLDivElement>(null);

    if (!userID || !scriptID) {
        console.log('no user or script id: ', userID, scriptID);
    }

    // Page setup
    const [loading, setLoading] = useState(false);
    const [loadStage, setLoadStage] = useState<string | null>(null);
    const [script, setScript] = useState<ScriptElement[] | null>(null);
    const [sttProvider, setSttProvider] = useState<'google' | 'deepgram'>('deepgram');

    // Rehearsal flow
    const [isPlaying, setIsPlaying] = useState(false);
    const [isWaitingForUser, setIsWaitingForUser] = useState(false);

    // Error handling
    const [storageError, setStorageError] = useState(false);
    const [embeddingError, setEmbeddingError] = useState(false);
    const [ttsLoadError, setTTSLoadError] = useState(false);
    const [ttsFailedLines, setTTSFailedLines] = useState<number[]>([]);

    // Track current index in session storage
    const storageKey = `rehearsal-cache:${scriptID}:index`;

    const [currentIndex, setCurrentIndex] = useState(() => {
        if (typeof window !== 'undefined') {
            const saved = sessionStorage.getItem(storageKey);
            return saved ? parseInt(saved, 10) : 0;
        }
        return 0;
    });

    // Helper function to find next line (skipping scenes and directions)
    const findNextLine = (fromIndex: number): number => {
        if (!script) return fromIndex;
        
        for (let i = fromIndex; i < script.length; i++) {
            if (script[i].type === 'line') {
                return i;
            }
        }
        return script.length; // End of script
    };

    // Helper function to find previous line (skipping scenes and directions)
    const findPrevLine = (fromIndex: number): number => {
        if (!script) return fromIndex;
        
        for (let i = fromIndex; i >= 0; i--) {
            if (script[i].type === 'line') {
                return i;
            }
        }
        return 0; // Beginning of script
    };

    // Auto-scroll to current line
    useEffect(() => {
        if (currentLineRef.current) {
            currentLineRef.current.scrollIntoView({
                behavior: 'smooth',
                block: 'center'
            });
        }
    }, [currentIndex]);

    // Stability check before storing current index
    useEffect(() => {
        const timeout = setTimeout(() => {
            sessionStorage.setItem(storageKey, currentIndex.toString());
        }, 300);

        return () => clearTimeout(timeout);
    }, [currentIndex, scriptID]);

    // [All your existing TTS and loading functions remain the same...]
    const loadScript = async () => {
        if (!userID || !scriptID) return;

        setLoading(true);
        setEmbeddingError(false);
        setTTSLoadError(false);

        // Hume TTS -- No Batch + Context Utterances
        const addTTS = async (script: ScriptElement[]): Promise<[ScriptElement[], number[]]> => {
            const failedIndexes: number[] = [];
            const withTTS: ScriptElement[] = [];

            for (let i = 0; i < script.length; i++) {
                const element = script[i];

                if (element.type === 'line' && element.role === 'scene-partner') {
                    const ttsCacheKey = `tts:${userID}:${scriptID}:${element.index}`;
                    const voiceId =
                        element.gender === 'male'
                            ? 'c5be03fa-09cc-4fc3-8852-7f5a32b5606c'
                            : '5bbc32c1-a1f6-44e8-bedb-9870f23619e2';

                    try {
                        const cached = await get(ttsCacheKey);
                        if (cached) {
                            const url = URL.createObjectURL(cached);
                            withTTS.push({ ...element, ttsUrl: url });
                            continue;
                        }

                        // 🔁 Use previous 2 lines as context utterances
                        const contextUtterance = script
                            .slice(Math.max(0, i - 2), i)
                            .filter(l => l.type === 'line' && typeof l.text === 'string' && l.text.trim().length > 0)
                            .map(l => ({
                                text: l.text,
                                description: (l as any).actingInstructions || '',
                            }));

                        const blob = await useHumeTTS({
                            text: element.text,
                            voiceId,
                            voiceDescription: element.actingInstructions || '',
                            contextUtterance: contextUtterance.length > 0 ? contextUtterance : undefined
                        });

                        try {
                            await set(ttsCacheKey, blob);
                        } catch (setErr) {
                            console.warn(`⚠️ Failed to store TTS blob in IndexedDB for line ${element.index}`, setErr);
                        }

                        const url = URL.createObjectURL(blob);
                        withTTS.push({ ...element, ttsUrl: url });

                        await new Promise((res) => setTimeout(res, 100));
                    } catch (err) {
                        console.warn(`⚠️ Failed to generate Hume TTS for line ${element.index}`, err);
                        failedIndexes.push(element.index);
                        withTTS.push(element);
                    }
                } else {
                    withTTS.push(element);
                }
            }

            return [withTTS, failedIndexes];
        };

        const hydrateTTSUrls = async (script: ScriptElement[]): Promise<[ScriptElement[], number[]]> => {
            const hydrated: ScriptElement[] = [];
            const failedIndexes: number[] = [];

            for (let i = 0; i < script.length; i++) {
                const element = script[i];

                if (element.type === 'line' && element.role === 'scene-partner') {
                    const ttsCacheKey = `tts:${userID}:${scriptID}:${element.index}`;
                    const voiceId =
                        element.gender === 'male'
                            ? 'c5be03fa-09cc-4fc3-8852-7f5a32b5606c'
                            : '5bbc32c1-a1f6-44e8-bedb-9870f23619e2';

                    try {
                        let blob: Blob | undefined;

                        // Try loading from cache
                        try {
                            blob = await get(ttsCacheKey);
                        } catch (getErr) {
                            console.warn(`⚠️ Failed to read cache for line ${element.index}`, getErr);
                        }

                        // If missing, regenerate with context
                        if (!blob) {
                            console.warn(`💡 TTS blob missing for line ${element.index}, regenerating with Hume...`);

                            // Grab up to 2 previous lines as context
                            const contextUtterance = script
                                .slice(Math.max(0, i - 2), i)
                                .filter((l) => l.type === 'line' && typeof l.text === 'string' && l.text.trim().length > 0)
                                .map((l) => ({
                                    text: l.text,
                                    description: (l as any).actingInstructions || '',
                                }));

                            blob = await useHumeTTS({
                                text: element.text,
                                voiceId,
                                voiceDescription: element.actingInstructions || '',
                                contextUtterance: contextUtterance.length > 0 ? contextUtterance : undefined,
                            });

                            try {
                                await set(ttsCacheKey, blob);
                            } catch (setErr) {
                                console.warn(`⚠️ Failed to cache regenerated blob for line ${element.index}`, setErr);
                            }
                        }

                        const url = URL.createObjectURL(blob);
                        hydrated.push({ ...element, ttsUrl: url });
                    } catch (err) {
                        console.warn(`❌ Failed to hydrate or regenerate Hume TTS for line ${element.index}`, err);
                        failedIndexes.push(element.index);
                        hydrated.push(element);
                    }
                } else {
                    hydrated.push(element);
                }
            }

            return [hydrated, failedIndexes];
        };

        const scriptCacheKey = `script-cache:${userID}:${scriptID}`;

        try {
            setLoadStage('🔍 Checking local cache...');
            const cached = await get(scriptCacheKey);

            if (cached) {
                setLoadStage('🔁 Hydrating TTS URLs from cached audio blobs...');
                const [hydrated, failedIndexes] = await hydrateTTSUrls(cached);

                if (failedIndexes.length > 0) {
                    setTTSLoadError(true);
                    setTTSFailedLines(failedIndexes);
                }

                setLoadStage('✅ Loaded from cache');
                console.log('📦 Loaded script from IndexedDB cache');
                console.log('what is hydrated', hydrated);
                setScript(hydrated);
                return;
            } else {
                setLoadStage('🌐 Fetching script from Firestore...');
                console.log('🌐 Fetching script from Firestore');
                const data = await fetchScriptByID(userID, scriptID);
                console.log('what is data', data);
                const script = data.script;

                // Embed all user lines
                setLoadStage('📐 Embedding lines...');
                let embedded: any[];
                try {
                    embedded = await addEmbeddingsToScript(script);
                } catch (embedErr) {
                    console.error('❌ Failed to embed script:', embedErr);
                    setEmbeddingError(true);
                    return;
                }

                // Add TTS audio
                setLoadStage('🎤 Generating TTS...');
                const [withTTS, failedIndexes] = await addTTS(embedded);

                if (failedIndexes.length > 0) {
                    setTTSLoadError(true);
                    setTTSFailedLines(failedIndexes);
                    return;
                }

                // Try storing
                setLoadStage('💾 Caching to IndexedDB...');
                try {
                    await set(scriptCacheKey, withTTS);
                    console.log('💾 Script cached successfully');
                } catch (err) {
                    console.warn('⚠️ Failed to store script in IndexedDB:', err);
                    if (isQuotaExceeded(err)) {
                        setStorageError(true);
                    }
                    return;
                }

                setLoadStage('✅ Script ready!');
                setScript(withTTS);
            }
        } catch (err) {
            console.error('❌ Error loading script:', err);
            setLoadStage('❌ Unexpected error loading script');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        setLoadStage(null);
        loadScript();
    }, [userID, scriptID]);

    const isQuotaExceeded = (error: any) => {
        return (
            error &&
            (error.name === 'QuotaExceededError' ||
                error.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
                error.message?.includes('maximum size'))
        );
    };

    // Handle script flow - MODIFIED to skip scenes and directions
    const current = script?.find((el) => el.index === currentIndex) ?? null;

    useEffect(() => {
        if (!current || !isPlaying || isWaitingForUser) return;

        switch (current.type) {
            case 'scene':
            case 'direction':
                // Skip scenes and directions during playback
                console.log(`[SKIPPING ${current.type.toUpperCase()}]`, current.text);
                autoAdvance(0); // Advance immediately
                break;

            case 'line':
                if (current.role === 'user') {
                    console.log(`[USER LINE]`, current.text);
                    setIsWaitingForUser(true);
                }
                break;
        }
    }, [current, currentIndex, isPlaying, isWaitingForUser]);

    useEffect(() => {
        if (
            !current ||
            !isPlaying ||
            isWaitingForUser ||
            current.type !== 'line' ||
            current.role !== 'scene-partner' ||
            !current.ttsUrl
        ) {
            return;
        }

        const audio = new Audio(current.ttsUrl);
        console.log(`[SCENE PARTNER LINE]`, current.text);

        audio.play().catch((err) => {
            console.warn('⚠️ Failed to play TTS audio', err);
            autoAdvance(1000);
        });

        audio.onended = () => {
            autoAdvance(250);
        };

        return () => {
            audio.pause();
            audio.src = '';
        };
    }, [current, isPlaying, isWaitingForUser]);

    useEffect(() => {
        if (
            current?.type === 'line' &&
            current?.role === 'user' &&
            isPlaying &&
            !isWaitingForUser
        ) {
            startSTT();
        }
    }, [current, isPlaying, isWaitingForUser]);

    // MODIFIED autoAdvance to skip to next line only
    const autoAdvance = (delay = 1000) => {
        if (advanceTimeoutRef.current) clearTimeout(advanceTimeoutRef.current);

        advanceTimeoutRef.current = setTimeout(() => {
            setCurrentIndex((i) => {
                const nextLineIndex = findNextLine(i + 1);
                const endOfScript = nextLineIndex >= (script?.length ?? 0);

                if (endOfScript) {
                    console.log('🎬 Rehearsal complete — cleaning up STT');
                    cleanupSTT();
                    setIsPlaying(false);
                    return i;
                }

                return nextLineIndex;
            });

            advanceTimeoutRef.current = null;
        }, delay);
    };

    const handlePlay = async () => {
        await initializeSTT();
        
        // If we're not on a line, move to the first line
        if (script && current?.type !== 'line') {
            const firstLineIndex = findNextLine(0);
            setCurrentIndex(firstLineIndex);
        }
        
        setIsPlaying(true);
    };
    
    const handlePause = () => {
        pauseSTT();
        setIsWaitingForUser(false);
        setIsPlaying(false);

        if (advanceTimeoutRef.current) {
            clearTimeout(advanceTimeoutRef.current);
            advanceTimeoutRef.current = null;
        }
    };
    
    // MODIFIED to jump to next/prev lines only
    const handleNext = () => {
        setIsWaitingForUser(false);
        setCurrentIndex((i) => {
            const nextLineIndex = findNextLine(i + 1);
            return Math.min(nextLineIndex, (script?.length ?? 1) - 1);
        });
        setIsPlaying(false);
    };
    
    const handlePrev = () => {
        setIsWaitingForUser(false);
        setCurrentIndex((i) => {
            const prevLineIndex = findPrevLine(i - 1);
            return Math.max(prevLineIndex, 0);
        });
        setIsPlaying(false);
    };
    
    const handleRestart = () => {
        cleanupSTT();
        setIsWaitingForUser(false);
        
        // Start from the first line, not index 0
        const firstLineIndex = script ? findNextLine(0) : 0;
        setCurrentIndex(firstLineIndex);
        setIsPlaying(false);
    };

    const onUserLineMatched = () => {
        setIsWaitingForUser(false);

        setCurrentIndex((i) => {
            const nextLineIndex = findNextLine(i + 1);
            const endOfScript = nextLineIndex >= (script?.length ?? 0);

            if (endOfScript) {
                console.log('🎬 User finished final line — cleaning up STT');
                cleanupSTT();
                setIsPlaying(false);
                return i;
            }

            return nextLineIndex;
        });
    };

    const {
        initializeSTT,
        startSTT,
        pauseSTT,
        cleanupSTT,
    } = useGoogleSTT({
        lineEndKeywords: current?.lineEndKeywords ?? [],
        expectedEmbedding: current?.expectedEmbedding ?? [],
        onCueDetected: onUserLineMatched,
        onSilenceTimeout: () => {
            console.log('⏱️ Timeout reached');
            setIsWaitingForUser(false);
        },
    });

    useEffect(() => {
        const handleUnload = () => {
            cleanupSTT();
            console.log('🧹 STT cleaned up on unload');
        };

        window.addEventListener('beforeunload', handleUnload);

        return () => {
            cleanupSTT();
            window.removeEventListener('beforeunload', handleUnload);
            console.log('🧹 STT cleaned up on unmount');
        };
    }, []);

    // Render script element with highlighting
    const renderScriptElement = (element: ScriptElement, index: number) => {
        const isCurrent = element.index === currentIndex;
        const isCurrentRef = isCurrent ? currentLineRef : null;

        switch (element.type) {
            case 'scene':
                return (
                    <div
                        key={index}
                        ref={isCurrentRef}
                        className={`mb-6 text-center font-bold uppercase tracking-wide transition-all duration-300 ${
                            isCurrent 
                                ? 'bg-yellow-200 text-gray-900 p-4 rounded-lg shadow-lg' 
                                : 'text-gray-800'
                        }`}
                    >
                        {element.text}
                    </div>
                );

            case 'line':
                return (
                    <div
                        key={index}
                        ref={isCurrentRef}
                        className={`mb-4 mx-8 lg:mx-16 transition-all duration-300 ${
                            isCurrent 
                                ? 'bg-blue-100 p-4 rounded-lg shadow-lg border-l-4 border-blue-500' 
                                : 'hover:bg-gray-50'
                        }`}
                    >
                        <div className="flex flex-col">
                            <div className="flex items-center justify-between mb-2">
                                <span className="font-bold text-gray-900 uppercase tracking-wide">
                                    {element.character}
                                </span>
                                <div className="flex items-center gap-2">
                                    <span className="text-xs text-gray-500 italic px-2 py-1 bg-gray-100 rounded">
                                        {element.tone}
                                    </span>
                                    <span
                                        className={`text-xs px-2 py-1 rounded border ${
                                            element.role === 'user'
                                                ? 'bg-green-100 border-green-300 text-green-800'
                                                : 'bg-blue-100 border-blue-300 text-blue-800'
                                        }`}
                                    >
                                        {element.role === 'user' ? '🙋 You' : '🤖 Scene Partner'}
                                    </span>
                                </div>
                            </div>
                            <div className={`text-gray-800 leading-relaxed pl-4 ${
                                isCurrent ? 'text-lg font-medium' : ''
                            }`}>
                                {element.text}
                            </div>
                            {isCurrent && isWaitingForUser && (
                                <div className="mt-2 text-sm text-blue-600 italic">
                                    🎤 Listening for your line...
                                </div>
                            )}
                        </div>
                    </div>
                );

            case 'direction':
                return (
                    <div
                        key={index}
                        ref={isCurrentRef}
                        className={`mb-4 mx-12 lg:mx-20 text-center transition-all duration-300 ${
                            isCurrent 
                                ? 'bg-gray-100 p-3 rounded-lg text-gray-700 font-medium' 
                                : 'text-gray-600'
                        }`}
                    >
                        <div className="italic">
                            ({element.text})
                        </div>
                    </div>
                );

            default:
                return null;
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <h1 className="text-xl font-bold mb-4 text-black">Playroom</h1>
                    {loadStage && (
                        <div className="text-sm text-gray-600 italic">
                            {loadStage}
                        </div>
                    )}
                </div>
            </div>
        );
    }

    if (!script) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <h1 className="text-xl font-bold text-black">Playroom</h1>
                    <p className="text-gray-500">Select a script from db</p>
                </div>
            </div>
        );
    }

    // Calculate progress based on lines only
    const totalLines = script.filter(el => el.type === 'line').length;
    const currentLineNumber = script.slice(0, currentIndex + 1).filter(el => el.type === 'line').length;

    return (
        <div className="min-h-screen bg-gray-50 flex">
            {/* Fixed Control Panel */}
            <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
                <div className="p-6 border-b border-gray-200">
                    <h1 className="text-xl font-bold mb-4 text-black">Playroom</h1>
                    
                    {/* Error Messages */}
                    {embeddingError && (
                        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-600 text-sm">
                            Failed to embed all lines. Some lines may be missing expected match behavior.
                            <br />
                            <button
                                className="mt-2 px-3 py-1 bg-red-600 text-white rounded text-xs"
                                onClick={() => window.location.reload()}
                            >
                                🔁 Retry Embedding
                            </button>
                        </div>
                    )}
                    
                    {ttsLoadError && (
                        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-600 text-sm">
                            <p>Some lines failed to load TTS: {ttsFailedLines.join(', ')}</p>
                            <button
                                className="mt-2 px-3 py-1 bg-blue-600 text-white rounded text-xs"
                                onClick={() => retryTTS(ttsFailedLines)}
                            >
                                Retry Failed Lines
                            </button>
                        </div>
                    )}
                    
                    {storageError && (
                        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-600 text-sm">
                            <p>🚫 Not enough space to store rehearsal data.</p>
                            <button
                                onClick={async () => {
                                    await clear();
                                    setStorageError(false);
                                    window.location.reload();
                                }}
                                className="mt-2 px-3 py-1 bg-red-600 text-white rounded text-xs"
                            >
                                Clear Local Storage & Retry
                            </button>
                        </div>
                    )}
                </div>

                {/* Controls */}
                <div className="p-6 space-y-4">
                    <div className="grid grid-cols-2 gap-2">
                        <button 
                            onClick={handlePlay} 
                            className="px-3 py-2 bg-green-600 text-white rounded text-sm font-medium hover:bg-green-700"
                        >
                            ▶️ Play
                        </button>
                        <button 
                            onClick={handlePause} 
                            className="px-3 py-2 bg-yellow-500 text-white rounded text-sm font-medium hover:bg-yellow-600"
                        >
                            ⏸️ Pause
                        </button>
                        <button 
                            onClick={handlePrev} 
                            className="px-3 py-2 bg-blue-500 text-white rounded text-sm font-medium hover:bg-blue-600"
                        >
                            ⏮️ Back
                        </button>
                        <button 
                            onClick={handleNext} 
                            className="px-3 py-2 bg-blue-500 text-white rounded text-sm font-medium hover:bg-blue-600"
                        >
                            ⏭️ Next
                        </button>
                    </div>
                    
                    {currentIndex !== 0 && (
                        <button 
                            onClick={handleRestart} 
                            className="w-full px-3 py-2 bg-red-500 text-white rounded text-sm font-medium hover:bg-red-600"
                        >
                            🔄 Restart
                        </button>
                    )}

                    {/* Progress - Updated to show line progress */}
                    <div className="text-sm text-gray-600">
                        Line {currentLineNumber} of {totalLines}
                        <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                            <div 
                                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                                style={{ width: `${(currentLineNumber / totalLines) * 100}%` }}
                            ></div>
                        </div>
                    </div>
                </div>

                {/* STT Component */}
                {current?.type === 'line' &&
                    current?.role === 'user' &&
                    typeof current.character === 'string' &&
                    typeof current.text === 'string' &&
                    Array.isArray(current.lineEndKeywords) &&
                    Array.isArray(current.expectedEmbedding) && (
                        <div className="p-6 border-t border-gray-200 mt-auto">
                            {sttProvider === 'google' ? (
                                <GoogleSTT
                                    character={current.character}
                                    text={current.text}
                                    expectedEmbedding={current.expectedEmbedding}
                                    start={startSTT}
                                    stop={pauseSTT}
                                />
                            ) : (
                                <Deepgram
                                    character={current.character}
                                    text={current.text}
                                    expectedEmbedding={current.expectedEmbedding}
                                    start={startSTT}
                                    stop={pauseSTT}
                                />
                            )}
                        </div>
                    )}
            </div>

            {/* Script Display */}
            <div className="flex-1 overflow-y-auto">
                <div className="max-w-4xl mx-auto p-6">
                    <div className="bg-white border border-gray-300 rounded-lg p-8 font-mono text-sm leading-relaxed">
                        {script.map((element, index) => renderScriptElement(element, index))}
                        
                        {currentIndex >= script.length - 1 && (
                            <div className="text-center py-8 text-gray-500 text-lg">
                                🎉 End of script!
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );

    // Helper function for TTS retry (keeping your existing implementation)
    const retryTTS = async (failedIndexes: number[]) => {
        // Your existing retryTTS implementation here...
    };
}