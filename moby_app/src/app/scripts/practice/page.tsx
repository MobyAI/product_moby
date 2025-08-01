"use client";

import { useEffect, useState, useRef, useMemo, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useHumeTTS, useElevenTTS } from "@/lib/api/tts";
import { useGoogleSTT } from "@/lib/google/speechToText";
import { useDeepgramSTT } from "@/lib/deepgram/speechToText";
import type { ScriptElement } from "@/types/script";
import { loadScript, hydrateScript, hydrateLine } from './loader';
import { RoleSelector } from './roleSelector';
import EditableLine from './editableLine';
import { restoreSession, saveSession } from "./session";
import Deepgram from "../../rehearsal-room/deepgram";
import GoogleSTT from "../../rehearsal-room/google";
import { clear } from "idb-keyval";
import LoadingScreen from "./LoadingScreen";
import { Button } from "@/components/ui/Buttons";

// export default function RehearsalRoomPage() {
function RehearsalRoomContent() {
	const searchParams = useSearchParams();
	const userID = searchParams.get("userID");
	const scriptID = searchParams.get("scriptID");
	const advanceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const currentLineRef = useRef<HTMLDivElement>(null);
	const router = useRouter();

	if (!userID || !scriptID) {
		console.log("no user or script id: ", userID, scriptID);
	}

	// Page setup
	const [loading, setLoading] = useState(false);
	const [loadStage, setLoadStage] = useState<string | null>(null);
	const [script, setScript] = useState<ScriptElement[] | null>(null);
	const scriptRef = useRef<ScriptElement[] | null>(null);
	const [ttsHydrationStatus, setTTSHydrationStatus] = useState<Record<number, 'pending' | 'updating' | 'ready' | 'failed'>>({});
	const [editingLineIndex, setEditingLineIndex] = useState<number | null>(null);
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	const [sttProvider, setSttProvider] = useState<"google" | "deepgram">(
		"deepgram"
	);

	// Rehearsal flow
	const [currentIndex, setCurrentIndex] = useState(0);
	const [isPlaying, setIsPlaying] = useState(false);
	const [isWaitingForUser, setIsWaitingForUser] = useState(false);
	const [spokenWordMap, setSpokenWordMap] = useState<Record<number, number>>(
		{}
	);

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

		const init = async () => {
			setLoading(true);

			const rawScript = await loadScript({
				userID,
				scriptID,
				setLoadStage,
				setStorageError,
			});

			if (!rawScript) {
				// Display error page?
				setLoading(false);
				return;
			} else {
				setScript(rawScript);
				scriptRef.current = rawScript;
			}

			hydrateScript({
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
			});

			// Restore session from indexedDB
			const restored = await restoreSession(scriptID);

			if (restored) {
				setCurrentIndex(restored.index ?? 0);
			}

			setLoadStage('✅ Ready!');
			setLoading(false);
		};

		init();
	}, [userID, scriptID]);

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

		// Filter out common words and duplicates
		const meaningful = words
			.filter((word, index) => {
				return (
					!COMMON_WORDS.has(word) &&
					words.lastIndexOf(word) === index
				);
			});

		const selected = meaningful.slice(-2);

		if (selected.length === 2) return selected;

		if (selected.length === 1) {
			const keyword = selected[0];

			// Find index of that keyword in original `words` array
			const idx = words.lastIndexOf(keyword);

			let neighbor = '';

			// Prefer word before
			if (idx > 0) {
				neighbor = words[idx - 1];
			} else {
				neighbor = words[idx + 1];
			}

			// Only return the keyword and neighbor if neighbor exists
			return neighbor ? [neighbor, keyword] : [keyword];
		}

		if (selected.length === 0 && words.length > 0) {
			return words.slice(-2);
		}

		return [];
	}

	const onUpdateLine = async (updateLine: ScriptElement) => {
		setEditingLineIndex(null);

		if (!script) {
			console.warn('❌ Tried to update line before script was loaded.');
			return;
		}

		// Inject or replace lineEndKeywords
		if (updateLine.type === 'line' && typeof updateLine.text === 'string') {
			updateLine.lineEndKeywords = extractLineEndKeywords(updateLine.text);
			console.log('updated kw: ', updateLine.lineEndKeywords);
		}

		try {
			const updatedScript = script?.map((el) =>
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

				setScript((prev) => {
					const next = prev?.map((el) =>
						el.index === result.index ? result : el
					) ?? [];

					scriptRef.current = next;

					return next;
				});
			}
		} catch (err) {
			console.error(`❌ Failed to update line ${updateLine.index}:`, err);
		}
	};

	// Handle script flow
	const current = script?.find((el) => el.index === currentIndex) ?? null;

	const isScriptFullyHydrated = useMemo(() => {
		return script?.every((el) => {
			if (el.type !== 'line') return true;

			const hydratedEmbedding = Array.isArray(el.expectedEmbedding) && el.expectedEmbedding.length > 0;
			const hydratedTTS = typeof el.ttsUrl === 'string' && el.ttsUrl.length > 0;
			const ttsReady = (ttsHydrationStatus[el.index] ?? 'pending') === 'ready';

			return hydratedEmbedding && hydratedTTS && ttsReady;
		}) ?? false;
	}, [script, ttsHydrationStatus]);

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

	useEffect(() => {
		if (!current || !isPlaying || isWaitingForUser) return;

		switch (current.type) {
			case "scene":
			case "direction":
				console.log(`[${current.type.toUpperCase()}]`, current.text);
				autoAdvance(0); // Changed from 2000 to 0 for immediate skip
				break;

			case "line":
				if (current.role === "user") {
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
			current.type !== "line" ||
			current.role !== "scene-partner" ||
			!current.ttsUrl
		) {
			return;
		}
		const audio = new Audio(current.ttsUrl);
		console.log(`[SCENE PARTNER LINE]`, current.text);

		audio.play().catch((err) => {
			console.warn("⚠️ Failed to play TTS audio", err);
			autoAdvance(1000);
		});

		audio.onended = () => {
			autoAdvance(250);
		};

		return () => {
			audio.pause();
			audio.src = "";
		};
	}, [current, isPlaying, isWaitingForUser]);

	useEffect(() => {
		if (
			current?.type === "line" &&
			current?.role === "user" &&
			isPlaying &&
			!isWaitingForUser
		) {
			startSTT();
		}
	}, [current, isPlaying, isWaitingForUser]);

	const autoAdvance = (delay = 1000) => {
		if (advanceTimeoutRef.current) clearTimeout(advanceTimeoutRef.current);

		advanceTimeoutRef.current = setTimeout(() => {
			const nextIndex = currentIndex + 1;
			const endOfScript = nextIndex >= (script?.length ?? 0);

			if (endOfScript) {
				console.log("🎬 Rehearsal complete — cleaning up STT");
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
		if (!isScriptFullyHydrated) {
			console.warn('⏳ Script is still being prepared with resources...');
			return;
		}

		await initializeSTT();
		const currentLine = script?.find((el) => el.index === currentIndex);
		prepareUserLine(currentLine);
		setIsPlaying(true);
	};

	const handlePause = () => {
		setIsPlaying(false);
		setIsWaitingForUser(false);
		pauseSTT();

		if (advanceTimeoutRef.current) {
			clearTimeout(advanceTimeoutRef.current);
			advanceTimeoutRef.current = null;
		}
	};

	const handleNext = () => {
		setIsPlaying(false);
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
		setIsWaitingForUser(false);
		setCurrentIndex((i) => {
			const prevIndex = Math.max(i - 1, 0);
			const prevLine = script?.find((el) => el.index === prevIndex);
			setSpokenWordMap((prevMap) => {
				const newMap = { ...prevMap };
				delete newMap[prevIndex];
				return newMap;
			});
			prepareUserLine(prevLine);
			return prevIndex;
		});
	};

	const handleRestart = () => {
		setIsPlaying(false);
		setIsWaitingForUser(false);
		cleanupSTT();
		setCurrentIndex(0);
		setSpokenWordMap({});
		prepareUserLine(script?.find((el) => el.index === 0));
	};

	// NEW: Handle line click to jump to specific line
	const handleLineClick = (lineIndex: number) => {
		// Pause current playback
		setIsPlaying(false);
		setIsWaitingForUser(false);
		pauseSTT();

		// Clear any pending timeouts
		if (advanceTimeoutRef.current) {
			clearTimeout(advanceTimeoutRef.current);
			advanceTimeoutRef.current = null;
		}

		// Clear spoken word progress for lines after the clicked line
		setSpokenWordMap((prevMap) => {
			const newMap = { ...prevMap };
			Object.keys(newMap).forEach(key => {
				const keyIndex = parseInt(key);
				if (keyIndex >= lineIndex) {
					delete newMap[keyIndex];
				}
			});
			return newMap;
		});

		// Jump to the clicked line
		setCurrentIndex(lineIndex);
		const targetLine = script?.find((el) => el.index === lineIndex);
		prepareUserLine(targetLine);
	};

	const onUserLineMatched = () => {
		setIsWaitingForUser(false);
		setCurrentIndex((i) => {
			const nextIndex = i + 1;
			const endOfScript = nextIndex >= (script?.length ?? 0);

			if (endOfScript) {
				console.log("🎬 User finished final line — cleaning up STT");
				cleanupSTT();
				setIsPlaying(false);
				return i;
			}

			const nextLine = script?.find((el) => el.index === nextIndex);
			prepareUserLine(nextLine);

			return nextIndex;
		});
	};

	// STT functions import
	function useSTT({
		provider,
		lineEndKeywords,
		expectedEmbedding,
		onCueDetected,
		onSilenceTimeout,
		onProgressUpdate,
	}: {
		provider: "google" | "deepgram";
		lineEndKeywords: string[];
		expectedEmbedding: number[];
		onCueDetected: () => void;
		onSilenceTimeout: () => void;
		onProgressUpdate?: (matchedCount: number) => void;
	}) {
		const google = useGoogleSTT({
			lineEndKeywords,
			expectedEmbedding,
			onCueDetected,
			onSilenceTimeout,
			onProgressUpdate,
		});

		const deepgram = useDeepgramSTT({
			lineEndKeywords,
			expectedEmbedding,
			onCueDetected,
			onSilenceTimeout,
			onProgressUpdate,
		});

		return provider === "google" ? google : deepgram;
	}

	const { initializeSTT, startSTT, pauseSTT, cleanupSTT, setCurrentLineText } =
		useSTT({
			provider: sttProvider,
			lineEndKeywords: current?.lineEndKeywords ?? [],
			expectedEmbedding: current?.expectedEmbedding ?? [],
			onCueDetected: onUserLineMatched,
			onSilenceTimeout: () => {
				console.log("⏱️ Timeout reached");
				setIsWaitingForUser(false);
			},
			onProgressUpdate: (count) => {
				if (current?.type === "line" && current.role === "user") {
					setSpokenWordMap((prev) => ({ ...prev, [current.index]: count }));
				}
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
	}, []);

	const goBackHome = () => {
		router.push('/home')
	}

	// Testing TTS audio manually
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	const loadElevenTTS = async ({
		text,
		voiceId = "JBFqnCBsd6RMkjVDRZzb",
		stability = 0.3,
		similarityBoost = 0.8,
	}: {
		text: string;
		voiceId?: string;
		stability?: number;
		similarityBoost?: number;
	}) => {
		try {
			// eslint-disable-next-line react-hooks/rules-of-hooks
			const blob = await useElevenTTS({
				text,
				voiceId,
				voiceSettings: {
					stability,
					similarityBoost,
				},
			});

			const url = URL.createObjectURL(blob);
			const audio = new Audio(url);
			await audio.play();

			audio.onended = () => {
				URL.revokeObjectURL(url);
			};
		} catch (err) {
			console.error("❌ Failed to load or play TTS audio:", err);
		}
	};
	// eslint-disable-next-line @typescript-eslint/no-unused-vars	
	const loadHumeTTS = async ({
		text,
		voiceId,
		voiceDescription,
		contextUtterance,
	}: {
		text: string;
		voiceId: string;
		voiceDescription: string;
		contextUtterance?: {
			text: string;
			description: string;
		}[];
	}) => {
		try {
			// eslint-disable-next-line @typescript-eslint/no-unused-vars, react-hooks/rules-of-hooks
			const blob = await useHumeTTS({
				text,
				voiceId,
				voiceDescription,
				contextUtterance,
			});

			const url = URL.createObjectURL(blob);

			const audio = new Audio(url);
			await audio.play();

			audio.onended = () => {
				URL.revokeObjectURL(url);
			};
		} catch (err) {
			console.error("❌ Failed to load or play Hume TTS audio:", err);
		}
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
					className={`text-center mb-8 cursor-pointer transition-all duration-200 hover:bg-gray-50 rounded-lg p-6 ${isCurrent ? "bg-blue-50 shadow-md border border-blue-200" : ""
						}`}
				>
					<h2 className="text-xl font-bold uppercase tracking-wider text-gray-800">
						{element.text}
					</h2>
					{isCurrent && isPlaying && (
						<div className="text-xs text-blue-600 mt-2 animate-pulse font-medium">
							● ACTIVE SCENE
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
					className={`text-center mb-6 cursor-pointer transition-all duration-200 hover:bg-gray-50 rounded-lg p-4 ${isCurrent ? "bg-blue-50 shadow-md border border-blue-200" : ""
						}`}
				>
					<p className="italic text-gray-600 text-sm">({element.text})</p>
					{isCurrent && isPlaying && (
						<div className="text-xs text-blue-600 mt-1 animate-pulse font-medium">
							● ACTIVE DIRECTION
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
					className={`mb-6 cursor-pointer transition-all duration-200 rounded-lg p-6 relative ${isCurrent
						? "bg-blue-50 shadow-md border-blue-200"
						: "hover:bg-gray-50 border-gray-200 hover:shadow-sm"
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
						<div className="pl-4 border-l-3 border-gray-300">
							{element.role === "user" ? (
								<div className="text-base leading-relaxed">
									{element.text.split(/\s+/).map((word, i) => {
										const matched = spokenWordMap[element.index] ?? 0;
										return (
											<span
												key={i}
												className={`${i < matched
													? "font-bold text-gray-900"
													: isCurrent && isWaitingForUser
														? "text-blue-900 font-medium"
														: "text-gray-700"
													} transition-all duration-300`}
											>
												{word + " "}
											</span>
										);
									})}
								</div>
							) : (
								<p className="text-base leading-relaxed text-gray-700">
									{element.text}
								</p>
							)}
						</div>
					)}

					{/* Edit button */}
					{isCurrent &&
						!isPlaying &&
						!editingLineIndex &&
						ttsHydrationStatus[element.index] === 'ready' &&
						(
							<button
								onClick={() => setEditingLineIndex(element.index)}
								className="absolute top-4 right-4 text-xs text-black bg-gray-50 px-3 py-1 rounded shadow-sm hover:shadow-lg"
								title="Edit Line"
							>
								✏️
							</button>
						)
					}

					{/* Loading indicator */}
					{['pending', 'updating'].includes(ttsHydrationStatus[element.index]) && (
						<div className="absolute top-4 right-4 w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
					)}

					{/* Failed indicator */}
					{ttsHydrationStatus[element.index] === 'failed' && (
						<div className="absolute top-4 right-4 text-sm">
							❌
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
			{loading ? (
				<LoadingScreen loadStage={loading}>
					{loadStage}
				</LoadingScreen>
			) : (
				<div className="min-h-screen flex relative" style={{ backgroundColor: '#1c1d1d' }}>
					{/* Back to Scripts Button - Top Right Corner */}
					{/* <div className="absolute top-4 right-4 z-10">
						<Button
							onClick={goBackHome}
							className="px-6 py-2 bg-blue hover:bg-gray-100 text-gray-800 rounded-lg shadow-sm transition-all duration-200 font-medium"
						>
							Upload a new script
						</Button>
					</div> */}

					{/* Left Control Panel - Dark Theme */}
					<div className="w-80 h-screen text-white shadow-xl flex flex-col" style={{ backgroundColor: '#1c1d1d' }}>
						<div className="p-6 pb-30 flex-1 overflow-y-auto hide-scrollbar">
							{/* Header */}
							<div className="mb-8">
								<h1 className="text-2xl font-bold mb-2">Rehearsal</h1>
								<p className="text-gray-400 text-sm">Practice your lines</p>
							</div>

							{/* Progress Section */}
							<div className="mb-8">
								<div className="text-sm text-gray-400 mb-2">Progress</div>
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
										></div>
									</div>
									<div className="text-xs text-gray-400">
										{Math.round(((currentIndex + 1) / (script?.length || 1)) * 100)}% complete
									</div>
								</div>
							</div>

							{/* Current Status */}
							{current && (
								<div className="mb-8">
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

							{/* Control Buttons */}
							<div className="space-y-3 mb-8">
								<button
									onClick={handlePlay}
									disabled={isPlaying || !isScriptFullyHydrated}
									className="w-full px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center gap-2 font-medium"
								>
									▶️ {!isScriptFullyHydrated
										? "Preparing..."
										: isPlaying
											? "Playing..."
											: "Start Rehearsal"}
								</button>
								<button
									onClick={handlePause}
									disabled={!isPlaying}
									className="w-full px-4 py-3 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center gap-2 font-medium"
								>
									⏸️ Pause
								</button>
								<div className="flex gap-3">
									<button
										onClick={handlePrev}
										className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all duration-200 flex items-center justify-center gap-2 font-medium"
									>
										⏮️ Previous
									</button>
									<button
										onClick={handleNext}
										className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all duration-200 flex items-center justify-center gap-2 font-medium"
									>
										⏭️ Next
									</button>
								</div>
								{currentIndex !== 0 && (
									<button
										onClick={handleRestart}
										className="w-full px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-all duration-200 flex items-center justify-center gap-2 font-medium"
									>
										🔄 Restart from Beginning
									</button>
								)}
							</div>

							{/* Select New Roles */}
							{script &&
								<div className="mb-8">
									<div className="text-sm text-gray-400 mb-2">Role Selector</div>
									<div className="bg-gray-800 rounded-lg p-4">
										<div className="flex items-center gap-2 mb-2">
											<RoleSelector
												script={script}
												userID={userID!}
												scriptID={scriptID!}
												onRolesUpdated={(updated) => {
													setScript(updated);
													scriptRef.current = updated;
													prepareUserLine(updated[currentIndex]);
													// setCurrentIndex(0);
													// setSpokenWordMap({});
													// prepareUserLine(updated[0]);
												}}
											/>
										</div>
										{isWaitingForUser && (
											<div className="text-xs text-yellow-400 animate-pulse">
												🎤 Listening for your line...
											</div>
										)}
									</div>
								</div>
							}

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

							{/* Back to Scripts Button - Top Right Corner */}
							<div className="absolute bottom-20 left-4 z-10">
								<Button
									onClick={goBackHome}
									className="px-6 py-2 bg-green-600 hover:bg-green-800 text-gray-800 rounded-lg shadow-md shadow-black hover:shadow-lg hover:shadow-black transition-all duration-200 font-medium"
								>
									Upload a new script
								</Button>
							</div>
						</div>
					</div>

					{/* Right Content Area - Light Theme */}
					<div
						className="flex-1 bg-white h-screen overflow-hidden my-16"
						style={{ borderRadius: 25, height: 'calc(100vh - 130px)', marginRight: 16 }}
					>
						<div className="max-w-4xl mx-auto h-full flex flex-col">
							{/* Script Header */}
							<div className="text-center py-8 px-8 border-b border-gray-200 shrink-0">
								<h1 className="text-3xl font-bold text-gray-900 mb-2">Script Rehearsal</h1>
								<p className="text-gray-600">Follow along and practice your lines</p>
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
								{script && currentIndex >= script.length && (
									<div className="text-center py-16 border-t border-gray-200 mt-12">
										<div className="text-6xl mb-6">🎉</div>
										<h2 className="text-3xl font-bold text-gray-900 mb-4">
											Rehearsal Complete!
										</h2>
										<p className="text-gray-600 text-lg mb-8">
											Excellent work! You&apos;ve practiced the entire script.
										</p>
										<button
											onClick={handleRestart}
											className="px-8 py-4 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium text-lg"
										>
											🔄 Practice Again
										</button>
									</div>
								)}
							</div>
						</div>
					</div>

					{/* Hidden STT Components */}
					<div className="hidden">
						{current?.type === "line" &&
							current?.role === "user" &&
							typeof current.character === "string" &&
							typeof current.text === "string" &&
							Array.isArray(current.lineEndKeywords) &&
							Array.isArray(current.expectedEmbedding) && (
								<>
									{sttProvider === "google" ? (
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
								</>
							)}
					</div>
				</div>
			)}
		</>
	);
}

export default function RehearsalRoomPage() {
	return (
		<Suspense fallback={
			<div className="min-h-screen flex items-center justify-center bg-gray-100">
				<div className="text-center">
					<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
					<p className="text-gray-600">Loading rehearsal room...</p>
				</div>
			</div>
		}>
			<RehearsalRoomContent />
		</Suspense>
	);
}