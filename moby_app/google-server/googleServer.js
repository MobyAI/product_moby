const http = require('http');
const WebSocket = require('ws');
const { SpeechClient } = require('@google-cloud/speech');
require('dotenv').config();

let speechClient;

// Initialize Google Speech client
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
    speechClient = new SpeechClient();
    console.warn("⚠️ Using default Google credential loading — may fail on Fly");
}

// Create HTTP server
const server = http.createServer();

// Handle regular HTTP requests
server.on('request', (req, res) => {
    // Skip WebSocket upgrade requests
    if (req.headers.upgrade === 'websocket') {
        return;
    }

    if (req.url === '/health') {
        res.writeHead(200, { 'Content-Type': 'text/plain' });
        res.end('OK');
    } else if (req.url === '/') {
        res.writeHead(200, { 'Content-Type': 'text/plain' });
        res.end('Google STT WebSocket Server');
    } else {
        res.writeHead(404);
        res.end();
    }
});

// Configure WebSocket server with optimizations
const wss = new WebSocket.Server({ server });

// WebSocket connection handler
wss.on('connection', async (socket, req) => {
    const clientIp = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    console.log(`🎧 Client connected from ${clientIp}`);

    let recognizeStream = null;

    try {
        recognizeStream = speechClient
            .streamingRecognize({
                config: {
                    encoding: 'LINEAR16',
                    sampleRateHertz: 16000,
                    languageCode: 'en-US',

                    // Optimized settings for real-time transcription
                    model: 'latest_long',
                    enableWordTimeOffsets: true,
                    enableAutomaticPunctuation: true,
                    enableWordConfidence: true,

                    // Performance optimizations
                    useEnhanced: true,
                    profanityFilter: false,
                    singleUtterance: false,

                    // Additional optimizations for streaming
                    maxAlternatives: 1,  // Reduce processing overhead
                },
                interimResults: true,
                singleUtterance: false,
            })
            .on('data', (data) => {
                const alt = data.results[0]?.alternatives?.[0];
                const isFinal = data.results[0]?.isFinal;

                if (alt && socket.readyState === WebSocket.OPEN) {
                    socket.send(JSON.stringify({
                        channel: { alternatives: [alt] },
                        is_final: isFinal
                    }));
                }
            })
            .on('error', (err) => {
                console.error('❌ Google STT error:', err.message);
                if (socket.readyState === WebSocket.OPEN) {
                    socket.send(JSON.stringify({
                        error: err.message,
                        code: err.code || 'UNKNOWN_ERROR'
                    }));
                }

                // Clean up on error
                if (recognizeStream) {
                    recognizeStream.destroy();
                    recognizeStream = null;
                }
            })
            .on('end', () => {
                console.log('🔚 Stream ended normally');
            });
    } catch (err) {
        console.error('❌ Failed to create recognize stream:', err);
        socket.send(JSON.stringify({
            error: 'Failed to initialize speech recognition',
            details: err.message
        }));
        socket.close();
        return;
    }

    // Handle incoming audio chunks
    socket.on('message', (audioChunk) => {
        if (recognizeStream && !recognizeStream.destroyed) {
            try {
                recognizeStream.write(audioChunk);
            } catch (err) {
                console.error('❌ Error writing to stream:', err);
            }
        }
    });

    // Handle client disconnect
    socket.on('close', (code, reason) => {
        console.log(`❎ Client disconnected: ${code} - ${reason}`);
        if (recognizeStream && !recognizeStream.destroyed) {
            recognizeStream.destroy();
        }
    });

    // Handle socket errors
    socket.on('error', (err) => {
        console.error('❌ WebSocket error:', err);
        if (recognizeStream && !recognizeStream.destroyed) {
            recognizeStream.destroy();
        }
    });

    // Implement ping/pong for connection health
    socket.isAlive = true;
    socket.on('pong', () => {
        socket.isAlive = true;
    });
});

// Periodic ping to keep connections alive and detect dead connections
const pingInterval = setInterval(() => {
    wss.clients.forEach((ws) => {
        if (ws.isAlive === false) {
            console.log('⚠️ Terminating dead connection');
            return ws.terminate();
        }
        ws.isAlive = false;
        ws.ping();
    });
}, 30000); // Ping every 30 seconds

// Cleanup on server close
wss.on('close', () => {
    clearInterval(pingInterval);
});

// Start server
const PORT = 3000;
const HOST = '0.0.0.0'; // Important for Fly.io

server.listen(PORT, HOST, () => {
    console.log(`🚀 WebSocket server listening on ws://${HOST}:${PORT}`);
    console.log(`📊 Active connections: ${wss.clients.size}`);
    console.log(`🌍 Region: ${process.env.FLY_REGION || 'local'}`);
});

// Graceful shutdown handling
process.on('SIGTERM', () => {
    console.log('📴 SIGTERM received, closing gracefully...');

    wss.clients.forEach((client) => {
        client.close(1000, 'Server shutting down');
    });

    server.close(() => {
        console.log('✅ Server closed');
        process.exit(0);
    });

    // Force close after 5 seconds
    setTimeout(() => {
        console.error('❌ Forced shutdown');
        process.exit(1);
    }, 5000);
});