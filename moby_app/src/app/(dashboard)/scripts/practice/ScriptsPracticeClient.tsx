"use client";

import { useEffect, useState, useRef, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useGoogleSTT } from "@/lib/google/speechToText";
import { useDeepgramSTT } from "@/lib/deepgram/speechToText";
import type { ScriptElement } from "@/types/script";
import { updateScript, setLastPracticed } from "@/lib/firebase/client/scripts";
import { AudioPlayerWithFallbacks } from "@/lib/audioplayer/withFallbacks";
import { loadScript, hydrateScript, hydrateLine, initializeEmbeddingModel } from "./loader";
import { RoleSelector } from "./roleSelector";
import EditableLine from "./editableLine";
import { OptimizedLineRenderer } from "./lineRenderer";
import { restoreSession, saveSession } from "./session";
import { clear, set } from "idb-keyval";
import { LoadingScreen } from "@/components/ui";
import {
    Button,
    MicCheckModal,
    DelaySelector,
    CountdownTimer
} from "@/components/ui";
import { useAuthUser } from "@/components/providers/UserProvider";
import { useToast } from "@/components/providers/ToastProvider";
import {
    Play,
    Pause,
    SkipBack,
    SkipForward,
    RotateCcw,
    Undo2,
    Pencil,
    ChevronDown,
    RefreshCw,
    AlertCircle,
} from "lucide-react";
import * as Sentry from "@sentry/nextjs";
import { useQueryClient } from "@tanstack/react-query";

