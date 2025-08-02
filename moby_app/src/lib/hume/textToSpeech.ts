import { HumeClient } from "hume";

const client = new HumeClient({ apiKey: process.env.HUME_API_KEY! });

export async function fetchTTSBlob({
    text,
    voiceId,
    voiceDescription,
    contextUtterance,
}: {
    text: string;
    voiceId: string;
    voiceDescription?: string;
    contextUtterance?: { text: string; description: string }[];
}): Promise<Blob> {
    const body = {
        utterances: [
            {
                voice: {
                    id: voiceId,
                    provider: "HUME_AI" as const
                },
                text,
                ...(voiceDescription && { description: voiceDescription }),
            },
        ],
        ...(contextUtterance && {
            context: {
                utterances: contextUtterance,
            },
        }),
        format: {
            type: 'mp3' as const,
        },
        numGenerations: 1,
    };

    const response = await client.tts.synthesizeJson({ body });

    const audio = response.generations?.[0]?.audio;

    if (!audio) {
        throw new Error('No audio returned from Hume.');
    }

    const binary = atob(audio);
    const audioBytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
        audioBytes[i] = binary.charCodeAt(i);
    }
    // const audioBytes = Uint8Array.from(audio);
    return new Blob([audioBytes], { type: 'audio/mpeg' });
}