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
        '?punctuate=true' +
        '&interim_results=true' +
        '&encoding=linear16' +
        '&sample_rate=44100' +
        '&endpointing=1000' +
        '&utterance_end_ms=1000' +
        '&model=general-enhanced',
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
    // clientSocket.on('message', (msg) => {
    //     console.log('🎤 Receiving audio chunk from browser:', msg.length);
    //     if (dgSocket.readyState === WebSocket.OPEN) {
    //         dgSocket.send(msg);
    //     }
    // });

    clientSocket.on('message', (msg) => {
        console.log('🎤 Receiving audio chunk from browser:', msg.length);
        const audio = Buffer.from(msg);
        if (dgSocket.readyState === WebSocket.OPEN) {
            dgSocket.send(audio);
        }
    });

    // Forward Deepgram transcripts to browser
    dgSocket.on('message', (data) => {
        const message = data.toString();
        console.log('🧠 Deepgram -> Server:', message.slice(0, 300));
        clientSocket.send(data);
    });

    clientSocket.on('close', () => {
        console.log('🔌 Client disconnected');
        dgSocket.close();
    });
});

server.listen(3001, () => {
    console.log('🖥️ WebSocket Proxy listening on ws://localhost:3001');
});