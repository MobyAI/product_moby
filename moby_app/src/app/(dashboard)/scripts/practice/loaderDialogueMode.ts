import type { ScriptElement } from "@/types/script";
import { updateScript } from "@/lib/firebase/client/scripts";
import { getAudioUrl, saveAudioBlob } from '@/lib/firebase/client/tts';
import pLimit from 'p-limit';
import * as Sentry from '@sentry/react';
import { set } from 'idb-keyval';
import type { AlignmentData } from "@/types/alignment";
import { sanitizeForTTS } from "@/lib/helpers/sanitizerTTS";

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
// const audioBufferToBlob = async (audioBuffer: AudioBuffer): Promise<Blob> => {
//     const numberOfChannels = audioBuffer.numberOfChannels;
//     const length = audioBuffer.length * numberOfChannels * 2;
//     const arrayBuffer = new ArrayBuffer(length);
//     const view = new DataView(arrayBuffer);
//     const channels: Float32Array[] = [];
//     let offset = 0;

//     for (let i = 0; i < audioBuffer.numberOfChannels; i++) {
//         channels.push(audioBuffer.getChannelData(i));
//     }

//     for (let i = 0; i < audioBuffer.length; i++) {
//         for (let channel = 0; channel < numberOfChannels; channel++) {
//             const sample = channels[channel][i];
//             const clampedSample = Math.max(-1, Math.min(1, sample));
//             view.setInt16(offset, clampedSample * 0x7FFF, true);
//             offset += 2;
//         }
//     }

//     // Create WAV header
//     const wavHeader = createWavHeader(arrayBuffer, audioBuffer.sampleRate, numberOfChannels);
//     return new Blob([wavHeader, arrayBuffer], { type: 'audio/wav' });
// };

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
    formData.append('audio', audioBlob, 'audio.wav');
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

// // Split audio into segments using Web Audio API
// // With silence detector
// const splitAudioIntoSegments = async (
//     audioBlob: Blob,
//     timingMap: Map<number, { startTime: number; endTime: number }>
// ): Promise<Map<number, Blob>> => {
//     const sampleRate = 48000;
//     const numberOfChannels = 1;
//     const bytesPerSample = 2;
//     const bytesPerSecond = sampleRate * numberOfChannels * bytesPerSample;

//     const arrayBuffer = await audioBlob.arrayBuffer();
//     const view = new DataView(arrayBuffer);
//     let pcmData: Uint8Array;

//     if (view.getUint32(0, false) === 0x52494646) {
//         pcmData = new Uint8Array(arrayBuffer, 44);
//         console.log('Found WAV header, skipping 44 bytes');
//     } else {
//         pcmData = new Uint8Array(arrayBuffer);
//         console.log('Raw PCM data, no header to skip');
//     }

//     // Convert PCM bytes to samples for silence detection
//     const pcmSamples = new Int16Array(pcmData.buffer, pcmData.byteOffset, pcmData.length / 2);

//     // Silence detection function
//     const findSilencePoint = (
//         startSample: number,
//         lineIndex: number,
//         nextLineStartTime: number | undefined,
//         maxSearchSamples: number = sampleRate * 0.05, // Search up to 50ms forward
//         silenceThreshold: number = 0.02, // ~2% of max amplitude
//         minSilenceDuration: number = sampleRate * 0.01 // 10ms of silence
//     ): number => {
//         const maxAmplitude = 32767; // Max for 16-bit audio
//         const threshold = maxAmplitude * silenceThreshold;

//         let silentSamples = 0;
//         let lastSilenceStart = -1;

//         // Limit search to not exceed next line's start
//         let searchEnd = Math.min(startSample + maxSearchSamples, pcmSamples.length);
//         if (nextLineStartTime !== undefined) {
//             const nextLineStartSample = Math.floor(nextLineStartTime * sampleRate);
//             searchEnd = Math.min(searchEnd, nextLineStartSample - 480); // Stop 10ms before next line
//         }

//         for (let i = startSample; i < searchEnd; i++) {
//             if (Math.abs(pcmSamples[i]) < threshold) {
//                 if (silentSamples === 0) {
//                     lastSilenceStart = i; // Mark where this silence region starts
//                 }
//                 silentSamples++;

