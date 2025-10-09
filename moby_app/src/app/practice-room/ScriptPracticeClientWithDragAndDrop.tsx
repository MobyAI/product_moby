"use client";

import React, {
  useEffect,
  useState,
  useRef,
  useCallback,
  Suspense,
} from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useGoogleSTT } from "@/lib/google/speechToText";
import { useDeepgramSTT } from "@/lib/deepgram/speechToText";
import type { ScriptElement } from "@/types/script";
import { updateScript, setLastPracticed } from "@/lib/firebase/client/scripts";
import { AudioPlayerWithFallbacks } from "@/lib/audioplayer/withFallbacks";
import {
  loadScript,
  hydrateScript,
  hydrateLine,
  initializeEmbeddingModel,
} from "./loader";
import { hydrateScriptWithDialogue } from "./loaderDialogueMode";
import EditableLine from "./editableLine";
import EditableDirection from "./editableDirection";
import { OptimizedLineRenderer } from "./lineRenderer";
import LoadingTips from "./rotatingTips";
import AudioVisualizer from "./visualizer";
import { ControlPanel } from "./controlPanel";
import {
  RangeMarker,
  StartDropZone,
  EndDropZone,
  DraggedMarker,
} from "./dragAndDrop";
import { DragState, Position } from "@/types/dragAndDrop";
import { restoreSession, saveSession } from "./session";
import { clear, set } from "idb-keyval";
import { LoadingScreen } from "@/components/ui";
import {
  Button,
  MicCheckModal,
  DelaySelector,
  CountdownTimer,
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
  Bot,
  Clapperboard,
  UserRound,
} from "lucide-react";
import * as Sentry from "@sentry/nextjs";
import { useQueryClient } from "@tanstack/react-query";

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
  const [ttsHydrationStatus, setTTSHydrationStatus] = useState<
    Record<number, "pending" | "updating" | "ready" | "failed">
  >({});
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
  const [editingDirectionIndex, setEditingDirectionIndex] = useState<
    number | null
  >(null);
  const [isUpdatingLine, setIsUpdatingLine] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [sttProvider, setSttProvider] = useState<"google" | "deepgram">(
    "deepgram"
  );
  const [isDarkMode, setIsDarkMode] = useState(false);
  const contentAreaRef = useRef<HTMLDivElement>(null);

  // Mic Check
  const [showMicCheck, setShowMicCheck] = useState<boolean>(false);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [micCheckComplete, setMicCheckComplete] = useState<boolean>(false);

  // Rehearsal flow
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isWaitingForUser, setIsWaitingForUser] = useState(false);
  const wordRefs = useRef<Map<number, HTMLSpanElement[]>>(new Map());
  const [lineStates, setLineStates] = useState<
    Map<number, { matched: number; completed: boolean }>
  >(new Map());
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

  // Dragging state
  const [dragging, setDragging] = useState<DragState | null>(null);
  const [dragPosition, setDragPosition] = useState<Position>({ x: 0, y: 0 });
  const draggedMarkerRef = useRef<HTMLDivElement | null>(null);
  const [hoveredDropZone, setHoveredDropZone] = useState<number | null>(null);
  const startDropZoneRefs = useRef<(HTMLDivElement | null)[]>([]);
  const endDropZoneRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [customStartIndex, setCustomStartIndex] = useState<number>(0);
  const [customEndIndex, setCustomEndIndex] = useState<number>(0);

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

        // Set end of script
        setCustomEndIndex(rawScript.length);

        // Check if we should continue
        if (!shouldContinueProcessing.current) {
          console.log("Load and hydration cancelled");
          return;
        }

        // Mark all user lines as ready (they don't need TTS)
        rawScript.forEach((element) => {
          if (element.type === "line" && element.role === "user") {
            updateTTSHydrationStatus(element.index, "ready");
          }
        });

        setScript(rawScript);
        scriptRef.current = rawScript;

        // 2) Initialize embeddings
        setLoadProgress(0);
        setDownloading(true);
        setLoading(false);
        try {
          await initializeEmbeddingModel({
            setLoadStage,
            onProgressUpdate: (a: number, b?: number) => {
              const pct =
                b && b > 0 ? Math.round((a / b) * 100) : Math.round(a);
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
          console.log("Load and hydration cancelled");
          return;
        }

        // 3) Hydrate script
        setLoadProgress(0);
        setHydrating(true);
        try {
          const wasHydrated = await hydrateScriptWithDialogue({
            script: rawScript,
            userID,
            scriptID,
            setLoadStage,
            setScript,
            setStorageError,
            setTTSLoadError,
            setTTSFailedLines,
            updateTTSHydrationStatus,
            onProgressUpdate: (hydrated, total) => {
              const pct = total > 0 ? Math.round((hydrated / total) * 100) : 0;
              setLoadProgress(pct);
            },
            showToast,
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
        } finally {
          setHydrating(false);
        }

        if (!shouldContinueProcessing.current) {
          console.log("Load and hydration cancelled");
          return;
        }

        // 4) Restore session
        const restored = await restoreSession(scriptID);
        if (restored) {
          setCurrentIndex(restored.index ?? 0);

          // Restore custom indexes if they exist
          if (restored.customStartIndex !== undefined) {
            setCustomStartIndex(restored.customStartIndex);
          }

          if (restored.customEndIndex !== undefined) {
            setCustomEndIndex(restored.customEndIndex);
          }
        }

        // 5) Set theme
        const savedTheme = localStorage.getItem("rehearsal-theme");
        if (savedTheme !== null) {
          // User global preference
          setIsDarkMode(savedTheme === "dark");
        } else if (restored?.isDarkMode !== undefined) {
          // No global preference, use session value if available
          setIsDarkMode(restored.isDarkMode);
        } else {
          // No preference anywhere, default to light
          setIsDarkMode(false);
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

    window.addEventListener("beforeunload", handleBeforeUnload);

    // Cleanup on unmount
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      shouldContinueProcessing.current = false;
    };
  }, []);

  // Mic check
  useEffect(() => {
    if (!scriptID) return;

    // Check if mic check was already completed for this script
    try {
      const completedChecks = localStorage.getItem("audioSetupsCompleted");
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
      console.error("Error checking mic setup status:", err);
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
      saveSession(scriptID, {
        index: currentIndex,
        isDarkMode: isDarkMode,
        customStartIndex: customStartIndex,
        customEndIndex: customEndIndex,
      });
    }, 1000);

    return () => clearTimeout(timeout);
  }, [currentIndex, scriptID, isDarkMode, customStartIndex, customEndIndex]);

  const retryLoadScript = async () => {
    if (!userID || !scriptID || !script) return;

    setLoadStage("🚰 Retrying hydration");
    setLoading(true);

    try {
      const wasHydrated = await hydrateScriptWithDialogue({
        script: script,
        userID,
        scriptID,
        setLoadStage,
        setScript,
        setStorageError,
        setTTSLoadError,
        setTTSFailedLines,
        updateTTSHydrationStatus,
        onProgressUpdate: (hydrated, total) => {
          const pct = total > 0 ? Math.round((hydrated / total) * 100) : 0;
          setLoadProgress(pct);
        },
        showToast,
      });

      if (shouldContinueProcessing.current && wasHydrated) {
        showToast({
          header: "Script ready!",
          type: "success",
        });

        setLoadStage("✅ Retry succeeded!");
      }
    } catch (e) {
      console.error("Retry failed", e);
      Sentry.captureException(e);
    } finally {
      setLoading(false);
    }
  };

  // Track TTS audio generation status
  const updateTTSHydrationStatus = (
    index: number,
    status: "pending" | "updating" | "ready" | "failed"
  ) => {
    setTTSHydrationStatus((prev) => ({
      ...prev,
      [index]: status,
    }));
  };

  // -------- Control Panel -------- //
  // Light and dark mode toggle
  const toggleTheme = () => {
    setIsDarkMode((prev) => {
      const newTheme = !prev;
      localStorage.setItem("rehearsal-theme", newTheme ? "dark" : "light");
      return newTheme;
    });
  };

  // Helper for classnames
  const getThemeClass = (lightClass: string, darkClass: string) => {
    return isDarkMode ? darkClass : lightClass;
  };

  // Fullscreen mode
  const toggleFullscreen = async () => {
    if (!document.fullscreenElement) {
      // Enter fullscreen with just the content area
      try {
        if (contentAreaRef.current) {
          await contentAreaRef.current.requestFullscreen();
        }
      } catch (err) {
        console.error("Error entering fullscreen:", err);
        showToast({
          header: "Fullscreen not available",
          line1: "Your browser doesn't support fullscreen mode",
          type: "warning",
        });
      }
    } else {
      // Exit fullscreen
      try {
        await document.exitFullscreen();
      } catch (err) {
        console.error("Error exiting fullscreen:", err);
      }
    }
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
    setLoadStage("👤 Updating roles");

    try {
      // Mark all new user lines as ready immediately
      updatedScript.forEach((element) => {
        if (element.type === "line" && element.role === "user") {
          updateTTSHydrationStatus(element.index, "ready");
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

  // -------- Script Handling -------- //
  // Update script line
  const COMMON_WORDS = new Set([
    "the",
    "a",
    "an",
    "to",
    "and",
    "but",
    "or",
    "for",
    "at",
    "by",
    "in",
    "on",
    "of",
    "then",
    "so",
  ]);

  function extractLineEndKeywords(text: string): string[] {
    const words = text
      .toLowerCase()
      .replace(/[^a-z0-9\s']/gi, "")
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
      let neighbor = "";

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
    setLoadStage("♻️ Regenerating audio");

    if (!script) {
      console.warn("❌ Tried to update line before script was loaded.");
      return;
    }

    // ✅ Normalize bracket spacing on the edited text (persisted change)
    if (typeof updateLine.text === "string") {
      updateLine = {
        ...updateLine,
        text: normalizeBracketSpaces(updateLine.text),
      };
    }

    // Inject or replace lineEndKeywords
    if (updateLine.type === "line" && typeof updateLine.text === "string") {
      // Remove all content within brackets [] or parentheses ()
      const sanitized = updateLine.text
        .replace(/(\[.*?\]|\(.*?\))/g, "")
        .trim();
      const cleaned = sanitized.replace(/\s+/g, " "); // collapse doubles
      updateLine.lineEndKeywords = extractLineEndKeywords(cleaned);
      console.log("updated kw: ", updateLine.lineEndKeywords);
    }

    try {
      const updatedScript =
        script?.map((el) =>
          el.index === updateLine.index ? updateLine : el
        ) ?? [];

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
            ? // keep the normalized text we just saved
              { ...el, ...result, text: updateLine.text }
            : el
        );

        // --- 1. Save to Firestore ---
        await updateScript(scriptID, finalUpdatedScript);

        // --- 2. Save to IndexedDB ---
        const cacheKey = `script-cache:${userID}:${scriptID}`;
        await set(cacheKey, finalUpdatedScript);

        // --- 3. Commit to local state only after both succeed ---
        setScript(finalUpdatedScript);
        scriptRef.current = finalUpdatedScript;

        // --- 4. Signal success ---
        setLoadStage("✅ Line successfully updated!");

        // Update status to ready after successful refresh
        updateTTSHydrationStatus(updateLine.index, "ready");

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
      updateTTSHydrationStatus(updateLine.index, "failed");

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

  const onUpdateDirection = async (updateDirection: ScriptElement) => {
    if (!script) {
      console.warn("❌ Tried to update direction before script was loaded.");
      return;
    }

    // Normalize spacing before saving
    if (typeof updateDirection.text === "string") {
      updateDirection = {
        ...updateDirection,
        text: updateDirection.text.replace(/\s+/g, " ").trim(),
      };
    }

    try {
      // Build updated script array
      const updatedScript =
        script?.map((el) =>
          el.index === updateDirection.index ? updateDirection : el
        ) ?? [];

      if (userID && scriptID) {
        // --- 1. Save to Firestore ---
        await updateScript(scriptID, updatedScript);
        console.log(
          `✅ Firestore updated for direction ${updateDirection.index}`
        );

        // --- 2. Save to IndexedDB ---
        const cacheKey = `script-cache:${userID}:${scriptID}`;
        await set(cacheKey, updatedScript);
        console.log(
          `💾 IndexedDB updated for direction ${updateDirection.index}`
        );

        // --- 3. Commit to local state only after both succeed ---
        setScript(updatedScript);
        scriptRef.current = updatedScript;
        setEditingDirectionIndex(null);

        // --- 4. Signal success ---
        showToast({
          header: "Direction updated!",
          type: "success",
        });
      }
    } catch (err) {
      console.error(
        `❌ Failed to update direction ${updateDirection.index}:`,
        err
      );
      Sentry.captureException(err);

      showToast({
        header: "Direction update failed",
        line1: "Your change was not saved",
        type: "danger",
      });
    }
  };

  // Refresh failed audio
  const onRefreshLine = async (updateLine: ScriptElement) => {
    setIsUpdatingLine(true);
    setHydrating(true);
    setLoadStage("♻️ Regenerating audio");

    if (!script) {
      console.warn("❌ Tried to update line before script was loaded.");
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
          el.index === result.index ? { ...el, ...result } : el
        );

        setScript(finalUpdatedScript);
        scriptRef.current = finalUpdatedScript;

        try {
          await updateScript(scriptID, finalUpdatedScript);
          console.log(
            `✅ Updated Firestore with refreshed line ${updateLine.index}`
          );
        } catch (err) {
          console.error("❌ Failed to update Firestore");
          Sentry.captureException(err);
        }

        const cacheKey = `script-cache:${userID}:${scriptID}`;
        try {
          await set(cacheKey, finalUpdatedScript);
          console.log(
            `💾 Script cached successfully in IndexedDB for line ${updateLine.index}`
          );
        } catch (cacheError) {
          console.warn("⚠️ Failed to update IndexedDB cache:", cacheError);
          Sentry.captureException(cacheError);
        }

        setLoadStage("✅ Line successfully refreshed!");
        setIsUpdatingLine(false);

        // Update status to ready after successful refresh
        updateTTSHydrationStatus(updateLine.index, "ready");

        showToast({
          header: "Line refreshed!",
          type: "success",
        });
      }
    } catch (err) {
      console.error(`❌ Failed to refresh line ${updateLine.index}:`, err);
      Sentry.captureException(err);

      // Reset status back to failed on error
      updateTTSHydrationStatus(updateLine.index, "failed");

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

  // Prepare user line for Matcher in useSTT hook for line highlighting
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
  const handleUrlRefreshed = useCallback(
    (lineIndex: number, newUrl: string) => {
      console.log(`Updating state with fresh URL for line ${lineIndex}`);

      setScript((prevScript) => {
        if (!prevScript) return prevScript;

        return prevScript.map((el) =>
          el.index === lineIndex ? { ...el, ttsUrl: newUrl } : el
        );
      });
    },
    []
  );

  // Preload upcoming lines
  useEffect(() => {
    const preloadUpcomingAudio = async () => {
      const player = audioPlayerRef.current;
      if (!player || !script || !scriptID) return;

      // Get next 3-5 lines
      const upcomingLines = script
        .slice(currentIndex, currentIndex + 5)
        .filter(
          (el) => el.type === "line" && el.role === "scene-partner" && el.ttsUrl
        )
        .map((el) => ({
          url: el.ttsUrl!,
          storagePath: `users/${userID}/scripts/${scriptID}/tts-audio/${el.index}.mp3`,
          lineIndex: el.index,
        }));

      if (upcomingLines.length > 0) {
        console.log(
          `Preloading ${upcomingLines.length} upcoming audio files...`
        );
        const results = await player.preload(upcomingLines, {
          scriptId: scriptID,
          userId: userID,
          onUrlRefreshed: handleUrlRefreshed,
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

    player
      ?.play(current.ttsUrl, {
        storagePath,
        lineIndex: current.index,
        scriptId: scriptID,
        userId: userID,
        onUrlRefreshed: (newUrl) => handleUrlRefreshed(current.index, newUrl),
      })
      .then(() => {
        const delay = current.customDelay || 0;
        console.log(
          "✅ Audio playback completed, delay before next line:",
          delay
        );

        if (delay > 0) {
          setShowCountdown(true);
          setCountdownDuration(delay);
        }

        // Add minimum delay to prevent stuttering
        const minDelay = 50;
        const actualDelay = Math.max(delay, minDelay);

        autoAdvance(actualDelay);
      })
      .catch((err) => {
        console.warn("⚠️ All audio playback strategies failed", err);

        // Mark as failed
        updateTTSHydrationStatus(current.index, "failed");

        showToast({
          header: "Scene partner line failed",
          line1: "Pause and try to refresh?",
          type: "danger",
        });

        // Matched timing of the toast message to give user chance to pause and refresh the line
        autoAdvance(3500);
      });

    return () => {
      player?.stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    current,
    isPlaying,
    isWaitingForUser,
    scriptID,
    userID,
    handleUrlRefreshed,
  ]);

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
      const scriptEndIndex = script?.length ?? 0;

      // Allow continuation if the user has moved beyond the customEndIndex
      const effectiveEndIndex =
        currentIndex > customEndIndex - 1 ? scriptEndIndex : customEndIndex;

      const endOfScript = nextIndex >= effectiveEndIndex;

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
      console.warn("⏳ Script is still being prepared with resources...");
      return;
    }

    await initializeSTT();
    const currentLine = script?.find((el) => el.index === currentIndex);
    prepareUserLine(currentLine);

    // Reset matched count for current line only if not completed
    setLineStates((prev) => {
      const newMap = new Map(prev);
      const currentState = newMap.get(currentIndex);
      if (!currentState?.completed) {
        newMap.set(currentIndex, { matched: 0, completed: false });
      }
      return newMap;
    });

    setIsPlaying(true);

    if (scriptID) {
      setLastPracticed(scriptID).catch((err) =>
        console.error("❌ Failed to update lastPracticed:", err)
      );
    }
  };

  const handlePause = () => {
    setIsPlaying(false);
    setShowCountdown(false);
    setCountdownDuration(0);
    setIsWaitingForUser(false);
    pauseSTT(true, false);

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
      setLineStates((prev) => {
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
    setCurrentIndex(customStartIndex);

    // Clear all line states
    setLineStates(new Map());
    wordRefs.current.clear();

    const firstLine = script?.find((el) => el.index === customStartIndex);
    prepareUserLine(firstLine);
  };

  // Handle line click to jump to specific line
  const handleLineClick = (lineIndex: number) => {
    setIsPlaying(false);
    setShowCountdown(false);
    setCountdownDuration(0);
    setIsWaitingForUser(false);
    setIsFinished(false);
    pauseSTT(true, false);

    if (advanceTimeoutRef.current) {
      clearTimeout(advanceTimeoutRef.current);
      advanceTimeoutRef.current = null;
    }

    // Remove states for the clicked line AND all lines after it
    if (scriptRef.current) {
      setLineStates((prev) => {
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
    console.log("✅ User line matched, delay before next line:", delay);

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
        const scriptEndIndex = script?.length ?? 0;

        // Allow continuation if the user has moved beyond the customEndIndex
        const effectiveEndIndex =
          currentIndex > customEndIndex - 1 ? scriptEndIndex : customEndIndex;

        const endOfScript = nextIndex >= effectiveEndIndex;

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
    onError,
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
    onError?: (error: {
      type: "websocket" | "microphone" | "audio-context" | "network";
      message1: string;
      message2: string;
      recoverable: boolean;
    }) => void;
  }) {
    const google = useGoogleSTT({
      lineEndKeywords,
      onCueDetected,
      onSilenceTimeout,
      onProgressUpdate,
      silenceTimers,
      onError,
    });

    const deepgram = useDeepgramSTT({
      lineEndKeywords,
      onCueDetected,
      onSilenceTimeout,
      onProgressUpdate,
      silenceTimers,
      onError,
    });

    return provider === "google" ? google : deepgram;
  }

  const onProgressUpdate = useCallback(
    (count: number) => {
      if (current?.type === "line" && current.role === "user") {
        setLineStates((prev) => {
          const newMap = new Map(prev);

          // Get the word count for this line
          const wordCount = current.text.split(/\s+/).length;

          newMap.set(current.index, {
            matched: count,
            completed: count >= wordCount,
          });
          return newMap;
        });
      }
    },
    [current?.index, current?.role, current?.type, current?.text]
  );

  // Handle STT errors
  const handleSTTError = useCallback(
    (error: {
      type: "websocket" | "microphone" | "audio-context" | "network";
      message1: string;
      message2: string;
      recoverable: boolean;
    }) => {
      console.error(`STT Error [${error.type}]:`, error.message1);

      if (error.type === "microphone") {
        // Microphone errors need special handling
        showToast({
          header: "Microphone Access Required",
          line1: error.message1,
          line2: error.message2,
          type: "danger",
          // action: error.recoverable ? (
          //     <Button
          //         size="sm"
          //         onClick={() => {
          //             // Retry initialization
          //             initializeSTT();
          //         }}
          //     >
          //         Try Again
          //     </Button>
          // ) : undefined
        });

        // Pause the scene so user can fix the issue
        handlePause();
      } else if (error.type === "websocket" || error.type === "network") {
        // Connection issues
        showToast({
          header: "Connection Issue",
          line1: error.message1,
          line2: error.message2,
          type: "danger",
          duration: error.recoverable ? 5000 : undefined,
        });

        if (!error.recoverable) {
          // Critical failure - pause and show retry option
          handlePause();
        }
        // If recoverable, the hook will auto-retry
      } else if (error.type === "audio-context") {
        // Browser/technical issues
        showToast({
          header: "Audio Setup Failed",
          line1: error.message1,
          line2: error.message2,
          type: "danger",
          // action: (
          //     <Button
          //         size="sm"
          //         onClick={() => window.location.reload()}
          //     >
          //         Refresh Page
          //     </Button>
          // )
        });
        handlePause();
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    },
    [showToast]
  );

  const {
    initializeSTT,
    startSTT,
    pauseSTT,
    cleanupSTT,
    setCurrentLineText,
    audioContext,
    audioSource,
    isRecording,
  } = useSTT({
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
    onError: handleSTTError,
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
    await queryClient.invalidateQueries({ queryKey: ["scripts", userID] });
    router.push("/scripts/list");
  };

  const normalizeBracketSpaces = (s: string) => s.replace(/\](?!\s|$)/g, "] ");

  // -------- Drag and drop -------- //
  const resetDrag = () => {
    if (!script) return null;

    setCustomStartIndex(0);
    setCustomEndIndex(script.length);
  };

  const handleDragStart = (
    type: "start" | "end",
    e: React.MouseEvent<Element>
  ) => {
    if (isPlaying) return;

    const target = e.currentTarget as HTMLElement;
    const rect = target.getBoundingClientRect();
    const offsetX = e.clientX - (rect.left + rect.width / 2);
    const offsetY = e.clientY - (rect.top + rect.height / 2);

    setDragging({
      type,
      mouseX: e.clientX,
      mouseY: e.clientY,
      offsetX,
      offsetY,
    });

    setDragPosition({ x: e.clientX, y: e.clientY });
  };

  // Check if a marker type is being dragged
  const isDraggingMarker = (type: "start" | "end"): boolean => {
    return dragging?.type === type;
  };

  // Handle mouse move for dragging
  useEffect(() => {
    if (!dragging) return;

    const SCROLL_EDGE_THRESHOLD = 100; // px from top/bottom edges
    const SCROLL_SPEED = 20; // px per tick
    let scrollInterval: number | null = null;

    const handleMouseMove = (e: MouseEvent) => {
      setDragPosition((prev) => ({
        x: prev.x, // keep original horizontal position fixed
        y: e.clientY, // allow vertical motion only
      }));

      // ---- Auto-scroll within scrollable div ----
      const scrollContainer = document.querySelector(
        ".overflow-y-auto.hide-scrollbar"
      ) as HTMLElement | null;

      if (scrollContainer) {
        const rect = scrollContainer.getBoundingClientRect();
        const { scrollTop, scrollHeight, clientHeight } = scrollContainer;

        const distanceFromTop = e.clientY - rect.top;
        const distanceFromBottom = rect.bottom - e.clientY;

        // Start scrolling up
        if (distanceFromTop < SCROLL_EDGE_THRESHOLD && scrollTop > 0) {
          if (!scrollInterval) {
            scrollInterval = window.setInterval(() => {
              scrollContainer.scrollTop = Math.max(
                0,
                scrollContainer.scrollTop - SCROLL_SPEED
              );
            }, 16); // roughly 60fps
          }
        }
        // Start scrolling down
        else if (
          distanceFromBottom < SCROLL_EDGE_THRESHOLD &&
          scrollTop + clientHeight < scrollHeight
        ) {
          if (!scrollInterval) {
            scrollInterval = window.setInterval(() => {
              scrollContainer.scrollTop = Math.min(
                scrollHeight - clientHeight,
                scrollContainer.scrollTop + SCROLL_SPEED
              );
            }, 16);
          }
        } else {
          // Stop scrolling if not near edges
          if (scrollInterval) {
            clearInterval(scrollInterval);
            scrollInterval = null;
          }
        }
      }

      // ---- Drop zone detection logic ----
      let foundZone: number | null = null;
      const refs =
        dragging.type === "start" ? startDropZoneRefs : endDropZoneRefs;

      const markerEl = draggedMarkerRef.current;
      if (markerEl) {
        const markerRect = markerEl.getBoundingClientRect();

        refs.current.forEach((ref, index) => {
          if (ref) {
            const rect = ref.getBoundingClientRect();

            const overlaps =
              markerRect.bottom >= rect.top &&
              markerRect.top <= rect.bottom &&
              markerRect.right >= rect.left &&
              markerRect.left <= rect.right;

            if (overlaps) {
              if (dragging.type === "start" && index < customEndIndex) {
                foundZone = index;
              } else if (dragging.type === "end" && index > customStartIndex) {
                foundZone = index;
              }
            }
          }
        });
      }

      setHoveredDropZone(foundZone);
    };

    const handleMouseUp = () => {
      if (scrollInterval) {
        clearInterval(scrollInterval);
        scrollInterval = null;
      }

      if (hoveredDropZone !== null) {
        if (dragging.type === "start") {
          setCustomStartIndex(hoveredDropZone);
          if (currentIndex < hoveredDropZone) {
            setCurrentIndex(hoveredDropZone);
          }
        } else if (dragging.type === "end") {
          setCustomEndIndex(hoveredDropZone + 1);
          if (currentIndex > hoveredDropZone) {
            setCurrentIndex(Math.max(hoveredDropZone, customStartIndex));
          }
        }
      }

      setDragging(null);
      setHoveredDropZone(null);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);

    return () => {
      if (scrollInterval) clearInterval(scrollInterval);
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [
    dragging,
    hoveredDropZone,
    customStartIndex,
    customEndIndex,
    currentIndex,
  ]);

  // -------- Script Display -------- //
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const renderScriptElement = (element: ScriptElement, index: number) => {
    const isCurrent = element.index === currentIndex;
    const isCompleted = element.index < currentIndex;

    // Allow drag and drop
    const shouldShowDropZone = !isPlaying;

    const elementContent = () => {
      // Scene headers
      if (element.type === "scene") {
        return (
          <div
            key={element.index}
            ref={isCurrent ? currentLineRef : null}
            onClick={() => handleLineClick(element.index)}
            className={`relative text-center mb-8 cursor-pointer transition-all duration-200 rounded-lg p-6 ${getThemeClass(
              "hover:bg-gray-100 hover:border-transparent",
              "hover:bg-[#3b3b3b] hover:border-transparent"
            )} ${
              isCurrent
                ? getThemeClass(
                    "bg-blue-50 border border-blue-200",
                    "bg-[#363c54]/60 border border-[#363c54]"
                  )
                : ""
            }`}
          >
            {/* DropZone positioned at top left corner */}
            {shouldShowDropZone && (
              <>
                <StartDropZone
                  ref={(el: any) => {
                    startDropZoneRefs.current[element.index] = el;
                  }}
                  index={element.index}
                  isPlaying={isPlaying}
                  dragging={dragging}
                  hoveredDropZone={hoveredDropZone}
                  customStartIndex={customStartIndex}
                  customEndIndex={customEndIndex}
                  onDragStart={handleDragStart}
                  isDraggingMarker={isDraggingMarker}
                />
                <EndDropZone
                  ref={(el: any) => {
                    endDropZoneRefs.current[element.index] = el;
                  }}
                  index={element.index}
                  isPlaying={isPlaying}
                  dragging={dragging}
                  hoveredDropZone={hoveredDropZone}
                  customStartIndex={customStartIndex}
                  customEndIndex={customEndIndex}
                  onDragStart={handleDragStart}
                  isDraggingMarker={isDraggingMarker}
                />
              </>
            )}

            <h2
              className={getThemeClass(
                "text-xl font-bold uppercase tracking-wider text-primary-light",
                "text-xl font-bold uppercase tracking-wider text-primary-dark"
              )}
            >
              {element.text}
            </h2>

            {isCurrent && isPlaying && (
              <div className="text-xs text-blue-600 mt-2 animate-pulse font-medium">
                ● ACTIVE SCENE
              </div>
            )}

            {/* Edit button */}
            {isCurrent && !isPlaying && (
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
                  isDarkMode={isDarkMode}
                />
              </div>
            )}

            {/* Delay countdown */}
            {showCountdown && countdownDuration > 0 && isCurrent && (
              <div className="absolute -bottom-4.5 left-1/2 transform -translate-x-1/2 flex gap-2 z-[999]">
                <CountdownTimer
                  duration={countdownDuration}
                  onComplete={() => setShowCountdown(false)}
                  isDarkMode={isDarkMode}
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
            className={`relative text-center mb-6 cursor-pointer transition-all duration-200 rounded-lg p-4 ${getThemeClass(
              "hover:bg-gray-100 hover:border-transparent",
              "hover:bg-[#3b3b3b] hover:border-transparent"
            )} ${
              isCurrent
                ? getThemeClass(
                    "bg-blue-50 border border-blue-200",
                    "bg-[#363c54]/60 border border-[#363c54]"
                  )
                : ""
            }`}
          >
            {/* DropZone positioned at top left corner */}
            {shouldShowDropZone && (
              <>
                <StartDropZone
                  ref={(el: any) => {
                    startDropZoneRefs.current[element.index] = el;
                  }}
                  index={element.index}
                  isPlaying={isPlaying}
                  dragging={dragging}
                  hoveredDropZone={hoveredDropZone}
                  customStartIndex={customStartIndex}
                  customEndIndex={customEndIndex}
                  onDragStart={handleDragStart}
                  isDraggingMarker={isDraggingMarker}
                />
                <EndDropZone
                  ref={(el: any) => {
                    endDropZoneRefs.current[element.index] = el;
                  }}
                  index={element.index}
                  isPlaying={isPlaying}
                  dragging={dragging}
                  hoveredDropZone={hoveredDropZone}
                  customStartIndex={customStartIndex}
                  customEndIndex={customEndIndex}
                  onDragStart={handleDragStart}
                  isDraggingMarker={isDraggingMarker}
                />
              </>
            )}

            {/* Editable Direction */}
            {editingDirectionIndex === element.index ? (
              <EditableDirection
                item={element}
                onUpdate={onUpdateDirection}
                onClose={() => setEditingDirectionIndex(null)}
              />
            ) : (
              <p
                className={getThemeClass(
                  "italic text-gray-600 text-sm",
                  "italic text-gray-300 text-sm"
                )}
              >
                {element.text}
              </p>
            )}

            {isCurrent && isPlaying && (
              <div className="text-xs text-blue-600 mt-1 animate-pulse font-medium">
                ● ACTIVE DIRECTION
              </div>
            )}

            {/* Edit button */}
            {isCurrent && !isPlaying && !editingDirectionIndex && (
              <div className="absolute -bottom-5.5 left-1/2 transform -translate-x-1/2 flex gap-2 z-[100]">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setEditingDirectionIndex(element.index);
                  }}
                  className={getThemeClass(
                    "cursor-pointer text-sm bg-primary-dark-alt text-primary-light px-3 py-1.5 rounded shadow-md hover:shadow-lg transition-all",
                    "cursor-pointer text-sm text-primary-dark-alt bg-primary-light px-3 py-1.5 rounded shadow-md hover:shadow-lg transition-all"
                  )}
                  title="Edit Line"
                >
                  <Pencil className="w-4 h-4" strokeWidth={2} />
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
                  isDarkMode={isDarkMode}
                />
              </div>
            )}

            {/* Delay countdown */}
            {showCountdown && countdownDuration > 0 && isCurrent && (
              <div className="absolute -bottom-5.5 left-1/2 transform -translate-x-1/2 flex gap-2 z-[999]">
                <CountdownTimer
                  duration={countdownDuration}
                  onComplete={() => setShowCountdown(false)}
                  isDarkMode={isDarkMode}
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
            className={`relative mb-6 cursor-pointer transition-all duration-200 rounded-lg p-6 ${
              editingLineIndex === element.index
                ? getThemeClass(
                    "bg-gray-100 border-transparent",
                    "bg-[#3b3b3b] border-transparent"
                  )
                : isCurrent
                ? getThemeClass(
                    "bg-blue-50 border border-blue-200",
                    "bg-[#363c54]/60 border border-[#464e6d]"
                  )
                : getThemeClass(
                    "hover:bg-gray-100 hover:border-transparent",
                    "hover:bg-[#3b3b3b] hover:border-transparent"
                  )
            } ${
              ["pending", "updating"].includes(
                ttsHydrationStatus[element.index]
              )
                ? "glow-pulse"
                : ""
            }`}
          >
            {/* DropZone positioned at top left corner */}
            {shouldShowDropZone && (
              <>
                <StartDropZone
                  ref={(el: any) => {
                    startDropZoneRefs.current[element.index] = el;
                  }}
                  index={element.index}
                  isPlaying={isPlaying}
                  dragging={dragging}
                  hoveredDropZone={hoveredDropZone}
                  customStartIndex={customStartIndex}
                  customEndIndex={customEndIndex}
                  onDragStart={handleDragStart}
                  isDraggingMarker={isDraggingMarker}
                />
                <EndDropZone
                  ref={(el: any) => {
                    endDropZoneRefs.current[element.index] = el;
                  }}
                  index={element.index}
                  isPlaying={isPlaying}
                  dragging={dragging}
                  hoveredDropZone={hoveredDropZone}
                  customStartIndex={customStartIndex}
                  customEndIndex={customEndIndex}
                  onDragStart={handleDragStart}
                  isDraggingMarker={isDraggingMarker}
                />
              </>
            )}

            {/* Character name and status */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <h3
                  className={`font-bold uppercase tracking-wide text-sm ${
                    element.role === "user"
                      ? isDarkMode
                        ? "text-blue-400"
                        : "text-blue-700"
                      : isDarkMode
                      ? "text-primary-light"
                      : "text-primary-dark"
                  }`}
                >
                  {element.character ||
                    (element.role === "user" ? "YOU" : "SCENE PARTNER")}
                </h3>
                {isCompleted && (
                  <span className="text-xs bg-green-100 text-green-700 px-3 py-1 rounded-full font-medium">
                    ✓ COMPLETE
                  </span>
                )}
                {isCurrent && isPlaying && (
                  <>
                    {element.role === "user" ? (
                      // User role: show visualizer or error
                      audioContext && audioSource ? (
                        <div className="audio-visualizer-container">
                          <AudioVisualizer
                            audioContext={audioContext}
                            sourceNode={audioSource}
                            isActive={isRecording}
                            size={25}
                            backgroundColor="rgba(255, 255, 255, 1)"
                          />
                        </div>
                      ) : (
                        <AlertCircle className="w-5 h-5" />
                      )
                    ) : (
                      // Non-user role: show ACTIVE span
                      <span className="text-xs bg-blue-100 text-blue-800 px-3 py-1 rounded-full animate-pulse font-medium">
                        ACTIVE
                      </span>
                    )}
                  </>
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
              <div
                className={getThemeClass(
                  "leading-relaxed text-primary-dark",
                  "leading-relaxed text-primary-light"
                )}
              >
                <OptimizedLineRenderer
                  element={element}
                  isCurrent={isCurrent}
                  isWaitingForUser={isWaitingForUser}
                  spanRefMap={wordRefs.current}
                  matchedCount={lineStates.get(element.index)?.matched ?? 0}
                  isCompleted={
                    lineStates.get(element.index)?.completed ?? false
                  }
                  isDarkMode={isDarkMode}
                />
              </div>
            )}

            {/* Edit and Refresh buttons */}
            {isCurrent && !isPlaying && !editingLineIndex && (
              <div className="absolute -bottom-4.5 left-1/2 transform -translate-x-1/2 flex gap-2 z-[100]">
                {/* Show refresh button if TTS failed */}
                {ttsHydrationStatus[element.index] === "failed" && (
                  <button
                    onClick={async (e) => {
                      e.stopPropagation();
                      await onRefreshLine(element);
                    }}
                    disabled={isUpdatingLine}
                    className={`
                                        cursor-pointer text-sm text-white px-3 py-1.5 rounded shadow-md 
                                        hover:shadow-lg transition-all
                                        ${
                                          isUpdatingLine
                                            ? "bg-gray-500 cursor-not-allowed opacity-50"
                                            : "bg-red-600 hover:bg-red-700"
                                        }
                                        `}
                    title="Refresh Failed Audio"
                  >
                    <RefreshCw
                      className={`w-4 h-4 ${
                        isUpdatingLine ? "animate-spin" : ""
                      }`}
                      strokeWidth={2}
                    />
                  </button>
                )}

                {/* Show edit buttons only if TTS is ready */}
                {ttsHydrationStatus[element.index] === "ready" && (
                  <>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingLineIndex(element.index);
                      }}
                      className={getThemeClass(
                        "cursor-pointer text-sm bg-primary-dark-alt text-primary-light px-3 py-1.5 rounded shadow-md hover:shadow-lg transition-all",
                        "cursor-pointer text-sm text-primary-dark-alt bg-primary-light px-3 py-1.5 rounded shadow-md hover:shadow-lg transition-all"
                      )}
                      title="Edit Line"
                    >
                      <Pencil className="w-4 h-4" strokeWidth={2} />
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
                      isDarkMode={isDarkMode}
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
                  isDarkMode={isDarkMode}
                />
              </div>
            )}

            {/* Loading indicator */}
            {["pending", "updating"].includes(
              ttsHydrationStatus[element.index]
            ) && (
              <div className="absolute top-4 right-4 w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            )}

            {/* Failed indicator */}
            {ttsHydrationStatus[element.index] === "failed" && (
              <div className="absolute top-4 right-4 text-sm text-red-500">
                <AlertCircle className="w-5 h-5" />
              </div>
            )}
          </div>
        );
      }

      return null;
    };

    // Return with RangeMarkers only (DropZone now inside element content)
    return (
      <React.Fragment key={element.index}>
        {/* Always show markers at their positions */}
        <div className="relative">
          {!isBusy && (
            <>
              <RangeMarker
                type="start"
                position={element.index}
                customStartIndex={customStartIndex}
                customEndIndex={customEndIndex}
                onDragStart={handleDragStart}
                isDragging={isDraggingMarker("start")}
              />
              <RangeMarker
                type="end"
                position={element.index}
                customStartIndex={customStartIndex}
                customEndIndex={customEndIndex}
                onDragStart={handleDragStart}
                isDragging={isDraggingMarker("end")}
              />
            </>
          )}
        </div>

        {elementContent()}
      </React.Fragment>
    );
  };

  // Loading State
  if (loading) {
    return (
      <LoadingScreen
        header="Practice Room"
        message="Setting up your scene"
        mode="light"
      />
    );
  }

  // Main render
  return (
    <ControlPanel
      script={script}
      userID={userID}
      scriptID={scriptID}
      skipMs={skipMs}
      onSkipMsChange={setSkipMs}
      onRolesUpdated={handleRoleChange}
      onGoBack={goBackHome}
      isDarkMode={isDarkMode}
      onToggleTheme={toggleTheme}
      isBusy={isBusy}
      onToggleFullscreen={toggleFullscreen}
      onResetDrag={resetDrag}
    >
      {/* Floating draggable marker */}
      <DraggedMarker
        dragging={dragging}
        dragPosition={dragPosition}
        ref={draggedMarkerRef}
      />

      {/* Mic Check Modal */}
      <MicCheckModal
        isOpen={showMicCheck}
        onComplete={() => {
          setShowMicCheck(false);
          setMicCheckComplete(true);
        }}
        scriptId={scriptID || undefined}
      />

      <div
        className={getThemeClass(
          "h-[100%] flex relative bg-primary-light p-2",
          "h-[100%] flex relative bg-primary-dark p-2"
        )}
      >
        {/* Left Control Panel - Floating/Absolute */}
        <div className="absolute top-4 left-4 z-50">
          {/* Only show one at a time */}
          {isBusy || isUpdatingLine ? (
            <div className="bg-primary-dark/80 rounded-[10px] p-4 w-full max-w-[400px]">
              <div className="absolute inset-0 bg-gradient-radial from-white/5 via-transparent to-transparent pointer-events-none" />

              <div className="text-sm text-gray-200 mb-2">
                {isUpdatingLine
                  ? "Updating Line"
                  : "Setting Up Your Practice Room"}
              </div>

              {isUpdatingLine ? (
                <>
                  {/* Line Update Loading State */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="text-lg font-bold text-white">
                      {loadStage || "Updating line..."}
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full bg-gray-700 rounded-full h-3 overflow-hidden">
                    <div className="w-full h-3 bg-blue-400 rounded-full animate-pulse" />
                  </div>
                </>
              ) : (
                <>
                  {/* Status Header */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="text-lg font-bold text-white">
                      {loadStage || "Initializing..."}
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="space-y-2 mb-4">
                    <div className="flex justify-end text-xs text-gray-300">
                      <span>{Math.round(loadProgress)}%</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-3 relative overflow-hidden">
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

                  {/* Rotating Tips */}
                  <LoadingTips isLoading={isBusy} />

                  {/* Ready Indicator */}
                  {loadProgress === 100 && !isBusy && (
                    <div className="text-xs text-green-400 flex items-center gap-1">
                      <span className="inline-block w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                      Scene ready to rehearse!
                    </div>
                  )}
                </>
              )}
            </div>
          ) : (
            /* Current Status - Only shown when not busy/updating */
            current && (
              <div className="flex items-center justify-center">
                <span
                  className={`inline-flex items-center justify-center gap-2 px-6 py-3 rounded-[10px] text-md font-semibold
                    ${
                      current.type === "line"
                        ? current.role === "user"
                          ? "bg-accent-blue text-primary-light"
                          : getThemeClass(
                              "bg-primary-dark text-primary-light", // light mode
                              "bg-primary-light text-primary-dark" // dark mode
                            )
                        : getThemeClass(
                            "bg-primary-dark text-primary-light", // light mode
                            "bg-primary-light text-primary-dark" // dark mode
                          )
                    }`}
                >
                  {/* Icon */}
                  {current.type === "line" ? (
                    current.role === "user" ? (
                      <UserRound className="w-6 h-6" />
                    ) : (
                      <Bot className="w-6 h-6" />
                    )
                  ) : (
                    <Clapperboard className="w-5 h-5" />
                  )}

                  {/* Text */}
                  {current.type === "line"
                    ? current.role === "user"
                      ? "YOUR LINE"
                      : "SCENE PARTNER LINE"
                    : current.type.toUpperCase()}
                </span>
              </div>
            )
          )}
        </div>

        {/* Right Content Area */}
        <div
          ref={contentAreaRef}
          className={`relative flex-1 flex flex-col overflow-hidden ${getThemeClass(
            "bg-primary-light",
            "bg-primary-dark"
          )}`}
        >
          <div className="max-w-4xl mx-auto h-full flex flex-col">
            {/* Script Header */}
            <div className="text-center py-8 px-8 border-b border-gray-200 shrink-0">
              <h1
                className={getThemeClass(
                  "text-header-2 font-bold text-gray-900",
                  "text-header-2 font-bold text-gray-100"
                )}
              >
                {scriptName ? scriptName : "Your Script"}
              </h1>
              {/* <p className="text-gray-600">Follow along and practice your lines</p> */}
            </div>

            {/* Scrollable Script Content */}
            <div className="flex-1 px-35 pt-4 pb-35 overflow-y-auto hide-scrollbar">
              {script && script.length > 0 ? (
                <div className="space-y-4">
                  {script.map((element, index) =>
                    renderScriptElement(element, index)
                  )}

                  {/* Final drop zone */}
                  <div className="relative">
                    {!isBusy && (
                      <>
                        <RangeMarker
                          type="start"
                          position={script.length}
                          customStartIndex={customStartIndex}
                          customEndIndex={customEndIndex}
                          onDragStart={handleDragStart}
                          isDragging={isDraggingMarker("start")}
                        />
                        <RangeMarker
                          type="end"
                          position={script.length}
                          customStartIndex={customStartIndex}
                          customEndIndex={customEndIndex}
                          onDragStart={handleDragStart}
                          isDragging={isDraggingMarker("end")}
                        />
                      </>
                    )}
                  </div>
                  {!isPlaying && (
                    <>
                      <StartDropZone
                        ref={(el: any) => {
                          startDropZoneRefs.current[script.length] = el;
                        }}
                        index={script.length}
                        isPlaying={isPlaying}
                        dragging={dragging}
                        hoveredDropZone={hoveredDropZone}
                        customStartIndex={customStartIndex}
                        customEndIndex={customEndIndex}
                        onDragStart={handleDragStart}
                        isDraggingMarker={isDraggingMarker}
                      />
                      <EndDropZone
                        ref={(el: any) => {
                          endDropZoneRefs.current[script.length] = el;
                        }}
                        index={script.length}
                        isPlaying={isPlaying}
                        dragging={dragging}
                        hoveredDropZone={hoveredDropZone}
                        customStartIndex={customStartIndex}
                        customEndIndex={customEndIndex}
                        onDragStart={handleDragStart}
                        isDraggingMarker={isDraggingMarker}
                      />
                    </>
                  )}
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="text-gray-400 text-lg">
                    Script failed to load
                  </div>
                </div>
              )}

              {/* End of Script */}
              {script &&
                currentIndex === script.length - 1 &&
                isFinished &&
                !isPlaying && (
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
            <div
              className={getThemeClass(
                "bg-primary-dark rounded-[10px] px-6 py-3 flex flex-col gap-3 shadow-xl w-[600px]",
                "bg-primary-light rounded-[10px] px-6 py-3 flex flex-col gap-3 shadow-xl w-[600px]"
              )}
            >
              {/* Control Buttons Container - Fixed height and centering */}
              <div className="flex items-center justify-center gap-15 h-[56px]">
                {/* Previous Button */}
                <button
                  onClick={handlePrev}
                  disabled={isBusy}
                  className={getThemeClass(
                    "p-3 rounded-full hover:bg-white/20 transition-all duration-200 text-white disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0",
                    "p-3 rounded-full hover:bg-gray-200 transition-all duration-200 text-primary-dark disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
                  )}
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
                    className={getThemeClass(
                      "p-3 rounded-full hover:bg-white/20 hover:text-white transition-all duration-200 text-white scale-110 disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0",
                      "p-3 rounded-full hover:bg-gray-300 transition-all duration-200 text-text-primary-dark scale-110 disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
                    )}
                    aria-label="Pause"
                    title="Pause"
                  >
                    <Pause className="h-6 w-6" />
                  </button>
                ) : (
                  <button
                    onClick={handlePlay}
                    disabled={isBusy}
                    className={getThemeClass(
                      "p-3 rounded-full hover:bg-white/20 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 text-white scale-110 flex-shrink-0",
                      "p-3 rounded-full hover:bg-gray-300 transition-all duration-200 text-text-primary-dark scale-110 disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
                    )}
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
                  className={getThemeClass(
                    "p-3 rounded-full hover:bg-white/20 transition-all duration-200 text-white disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0",
                    "p-3 rounded-full hover:bg-gray-200 transition-all duration-200 text-text-primary-dark disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
                  )}
                  aria-label="Next"
                  title="Next"
                >
                  <SkipForward className="h-6 w-6" />
                </button>

                {/* Restart Button (only show if not at beginning) */}
                {currentIndex !== 0 && (
                  <>
                    {/* Divider */}
                    <div
                      className={getThemeClass(
                        "w-px h-8 bg-white/20 mx-1 flex-shrink-0",
                        "w-px h-8 bg-gray-300 mx-1 flex-shrink-0"
                      )}
                    />
                    <button
                      onClick={handleRestart}
                      disabled={isBusy}
                      className={getThemeClass(
                        "p-3 rounded-full hover:bg-white/20 transition-all duration-200 text-white disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0",
                        "p-3 rounded-full hover:bg-gray-200 transition-all duration-200 text-text-primary-dark disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
                      )}
                      aria-label="Restart from Beginning"
                      title="Restart from Beginning"
                    >
                      <RotateCcw className="h-6 w-6" />
                    </button>
                  </>
                )}
              </div>

              {/* Progress Bar - Solid line */}
              <div
                className={`w-full h-1 ${getThemeClass(
                  "bg-white",
                  "bg-gray-300"
                )}`}
              >
                <div
                  className="h-full bg-green-500 transition-all duration-300"
                  style={{
                    width: `${
                      ((currentIndex + 1) / (script?.length || 1)) * 100
                    }%`,
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </ControlPanel>
  );
}

export default function RehearsalRoomPage() {
  return (
    <Suspense
      fallback={
        <LoadingScreen
          header="Practice Room"
          message="Setting up your scene"
          mode="dark"
        />
      }
    >
      <RehearsalRoomContent />
    </Suspense>
  );
}
