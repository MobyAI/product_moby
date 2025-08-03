const http = require('http');
const WebSocket = require('ws');
const { SpeechClient } = require('@google-cloud/speech');
require('dotenv').config();

let speechClient;

const base64Creds = process.env.GOOGLE_CREDENTIALS_BASE64;

if (base64Creds) {
    const jsonString = Buffer.from(base64Creds, 'base64').toString('utf-8');
    const creds = JSON.parse(jsonString);
    console.log("✅ Loaded credentials for:", creds.client_email);

    speechClient = new SpeechClient({
        credentials: {
            client_email: creds.client_email,
            private_key: creds.private_key,
        },
    });

    console.log("✅ Google credentials loaded from base64 secret");
} else {
    // This will fall back to GOOGLE_APPLICATION_CREDENTIALS env var if set,
    // or throw if no credentials found
    speechClient = new SpeechClient();
    console.warn("⚠️ Using default Google credential loading — may fail on Fly");
}

const server = http.createServer();
const wss = new WebSocket.Server({ server });

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
        recognizeStream.write(audioChunk);
    });

    socket.on('close', () => {
        console.log('❎ Client disconnected');
        recognizeStream.destroy();
    });
});

const PORT = 3000;
server.listen(PORT, '0.0.0.0', () => {
    console.log(`🖥️ WebSocket server listening on ws://0.0.0.0:${PORT}`);
});