//                 if (silentSamples >= minSilenceDuration) {
//                     // Found sufficient silence, but keep scanning to check for non-silence
//                     continue;
//                 }
//             } else {
//                 // Hit non-silence
//                 if (silentSamples >= minSilenceDuration) {
//                     // We had found valid silence, but now hit non-silence (likely next line's audio)
//                     // Include half the silence duration as buffer
//                     const halfSilence = Math.floor(silentSamples / 2);
//                     const trimPoint = lastSilenceStart + halfSilence;

//                     // Trying full silence
//                     // const trimPoint = lastSilenceStart + silentSamples;
//                     // console.log(`  Line ${lineIndex}: Found ${silentSamples} samples of silence starting at ${lastSilenceStart}, trimming at ${trimPoint} (includes ${silentSamples} samples of buffer), before non-silence at ${i}`);

//                     return trimPoint;
//                 }
//                 silentSamples = 0; // Reset counter
//                 lastSilenceStart = -1;
//             }
//         }

//         // If we ended the loop with valid silence (no non-silence after it)
//         if (silentSamples >= minSilenceDuration && lastSilenceStart !== -1) {
//             // Include half the silence as buffer here too
//             // const halfSilence = Math.floor(silentSamples / 2);
//             // const trimPoint = lastSilenceStart + halfSilence;

//             // console.log(`  Line ${lineIndex}: Found ${silentSamples} samples of silence at end, trimming at ${trimPoint} (includes ${halfSilence} samples of buffer)`);
//             // return trimPoint;

//             // Include the full silence duration found
//             const trimPoint = lastSilenceStart + silentSamples;

//             console.log(`  Line ${lineIndex}: Found ${silentSamples} samples of silence at end, trimming at ${trimPoint} (includes full silence duration)`);
//             return trimPoint;
//         }

//         // No valid silence found, return original position
//         console.log(`No silence found at line ${lineIndex}`);
//         return startSample;
//     };

//     const segmentMap = new Map<number, Blob>();
//     const startPaddingSeconds = 0.05;
//     const sortedEntries = Array.from(timingMap.entries()).sort((a, b) => a[0] - b[0]);

//     for (let i = 0; i < sortedEntries.length; i++) {
//         const [lineIndex, timing] = sortedEntries[i];
//         const nextEntry = sortedEntries[i + 1];
//         const nextLineStartTime = nextEntry ? nextEntry[1].startTime : undefined;
//         const startTime = Math.max(0, timing.startTime - startPaddingSeconds);

//         // Find the end point using silence detection
//         const originalEndTime = timing.endTime;
//         const initialEndSample = Math.floor(timing.endTime * sampleRate);
//         const silenceStartSample = findSilencePoint(
//             initialEndSample,
//             lineIndex,
//             nextLineStartTime
//         );
//         const adjustedEndTime = silenceStartSample / sampleRate;

//         // Detailed comparison logging
//         console.log(`Line ${lineIndex}:`);
//         console.log(`  Original end: ${originalEndTime.toFixed(3)}s`);
//         console.log(`  Adjusted end: ${adjustedEndTime.toFixed(3)}s`);
//         console.log(`  Adjustment: ${(adjustedEndTime - originalEndTime).toFixed(3)}s (${adjustedEndTime > originalEndTime ? 'extended' : 'trimmed'})`);

//         const startByte = Math.floor(startTime * bytesPerSecond);
//         const endByte = Math.floor(adjustedEndTime * bytesPerSecond);

//         const alignedStartByte = startByte - (startByte % bytesPerSample);
//         const alignedEndByte = endByte - (endByte % bytesPerSample);

//         const actualStartByte = Math.min(alignedStartByte, pcmData.length);
//         const actualEndByte = Math.min(alignedEndByte, pcmData.length);
//         const segmentLength = actualEndByte - actualStartByte;

//         if (segmentLength <= 0) {
//             console.warn(`⚠️ Line ${lineIndex} has invalid segment length: ${segmentLength} `);
//             continue;
//         }

