import type { TTSRequestV3 } from '@/types/elevenlabs';

export async function fetchElevenTTS({
    text,
    voiceId,
    voiceSettings,
    languageCode,
    seed,
    applyTextNormalization = 'auto',
    outputFormat = 'mp3_44100_128',
}: TTSRequestV3): Promise<Blob> {
    const res = await fetch('/api/tts/elevenlabs', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            text: text,
            voiceId,
            voiceSettings,
            languageCode,
            seed,
            applyTextNormalization,
            outputFormat,
        }),
    });

    if (!res.ok) {
        let errorMessage = 'TTS API request failed';

        try {
            const contentType = res.headers.get('content-type');
            if (contentType?.includes('application/json')) {
                const error = await res.json();
                errorMessage = error?.error || errorMessage;
            } else {
                console.warn('Unexpected content-type from TTS API:', contentType);
                const fallbackText = await res.text();
                console.warn('Raw response:', fallbackText);
            }
        } catch (err) {
            console.error('Failed to parse error response:', err);
        }

        throw new Error(errorMessage);
    }

    return await res.blob();
}

// export async function fetchElevenTTS({
//     text,
//     voiceId,
//     modelId,
//     voiceSettings,
// }: {
//     text: string;
//     voiceId: string;
//     modelId?: string;
//     voiceSettings?: {
//         stability?: number;
//         similarityBoost?: number;
//     };
// }): Promise<Blob> {
//     const res = await fetch('/api/tts/elevenlabs', {
//         method: 'POST',
//         headers: {
//             'Content-Type': 'application/json',
//         },
//         body: JSON.stringify({ text, voiceId, modelId, voiceSettings }),
//     });

//     if (!res.ok) {
//         let errorMessage = 'TTS API request failed';

//         try {
//             const contentType = res.headers.get('content-type');
//             if (contentType?.includes('application/json')) {
//                 const error = await res.json();
//                 errorMessage = error?.error || errorMessage;
//             } else {
//                 console.warn('Unexpected content-type from TTS API:', contentType);
//                 const fallbackText = await res.text();
//                 console.warn('Raw response:', fallbackText);
//             }
//         } catch (err) {
//             console.error('Failed to parse error response:', err);
//         }

//         throw new Error(errorMessage);
//     }

//     return await res.blob();
// }