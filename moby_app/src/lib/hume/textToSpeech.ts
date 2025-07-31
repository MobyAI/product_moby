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

export async function fetchTTSBatch({
    lines,
}: {
    lines: {
        text: string;
        description?: string;
        voiceId: string;
    }[];
}): Promise<string[]> {
    const body = {
        utterances: lines.map((line) => ({
            voice: {
                id: line.voiceId,
                provider: 'HUME_AI' as const,
            },
            text: line.text,
            description: line.description,
        })),
        options: {
            split_utterances: false
        },
        format: {
            type: 'mp3' as const,
        },
        numGenerations: 1,
    };

    console.log(
        '🧪 Sending to Hume TTS:',
        JSON.stringify(body.utterances.map(u => ({ text: u.text, description: u.description, voiceId: u.voice.id })), null, 2)
    );

    const response = await client.tts.synthesizeJson({ body });

    console.log(
        'Returned generations:',
        response.generations?.map((g, i) => ({
            index: i,
            text: (g as any).text,
            audioSample: g.audio?.slice(0, 10) + '...'
        }))
    );

    const audioList = response.generations?.map((g) => g.audio).filter(Boolean);

    console.log('audio length: ', audioList.length, JSON.stringify(audioList));
    console.log('lines length: ', lines.length);

    // if (!audioList || audioList.length !== lines.length) {
    //     throw new Error('Mismatch in number of audio generations returned from Hume.');
    // }

    return [];
    return audioList;
}