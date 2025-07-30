"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useHumeTTS, useElevenTTS } from "@/lib/api/tts";
import { useGoogleSTT } from "@/lib/google/speechToText";
import { useDeepgramSTT } from "@/lib/deepgram/speechToText";
import type { ScriptElement } from "@/types/script";
import { loadScript } from "../../rehearsal-room/loader";
import { restoreSession, saveSession } from "../../rehearsal-room/session";
import Deepgram from "../../rehearsal-room/deepgram";
import GoogleSTT from "../../rehearsal-room/google";
import { clear } from "idb-keyval";
import LoadingScreen from "./LoadingScreen";
import { Button } from "@/components/ui/Buttons";

export default function RehearsalRoomPage() {
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
	const [embeddingError, setEmbeddingError] = useState(false);
	const [embeddingFailedLines, setEmbeddingFailedLines] = useState<number[]>(
		[]
	);
	const [ttsLoadError, setTTSLoadError] = useState(false);
	const [ttsFailedLines, setTTSFailedLines] = useState<number[]>([]);

	// Load script and restore session
	useEffect(() => {
		if (!userID || !scriptID) return;

		const init = async () => {
			setLoading(true);
			await loadScript({
				userID,
				scriptID,
				setLoadStage,
				setScript,
				setStorageError,
				setEmbeddingError,
				setEmbeddingFailedLines,
				setTTSLoadError,
				setTTSFailedLines,
			});
			const restored = await restoreSession(scriptID);
			if (restored) {
				setCurrentIndex(restored.index ?? 0);
				setSpokenWordMap(restored.spokenWordMap ?? {});
			}
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
			saveSession(scriptID, { index: currentIndex, spokenWordMap });
		}, 1000);

		return () => clearTimeout(timeout);
	}, [currentIndex, scriptID]);

	const retryLoadScript = async () => {
		if (!userID || !scriptID) return;

		await loadScript({
			userID,
			scriptID,
			setLoadStage,
			setScript,
			setStorageError,
			setEmbeddingError,
			setEmbeddingFailedLines,
			setTTSLoadError,
			setTTSFailedLines,
		});
	};

	// Handle script flow
	const current = script?.find((el) => el.index === currentIndex) ?? null;

	const prepareUserLine = (line: ScriptElement | undefined | null) => {
		if (
			line?.type === "line" &&
			line.role === "user" &&
			typeof line.text === "string"
		) {
			setCurrentLineText(line.text);
		}
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
			const blob = await useHumeTTS({
				text,
				voiceId,
				voiceDescription,
				contextUtterance,
			});

			const url = URL.createObjectURL(url);

			const audio = new Audio(url);
			await audio.play();

			audio.onended = () => {
				URL.revokeObjectURL(url);
			};
		} catch (err) {
			console.error("❌ Failed to load or play Hume TTS audio:", err);
		}
	};

	const [drawerOpen, setDrawerOpen] = useState(false);

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
					className={`text-center mb-8 cursor-pointer transition-all duration-200 hover:bg-yellow-50 hover:shadow-sm rounded-lg p-4 ${
						isCurrent ? "bg-yellow-100 shadow-sm" : ""
					}`}
				>
					<h2 className="text-xl font-bold uppercase tracking-wider text-black">
						{element.text}
					</h2>
					{isCurrent && isPlaying && (
						<div className="text-xs text-yellow-700 mt-2 animate-pulse">
							● ACTIVE
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
					className={`text-center mb-6 cursor-pointer transition-all duration-200 hover:bg-gray-50 hover:shadow-sm rounded-lg p-3 ${
						isCurrent ? "bg-gray-100 shadow-sm" : ""
					}`}
				>
					<p className="italic text-gray-600 text-sm">({element.text})</p>
					{isCurrent && isPlaying && (
						<div className="text-xs text-gray-500 mt-1 animate-pulse">
							● ACTIVE
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
					className={`mb-6 cursor-pointer transition-all duration-200 hover:bg-blue-25 hover:shadow-md rounded-lg p-4 ${
						isCurrent ? "bg-blue-50 shadow-sm" : "hover:bg-slate-50"
					}`}
				>
					{/* Character name */}
					<div className="flex items-center justify-between mb-2">
						<div className="flex items-center justify-center flex-1 gap-2">
							<h3
								className={`font-bold uppercase tracking-wide text-sm text-center ${
									element.role === "user" ? "text-blue-800" : "text-purple-800"
								}`}
							>
								{element.character ||
									(element.role === "user" ? "YOU" : "SCENE PARTNER")}
							</h3>
							{isCurrent && isPlaying && (
								<span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded animate-pulse">
									ACTIVE
								</span>
							)}
							{isCompleted && (
								<span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
									✓
								</span>
							)}
						</div>
					</div>

					{/* Dialogue text */}
					<div className="ml-6">
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
														: "text-gray-800"
												} transition-all duration-200`}
										>
											{word + " "}
										</span>
									);
								})}
							</div>
						) : (
							<p className="text-base leading-relaxed text-gray-800">
								{element.text}
							</p>
						)}
					</div>
				</div>
			);
		}

		return null;
	};

	// Update the main return JSX to use overlay drawer that doesn't take over
	return (
		<>
			{loading ? 
				<LoadingScreen loadStage={loading}>
					{loadStage}
				</LoadingScreen>
				:
				<div className="min-h-screen bg-white">
					{/* Main Content - Always visible and centered */}
					<div className="max-w-4xl mx-auto">
						{/* Script Title Area */}
						<div className="text-center py-8 border-b border-gray-200">
							<h1 className="text-3xl font-bold text-gray-800 mb-2">
								Play session
							</h1>
						</div>

						{/* Script Body */}
						<div className="px-12 py-8 font-mono text-sm leading-loose">
							{script?.map((element, index) => renderScriptElement(element, index))}
						</div>

						{/* End of Script */}
						{script && currentIndex >= script.length && (
							<div className="text-center py-12 border-t border-gray-200">
								<div className="text-6xl mb-4">🎉</div>
								<h2 className="text-2xl font-bold text-gray-800 mb-2">
									REHEARSAL COMPLETE!
								</h2>
								<p className="text-gray-600">
									Great job working through the script.
								</p>
								<button
									onClick={handleRestart}
									className="mt-4 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
								>
									🔄 Start Over
								</button>
							</div>
						)}
					</div>

					{/* Drawer Panel */}
					<div className="fixed inset-y-0 left-0 z-50 w-80 bg-gray-900 text-white shadow-xl transform transition-transform duration-300 ease-in-out">
						<div className="p-6 h-full overflow-y-auto flex flex-col">
							<div className="flex-1">
								<div className="flex items-center justify-between mb-6">
									<h1 className="text-xl font-bold">Play Room</h1>
								</div>

								{/* Progress Info */}
								<div className="mb-6 p-3 bg-gray-800 rounded">
									<div className="text-sm text-gray-300 mb-1">Progress</div>
									<div className="text-lg font-semibold">
										Line {currentIndex + 1} of {script?.length}
									</div>
									<div className="w-full bg-gray-700 rounded-full h-2 mt-2">
										<div
											className="bg-blue-500 h-2 rounded-full transition-all duration-300"
											style={{
												width: `${((currentIndex + 1) / (script?.length || 1)) * 100}%`,
											}}
										></div>
									</div>
								</div>

								{/* Control Buttons */}
								<div className="space-y-3">
									<button
										onClick={handlePlay}
										disabled={isPlaying}
										className="w-full px-4 py-3 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
									>
										▶️ Play
									</button>
									<button
										onClick={handlePause}
										disabled={!isPlaying}
										className="w-full px-4 py-3 bg-yellow-500 text-white rounded hover:bg-yellow-600 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
									>
										⏸️ Pause
									</button>
									<div className="flex gap-2">
										<button
											onClick={handlePrev}
											className="flex-1 px-4 py-3 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors flex items-center justify-center gap-2"
										>
											⏮️ Back
										</button>
										<button
											onClick={handleNext}
											className="flex-1 px-4 py-3 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors flex items-center justify-center gap-2"
										>
											⏭️ Next
										</button>
									</div>
									{currentIndex !== 0 && (
										<button
											onClick={handleRestart}
											className="w-full px-4 py-3 bg-red-500 text-white rounded hover:bg-red-600 transition-colors flex items-center justify-center gap-2"
										>
											🔄 Restart
										</button>
									)}
								</div>

								{/* Current Status */}
								{current && (
									<div className="mt-6 p-3 bg-gray-800 rounded">
										<div className="text-sm text-gray-300 mb-1">Current</div>
										<div className="text-sm">
											<span
												className={`inline-block px-2 py-1 rounded text-xs font-semibold ${current.type === "line"
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
											{isWaitingForUser && (
												<span className="ml-2 text-xs text-yellow-400 animate-pulse">
													Waiting for your line...
												</span>
											)}
										</div>
									</div>
								)}

								{/* Storage Error */}
								{storageError && (
									<div className="mt-6 p-3 bg-red-900 border border-red-700 rounded">
										<p className="text-red-200 text-sm">
											🚫 Not enough space to store rehearsal data.
										</p>
										<button
											onClick={async () => {
												await clear();
												setStorageError(false);
												await retryLoadScript();
											}}
											className="mt-2 px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700 w-full"
										>
											Clear Local Storage & Retry
										</button>
									</div>
								)}
							</div>

							{/* Bottom Button - Always at bottom */}
							<div className="mt-6 pt-4 border-t border-gray-700">
								<Button onClick={goBackHome}>
									Upload new script
								</Button>
							</div>
						</div>
					</div>

					{/* STT Components (hidden) */}
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
				</div>}
		</>
	);
}