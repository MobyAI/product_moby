import { useHumeTTS } from '@/lib/api/tts';
import { uploadTTSAudioBlob, fetchTTSAudioUrl } from '@/lib/api/dbFunctions/audio/tts';
import type { ScriptElement } from '@/types/script';

// Add TTS Audio
export async function addTTS(
    element: ScriptElement,
    script: ScriptElement[],
    userID: string,
    scriptID: string
): Promise<ScriptElement> {
    if (element.type !== 'line') return element;

    const voiceId =
        element.gender === 'male'
            ? 'c5be03fa-09cc-4fc3-8852-7f5a32b5606c'
            : element.gender === 'female'
                ? '5bbc32c1-a1f6-44e8-bedb-9870f23619e2'
                : '5bbc32c1-a1f6-44e8-bedb-9870f23619e2';

    try {
        let url: string | undefined;

        try {
            url = await fetchTTSAudioUrl({ userID, scriptID, index: element.index });

            if (url) {
                console.log(`✅ TTS already exists for line ${element.index}`);
                return { ...element, ttsUrl: url };
            }
        } catch {
            console.log(`🔍 No existing TTS for line ${element.index}, generating...`);
        }

        const contextUtterance = script
            .slice(Math.max(0, element.index - 2), element.index)
            .filter((l) => l.type === 'line' && typeof l.text === 'string' && l.text.trim().length > 0)
            .map((l) => ({
                text: l.text,
                description: (l as any).actingInstructions || '',
            }));

        const blob = await useHumeTTS({
            text: element.text,
            voiceId,
            voiceDescription: element.actingInstructions || '',
            contextUtterance: contextUtterance.length > 0 ? contextUtterance : undefined,
        });

        await uploadTTSAudioBlob({ userID, scriptID, index: element.index, blob });

        url = await fetchTTSAudioUrl({ userID, scriptID, index: element.index });

        return { ...element, ttsUrl: url };
    } catch (err) {
        console.warn(`❌ Failed to generate or upload TTS for line ${element.index}`, err);
        return element;
    }
}

// Regenerate TTS
export async function addTTSRegenerate(
    element: ScriptElement,
    script: ScriptElement[],
    userID: string,
    scriptID: string
): Promise<ScriptElement> {
    if (element.type !== 'line') return element;

    const voiceId =
        element.gender === 'male'
            ? 'c5be03fa-09cc-4fc3-8852-7f5a32b5606c'
            : element.gender === 'female'
                ? '5bbc32c1-a1f6-44e8-bedb-9870f23619e2'
                : '5bbc32c1-a1f6-44e8-bedb-9870f23619e2';

    try {
        const contextUtterance = script
            .slice(Math.max(0, element.index - 2), element.index)
            .filter((l) => l.type === 'line' && typeof l.text === 'string' && l.text.trim().length > 0)
            .map((l) => ({
                text: l.text,
                description: (l as any).actingInstructions || '',
            }));

        const blob = await useHumeTTS({
            text: element.text,
            voiceId,
            voiceDescription: element.actingInstructions || '',
            contextUtterance: contextUtterance.length > 0 ? contextUtterance : undefined,
        });

        await uploadTTSAudioBlob({ userID, scriptID, index: element.index, blob });

        const url = await fetchTTSAudioUrl({ userID, scriptID, index: element.index });

        return { ...element, ttsUrl: url };
    } catch (err) {
        console.warn(`❌ Failed to regenerate and upload TTS for line ${element.index}`, err);
        return element;
    }
}