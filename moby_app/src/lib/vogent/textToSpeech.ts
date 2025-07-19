import fetch from 'node-fetch';

export async function synthesizeVogentSpeech({
    text,
    voiceId,
    voiceOptionValues,
}: {
    text: string;
    voiceId: string;
    voiceOptionValues?: { optionId: string; value: string }[];
}): Promise<Buffer> {
    const apiKey = process.env.VOGENT_API_KEY;
    if (!apiKey) throw new Error('Missing VOGENT_API_KEY');

    console.log('Calling Vogent...', text, voiceId, voiceOptionValues);

    const res = await fetch('https://api.vogent.ai/api/tts', {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            text,
            voiceId,
            voiceOptionValues,
        }),
    });

    console.log('Status:', res.status);

    if (!res.ok) {
        const errText = await res.text();
        console.error('Vogent API error:', errText);
        throw new Error('Vogent TTS failed');
    }

    const arrayBuffer = await res.arrayBuffer();
    return Buffer.from(arrayBuffer);
}