// export default function RehearsalRoomPage() {
function RehearsalRoomContent() {
    const searchParams = useSearchParams();
    const scriptID = searchParams.get("scriptID");

    const { uid } = useAuthUser();
    const userID = uid;
    const { showToast } = useToast();
    const queryClient = useQueryClient();

    const advanceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const currentLineRef = useRef<HTMLDivElement>(null);
    const router = useRouter();

    if (!userID || !scriptID) {
        console.log("no user or script id: ", userID, scriptID);
    }

    // Loading
    const [loading, setLoading] = useState(false);
    const [hydrating, setHydrating] = useState(false);
    const [downloading, setDownloading] = useState(false);
    const [updating, setUpdating] = useState(false);
    const [loadStage, setLoadStage] = useState<string | null>(null);
    const [loadProgress, setLoadProgress] = useState(0);
    const [ttsHydrationStatus, setTTSHydrationStatus] = useState<Record<number, 'pending' | 'updating' | 'ready' | 'failed'>>({});
    const hydrationInProgress = useRef(false);

    // Use a ref to track if processing should continue
    const shouldContinueProcessing = useRef(true);

    // Disable script rehearsal until finished
    const isBusy = hydrating || downloading || updating;

    // Page Content
    const [script, setScript] = useState<ScriptElement[] | null>(null);
    const [scriptName, setScriptName] = useState<string | null>(null);
    const scriptRef = useRef<ScriptElement[] | null>(null);
    const [editingLineIndex, setEditingLineIndex] = useState<number | null>(null);
    const [isUpdatingLine, setIsUpdatingLine] = useState(false);
    const [showAdvanced, setShowAdvanced] = useState(false);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [sttProvider, setSttProvider] = useState<"google" | "deepgram">(
        "deepgram"
    );

    // Mic Check
    const [showMicCheck, setShowMicCheck] = useState<boolean>(false);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [micCheckComplete, setMicCheckComplete] = useState<boolean>(false);

    // Rehearsal flow
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isWaitingForUser, setIsWaitingForUser] = useState(false);
    const wordRefs = useRef<Map<number, HTMLSpanElement[]>>(new Map());
    const [lineStates, setLineStates] = useState<Map<number, { matched: number; completed: boolean }>>(new Map());
    const [skipMs, setSkipMs] = useState(4000);
    const [showCountdown, setShowCountdown] = useState(false);
    const [countdownDuration, setCountdownDuration] = useState(0);
    const [isFinished, setIsFinished] = useState(false);

    // Error handling
    const [storageError, setStorageError] = useState(false);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [embeddingError, setEmbeddingError] = useState(false);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [embeddingFailedLines, setEmbeddingFailedLines] = useState<number[]>(
        []
    );
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [ttsLoadError, setTTSLoadError] = useState(false);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [ttsFailedLines, setTTSFailedLines] = useState<number[]>([]);

    // Load script and restore session
    useEffect(() => {
        if (!userID || !scriptID) return;

        // Start processing
        shouldContinueProcessing.current = true;

        // Check if hydration is already running
        if (hydrationInProgress.current) {
            console.log("⏭️ Hydration already in progress, skipping...");
            return;
        }
        hydrationInProgress.current = true;

        (async () => {
            setLoading(true);
            setHydrating(true);
            setDownloading(true);
            setLoadProgress(0);

            try {
                // 1) Load script first
                const rawScript = await loadScript({
                    userID,
                    scriptID,
                    setLoadStage,
                    setStorageError,
                    setScriptName,
                });

                if (!rawScript) {
                    return;
                }

                // Check if we should continue
                if (!shouldContinueProcessing.current) {
                    console.log('Load and hydration cancelled');
                    return;
                }

                // Mark all user lines as ready (they don't need TTS)
                rawScript.forEach(element => {
                    if (element.type === 'line' && element.role === 'user') {
                        updateTTSHydrationStatus(element.index, 'ready');
                    }
                });

                setScript(rawScript);
                scriptRef.current = rawScript;
                setLoading(false);

                // 2) Initialize embeddings
                setLoadProgress(0);
                try {
                    await initializeEmbeddingModel({
                        setLoadStage,
                        onProgressUpdate: (a: number, b?: number) => {
                            const pct = b && b > 0 ? Math.round((a / b) * 100) : Math.round(a);
                            setLoadProgress(Math.max(0, Math.min(100, pct)));
                        },
                    });
                } catch (e) {
                    console.warn("Model initialization failed, using fallback", e);
                    Sentry.captureException(e);
                } finally {
                    setDownloading(false);
                }

                if (!shouldContinueProcessing.current) {
                    console.log('Load and hydration cancelled');
                    return;
                }

                // 3) Hydrate script
                setLoadProgress(0);
                try {
                    const wasHydrated = await hydrateScript({
                        script: rawScript,
                        userID,
                        scriptID,
                        setLoadStage,
                        setScript,
                        setStorageError,
                        setEmbeddingError,
                        setEmbeddingFailedLines,
                        setTTSLoadError,
                        setTTSFailedLines,
                        updateTTSHydrationStatus,
                        getScriptLine,
                        onProgressUpdate: (hydrated, total) => {
                            const pct = total > 0 ? Math.round((hydrated / total) * 100) : 0;
                            setLoadProgress(pct);
                        },
                    });

                    if (shouldContinueProcessing.current && wasHydrated) {
                        showToast({
                            header: "Script ready!",
                            type: "success",
                        });
                    }
                } catch (e) {
                    console.error("Hydration failed", e);
                    Sentry.captureException(e);
                }

                if (!shouldContinueProcessing.current) {
                    console.log('Load and hydration cancelled');
                    return;
                }

                // 4) Restore session
                const restored = await restoreSession(scriptID);
                if (restored) {
                    setCurrentIndex(restored.index ?? 0);
                }
            } finally {
                hydrationInProgress.current = false;
                setHydrating(false);
                setDownloading(false);
                setLoading(false);
            }
        })();

        // Optional: Reset on cleanup in case component unmounts
        return () => {
            hydrationInProgress.current = false;
            shouldContinueProcessing.current = false;
            setHydrating(false);
            setDownloading(false);
            setLoading(false);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [userID, scriptID]);

    // Listen for page unload to stop processing
    useEffect(() => {
        // For browser-level navigation (refresh, close tab, back button)
        const handleBeforeUnload = () => {
            shouldContinueProcessing.current = false;
        };

        window.addEventListener('beforeunload', handleBeforeUnload);

        // Cleanup on unmount
        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload);
            shouldContinueProcessing.current = false;
        };
    }, []);

    // Mic check
    useEffect(() => {
        if (!scriptID) return;

        // Check if mic check was already completed for this script
        try {
            const completedChecks = localStorage.getItem('audioSetupsCompleted');
            const completed = completedChecks ? JSON.parse(completedChecks) : {};

            if (!completed[scriptID]) {
                // Show mic check modal after a brief delay to ensure page is interactive
                setTimeout(() => {
                    setShowMicCheck(true);
                }, 100);
            } else {
                setMicCheckComplete(true);
            }
        } catch (err) {
            console.error('Error checking mic setup status:', err);
            Sentry.captureException(err);
            // Show modal on error to be safe
            setShowMicCheck(true);
        }
    }, [scriptID]);

    // Auto-scroll to current line
    useEffect(() => {
        if (currentLineRef.current) {
            currentLineRef.current.scrollIntoView({
                behavior: "smooth",
                block: "center",
            });
        }
    }, [currentIndex]);

    // Save Session
    useEffect(() => {
        if (!scriptID) return;

        const timeout = setTimeout(() => {
            saveSession(scriptID, { index: currentIndex });
        }, 1000);

        return () => clearTimeout(timeout);
    }, [currentIndex, scriptID]);

    const retryLoadScript = async () => {
        if (!userID || !scriptID || !script) return;

        setLoadStage('🚰 Retrying hydration');
        setLoading(true);

        await hydrateScript({
            script: script,
            userID,
            scriptID,
            setLoadStage,
            setScript,
            setStorageError,
            setEmbeddingError,
            setEmbeddingFailedLines,
            setTTSLoadError,
            setTTSFailedLines,
            updateTTSHydrationStatus,
            getScriptLine,
        });

        setLoadStage('✅ Retry succeeded!');
        setLoading(false);
    };

    // Track TTS audio generation status
    const updateTTSHydrationStatus = (index: number, status: 'pending' | 'updating' | 'ready' | 'failed') => {
        setTTSHydrationStatus((prev) => ({
            ...prev,
            [index]: status,
        }));
    };

    // Update role selections
    const handleRoleChange = async (updatedScript: ScriptElement[]) => {
        // Don't allow role changes during initial hydration
        if (isBusy) {
            console.log("⏳ Cannot change roles while hydration is in progress");
            return;
        }

        console.log("🔄 Roles changed, re-hydrating script...");

        // Set loading states
        setHydrating(true);
        setLoadProgress(0);
        setLoadStage("👤 Updating roles...");

        try {
            // Mark all new user lines as ready immediately
            updatedScript.forEach(element => {
                if (element.type === 'line' && element.role === 'user') {
                    updateTTSHydrationStatus(element.index, 'ready');
                }
            });

            // Update the script in state and ref
            setScript(updatedScript);
            scriptRef.current = updatedScript;

            // Re-hydrate the script with new scene-partner lines
            const wasHydrated = await hydrateScript({
                script: updatedScript,
                userID: userID!,
                scriptID: scriptID!,
                setLoadStage,
                setScript,
                setStorageError,
                setEmbeddingError,
                setEmbeddingFailedLines,
                setTTSLoadError,
                setTTSFailedLines,
                updateTTSHydrationStatus,
                getScriptLine,
                onProgressUpdate: (hydrated, total) => {
                    const pct = total > 0 ? Math.round((hydrated / total) * 100) : 0;
                    setLoadProgress(pct);
                },
            });

            if (wasHydrated) {
                showToast({
                    header: "Roles updated!",
                    type: "success",
                });
            }

            // Update the current line preparation
            prepareUserLine(updatedScript[currentIndex]);

        } catch (error) {
            console.error("❌ Role change hydration failed:", error);
            Sentry.captureException(error);
            showToast({
                header: "Failed to update resources",
                line1: "Some lines readings may fail",
                type: "danger",
            });
        } finally {
            setHydrating(false);
            setLoadStage(null);
            setLoadProgress(0);
        }
    };

    // Update script line
    const COMMON_WORDS = new Set([
        'the', 'a', 'an', 'to', 'and', 'but', 'or', 'for', 'at', 'by', 'in', 'on', 'of', 'then', 'so'
    ]);

    function extractLineEndKeywords(text: string): string[] {
        const words = text
            .toLowerCase()
            .replace(/[^a-z0-9\s']/gi, '')
            .split(/\s+/)
            .filter(Boolean);

        // Count occurrences of each word
        const counts = words.reduce<Record<string, number>>((acc, w) => {
            acc[w] = (acc[w] || 0) + 1;
            return acc;
        }, {});

        // Filter out common words and any word that occurs more than once
        const meaningful = words.filter((word) => {
            return !COMMON_WORDS.has(word) && counts[word] === 1;
        });

        const selected = meaningful.slice(-2);

        if (selected.length === 2) return selected;

        if (selected.length === 1) {
            const keyword = selected[0];
            const idx = words.lastIndexOf(keyword);
            let neighbor = '';

            // Prefer word before
            if (idx > 0) {
                neighbor = words[idx - 1];
            } else {
                neighbor = words[idx + 1];
            }

            return neighbor ? [neighbor, keyword] : [keyword];
        }

        if (selected.length === 0 && words.length > 0) {
            return words.slice(-2);
        }

        return [];
    }

    // Rehydrate after line edit
    const onUpdateLine = async (updateLine: ScriptElement) => {
        setEditingLineIndex(null);
        setIsUpdatingLine(true);
        setHydrating(true);
        setLoadStage('♻️ Regenerating...');

        if (!script) {
            console.warn('❌ Tried to update line before script was loaded.');
            return;
        }

        // ✅ Normalize bracket spacing on the edited text (persisted change)
        if (typeof updateLine.text === 'string') {
            updateLine = { ...updateLine, text: normalizeBracketSpaces(updateLine.text) };
        }

        // Inject or replace lineEndKeywords
        if (updateLine.type === 'line' && typeof updateLine.text === 'string') {
            // Remove all content within brackets [] or parentheses () including the brackets/parens
            const sanitized = updateLine.text.replace(/(\[.*?\]|\(.*?\))/g, '').trim();
            const cleaned = sanitized.replace(/\s+/g, ' '); // collapse doubles
            updateLine.lineEndKeywords = extractLineEndKeywords(cleaned);
            console.log('updated kw: ', updateLine.lineEndKeywords);
        }

        try {
            const updatedScript = (script?.map((el) =>
                el.index === updateLine.index ? updateLine : el
            )) ?? [];

            setScript(updatedScript);
            scriptRef.current = updatedScript;

            if (userID && scriptID) {
                const result = await hydrateLine({
                    line: updateLine,
                    script: updatedScript,
                    userID,
                    scriptID,
                    updateTTSHydrationStatus,
                    setStorageError,
                });

                const finalUpdatedScript = updatedScript.map((el) =>
                    el.index === result.index
                        // keep the normalized text we just saved
                        ? { ...el, ...result, text: updateLine.text }
                        : el
                );

                setScript(finalUpdatedScript);
                scriptRef.current = finalUpdatedScript;

                try {
                    await updateScript(scriptID, finalUpdatedScript);
                    console.log(`✅ Updated Firestore with updated line ${updateLine.index}`);
                } catch (err) {
                    console.error('❌ Failed to update Firestore');
                    Sentry.captureException(err);
                }

                const cacheKey = `script-cache:${userID}:${scriptID}`;
                try {
                    await set(cacheKey, finalUpdatedScript);
                    console.log(`💾 Script cached successfully in IndexedDB for line ${updateLine.index}`);
                } catch (cacheError) {
                    console.warn('⚠️ Failed to update IndexedDB cache:', cacheError);
                    Sentry.captureException(cacheError);
                }

                setLoadStage('✅ Line successfully updated!');

                // Update status to ready after successful refresh
                updateTTSHydrationStatus(updateLine.index, 'ready');

                setIsUpdatingLine(false);
                showToast({
                    header: "Line updated!",
                    type: "success",
                });
            }
        } catch (err) {
            console.error(`❌ Failed to update line ${updateLine.index}:`, err);
            Sentry.captureException(err);

            // Reset status back to failed on error
            updateTTSHydrationStatus(updateLine.index, 'failed');

            showToast({
                header: "Line failed to update",
                line1: "Please try again",
                type: "danger",
            });
        } finally {
            setHydrating(false);
            setIsUpdatingLine(false);
        }
    };

    // Refresh failed audio
    const onRefreshLine = async (updateLine: ScriptElement) => {
        setIsUpdatingLine(true);
        setHydrating(true);
        setLoadStage('♻️ Regenerating...');

        if (!script) {
            console.warn('❌ Tried to update line before script was loaded.');
            return;
        }

        try {
            if (userID && scriptID) {
                const result = await hydrateLine({
                    line: updateLine,
                    script: script,
                    userID,
                    scriptID,
                    updateTTSHydrationStatus,
                    setStorageError,
                });

                const finalUpdatedScript = script.map((el) =>
                    el.index === result.index
                        ? { ...el, ...result }
                        : el
                );

                setScript(finalUpdatedScript);
                scriptRef.current = finalUpdatedScript;

                try {
                    await updateScript(scriptID, finalUpdatedScript);
                    console.log(`✅ Updated Firestore with refreshed line ${updateLine.index}`);
                } catch (err) {
                    console.error('❌ Failed to update Firestore');
                    Sentry.captureException(err);
                }

                const cacheKey = `script-cache:${userID}:${scriptID}`;
                try {
                    await set(cacheKey, finalUpdatedScript);
                    console.log(`💾 Script cached successfully in IndexedDB for line ${updateLine.index}`);
                } catch (cacheError) {
                    console.warn('⚠️ Failed to update IndexedDB cache:', cacheError);
                    Sentry.captureException(cacheError);
                }

                setLoadStage('✅ Line successfully refreshed!');
                setIsUpdatingLine(false);

                // Update status to ready after successful refresh
                updateTTSHydrationStatus(updateLine.index, 'ready');

                showToast({
                    header: "Line refreshed!",
                    type: "success",
                });
            }
        } catch (err) {
            console.error(`❌ Failed to refresh line ${updateLine.index}:`, err);
            Sentry.captureException(err);

            // Reset status back to failed on error
            updateTTSHydrationStatus(updateLine.index, 'failed');

            showToast({
                header: "Line failed to refresh",
                line1: "Please try again",
                type: "danger",
            });
        } finally {
            setHydrating(false);
            setIsUpdatingLine(false);
        }
    };

    // Handle script flow
    const current = script?.find((el) => el.index === currentIndex) ?? null;

    // May not be needed anymore
    // const isScriptFullyHydrated = useMemo(() => {
    // 	return script?.every((el) => {
    // 		if (el.type !== 'line') return true;

    // 		const hydratedEmbedding = Array.isArray(el.expectedEmbedding) && el.expectedEmbedding.length > 0;
    // 		const hydratedTTS = typeof el.ttsUrl === 'string' && el.ttsUrl.length > 0;
    // 		const ttsReady = (ttsHydrationStatus[el.index] ?? 'pending') === 'ready';

    // 		return hydratedEmbedding && hydratedTTS && ttsReady;
    // 	}) ?? false;
    // }, [script, ttsHydrationStatus]);

    const prepareUserLine = (line: ScriptElement | undefined | null) => {
        if (
            line?.type === "line" &&
            line.role === "user" &&
            typeof line.text === "string"
        ) {
            setCurrentLineText(line.text);
        }
    };

    const getScriptLine = (index: number): ScriptElement | undefined => {
        return scriptRef.current?.find((el) => el.index === index);
    };

    // Scene + direction
    useEffect(() => {
        if (!current || !isPlaying || isWaitingForUser) return;

        switch (current.type) {
            case "scene":
            case "direction":
                console.log(`[${current.type.toUpperCase()}]`, current.text);

                const delay = current.customDelay || 0;

                if (delay > 0) {
                    setShowCountdown(true);
                    setCountdownDuration(delay);
                }

                autoAdvance(delay);
                break;

            case "line":
                if (current.role === "user") {
                    console.log(`[USER LINE]`, current.text);
                    setIsWaitingForUser(true);
                }
                break;
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [current, currentIndex, isPlaying, isWaitingForUser]);

    // Initialize player
    const audioPlayerRef = useRef<AudioPlayerWithFallbacks | null>(null);
    if (!audioPlayerRef.current) {
        audioPlayerRef.current = new AudioPlayerWithFallbacks();
    }

    // Callback to update script state when URL is refreshed
    const handleUrlRefreshed = useCallback((lineIndex: number, newUrl: string) => {
        console.log(`Updating state with fresh URL for line ${lineIndex}`);

        setScript(prevScript => {
            if (!prevScript) return prevScript;

            return prevScript.map(el =>
                el.index === lineIndex
                    ? { ...el, ttsUrl: newUrl }
                    : el
            );
        });
    }, []);

    // Preload upcoming lines
    useEffect(() => {
        const preloadUpcomingAudio = async () => {
            const player = audioPlayerRef.current;
            if (!player || !script || !scriptID) return;

            // Get next 3-5 lines
            const upcomingLines = script
                .slice(currentIndex, currentIndex + 5)
                .filter(el =>
                    el.type === 'line' &&
                    el.role === 'scene-partner' &&
                    el.ttsUrl
                )
                .map(el => ({
                    url: el.ttsUrl!,
                    storagePath: `users/${userID}/scripts/${scriptID}/tts-audio/${el.index}.mp3`,
                    lineIndex: el.index
                }));

            if (upcomingLines.length > 0) {
                console.log(`Preloading ${upcomingLines.length} upcoming audio files...`);
                const results = await player.preload(upcomingLines, {
                    scriptId: scriptID,
                    userId: userID,
                    onUrlRefreshed: handleUrlRefreshed
                });

                // Check for failures
                results.forEach((success, lineId) => {
                    if (!success) {
                        console.warn(`Failed to preload line ${lineId}`);
                    }
                });
            }
        };

        preloadUpcomingAudio();
    }, [currentIndex, script, scriptID, userID, handleUrlRefreshed]);

    // Scene partner line playback
    useEffect(() => {
        if (
            !current ||
            !isPlaying ||
            isWaitingForUser ||
            current.type !== "line" ||
            current.role !== "scene-partner" ||
            !current.ttsUrl ||
            !scriptID
        ) {
            return;
        }

        console.log(`[SCENE PARTNER LINE]`, current.text);

        const player = audioPlayerRef.current;
        const storagePath = `users/${userID}/scripts/${scriptID}/tts-audio/${current.index}.mp3`;

        player?.play(current.ttsUrl, {
            storagePath,
            lineIndex: current.index,
            scriptId: scriptID,
            userId: userID,
            onUrlRefreshed: (newUrl) => handleUrlRefreshed(current.index, newUrl)
        })
            .then(() => {
                const delay = current.customDelay || 0;
                console.log('✅ Audio playback completed, delay before next line:', delay);

                if (delay > 0) {
                    setShowCountdown(true);
                    setCountdownDuration(delay);
                }

                autoAdvance(delay);
            })
            .catch((err) => {
                console.warn("⚠️ All audio playback strategies failed", err);

                // Mark as failed
                updateTTSHydrationStatus(current.index, 'failed');

                showToast({
                    header: "Scene partner line failed",
                    line1: "Pause and try to refresh?",
                    type: "danger"
                });

                // Matched timing of the toast message to give user chance to pause and refresh the line
                autoAdvance(3500);
            });

        return () => {
            player?.stop();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [current, isPlaying, isWaitingForUser, scriptID, userID, handleUrlRefreshed]);

    useEffect(() => {
        if (
            current?.type === "line" &&
            current?.role === "user" &&
            isPlaying &&
            !isWaitingForUser
        ) {
            startSTT();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [current, isPlaying, isWaitingForUser]);

    const autoAdvance = (delay = 1000) => {
        if (advanceTimeoutRef.current) clearTimeout(advanceTimeoutRef.current);

        advanceTimeoutRef.current = setTimeout(() => {
            setShowCountdown(false);
            setCountdownDuration(0);

            const nextIndex = currentIndex + 1;
            const endOfScript = nextIndex >= (script?.length ?? 0);

            if (endOfScript) {
                console.log("🎬 Rehearsal complete — cleaning up STT");

                showToast({
                    header: "Congratulations, you finished!",
                    type: "success",
                });

                setIsFinished(true);
                cleanupSTT();
                setIsPlaying(false);
                return;
            }

            const nextLine = script?.find((el) => el.index === nextIndex);
            prepareUserLine(nextLine);

            setCurrentIndex(nextIndex);
            advanceTimeoutRef.current = null;
        }, delay);
    };

    const handlePlay = async () => {
        if (isBusy) {
            console.warn('⏳ Script is still being prepared with resources...');
            return;
        }

        await initializeSTT();
        const currentLine = script?.find((el) => el.index === currentIndex);
        prepareUserLine(currentLine);

        // Reset matched count for current line only if not completed
        setLineStates(prev => {
            const newMap = new Map(prev);
            const currentState = newMap.get(currentIndex);
            if (!currentState?.completed) {
                newMap.set(currentIndex, { matched: 0, completed: false });
            }
            return newMap;
        });

        setIsPlaying(true);

        if (scriptID) {
            setLastPracticed(scriptID).catch(err =>
                console.error("❌ Failed to update lastPracticed:", err)
            );
        }
    };

    const handlePause = () => {
        setIsPlaying(false);
        setShowCountdown(false);
        setCountdownDuration(0);
        setIsWaitingForUser(false);
        pauseSTT();

        if (advanceTimeoutRef.current) {
            clearTimeout(advanceTimeoutRef.current);
            advanceTimeoutRef.current = null;
        }
    };

    const handleNext = () => {
        setIsPlaying(false);
        setShowCountdown(false);
        setCountdownDuration(0);
        setIsWaitingForUser(false);
        setCurrentIndex((i) => {
            const nextIndex = Math.min(i + 1, (script?.length ?? 1) - 1);
            const nextLine = script?.find((el) => el.index === nextIndex);
            prepareUserLine(nextLine);
            return nextIndex;
        });
    };

    const handlePrev = () => {
        setIsPlaying(false);
        setShowCountdown(false);
        setCountdownDuration(0);
        setIsWaitingForUser(false);
        setIsFinished(false);
        setCurrentIndex((i) => {
            const prevIndex = Math.max(i - 1, 0);
            const prevLine = script?.find((el) => el.index === prevIndex);

            // Clear state for the previous line
            setLineStates(prev => {
                const newMap = new Map(prev);
                newMap.delete(prevIndex);
                return newMap;
            });

            wordRefs.current.delete(prevIndex);
            prepareUserLine(prevLine);
            return prevIndex;
        });
    };

    const handleRestart = () => {
        setIsPlaying(false);
        setShowCountdown(false);
        setCountdownDuration(0);
        setIsWaitingForUser(false);
        setIsFinished(false);
        cleanupSTT();
        setCurrentIndex(0);

        // Clear all line states
        setLineStates(new Map());
        wordRefs.current.clear();

        const firstLine = script?.find((el) => el.index === 0);
        prepareUserLine(firstLine);
    };

    // Handle line click to jump to specific line
    const handleLineClick = (lineIndex: number) => {
        setIsPlaying(false);
        setShowCountdown(false);
        setCountdownDuration(0);
        setIsWaitingForUser(false);
        setIsFinished(false);
        pauseSTT();

        if (advanceTimeoutRef.current) {
            clearTimeout(advanceTimeoutRef.current);
            advanceTimeoutRef.current = null;
        }

        // Remove states for the clicked line AND all lines after it
        if (scriptRef.current) {
            setLineStates(prev => {
                const newMap = new Map(prev);
                // Start at lineIndex to include the clicked line itself
                for (let i = lineIndex; i < scriptRef.current!.length; i++) {
                    newMap.delete(i);
                }
                return newMap;
            });

            // Also clear wordRefs for the same range
            for (let i = lineIndex; i < scriptRef.current.length; i++) {
                wordRefs.current.delete(i);
            }
        }

        setCurrentIndex(lineIndex);
        const targetLine = script?.find((el) => el.index === lineIndex);
        prepareUserLine(targetLine);
    };

    const onUserLineMatched = () => {
        if (!current) return;

        const delay = current.customDelay || 0;
        console.log('✅ User line matched, delay before next line:', delay);

        if (delay > 0) {
            setShowCountdown(true);
            setCountdownDuration(delay);
        }

        setTimeout(() => {
            setIsWaitingForUser(false);
            setShowCountdown(false);
            setCountdownDuration(0);

            setCurrentIndex((i) => {
                const nextIndex = i + 1;
                const endOfScript = nextIndex >= (script?.length ?? 0);

                if (endOfScript) {
                    console.log("🎬 User finished final line — cleaning up STT");

                    showToast({
                        header: "Congratulations, you finished!",
                        type: "success",
                    });

                    setIsFinished(true);
                    cleanupSTT();
                    setIsPlaying(false);
                    return i;
                }

                const nextLine = script?.find((el) => el.index === nextIndex);
                prepareUserLine(nextLine);

                return nextIndex;
            });
        }, delay);
    };

    // Delay change update (optional)
    const handleDelayChange = (index: number, delay: number): void => {
        console.log(`Delay changed for line ${index}: ${delay}ms`);
    };

    // STT functions import
    function useSTT({
        provider,
        lineEndKeywords,
        onCueDetected,
        onSilenceTimeout,
        onProgressUpdate,
        silenceTimers,
    }: {
        provider: "google" | "deepgram";
        lineEndKeywords: string[];
        onCueDetected: () => void;
        onSilenceTimeout: () => void;
        onProgressUpdate?: (matchedCount: number) => void;
        silenceTimers?: {
            skipToNextMs?: number;
            inactivityPauseMs?: number;
        };
    }) {
        const google = useGoogleSTT({
            lineEndKeywords,
            onCueDetected,
            onSilenceTimeout,
            onProgressUpdate,
            silenceTimers,
        });

        const deepgram = useDeepgramSTT({
            lineEndKeywords,
            onCueDetected,
            onSilenceTimeout,
            onProgressUpdate,
            silenceTimers,
        });

        return provider === "google" ? google : deepgram;
    }

    const onProgressUpdate = useCallback((count: number) => {
        if (current?.type === "line" && current.role === "user") {
            setLineStates(prev => {
                const newMap = new Map(prev);

                // Get the word count for this line
                const wordCount = current.text.split(/\s+/).length;

                newMap.set(current.index, {
                    matched: count,
                    completed: count >= wordCount
                });
                return newMap;
            });
        }
    }, [current?.index, current?.role, current?.type, current?.text]);

    const { initializeSTT, startSTT, pauseSTT, cleanupSTT, setCurrentLineText } =
        useSTT({
            provider: sttProvider,
            lineEndKeywords: current?.lineEndKeywords ?? [],
            onCueDetected: onUserLineMatched,
            onSilenceTimeout: () => {
                console.log("⏱️ Timeout reached");
                setIsWaitingForUser(false);
            },
            onProgressUpdate,
            silenceTimers: {
                skipToNextMs: skipMs,
                inactivityPauseMs: 15000,
            },
        });

    // Clean up STT
    useEffect(() => {
        const handleUnload = () => {
            cleanupSTT();
            console.log("🧹 STT cleaned up on unload");
        };

        window.addEventListener("beforeunload", handleUnload);

        return () => {
            cleanupSTT();
            window.removeEventListener("beforeunload", handleUnload);
            console.log("🧹 STT cleaned up on unmount");
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const goBackHome = async () => {
        await queryClient.invalidateQueries({ queryKey: ['scripts', userID] });
        router.push('/scripts/list');
    };

    const normalizeBracketSpaces = (s: string) => s.replace(/\](?!\s|$)/g, "] ");

    // Helper function to parse text and convert [word] to button elements
    const parseTextWithButtons = (text: string) => {
        // Ensure there's always a space after a closing bracket if missing
        // text = text.replace(/\](?!\s)/g, "] ");

        const parts = [];
        const regex = /\[([^\]]+)\]/g;
        let lastIndex = 0;
        let match;

        while ((match = regex.exec(text)) !== null) {
            // Add text before the match
            if (match.index > lastIndex) {
                parts.push(text.slice(lastIndex, match.index));
            }

            // Add the button for the bracketed word
            const buttonText = match[1];
            parts.push(
                <button
                    key={`btn-${match.index}-${buttonText}`}
                    onClick={(e) => {
                        e.stopPropagation();
                    }}
                    className="inline-flex items-center px-2 py-0 mx-0 rounded-sm"
                    style={{ background: '#b8b3d7', color: '#333333', fontWeight: '500' }}
                >
                    {buttonText}
                </button>
            );

            lastIndex = regex.lastIndex;
        }

        // Add remaining text
        if (lastIndex < text.length) {
            parts.push(text.slice(lastIndex));
        }

        return parts.length > 0 ? parts : [text];
    };


    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const renderScriptElement = (element: ScriptElement, index: number) => {
        const isCurrent = element.index === currentIndex;
        const isCompleted = element.index < currentIndex;

        // Scene headers
        if (element.type === "scene") {
            return (
                <div
                    key={element.index}
                    ref={isCurrent ? currentLineRef : null}
                    onClick={() => handleLineClick(element.index)}
                    className={`relative text-center mb-8 cursor-pointer transition-all duration-200 hover:bg-gray-50 rounded-lg p-6 ${isCurrent ? "bg-blue-50 shadow-md border border-blue-200" : ""
                        }`}
                >
                    <h2 className="text-xl font-bold uppercase tracking-wider text-gray-800">
                        {parseTextWithButtons(element.text)}
                    </h2>

                    {isCurrent && isPlaying && (
                        <div className="text-xs text-blue-600 mt-2 animate-pulse font-medium">
                            ● ACTIVE SCENE
                        </div>
                    )}

                    {/* Edit button */}
                    {isCurrent &&
                        !isPlaying &&
                        (
                            <div className="absolute -bottom-4.5 left-1/2 transform -translate-x-1/2 flex gap-2 z-[100]">
                                <DelaySelector
                                    lineIndex={element.index}
                                    currentDelay={element.customDelay || 0}
                                    onDelayChange={handleDelayChange}
                                    scriptId={scriptID}
                                    userId={userID}
                                    script={script}
                                    setScript={setScript}
                                    updateScript={updateScript}
                                    updatingState={[updating, setUpdating]}
                                />
                            </div>
                        )
                    }

                    {/* Delay countdown */}
                    {showCountdown && countdownDuration > 0 && isCurrent && (
                        <div className="absolute -bottom-4.5 left-1/2 transform -translate-x-1/2 flex gap-2 z-[999]">
                            <CountdownTimer
                                duration={countdownDuration}
                                onComplete={() => setShowCountdown(false)}
                            />
                        </div>
                    )}
                </div>
            );
        }

        // Stage directions
        if (element.type === "direction") {
            return (
                <div
                    key={element.index}
                    ref={isCurrent ? currentLineRef : null}
                    onClick={() => handleLineClick(element.index)}
                    className={`relative text-center mb-6 cursor-pointer transition-all duration-200 hover:bg-gray-50 rounded-lg p-4 ${isCurrent ? "bg-blue-50 shadow-md border border-blue-200" : ""
                        }`}
                >
                    <p className="italic text-gray-600 text-sm">
                        ({parseTextWithButtons(element.text)})
                    </p>
                    {isCurrent && isPlaying && (
                        <div className="text-xs text-blue-600 mt-1 animate-pulse font-medium">
                            ● ACTIVE DIRECTION
                        </div>
                    )}

                    {/* Edit button */}
                    {isCurrent &&
                        !isPlaying &&
                        (
                            <div className="absolute -bottom-5.5 left-1/2 transform -translate-x-1/2 flex gap-2 z-[100]">
                                <DelaySelector
                                    lineIndex={element.index}
                                    currentDelay={element.customDelay || 0}
                                    onDelayChange={handleDelayChange}
                                    scriptId={scriptID}
                                    userId={userID}
                                    script={script}
                                    setScript={setScript}
                                    updateScript={updateScript}
                                    updatingState={[updating, setUpdating]}
                                />
                            </div>
                        )
                    }

                    {/* Delay countdown */}
                    {showCountdown && countdownDuration > 0 && isCurrent && (
                        <div className="absolute -bottom-5.5 left-1/2 transform -translate-x-1/2 flex gap-2 z-[999]">
                            <CountdownTimer
                                duration={countdownDuration}
                                onComplete={() => setShowCountdown(false)}
                            />
                        </div>
                    )}
                </div>
            );
        }

        // Dialogue lines
        if (element.type === "line") {
            return (
                <div
                    key={element.index}
                    ref={isCurrent ? currentLineRef : null}
                    onClick={() => handleLineClick(element.index)}
                    className={`mb-6 cursor-pointer transition-all duration-200 rounded-lg p-6 relative 
						${isCurrent
                            ? "bg-blue-50 shadow-md border-blue-200"
                            : "hover:bg-gray-50 border-gray-200 hover:shadow-sm"
                        }
						${['pending', 'updating'].includes(ttsHydrationStatus[element.index])
                            ? "glow-pulse"
                            : ""
                        }`}
                >
                    {/* Character name and status */}
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                            <h3
                                className={`font-bold uppercase tracking-wide text-sm ${element.role === "user" ? "text-blue-700" : "text-purple-700"
                                    }`}
                            >
                                {element.character ||
                                    (element.role === "user" ? "YOU" : "SCENE PARTNER")}
                            </h3>
                            {isCurrent && isPlaying && (
                                <span className="text-xs bg-blue-100 text-blue-800 px-3 py-1 rounded-full animate-pulse font-medium">
                                    ACTIVE
                                </span>
                            )}
                            {isCompleted && (
                                <span className="text-xs bg-green-100 text-green-700 px-3 py-1 rounded-full font-medium">
                                    ✓ COMPLETE
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Dialogue text */}
                    {editingLineIndex === element.index ? (
                        <EditableLine
                            item={element}
                            onUpdate={onUpdateLine}
                            onClose={() => setEditingLineIndex(null)}
                            hydrationStatus={ttsHydrationStatus[element.index]}
                        />
                    ) : (
                        <div className="text-gray-800 leading-relaxed">
                            <OptimizedLineRenderer
                                element={element}
                                isCurrent={isCurrent}
                                isWaitingForUser={isWaitingForUser}
                                spanRefMap={wordRefs.current}
                                matchedCount={lineStates.get(element.index)?.matched ?? 0}
                                isCompleted={lineStates.get(element.index)?.completed ?? false}
                            />
                        </div>
                    )}

                    {/* Edit and Refresh buttons */}
                    {isCurrent && !isPlaying && !editingLineIndex && (
                        <div className="absolute -bottom-4.5 left-1/2 transform -translate-x-1/2 flex gap-2 z-[100]">
                            {/* Show refresh button if TTS failed */}
                            {ttsHydrationStatus[element.index] === 'failed' && (
                                <button
                                    onClick={async (e) => {
                                        e.stopPropagation();
                                        await onRefreshLine(element);
                                    }}
                                    disabled={isUpdatingLine}
                                    className={`
                                        cursor-pointer text-sm text-white px-3 py-1.5 rounded shadow-md 
                                        hover:shadow-lg transition-all
                                        ${isUpdatingLine
                                            ? 'bg-gray-500 cursor-not-allowed opacity-50'
                                            : 'bg-red-600 hover:bg-red-700'
                                        }
                                        `}
                                    title="Refresh Failed Audio"
                                >
                                    <RefreshCw
                                        className={`w-4 h-4 ${isUpdatingLine ? 'animate-spin' : ''}`}
                                        strokeWidth={2}
                                    />
                                </button>
                            )}

                            {/* Show edit buttons only if TTS is ready */}
                            {ttsHydrationStatus[element.index] === 'ready' && (
                                <>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setEditingLineIndex(element.index);
                                        }}
                                        className="cursor-pointer text-sm text-white bg-gray-900 px-3 py-1.5 rounded shadow-md hover:shadow-lg transition-all"
                                        title="Edit Line"
                                    >
                                        <Pencil
                                            className="w-4 h-4"
                                            strokeWidth={2}
                                        />
                                    </button>
                                    <DelaySelector
                                        lineIndex={element.index}
                                        currentDelay={element.customDelay || 0}
                                        onDelayChange={handleDelayChange}
                                        scriptId={scriptID}
                                        userId={userID}
                                        script={script}
                                        setScript={setScript}
                                        updateScript={updateScript}
                                        updatingState={[updating, setUpdating]}
                                    />
                                </>
                            )}
                        </div>
                    )}

                    {/* Delay countdown */}
                    {showCountdown && countdownDuration > 0 && isCurrent && (
                        <div className="absolute -bottom-4.5 left-1/2 transform -translate-x-1/2 flex gap-2 z-[999]">
                            <CountdownTimer
                                duration={countdownDuration}
                                onComplete={() => setShowCountdown(false)}
                            />
                        </div>
                    )}

                    {/* Loading indicator */}
                    {['pending', 'updating'].includes(ttsHydrationStatus[element.index]) && (
                        <div className="absolute top-4 right-4 w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                    )}

                    {/* Failed indicator */}
                    {ttsHydrationStatus[element.index] === 'failed' && (
                        <div className="absolute top-4 right-4 text-sm text-red-500">
                            <AlertCircle className="w-5 h-5" />
                        </div>
                    )}
                </div>
            );
        }

        return null;
    };

    // Main render
    return (
        <>
            {/* Mic Check Modal */}
            <MicCheckModal
                isOpen={showMicCheck}
                onComplete={() => {
                    setShowMicCheck(false);
                    setMicCheckComplete(true);
                }}
                scriptId={scriptID || undefined}
            />

            {loading ? (
                <LoadingScreen
                    header="Practice Room"
                    message="Setting up your scene"
                    mode="dark"
                />
            ) : (
                <div className="h-full flex relative bg-card-dark">

                    {/* Left Control Panel - Dark Theme */}
                    <div className="w-[20%] mr-6 text-white flex flex-col">
                        <div className="flex-1 overflow-y-auto hide-scrollbar">

                            {/* Header */}
                            <div className="mb-6">
                                <h1 className="text-header-2 text-white font-bold mb-2">Practice Room</h1>
                                <p className="text-gray-400 text-sm">Follow along and practice your lines</p>
                            </div>

                            {/* Progress Section */}
                            <div className="mb-6">
                                <div className="text-sm text-gray-400 mb-2">
                                    {!isBusy ? "Progress" : isUpdatingLine ? "Updating Line" : "Loading Practice Room"}
                                </div>

                                {!isBusy && !isUpdatingLine ? (
                                    <div className="bg-gray-800 rounded-lg p-4">
                                        <div className="text-xl font-bold mb-2">
                                            {currentIndex + 1} / {script?.length || 0}
                                        </div>
                                        <div className="w-full bg-gray-700 rounded-full h-3 mb-2">
                                            <div
                                                className="bg-blue-500 h-3 rounded-full transition-all duration-500"
                                                style={{
                                                    width: `${((currentIndex + 1) / (script?.length || 1)) * 100}%`,
                                                }}
                                            />
                                        </div>
                                        <div className="text-xs text-gray-400">
                                            {Math.round(((currentIndex + 1) / (script?.length || 1)) * 100)}% complete
                                        </div>
                                    </div>
                                ) : isUpdatingLine ? (
                                    <div className="bg-gray-800 rounded-lg p-4">
                                        {/* Line Update Loading State */}
                                        <div className="flex items-center justify-between mb-3">
                                            <div className="text-lg font-bold">
                                                {loadStage || 'Updating line...'}
                                            </div>
                                        </div>

                                        {/* Progress Bar */}
                                        <div className="w-full bg-gray-700 rounded-full h-3 overflow-hidden">
                                            <div className="w-full h-3 bg-blue-600 rounded-full animate-pulse" />
                                        </div>

                                        <div className="text-xs text-gray-400 mt-2">
                                            Regenerating audio for the updated line...
                                        </div>
                                    </div>
                                ) : (
                                    <div className="bg-gray-800 rounded-lg p-4">
                                        {/* Status Header */}
                                        <div className="flex items-center justify-between mb-3">
                                            <div className="text-lg font-bold">
                                                {loadStage || 'Initializing...'}
                                            </div>
                                        </div>

                                        {/* Progress Bar */}
                                        <div className="space-y-2 mb-3">
                                            <div className="flex justify-between text-xs text-gray-400">
                                                <span>Preparing resources</span>
                                                <span>{Math.round(loadProgress)}%</span>
                                            </div>
                                            <div className="w-full bg-gray-700 rounded-full h-3 relative overflow-hidden">
                                                <div
                                                    className="bg-gradient-to-r from-blue-600 to-blue-400 h-3 rounded-full transition-all duration-300 ease-out"
                                                    style={{ width: `${loadProgress}%` }}
                                                />
                                                {/* Shimmer effect */}
                                                {loading && loadProgress < 100 && (
                                                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-shimmer" />
                                                )}
                                            </div>
                                        </div>

                                        {/* Ready Indicator */}
                                        {loadProgress === 100 && !isBusy && (
                                            <div className="text-xs text-green-400 flex items-center gap-1">
                                                <span className="inline-block w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                                                Scene ready to rehearse!
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Current Status */}
                            {current && (
                                <div className="mb-6">
                                    <div className="text-sm text-gray-400 mb-2">Current Line</div>
                                    <div className="bg-gray-800 rounded-lg p-4">
                                        <div className="flex items-center gap-2 mb-2">
                                            <span
                                                className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${current.type === "line"
                                                    ? current.role === "user"
                                                        ? "bg-blue-600 text-white"
                                                        : "bg-purple-600 text-white"
                                                    : current.type === "scene"
                                                        ? "bg-yellow-600 text-white"
                                                        : "bg-gray-600 text-white"
                                                    }`}
                                            >
                                                {current.type === "line"
                                                    ? current.role === "user"
                                                        ? "YOU"
                                                        : "SCENE PARTNER"
                                                    : current.type.toUpperCase()}
                                            </span>
                                        </div>
                                        {isWaitingForUser && (
                                            <div className="text-xs text-yellow-400 animate-pulse">
                                                🎤 Listening for your line...
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Advanced Settings Section - Collapsible */}
                            <div
                                className={`
                					overflow-hidden transition-all duration-300 ease-out
                					${showAdvanced
                                        ? 'max-h-[600px] opacity-100 mb-0'
                                        : 'max-h-0 opacity-0 mb-0'
                                    }`}
                            >
                                <div className="text-sm text-gray-400 mb-2">Advanced Settings</div>

                                {/* Role Selector */}
                                {script && (
                                    <div className="mb-2">
                                        <div className="bg-gray-800 rounded-lg p-4">
                                            <div className="flex items-center gap-2 mb-2">
                                                <RoleSelector
                                                    script={script}
                                                    userID={userID!}
                                                    scriptID={scriptID!}
                                                    disabled={isBusy}
                                                    onRolesUpdated={handleRoleChange}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Silence Skip Selector */}
                                <div className="mb-4">
                                    <div className="bg-gray-800 rounded-lg p-4">
                                        <label htmlFor="skipMs" className="sr-only">Skip to next line delay</label>
                                        <div className="text-sm text-gray-200 flex items-center flex-wrap gap-2">
                                            <span className="font-semibold">Silence Detection:</span>
                                            <span className="text-gray-400 font-medium">
                                                Auto advance to next line after
                                            </span>
                                            <select
                                                id="skipMs"
                                                value={skipMs}
                                                onChange={(e) => setSkipMs(Number(e.target.value))}
                                                className="appearance-none bg-gray-900 border border-gray-700 rounded-md px-2 py-1 text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                                title="Silence before auto-advancing"
                                            >
                                                <option value={2000}>2s</option>
                                                <option value={4000}>4s</option>
                                                <option value={6000}>6s</option>
                                                <option value={8000}>8s</option>
                                                <option value={10000}>10s</option>
                                            </select>
                                            <span className="text-gray-400 font-medium">of silence.</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Error Handling */}
                            {storageError && (
                                <div className="mb-6 p-4 bg-red-900 border border-red-700 rounded-lg">
                                    <p className="text-red-200 text-sm mb-3">
                                        🚫 Storage limit reached. Clear data to continue.
                                    </p>
                                    <button
                                        onClick={async () => {
                                            await clear();
                                            setStorageError(false);
                                            await retryLoadScript();
                                        }}
                                        className="w-full px-3 py-2 bg-red-600 text-white text-sm rounded hover:bg-red-700 transition-colors"
                                    >
                                        Clear & Retry
                                    </button>
                                </div>
                            )}

                            {/* Additional Buttons */}
                            <div className="flex flex-col gap-2 ml-2">
                                <Button
                                    onClick={() => setShowAdvanced(!showAdvanced)}
                                    size="sm"
                                    variant="secondary"
                                    className="w-[90%] mx-auto flex items-center justify-between disabled:opacity-50 disabled:cursor-not-allowed"
                                    disabled={hydrating}
                                >
                                    <ChevronDown className={`w-4 h-4 chevron ${showAdvanced ? 'rotated' : ''}`} />
                                    <span className="flex items-center gap-2">
                                        {showAdvanced ? 'Advanced Settings' : 'Advanced Settings'}
                                    </span>
                                </Button>

                                <Button
                                    icon={Undo2}
                                    onClick={goBackHome}
                                    size="sm"
                                    variant="primary"
                                    className="w-[90%] mx-auto disabled:opacity-50 disabled:cursor-not-allowed"
                                    disabled={hydrating}
                                >
                                    Go Back
                                </Button>
                            </div>
                        </div>
                    </div>

                    {/* Right Content Area - Light Theme */}
                    <div className="relative flex-1 bg-card-light flex flex-col overflow-hidden rounded-[25px] mr-4">
                        <div className="max-w-4xl mx-auto h-full flex flex-col">

                            {/* Script Header */}
                            <div className="text-center py-8 px-8 border-b border-gray-200 shrink-0">
                                <h1 className="text-header-2 font-bold text-gray-900">
                                    {scriptName ? scriptName : "Your Script"}
                                </h1>
                                {/* <p className="text-gray-600">Follow along and practice your lines</p> */}
                            </div>

                            {/* Scrollable Script Content */}
                            <div className="flex-1 px-8 py-8 overflow-y-auto hide-scrollbar">
                                {script && script.length > 0 ? (
                                    <div className="space-y-4">
                                        {script.map((element, index) =>
                                            renderScriptElement(element, index)
                                        )}
                                    </div>
                                ) : (
                                    <div className="text-center py-12">
                                        <div className="text-gray-400 text-lg">No script loaded</div>
                                    </div>
                                )}

                                {/* End of Script */}
                                {script && currentIndex === script.length - 1 && isFinished && !isPlaying && (
                                    <div className="text-center py-16 border-t border-gray-200 mt-12">
                                        <div className="text-6xl mb-6">🎉</div>
                                        <h2 className="text-header-4 text-gray-900 mb-4">
                                            Rehearsal Complete!
                                        </h2>
                                        <p className="text-gray-600 text-lg mb-8">
                                            {"Excellent work! You've practiced the entire script."}
                                        </p>
                                        <button
                                            onClick={handleRestart}
                                            className="px-4 py-4 bg-green-600 text-white rounded-full hover:bg-green-700 transition-colors font-medium text-lg"
                                        >
                                            <RotateCcw className="h-6 w-6" />
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Floating Control Panel */}
                        <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-[200]">
                            <div className="bg-[rgba(44,47,61,0.85)] rounded-full px-9 py-3 flex items-center gap-9 shadow-xl">

                                {/* Previous Button */}
                                <button
                                    onClick={handlePrev}
                                    disabled={isBusy}
                                    className="p-3 rounded-full hover:bg-white/20 transition-all duration-200 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                                    aria-label="Previous"
                                    title="Previous"
                                >
                                    <SkipBack className="h-6 w-6" />
                                </button>

                                {/* Play/Pause Button */}
                                {isPlaying ? (
                                    <button
                                        onClick={handlePause}
                                        disabled={isBusy}
                                        className="p-3 rounded-full bg-white hover:bg-white/20 hover:text-white transition-all duration-200 text-black shadow-lg scale-110 disabled:opacity-50 disabled:cursor-not-allowed"
                                        aria-label="Pause"
                                        title="Pause"
                                    >
                                        <Pause className="h-6 w-6" />
                                    </button>
                                ) : (
                                    <button
                                        onClick={handlePlay}
                                        disabled={isBusy}
                                        className="p-3 rounded-full bg-white hover:bg-white/20 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 text-black shadow-lg scale-110"
                                        aria-label="Play"
                                        title={isBusy ? "Preparing..." : "Start Rehearsal"}
                                    >
                                        <Play className="h-6 w-6" />
                                    </button>
                                )}

                                {/* Next Button */}
                                <button
                                    onClick={handleNext}
                                    disabled={isBusy}
                                    className="p-3 rounded-full hover:bg-white/20 transition-all duration-200 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                                    aria-label="Next"
                                    title="Next"
                                >
                                    <SkipForward className="h-6 w-6" />
                                </button>

                                {/* Restart Button (only show if not at beginning) */}
                                {currentIndex !== 0 && (
                                    <>
                                        <div className="w-px h-8 bg-white/20 mx-1" /> {/* Divider */}
                                        <button
                                            onClick={handleRestart}
                                            disabled={isBusy}
                                            className="p-3 rounded-full hover:bg-white/20 transition-all duration-200 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                                            aria-label="Restart from Beginning"
                                            title="Restart from Beginning"
                                        >
                                            <RotateCcw className="h-6 w-6" />
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}

export default function RehearsalRoomPage() {
    return (
        <Suspense fallback={
            <LoadingScreen
                header="Practice Room"
                message="Setting up your scene"
                mode="dark"
            />
        }>
            <RehearsalRoomContent />
        </Suspense>
    );
}