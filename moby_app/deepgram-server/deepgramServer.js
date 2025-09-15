const WebSocket = require('ws');
const fetch = require('node-fetch');
const http = require('http');
require('dotenv').config();

//
// Need to add better error handling
//

const server = http.createServer();
const wss = new WebSocket.Server({ server });

const DEEPGRAM_API_KEY = process.env.DEEPGRAM_API_KEY;

wss.on('connection', (clientSocket) => {
    console.log('🔌 Client connected');

    // Open Deepgram WS
    const dgSocket = new WebSocket(
        'wss://api.deepgram.com/v1/listen' +
        '?model=nova-3' +
        '&interim_results=true' +
        '&encoding=linear16' +
        '&sample_rate=16000' +
        '&endpointing=300' +
        '&utterance_end_ms=1000' +
        '&smart_format=true',
        {
            headers: {
                Authorization: `Token ${DEEPGRAM_API_KEY}`,
            },
        }
    );

    dgSocket.on('open', () => {
        console.log('🎤 Deepgram connection opened');
    });

    // Forward audio from browser to Deepgram
    clientSocket.on('message', (msg) => {
        // console.log('🎤 Receiving audio chunk from browser:', msg.length);
        const audio = Buffer.from(msg);
        if (dgSocket.readyState === WebSocket.OPEN) {
            dgSocket.send(audio);
        }
    });

    // Forward Deepgram transcripts to browser
    dgSocket.on('message', (data) => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const message = data.toString();
        // console.log('🧠 Deepgram -> Server:', JSON.stringify(message, null, 2));
        clientSocket.send(data);
    });

    clientSocket.on('close', () => {
        console.log('🔌 Client disconnected');
        dgSocket.close();
    });
});

// Handle server-level errors
wss.on('error', (error) => {
    console.error('❌ WSS error:', error);
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
    console.log(`🖥️ WebSocket Proxy listening on ws://0.0.0.0:${PORT}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM received');
    wss.clients.forEach((client) => {
        client.close();
    });
    server.close(() => {
        process.exit(0);
    });
});