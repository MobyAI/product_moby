import type { ScriptElement } from "@/types/script";
import { updateScript } from "@/lib/firebase/client/scripts";
import { getAudioUrl, saveAudioBlob } from '@/lib/firebase/client/tts';
import pLimit from 'p-limit';
import * as Sentry from '@sentry/react';
import { set } from 'idb-keyval';
import type { AlignmentData } from "@/types/alignment";

// Extend ScriptElement locally for this file only
interface ScriptElementWithTiming extends ScriptElement {
    startTime?: number;
    endTime?: number;
    duration?: number;
}

interface DialogueEntry {
    text: string;
    voiceId: string;
    lineIndex: number;
}

// Voice mapping by default
const VOICE_MAPPING: Record<string, string> = {
    "default": "21m00Tcm4TlvDq8ikWAM",
};

// Convert AudioBuffer to Blob
const audioBufferToBlob = async (audioBuffer: AudioBuffer): Promise<Blob> => {
    const numberOfChannels = audioBuffer.numberOfChannels;
    const length = audioBuffer.length * numberOfChannels * 2;
    const arrayBuffer = new ArrayBuffer(length);
    const view = new DataView(arrayBuffer);
    const channels: Float32Array[] = [];
    let offset = 0;

    for (let i = 0; i < audioBuffer.numberOfChannels; i++) {
        channels.push(audioBuffer.getChannelData(i));
    }

    for (let i = 0; i < audioBuffer.length; i++) {
        for (let channel = 0; channel < numberOfChannels; channel++) {
            const sample = channels[channel][i];
            const clampedSample = Math.max(-1, Math.min(1, sample));
            view.setInt16(offset, clampedSample * 0x7FFF, true);
            offset += 2;
        }
    }

    // Create WAV header
    const wavHeader = createWavHeader(arrayBuffer, audioBuffer.sampleRate, numberOfChannels);
    return new Blob([wavHeader, arrayBuffer], { type: 'audio/wav' });
};

const createWavHeader = (audioData: ArrayBuffer, sampleRate: number, numberOfChannels: number): ArrayBuffer => {
    const header = new ArrayBuffer(44);
    const view = new DataView(header);

    view.setUint32(0, 0x52494646, false); // "RIFF"
    view.setUint32(4, audioData.byteLength + 36, true);
    view.setUint32(8, 0x57415645, false); // "WAVE"
    view.setUint32(12, 0x666d7420, false); // "fmt "
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, numberOfChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * numberOfChannels * 2, true);
    view.setUint16(32, numberOfChannels * 2, true);
    view.setUint16(34, 16, true);
    view.setUint32(36, 0x64617461, false); // "data"
    view.setUint32(40, audioData.byteLength, true);

    return header;
};

// Upload audio segment to Firebase
const uploadAudioToFirebase = async (
    audioBlob: Blob,
    userID: string,
    scriptID: string,
    lineIndex: number
): Promise<string> => {
    await saveAudioBlob(userID, scriptID, lineIndex, audioBlob);

    return await getAudioUrl(userID, scriptID, lineIndex);
};

