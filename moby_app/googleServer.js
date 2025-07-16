const WebSocket = require('ws');
const { SpeechClient } = require('@google-cloud/speech');
require('dotenv').config();

const speechClient = new SpeechClient();

const wss = new WebSocket.Server({ port: 3001 });
console.log('🎤 Google STT proxy WebSocket server running on ws://localhost:3001');

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
            if (alt) {
                socket.send(JSON.stringify({
                    channel: { alternatives: [alt] },
                    is_final: data.results[0].isFinal,
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