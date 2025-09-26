import {
    // fetchHumeTTS,
    fetchElevenTTS
} from '@/lib/api/tts';
// import { uploadTTSAudioBlob, fetchTTSAudioUrl } from '@/lib/api/dbFunctions/audio/tts';
import { getAudioUrl, saveAudioBlob } from '@/lib/firebase/client/tts';
import type { ScriptElement } from '@/types/script';

// ElevenLabs TTS
export async function addTTS(
    element: ScriptElement,
    userID: string,
    scriptID: string,
    getScriptLine: (index: number) => ScriptElement | undefined,
): Promise<ScriptElement> {
    if (element.type !== 'line') return element;

    // Check for updated line
    const latestLine = getScriptLine(element.index);

    if (latestLine?.text !== element.text) {
        console.log(`⏩ Skipping outdated TTS for line ${element.index}`);
        console.log('latest vs expected line: ', latestLine?.text, element.text);
        return element;
    }

    const defaultVoiceId =
        element.gender === 'male'
            ? '1SM7GgM6IMuvQlz2BwM3' // Ethan
            : element.gender === 'female'
                ? 'kdmDKE6EkgrWrrykO9Qt' // Alexandra
                : 'kdmDKE6EkgrWrrykO9Qt';

    try {
        let url: string | undefined;

        try {
            url = await getAudioUrl(userID, scriptID, element.index);

            if (url) {
                console.log(`✅ TTS already exists for line ${element.index}`);
                return { ...element, ttsUrl: url };
            }
        } catch {
            console.log(`🔍 No existing TTS for line ${element.index}, generating...`);
        }

        const sanitizeForTTS = (text: string): string => {
            return text
                // Strip the "tag:" prefix from bracketed text and trim spaces inside brackets
                .replace(/\[\s*tag:\s*([^\]]+?)\s*\]/gi, (match, content) => `[${content.trim()}]`)

                // Trim spaces inside existing brackets (without tag: prefix)
                .replace(/\[\s*([^\]]+?)\s*\]/g, (match, content) => `[${content.trim()}]`)

                // Replace parentheses with brackets
                .replace(/\(\s*([^)]+?)\s*\)/g, (match, content) => `[${content.trim()}]`)

                // Replace one or more underscores with pause
                .replace(/_+/g, ' [pause] ')

                // Replace two or more periods with [pause]
                // .replace(/\.{2,}/g, ' [pause] ')

                // Collapse multiple spaces caused by replacements
                .replace(/\s+/g, ' ')
                .trim();
        };

        console.log('sanitized for tts: ', sanitizeForTTS(element.text));

        const processedText = sanitizeForTTS(element.text);

        // Add tone
        // const finalText = element.tone
        //     ? `[${element.tone}] ${processedText}`
        //     : processedText;

        // console.log('finalized for tts: ', finalText);

        const blob = await fetchElevenTTS({
            text: processedText,
            voiceId: element.voiceId ?? defaultVoiceId,
            voiceSettings: {
                stability: 0,
                similarityBoost: 0,
                style: 0,
                useSpeakerBoost: false
            },
            // seed: element.seed,
            applyTextNormalization: 'auto',
            outputFormat: 'mp3_44100_128'
        });

        // Check once more before upload
        const latestLineBeforeUpload = getScriptLine(element.index);

        if (sanitizeForTTS(latestLineBeforeUpload?.text || '') !== sanitizeForTTS(element.text)) {
            console.warn(`⚠️ Line ${element.index} changed mid-TTS — discarding blob`);
            return element;
        }

        await saveAudioBlob(userID, scriptID, element.index, blob);

        url = await getAudioUrl(userID, scriptID, element.index);

        return { ...element, ttsUrl: url };
    } catch (err) {
        console.warn(`❌ Failed to generate or upload TTS for line ${element.index}`, err);
        return element;
    }
}

