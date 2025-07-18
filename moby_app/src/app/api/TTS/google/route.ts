import { NextResponse } from 'next/server';
import { synthesizeSpeech } from '@/lib/google/textToSpeech';
import { protos } from '@google-cloud/text-to-speech';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const text: string = body.text;
        const voice: string = body.voice || 'en-US-Wavenet-D';
        const gender: string = (body.gender || 'MALE').toUpperCase();

        if (!text) {
            return NextResponse.json({ error: 'Missing text parameter' }, { status: 400 });
        }

        const genderEnum =
            {
                MALE: protos.google.cloud.texttospeech.v1.SsmlVoiceGender.MALE,
                FEMALE: protos.google.cloud.texttospeech.v1.SsmlVoiceGender.FEMALE,
                NEUTRAL: protos.google.cloud.texttospeech.v1.SsmlVoiceGender.NEUTRAL,
            }[gender] || protos.google.cloud.texttospeech.v1.SsmlVoiceGender.MALE;

        // ✅ Now synthesizeSpeech returns a Buffer directly
        const audioBuffer = await synthesizeSpeech(text, voice, genderEnum);

        // ✅ Respond directly with the Buffer
        return new Response(audioBuffer, {
            headers: {
                'Content-Type': 'audio/mpeg',
                'Content-Disposition': 'inline; filename="speech.mp3"',
            },
        });
    } catch (err) {
        console.error('TTS Error:', err);
        return NextResponse.json({ error: 'TTS synthesis failed' }, { status: 500 });
    }
}