// Get forced alignment from your API
export const getForcedAlignment = async (
    audioBlob: Blob,
    transcript: string
): Promise<AlignmentData> => {
    const formData = new FormData();
    formData.append('audio', audioBlob, 'audio.mp3');
    formData.append('transcript', transcript);

    const response = await fetch('/api/alignment', {
        method: 'POST',
        body: formData
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        const errorMessage = errorData?.error || `Forced alignment failed: ${response.status}`;
        throw new Error(errorMessage);
    }

    return await response.json();
};

const preprocessLineForAlignment = (text: string): string[] => {
    // Step 1: Remove stage directions/parentheticals (they won't be spoken)
    let cleaned = text.replace(/\([^)]*\)/g, ' ');

    // Step 2: Handle special punctuation
    cleaned = cleaned
        // Replace ellipses with space (represents pause, not a word)
        .replace(/\.{2,}/g, ' ')
        .replace(/…/g, ' ')

        // Replace dashes with space (represents interruption/pause)
        .replace(/--+/g, ' ')
        .replace(/—/g, ' ')
        .replace(/–/g, ' ')

        // Preserve contractions but separate other punctuation
        .replace(/([a-zA-Z])'([a-zA-Z])/g, '$1APOSTROPHE$2')  // Mark contractions
        .replace(/([a-zA-Z])([.,!?;:])/g, '$1 $2')            // Separate ending punctuation
        .replace(/([.,!?;:])([a-zA-Z])/g, '$1 $2')            // Separate starting punctuation
        .replace(/[^\w\s]/g, ' ')                              // Remove other punctuation
        .replace(/APOSTROPHE/g, "'")                           // Restore contractions

        // Normalize whitespace
        .replace(/\s+/g, ' ')
        .trim()
        .toLowerCase();

    // Step 3: Split and filter
    const words = cleaned
        .split(' ')
        .filter(word => word.length > 0)
        .filter(word => /[a-zA-Z0-9]/.test(word)); // Must contain at least one alphanumeric character

    return words;
};

// Map alignment data to script lines
const mapAlignmentToLines = (
    alignmentData: AlignmentData,
    scenePartnerLines: ScriptElement[]
): Map<number, { startTime: number; endTime: number }> => {
    const words = alignmentData.words || [];
    const timingMap = new Map<number, { startTime: number; endTime: number }>();

    console.log('=== Starting Alignment Mapping ===');
    console.log(`Total alignment words: ${words.length}`);
    console.log(`Total lines to match: ${scenePartnerLines.length}`);
    console.log('First 10 alignment words:', words.slice(0, 10).map(w => w.text));

    let wordIndex = 0;
    let lastSuccessfulEndIndex = 0;

    for (const line of scenePartnerLines) {
        const lineWords = preprocessLineForAlignment(line.text);
        const matchedWords: string[] = [];
        let wordsFound = 0;
        let lineStartTime: number | undefined;
        let lineEndTime: number | undefined;
        let searchedWords = 0;
        let firstMatchIndex = -1; // Track where we found the first word of this line
        let lastMatchIndex = -1;  // Track where we found the last matched word

        console.log(`\n--- Processing Line ${line.index} ---`);
        console.log(`Text: "${line.text.substring(0, 60)}${line.text.length > 60 ? '...' : ''}"`);
        console.log(`Target words (${lineWords.length}):`, lineWords);
        console.log(`Starting search at word index: ${wordIndex}`);
        console.log(`Next 10 alignment words from position ${wordIndex}:`,
            words.slice(wordIndex, wordIndex + 10).map(w => `"${w.text}"`).join(', '));

        while (wordIndex < words.length && wordsFound < lineWords.length) {
            const alignedWordRaw = words[wordIndex].text;
            // const alignedWord = alignedWordRaw.toLowerCase().replace(/[^\w\s]/g, '');
            const alignedWordParts = alignedWordRaw
                .toLowerCase()
                .replace(/'/g, '')            // Remove apostrophes (no space)
                .replace(/\.{2,}/g, ' ')      // Replace ellipses with space  
                .replace(/[^\w\s]/g, ' ')     // Replace other punctuation with space
                .trim()
                .split(/\s+/)
                .filter(w => w.length > 0);
            const targetWord = lineWords[wordsFound].replace(/[^\w\s]/g, '');
            searchedWords++;

            // Check if any part of the aligned word matches the target
            let matched = false;
            for (const part of alignedWordParts) {
                console.log(`    Checking part "${part}" vs target "${targetWord}"`);
                if (part === targetWord ||
                    (part.length > 2 && targetWord.length > 2 &&
                        (part.includes(targetWord) || targetWord.includes(part)))) {
                    matched = true;

                    if (wordsFound === 0) {
                        lineStartTime = words[wordIndex].start;
                        // eslint-disable-next-line @typescript-eslint/no-unused-vars
                        firstMatchIndex = wordIndex;
                        console.log(`  ✓ Found first word "${targetWord}" in "${alignedWordRaw}" at index ${wordIndex}`);
                    }

                    // For compound words, check if we can match multiple targets
                    let localWordsFound = 0;
                    for (let i = 0; i < alignedWordParts.length && wordsFound + i < lineWords.length; i++) {
                        const alignedPart = alignedWordParts[i];
                        const currentTarget = lineWords[wordsFound + i].replace(/[^\w\s]/g, '');

                        if (alignedPart === currentTarget ||
                            (alignedPart.length > 2 && currentTarget.length > 2 &&
                                (alignedPart.includes(currentTarget) || currentTarget.includes(alignedPart)))) {
                            localWordsFound++;
                            matchedWords.push(`${currentTarget}(from:${alignedWordRaw})`);
                            console.log(`    Matched "${currentTarget}" from compound word "${alignedWordRaw}"`);
                        } else {
                            break; // Stop if we can't match the next part
                        }
                    }

                    wordsFound += localWordsFound;
                    lastMatchIndex = wordIndex;
                    lineEndTime = words[wordIndex].end;

                    if (wordsFound === lineWords.length) {
                        console.log(`  ✓ Found last word at index ${wordIndex}`);
                    }
                    break; // Exit the parts loop once we've matched
                }
            }

            // Sliding Window to look ahead and skip words that shouldn't have been spoken
            if (!matched && wordsFound > 0) {
                // Look within next 10 words for our target
                const lookAheadWindow = 10;
                for (let offset = 1; offset <= lookAheadWindow && wordIndex + offset < words.length; offset++) {
                    const futureWordRaw = words[wordIndex + offset].text;
                    const futureWord = futureWordRaw.toLowerCase().replace(/[^\w\s]/g, '').replace(/'/g, '');

                    if (futureWord === targetWord ||
                        (futureWord.length > 2 && targetWord.length > 2 &&
                            (futureWord.includes(targetWord) || targetWord.includes(futureWord)))) {
                        console.log(`  ⚠️ Found target "${targetWord}" ${offset} words ahead (skipping unexpected: "${alignedWordRaw}" and ${offset - 1} others)`);
                        wordIndex += offset - 1; // -1 because we'll increment at the bottom
                        break;
                    }
                }
            }

            wordIndex++;

            if (wordsFound === lineWords.length) {
                if (lineStartTime !== undefined && lineEndTime !== undefined) {
                    timingMap.set(line.index, {
                        startTime: lineStartTime,
                        endTime: lineEndTime
                    });
                    lastSuccessfulEndIndex = wordIndex;
                    console.log(`✅ Line ${line.index} MATCHED!`);
                    console.log(`  - Matched ${wordsFound}/${lineWords.length} words`);
                    console.log(`  - Searched through ${searchedWords} alignment words`);
                    console.log(`  - Time range: ${lineStartTime.toFixed(2)}s - ${lineEndTime.toFixed(2)}s (${(lineEndTime - lineStartTime).toFixed(2)}s duration)`);
                    console.log(`  - Matched words:`, matchedWords);
                }
                break;
            }
        }

        if (!timingMap.has(line.index)) {
            console.log(`❌ Line ${line.index} FAILED!`);
            console.log(`  - Only matched ${wordsFound}/${lineWords.length} words`);
            console.log(`  - Searched through ${searchedWords} alignment words`);
            console.log(`  - Matched words so far:`, matchedWords);
            console.log(`  - Missing words:`, lineWords.slice(wordsFound));

            // Smart backtracking based on what happened
            let newIndex;
            if (wordsFound > 0 && lastMatchIndex > 0) {
                // We found some words - go back to just after where we found them
                newIndex = lastMatchIndex + 1;
                console.log(`  - Partial match found, resetting to just after last match at index ${newIndex}`);
            } else if (lastSuccessfulEndIndex > 0) {
                // No words found at all - go back to where the last complete line ended
                newIndex = lastSuccessfulEndIndex;
                console.log(`  - No match found, resetting to last successful line end at index ${newIndex}`);
            } else {
                // First line failed or no successful matches yet - skip forward a bit
                newIndex = Math.min(wordIndex + 10, words.length - 1);
                console.log(`  - No previous success, skipping forward to ${newIndex}`);
            }

            wordIndex = newIndex;
        }
    }

    console.log('\n=== Alignment Summary ===');
    console.log(`Successfully matched: ${timingMap.size}/${scenePartnerLines.length} lines`);
    console.log(`Failed lines:`, scenePartnerLines.filter(l => !timingMap.has(l.index)).map(l => l.index));
    console.log(`Final word index position: ${wordIndex}/${words.length}`);

    if (timingMap.size > 0) {
        const durations = Array.from(timingMap.values()).map(t => t.endTime - t.startTime);
        console.log(`Average line duration: ${(durations.reduce((a, b) => a + b, 0) / durations.length).toFixed(2)}s`);
        console.log(`Min duration: ${Math.min(...durations).toFixed(2)}s`);
        console.log(`Max duration: ${Math.max(...durations).toFixed(2)}s`);
    }

    return timingMap;
};

// Split audio into segments using Web Audio API
const splitAudioIntoSegments = async (
    audioBlob: Blob,
    timingMap: Map<number, { startTime: number; endTime: number }>
): Promise<Map<number, Blob>> => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const arrayBuffer = await audioBlob.arrayBuffer();
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

    const sampleRate = audioBuffer.sampleRate;
    const segmentMap = new Map<number, Blob>();
    const startPaddingSeconds = 0.05;  // 50ms before (catches beginning)
    const endPaddingSeconds = 0;    // 0ms to avoid overlap

    // Sort entries by line index to process in order
    const sortedEntries = Array.from(timingMap.entries()).sort((a, b) => a[0] - b[0]);

    for (const [lineIndex, timing] of sortedEntries) {
        const startTime = Math.max(0, timing.startTime - startPaddingSeconds);
        const endTime = Math.min(audioBuffer.duration, timing.endTime + endPaddingSeconds);

        const startSample = Math.floor(startTime * sampleRate);
        const endSample = Math.ceil(endTime * sampleRate);
        const segmentLength = endSample - startSample;

        // Add diagnostic logging
        console.log(`Line ${lineIndex}: startTime=${startTime.toFixed(3)}s (sample ${startSample}), endTime=${endTime.toFixed(3)}s (sample ${endSample}), length=${segmentLength} samples`);

        // Check for anomalies
        if (lineIndex > 0) {
            const prevEntry = sortedEntries[sortedEntries.findIndex(e => e[0] === lineIndex) - 1];
            if (prevEntry) {
                const prevEndTime = prevEntry[1].endTime;
                if (timing.startTime < prevEndTime) {
                    console.warn(`⚠️ Line ${lineIndex} starts (${timing.startTime}) before previous line ends (${prevEndTime})`);
                }
            }
        }

        const segmentBuffer = audioContext.createBuffer(
            audioBuffer.numberOfChannels,
            segmentLength,
            sampleRate
        );

        for (let channel = 0; channel < audioBuffer.numberOfChannels; channel++) {
            const sourceData = audioBuffer.getChannelData(channel);
            const segmentData = segmentBuffer.getChannelData(channel);

            for (let i = 0; i < segmentLength; i++) {
                if (startSample + i < sourceData.length) {
                    segmentData[i] = sourceData[startSample + i];
                }
            }
        }

        const segmentBlob = await audioBufferToBlob(segmentBuffer);
        segmentMap.set(lineIndex, segmentBlob);
    }

    return segmentMap;
};

// Hydration function using dialogue mode
export const hydrateScriptWithDialogue = async ({
    script,
    userID,
    scriptID,
    setLoadStage,
    setScript,
    setStorageError,
    setTTSLoadError,
    setTTSFailedLines,
    updateTTSHydrationStatus,
    onProgressUpdate,
    showToast,
}: {
    script: ScriptElement[];
    userID: string;
    scriptID: string;
    setLoadStage: (stage: string) => void;
    setScript: (script: ScriptElement[]) => void;
    setStorageError: (val: boolean) => void;
    setTTSLoadError: (val: boolean) => void;
    setTTSFailedLines: (lines: number[]) => void;
    updateTTSHydrationStatus?: (index: number, status: 'pending' | 'ready' | 'failed') => void;
    onProgressUpdate?: (hydratedCount: number, totalCount: number) => void;
    showToast: (props: { header: string; line1?: string; type: 'success' | 'danger' | 'warning' | 'neutral' }) => void;
}): Promise<boolean> => {
    if (!userID || !scriptID) return false;

    const start = performance.now();
    const scriptCacheKey = `script-cache:${userID}:${scriptID}`;

    // Reset error states
    setStorageError(false);
    setTTSLoadError(false);
    setTTSFailedLines([]);

    try {
        // Get all lines that need TTS
        const scenePartnerLines = script.filter(
            (element: ScriptElement) =>
                element.type === 'line' &&
                (!element.ttsUrl || element.ttsUrl.length === 0)
        );

        if (scenePartnerLines.length === 0) {
            console.log('✅ All scene-partner lines already have audio');
            setLoadStage('✅ Script ready!');
            return false;
        }

        const totalOperations = scenePartnerLines.length;
        let completedOperations = 0;

        // Update status to pending for all lines
        scenePartnerLines.forEach(line => {
            updateTTSHydrationStatus?.(line.index, 'pending');
        });

        // Step 1: Generate dialogue audio for all scene-partner lines
        setLoadStage('🎤 Generating dialogue audio...');

        // Check if any lines are missing voiceId
        const linesWithoutVoice = scenePartnerLines.filter(line => !line.voiceId);
        if (linesWithoutVoice.length > 0 && showToast) {
            showToast({
                header: "Missing voice selection",
                line1: "Using default voice",
                type: "warning"
            });
        }

        const dialogueEntries: DialogueEntry[] = scenePartnerLines.map(line => ({
            text: line.text,
            voiceId: line.voiceId || VOICE_MAPPING.default,
            lineIndex: line.index
        }));

        const response = await fetch('/api/tts/dialogue', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                dialogue: dialogueEntries,
                modelId: 'eleven_v3',
                applyTextNormalization: 'auto'
            }),
        });

        if (!response.ok) {
            const errorMessage = await response.text().catch(() => 'Unknown error');
            console.error(`TTS API failed with status ${response.status}: ${errorMessage}`);

            showToast({
                header: "Audio generation failed",
                line1: response.status === 429
                    ? "Rate limit exceeded. Please try again later"
                    : "Unable to generate scene partner audio",
                type: "danger"
            });

            throw new Error('Failed to generate dialogue audio');
        }

        const audioBlob = await response.blob();
        console.log('✅ Dialogue audio generated');

        // Step 2: Get forced alignment
        setLoadStage('🎯 Aligning audio with text...');

        const fullTranscript = scenePartnerLines.map(line => line.text).join(' ');
        const alignmentData = await getForcedAlignment(audioBlob, fullTranscript);
        console.log('✅ Forced alignment complete');

        // Step 3: Map timestamps to lines
        const timingMap = mapAlignmentToLines(alignmentData, scenePartnerLines);

        // Check if all lines got timestamps
        const failedLines: number[] = [];
        scenePartnerLines.forEach(line => {
            if (!timingMap.has(line.index)) {
                failedLines.push(line.index);
                console.warn(`❌ No timing found for line ${line.index}`);
            }
        });

        if (failedLines.length > 0) {
            console.warn('⚠️ Some lines could not be aligned:', failedLines);
            // Continue with the lines that were successfully aligned
        }

        // Step 4: Split audio into segments
        setLoadStage('✂️ Splitting audio into segments...');
        const segmentMap = await splitAudioIntoSegments(audioBlob, timingMap);
        console.log(`✅ Split into ${segmentMap.size} segments`);

        // Step 5: Upload segments to Firebase and update script
        setLoadStage('☁️ Uploading audio segments...');

        const uploadLimit = pLimit(3); // Limit concurrent uploads

        // Use the extended type for the updated script
        const updatedScript: (ScriptElement | ScriptElementWithTiming)[] = await Promise.all(
            script.map(element =>
                uploadLimit(async () => {
                    if (
                        element.type === 'line' &&
                        segmentMap.has(element.index)
                    ) {
                        try {
                            const audioBlob = segmentMap.get(element.index)!;
                            const timing = timingMap.get(element.index)!;

                            // Upload to Firebase
                            const firebaseUrl = await uploadAudioToFirebase(
                                audioBlob,
                                userID,
                                scriptID,
                                element.index
                            );

                            completedOperations++;
                            onProgressUpdate?.(completedOperations, totalOperations);
                            updateTTSHydrationStatus?.(element.index, 'ready');

                            // Return updated element with URL and timing (extended type)
                            const extendedElement: ScriptElementWithTiming = {
                                ...element,
                                ttsUrl: firebaseUrl,
                                startTime: timing.startTime,
                                endTime: timing.endTime,
                                duration: timing.endTime - timing.startTime
                            };

                            return extendedElement;
                        } catch (err) {
                            console.error(`❌ Failed to upload audio for line ${element.index}:`, err);
                            Sentry.captureException(err);
                            failedLines.push(element.index);
                            updateTTSHydrationStatus?.(element.index, 'failed');
                            return element;
                        }
                    }
                    return element;
                })
            )
        );

        if (failedLines.length > 0) {
            setTTSLoadError(true);
            setTTSFailedLines(failedLines);
            // Continue with partial success
        }

        // Step 6: Cache the updated script
        setLoadStage('💾 Saving...');

        try {
            // The timing data preserved in the cached object
            await set(scriptCacheKey, updatedScript as ScriptElement[]);
            console.log('💾 Script cached successfully');
        } catch (err) {
            console.warn('⚠️ Failed to cache script:', err);
            Sentry.captureException(err);
        }

        // Step 7: Save to database
        try {
            await updateScript(scriptID, updatedScript as ScriptElement[]);
            console.log('✅ Script saved to database');
        } catch (err) {
            console.warn('⚠️ Failed to save to database:', err);
            Sentry.captureException(err);
        }

        const end = performance.now();
        console.log(`⏱️ Script hydrated with dialogue mode in ${(end - start).toFixed(2)} ms`);

        setLoadStage('✅ Resources loaded!');
        setScript(updatedScript as ScriptElement[]);

        return failedLines.length === 0; // Return true only if all lines succeeded
    } catch (err) {
        console.error('❌ Error hydrating script with dialogue:', err);
        Sentry.captureException(err);
        setLoadStage('❌ Failed to load audio');
        setTTSLoadError(true);
        return false;
    }
};