//         const segmentPCM = pcmData.slice(actualStartByte, actualEndByte);

//         // Create WAV header
//         const createWavHeader = (dataLength: number): ArrayBuffer => {
//             const header = new ArrayBuffer(44);
//             const view = new DataView(header);
//             view.setUint32(0, 0x52494646, false);
//             view.setUint32(4, dataLength + 36, true);
//             view.setUint32(8, 0x57415645, false);
//             view.setUint32(12, 0x666d7420, false);
//             view.setUint32(16, 16, true);
//             view.setUint16(20, 1, true);
//             view.setUint16(22, numberOfChannels, true);
//             view.setUint32(24, sampleRate, true);
//             view.setUint32(28, sampleRate * numberOfChannels * bytesPerSample, true);
//             view.setUint16(32, numberOfChannels * bytesPerSample, true);
//             view.setUint16(34, 16, true);
//             view.setUint32(36, 0x64617461, false);
//             view.setUint32(40, dataLength, true);
//             return header;
//         };

//         const wavHeader = createWavHeader(segmentPCM.length);
//         const segmentBlob = new Blob([wavHeader, segmentPCM], { type: 'audio/wav' });
//         segmentMap.set(lineIndex, segmentBlob);
//     }

//     return segmentMap;
// };

// Split audio into segments using Web Audio API
// NO silence detector
const splitAudioIntoSegments = async (
    audioBlob: Blob,
    timingMap: Map<number, { startTime: number; endTime: number }>
): Promise<Map<number, Blob>> => {
    const sampleRate = 48000;
    const numberOfChannels = 1;
    const bytesPerSample = 2;
    const bytesPerSecond = sampleRate * numberOfChannels * bytesPerSample;

    const arrayBuffer = await audioBlob.arrayBuffer();
    const view = new DataView(arrayBuffer);
    let pcmData: Uint8Array;

    if (view.getUint32(0, false) === 0x52494646) {
        pcmData = new Uint8Array(arrayBuffer, 44);
        console.log('Found WAV header, skipping 44 bytes');
    } else {
        pcmData = new Uint8Array(arrayBuffer);
        console.log('Raw PCM data, no header to skip');
    }

    const segmentMap = new Map<number, Blob>();
    const sortedEntries = Array.from(timingMap.entries()).sort((a, b) => a[0] - b[0]);

    // Padding
    const startPaddingSeconds = 0.05;
    const endPaddingSeconds = 0.05;

    for (let i = 0; i < sortedEntries.length; i++) {
        const [lineIndex, timing] = sortedEntries[i];
        const nextEntry = sortedEntries[i + 1];
        const nextLineStartTime = nextEntry ? nextEntry[1].startTime : undefined;

        // Log original timings and gap analysis
        console.log(`Line ${lineIndex}:`);
        console.log(`  Original timing: ${timing.startTime.toFixed(3)}s - ${timing.endTime.toFixed(3)}s`);
        if (nextEntry) {
            const gapToNext = nextEntry[1].startTime - timing.endTime;
            console.log(`  Gap to next line: ${(gapToNext * 1000).toFixed(1)}ms`);
            if (gapToNext < 0) {
                console.log(`  ⚠️ OVERLAP DETECTED: Lines ${lineIndex} and ${nextEntry[0]} overlap by ${Math.abs(gapToNext * 1000).toFixed(1)}ms`);
            }
        }

        const gap = nextEntry ? nextEntry[1].startTime - timing.endTime : 1.0;

        // Account for the fact that both lines get padded
        const effectiveGap = gap - startPaddingSeconds - endPaddingSeconds;

        // Determine actual end padding based on effective gap
        let actualEndPadding;
        if (effectiveGap < 0.1) { // Less than 100ms effective gap after padding
            actualEndPadding = 0; // No end padding to avoid overlap
        } else {
            actualEndPadding = Math.min(endPaddingSeconds, gap * 0.5);
        }

        // Calculate times with padding
        const startTime = Math.max(0, timing.startTime - startPaddingSeconds);
        let endTime = timing.endTime + actualEndPadding;

        if (nextLineStartTime !== undefined) {
            const maxEndTime = nextLineStartTime - 0.01;
            endTime = Math.min(endTime, maxEndTime);
        }

        const audioLengthSeconds = pcmData.length / bytesPerSecond;
        endTime = Math.min(endTime, audioLengthSeconds);

        // Convert to samples first for better precision
        const startSample = Math.floor(startTime * sampleRate);
        const endSample = Math.floor(endTime * sampleRate);

        // Convert samples to bytes
        const startByte = startSample * bytesPerSample * numberOfChannels;
        let endByte = endSample * bytesPerSample * numberOfChannels;

        // After calculating endByte, ensure it doesn't equal or exceed the next segment's start
        if (nextEntry) {
            const nextStartTime = Math.max(0, nextEntry[1].startTime - startPaddingSeconds);
            const nextStartSample = Math.floor(nextStartTime * sampleRate);
            const nextStartByte = nextStartSample * bytesPerSample * numberOfChannels;

            // Ensure we stop at least 1 sample before the next segment starts
            if (endByte >= nextStartByte) {
                endByte = nextStartByte - (bytesPerSample * numberOfChannels);
                console.log(`  ⚠️ Trimmed line ${lineIndex} end to prevent overlap with line ${nextEntry[0]}`);
            }
        }

        const actualStartByte = Math.max(0, Math.min(startByte, pcmData.length));
        const actualEndByte = Math.max(0, Math.min(endByte, pcmData.length));
        const segmentLength = actualEndByte - actualStartByte;

        console.log(`Line ${lineIndex}:`);
        console.log(`  Time: ${startTime.toFixed(3)}s - ${endTime.toFixed(3)}s`);
        console.log(`  Samples: ${startSample} - ${endSample}`);
        console.log(`  Bytes: ${actualStartByte} - ${actualEndByte}`);
        console.log(`  Length: ${segmentLength} bytes`);

        if (segmentLength <= 0) {
            console.warn(`⚠️ Line ${lineIndex} has invalid segment length: ${segmentLength}`);
            continue;
        }

        const segmentPCM = pcmData.slice(actualStartByte, actualEndByte);

        // Create WAV header (keeping your existing function)
        const createWavHeader = (dataLength: number): ArrayBuffer => {
            const header = new ArrayBuffer(44);
            const view = new DataView(header);
            view.setUint32(0, 0x52494646, false);
            view.setUint32(4, dataLength + 36, true);
            view.setUint32(8, 0x57415645, false);
            view.setUint32(12, 0x666d7420, false);
            view.setUint32(16, 16, true);
            view.setUint16(20, 1, true);
            view.setUint16(22, numberOfChannels, true);
            view.setUint32(24, sampleRate, true);
            view.setUint32(28, sampleRate * numberOfChannels * bytesPerSample, true);
            view.setUint16(32, numberOfChannels * bytesPerSample, true);
            view.setUint16(34, 16, true);
            view.setUint32(36, 0x64617461, false);
            view.setUint32(40, dataLength, true);
            return header;
        };

        const wavHeader = createWavHeader(segmentPCM.length);
        const segmentBlob = new Blob([wavHeader, segmentPCM], { type: 'audio/wav' });
        segmentMap.set(lineIndex, segmentBlob);
    }

    return segmentMap;
};

