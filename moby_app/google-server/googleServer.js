const WebSocket = require('ws');
const { SpeechClient } = require('@google-cloud/speech');
require('dotenv').config();

//
// Need to add better error handling
//

let speechClient;

if (process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON) {
    // Production (Fly.io) using JSON secret
    const creds = JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON);
    speechClient = new SpeechClient({
        credentials: {
            client_email: creds.client_email,
            private_key: creds.private_key,
        },
    });
} else {
    // Local (file path from GOOGLE_APPLICATION_CREDENTIALS)
    speechClient = new SpeechClient();
}

const PORT = 3000;
const wss = new WebSocket.Server({ port: PORT, host: '0.0.0.0' });
console.log('🎤 Google STT proxy WebSocket server running on ws://0.0.0.0:3002');

wss.on('connection', async (socket) => {
    console.log('🎧 Client connected to STT proxy');

    const recognizeStream = speechClient
        .streamingRecognize({
            config: {
                encoding: 'LINEAR16',
                sampleRateHertz: 44100,
                languageCode: 'en-US',
                model: 'default',
                enableWordTimeOffsets: true,
                enableAutomaticPunctuation: true,
            },
            interimResults: true,
        })
        .on('data', (data) => {
            const alt = data.results[0]?.alternatives?.[0];
            const isFinal = data.results[0]?.isFinal;

            // console.log(`🧠 Google STT returned: ${alt?.transcript || '[no transcript]'} (final: ${isFinal})`);

            if (alt) {
                socket.send(JSON.stringify({
                    channel: { alternatives: [alt] },
                    is_final: isFinal,
                }));
            }
        })
        .on('error', (err) => {
            console.error('❌ Google STT error:', err);
            socket.send(JSON.stringify({ error: err.message }));
        });

    socket.on('message', (audioChunk) => {
        // console.log(`📥 Received audio chunk: ${audioChunk.length || audioChunk.byteLength} bytes`);
        recognizeStream.write(audioChunk);
    });

    socket.on('close', () => {
        console.log('❎ Client disconnected');
        recognizeStream.destroy();
    });
});