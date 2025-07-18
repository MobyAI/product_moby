import textToSpeech, { protos } from '@google-cloud/text-to-speech';
import dotenv from 'dotenv';
dotenv.config();

const client = new textToSpeech.TextToSpeechClient({
    keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS,
});

export async function synthesizeSpeech(
    text: string,
    voiceName = 'en-US-Wavenet-D',
    gender: protos.google.cloud.texttospeech.v1.SsmlVoiceGender = protos.google.cloud.texttospeech.v1.SsmlVoiceGender.MALE
): Promise<Buffer> {
    const request: protos.google.cloud.texttospeech.v1.ISynthesizeSpeechRequest = {
        input: { text },
        voice: {
            languageCode: 'en-US',
            name: voiceName,
            ssmlGender: gender,
        },
        audioConfig: {
            audioEncoding: 'MP3',
            speakingRate: 1.0,
        },
    };

    const [response] = await client.synthesizeSpeech(request);

    return response.audioContent as Buffer;
}