// Regenerate TTS
export async function addTTSRegenerate(
    element: ScriptElement,
    userID: string,
    scriptID: string,
): Promise<ScriptElement> {
    if (element.type !== 'line') return element;

    const defaultVoiceId =
        element.gender === 'male'
            ? '1SM7GgM6IMuvQlz2BwM3' // Ethan
            : element.gender === 'female'
                ? 'kdmDKE6EkgrWrrykO9Qt' // Alexandra
                : 'kdmDKE6EkgrWrrykO9Qt';

    try {
        const sanitizeForTTS = (text: string): string => {
            return text
                // Strip the "tag:" prefix from bracketed text and trim spaces inside brackets
                .replace(/\[\s*tag:\s*([^\]]+?)\s*\]/gi, (match, content) => `[${content.trim()}]`)

                // Trim spaces inside existing brackets (without tag: prefix)
                .replace(/\[\s*([^\]]+?)\s*\]/g, (match, content) => `[${content.trim()}]`)

                // Replace parentheses with brackets
                .replace(/\(\s*([^)]+?)\s*\)/g, (match, content) => `[${content.trim()}]`)

                // Replace one or more underscores with pause
                .replace(/_+/g, ' [pause] ')

                // Replace two or more periods with [pause]
                // .replace(/\.{2,}/g, ' [pause] ')

                // Collapse multiple spaces caused by replacements
                .replace(/\s+/g, ' ')
                .trim();
        };

        console.log('sanitized for tts: ', sanitizeForTTS(element.text));

        const processedText = sanitizeForTTS(element.text);

        // Add tone
        // const finalText = element.tone
        //     ? `[${element.tone}] ${processedText}`
        //     : processedText;

        // console.log('finalized for tts: ', finalText);

        const blob = await fetchElevenTTS({
            text: processedText,
            voiceId: element.voiceId ?? defaultVoiceId,
            voiceSettings: {
                stability: 0,
                similarityBoost: 0,
                style: 0,
                useSpeakerBoost: false
            },
            // seed: element.seed,
            applyTextNormalization: 'auto',
            outputFormat: 'mp3_44100_128'
        });

        await saveAudioBlob(userID, scriptID, element.index, blob);

        const url = await getAudioUrl(userID, scriptID, element.index);

        return { ...element, ttsUrl: url };
    } catch (err) {
        console.warn(`❌ Failed to regenerate and upload TTS for line ${element.index}`, err);
        return element;
    }
}

// OPTIONAL: Include acting instructions in TTS audio gen
// const blob = await fetchHumeTTS({
//     text: sanitizeForTTS(element.text),
//     voiceId,
//     voiceDescription: element.actingInstructions || '',
//     contextUtterance: contextUtterance.length > 0 ? contextUtterance : undefined,
// });

// Add Hume TTS Audio
// export async function addTTS(
//     element: ScriptElement,
//     script: ScriptElement[],
//     userID: string,
//     scriptID: string,
//     getScriptLine: (index: number) => ScriptElement | undefined,
// ): Promise<ScriptElement> {
//     if (element.type !== 'line') return element;

//     console.log(`➡️ addTTS called for line ${element.index}`);

//     // Check for updated line
//     const latestLine = getScriptLine(element.index);

//     if (latestLine?.text !== element.text) {
//         console.log(`⏩ Skipping outdated TTS for line ${element.index}`);
//         console.log('latest vs expected line: ', latestLine?.text, element.text);
//         return element;
//     }

//     const defaultVoiceId =
//         element.gender === 'male'
//             ? 'c5be03fa-09cc-4fc3-8852-7f5a32b5606c'
//             : element.gender === 'female'
//                 ? '5bbc32c1-a1f6-44e8-bedb-9870f23619e2'
//                 : '5bbc32c1-a1f6-44e8-bedb-9870f23619e2';

//     try {
//         let url: string | undefined;

//         try {
//             url = await getAudioUrl(userID, scriptID, element.index);