// Function to split dialogue entries into batches
const splitDialogueIntoBatches = (
    entries: DialogueEntry[],
    maxChars: number = 800
): DialogueEntry[][] => {
    const batches: DialogueEntry[][] = [];
    let currentBatch: DialogueEntry[] = [];
    let currentCharCount = 0;

    for (const entry of entries) {
        const entryCharCount = entry.text.length;

        // If adding this entry would exceed the limit AND we have entries in current batch
        if (currentCharCount + entryCharCount > maxChars && currentBatch.length > 0) {
            // Save current batch and start a new one
            batches.push(currentBatch);
            currentBatch = [entry];
            currentCharCount = entryCharCount;
        } else {
            // Add to current batch
            currentBatch.push(entry);
            currentCharCount += entryCharCount;
        }
    }

    // Don't forget the last batch
    if (currentBatch.length > 0) {
        batches.push(currentBatch);
    }

    return batches;
};

// Function to concatenate audio blobs
const concatenateAudioBlobs = async (blobs: Blob[]): Promise<Blob> => {
    // PCM parameters for 48000 Hz
    const sampleRate = 48000;
    const numberOfChannels = 1; // ElevenLabs returns mono PCM
    const bytesPerSample = 2; // 16-bit audio

    // Convert all blobs to ArrayBuffers (raw PCM data - NO HEADERS)
    const pcmBuffers = await Promise.all(
        blobs.map(blob => blob.arrayBuffer())
    );

    // Calculate total size in bytes
    const totalBytes = pcmBuffers.reduce((sum, buffer) => sum + buffer.byteLength, 0);

    // Create a single buffer for all PCM data
    const combinedPCM = new Uint8Array(totalBytes);

    // Copy all PCM data into the combined buffer
    let offset = 0;
    for (const buffer of pcmBuffers) {
        combinedPCM.set(new Uint8Array(buffer), offset);
        offset += buffer.byteLength;
    }

    // Create WAV header for the combined PCM data
    const createWavHeader = (dataLength: number): ArrayBuffer => {
        const header = new ArrayBuffer(44);
        const view = new DataView(header);

        view.setUint32(0, 0x52494646, false); // "RIFF"
        view.setUint32(4, dataLength + 36, true);
        view.setUint32(8, 0x57415645, false); // "WAVE"
        view.setUint32(12, 0x666d7420, false); // "fmt "
        view.setUint32(16, 16, true);
        view.setUint16(20, 1, true);
        view.setUint16(22, numberOfChannels, true);
        view.setUint32(24, sampleRate, true);
        view.setUint32(28, sampleRate * numberOfChannels * bytesPerSample, true);
        view.setUint16(32, numberOfChannels * bytesPerSample, true);
        view.setUint16(34, 16, true);
        view.setUint32(36, 0x64617461, false); // "data"
        view.setUint32(40, dataLength, true);

        return header;
    };

    const wavHeader = createWavHeader(totalBytes);

    // Return with header for forced alignment API
    return new Blob([wavHeader, combinedPCM], { type: 'audio/wav' });
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
    const scriptCacheKey = `script - cache:${userID}:${scriptID} `;

    // Reset error states
    setStorageError(false);
    setTTSLoadError(false);
    setTTSFailedLines([]);

    try {
        // Get all lines that need TTS
        const linesNeedingHydration = script.filter(
            (element: ScriptElement) =>
                element.type === 'line' &&
                (!element.ttsUrl || element.ttsUrl.length === 0)
        );

        // Quick regeneration of all lines for testing
        // const linesNeedingHydration = script.filter(
        //     (element: ScriptElement) =>
        //         element.type === 'line'
        // );

        if (linesNeedingHydration.length === 0) {
            console.log('✅ All scene-partner lines already have audio');

            // Still update TTS status for UI
            script.forEach(element => {
                if (element.type === 'line') {
                    updateTTSHydrationStatus?.(element.index, 'ready');
                }
            });

            setLoadStage('✅ Script ready!');
            return false;
        }

        const totalOperations = linesNeedingHydration.length;
        let completedOperations = 0;

        // Update status to pending for all lines
        linesNeedingHydration.forEach(line => {
            updateTTSHydrationStatus?.(line.index, 'pending');
        });

        // Step 1: Generate dialogue audio for all scene-partner lines
        setLoadStage('🎤 Generating dialogue audio...');

        // Check if any lines are missing voiceId
        const linesWithoutVoice = linesNeedingHydration.filter(line => !line.voiceId);
        if (linesWithoutVoice.length > 0 && showToast) {
            showToast({
                header: "Missing voice selection",
                line1: "Using default voice",
                type: "warning"
            });
        }

        const dialogueEntries: DialogueEntry[] = linesNeedingHydration.map(line => ({
            text: sanitizeForTTS(line.text),
            voiceId: line.voiceId || VOICE_MAPPING.default,
            lineIndex: line.index
        }));

        // Log to verify pauses were added
        console.log('📝 Dialogue entries with pauses:', dialogueEntries);

        // Split into batches (800 characters per batch)
        const batches = splitDialogueIntoBatches(dialogueEntries, 800);
        console.log(`📦 Split into ${batches.length} batches: `);
        batches.forEach((batch, i) => {
            const charCount = batch.reduce((sum, e) => sum + e.text.length, 0);
            console.log(`  Batch ${i + 1}: ${batch.length} entries, ${charCount} characters`);
            console.log(`    Lines ${batch[0].lineIndex} to ${batch[batch.length - 1].lineIndex} `);
        });

        // Generate audio for each batch
        setLoadStage(`🎤 Generating dialogue audio(${batches.length} batches)...`);
        const audioBlobs: Blob[] = [];

        for (let i = 0; i < batches.length; i++) {
            const batch = batches[i];
            console.log(`📤 Generating batch ${i + 1}/${batches.length}...`);

            const response = await fetch('/api/tts/dialogue', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    dialogue: batch,
                    modelId: 'eleven_v3',
                    outputFormat: 'pcm_48000',
                    applyTextNormalization: 'auto'
                }),
            });

            if (!response.ok) {
                const errorMessage = await response.text().catch(() => 'Unknown error');
                console.error(`TTS API failed for batch ${i + 1}: ${response.status}: ${errorMessage}`);

                showToast({
                    header: `Audio generation failed (batch ${i + 1})`,
                    line1: response.status === 429
                        ? "Rate limit exceeded. Please try again later"
                        : "Unable to generate scene partner audio",
                    type: "danger"
                });

                throw new Error(`Failed to generate dialogue audio for batch ${i + 1}`);
            }

            const batchBlob = await response.blob();
            console.log(`Batch ${i + 1} MIME type: ${batchBlob.type}`);

            const firstBytes = new Uint8Array(await batchBlob.slice(0, 20).arrayBuffer());
            console.log(`First bytes:`, firstBytes);

            audioBlobs.push(batchBlob);
            console.log(`✅ Batch ${i + 1} generated (${(batchBlob.size / 1024).toFixed(2)} KB)`);

            // Optional: Add a small delay between batches to avoid rate limiting
            if (i < batches.length - 1) {
                await new Promise(resolve => setTimeout(resolve, 100));
            }
        }

        // Concatenate all audio blobs
        console.log('🔗 Concatenating audio batches...');
        const audioBlob = await concatenateAudioBlobs(audioBlobs);
        console.log(`✅ Combined audio generated (${(audioBlob.size / 1024 / 1024).toFixed(2)} MB)`);

        // Auto-play the combined audio
        // const playAudio = async (blob: Blob) => {
        //     const audioUrl = URL.createObjectURL(blob);
        //     const audio = new Audio(audioUrl);

        //     audio.addEventListener('ended', () => {
        //         URL.revokeObjectURL(audioUrl); // Clean up
        //         console.log('✅ Audio playback completed');
        //     });

        //     try {
        //         await audio.play();
        //         console.log('▶️ Playing combined audio...');
        //     } catch (err) {
        //         console.log('❌ Autoplay blocked. Audio element stored as window.debugAudio');
        //         (window as any).debugAudio = audio; // Store for manual play
        //     }
        // };

        // await playAudio(audioBlob);

        // Step 2: Get forced alignment
        setLoadStage('🎯 Aligning audio with text...');

        const fullTranscript = linesNeedingHydration
            .map(line => sanitizeForTTS(line.text))
            .join(' ');
        const alignmentData = await getForcedAlignment(audioBlob, fullTranscript);
        console.log('✅ Forced alignment complete');

        // Step 3: Map timestamps to lines
        const sanitizedLines = linesNeedingHydration.map(line => ({
            ...line,
            text: sanitizeForTTS(line.text)
        }));
        const timingMap = mapAlignmentToLines(alignmentData, sanitizedLines);

        // Check if all lines got timestamps
        const failedLines: number[] = [];
        linesNeedingHydration.forEach(line => {
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