//             if (url) {
//                 console.log(`✅ TTS already exists for line ${element.index}`);
//                 return { ...element, ttsUrl: url };
//             }
//         } catch {
//             console.log(`🔍 No existing TTS for line ${element.index}, generating...`);
//         }

//         const contextUtterance = script
//             .slice(0, element.index)
//             .filter((l) => l.type === 'line' && typeof l.text === 'string' && l.text.trim().length > 0)
//             .slice(-4)
//             .map((l) => ({
//                 text: l.text,
//                 description: l.actingInstructions ?? '',
//             }));

//         const sanitizeForTTS = (text: string): string => {
//             return text
//                 // Replace one or more underscores with pause
//                 .replace(/_+/g, ' [pause] ')
//                 // Remove parenthetical text
//                 .replace(/\([^)]*\)/g, '')
//                 // Collapse multiple spaces caused by removals
//                 .replace(/\s+/g, ' ')
//                 .trim();
//         };

//         const blob = await fetchHumeTTS({
//             text: sanitizeForTTS(element.text),
//             voiceId: element.voiceId ?? defaultVoiceId,
//             voiceDescription: '',
//             contextUtterance: contextUtterance.length > 0 ? contextUtterance : undefined,
//         });

//         // Check once more before upload
//         const latestLineBeforeUpload = getScriptLine(element.index);

//         if (sanitizeForTTS(latestLineBeforeUpload?.text || '') !== sanitizeForTTS(element.text)) {
//             console.warn(`⚠️ Line ${element.index} changed mid-TTS — discarding blob`);
//             return element;
//         }

//         await saveAudioBlob(userID, scriptID, element.index, blob);

//         url = await getAudioUrl(userID, scriptID, element.index);

//         return { ...element, ttsUrl: url };
//     } catch (err) {
//         console.warn(`❌ Failed to generate or upload TTS for line ${element.index}`, err);
//         return element;
//     }
// }

// Regenerate Hume TTS
// export async function addTTSRegenerate(
//     element: ScriptElement,
//     script: ScriptElement[],
//     userID: string,
//     scriptID: string,
// ): Promise<ScriptElement> {
//     if (element.type !== 'line') return element;

//     const defaultVoiceId =
//         element.gender === 'male'
//             ? 'c5be03fa-09cc-4fc3-8852-7f5a32b5606c'
//             : element.gender === 'female'
//                 ? '5bbc32c1-a1f6-44e8-bedb-9870f23619e2'
//                 : '5bbc32c1-a1f6-44e8-bedb-9870f23619e2';

//     try {
//         const contextUtterance = script
//             .slice(0, element.index)
//             .filter((l) => l.type === 'line' && typeof l.text === 'string' && l.text.trim().length > 0)
//             .slice(-4)
//             .map((l) => ({
//                 text: l.text,
//                 description: l.actingInstructions ?? '',
//             }));

//         const sanitizeForTTS = (text: string): string => {
//             return text
//                 // Replace one or more underscores with pause
//                 .replace(/_+/g, ' [pause] ')
//                 // Remove parenthetical text
//                 .replace(/\([^)]*\)/g, '')
//                 // Collapse multiple spaces caused by removals
//                 .replace(/\s+/g, ' ')
//                 .trim();
//         };

//         const blob = await fetchHumeTTS({
//             text: sanitizeForTTS(element.text),
//             voiceId: element.voiceId ?? defaultVoiceId,
//             voiceDescription: '',
//             contextUtterance: contextUtterance.length > 0 ? contextUtterance : undefined,
//         });

//         await saveAudioBlob(userID, scriptID, element.index, blob);

//         const url = await getAudioUrl(userID, scriptID, element.index);

//         return { ...element, ttsUrl: url };
//     } catch (err) {
//         console.warn(`❌ Failed to regenerate and upload TTS for line ${element.index}`, err);
//         return element;
//     }
// }