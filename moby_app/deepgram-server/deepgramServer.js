const WebSocket = require('ws');
const fetch = require('node-fetch');
const http = require('http');
require('dotenv').config();

const server = http.createServer((req, res) => {
    if (req.url === '/health' || req.url === '/') {
        res.writeHead(200, { 'Content-Type': 'text/plain' });
        res.end('WebSocket server is running');
    } else {
        res.writeHead(404);
        res.end('Not found');
    }
});

const wss = new WebSocket.Server({ server });

const DEEPGRAM_API_KEY = process.env.DEEPGRAM_API_KEY;

wss.on('connection', (clientSocket) => {
    console.log('🔌 Client connected');

    let dgSocket = null;

    try {
        // Open Deepgram WS
        dgSocket = new WebSocket(
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
            try {
                const audio = Buffer.from(msg);
                if (dgSocket && dgSocket.readyState === WebSocket.OPEN) {
                    dgSocket.send(audio);
                }
            } catch (error) {
                console.error('❌ Error forwarding audio to Deepgram:', error);
            }
        });

        // Forward Deepgram transcripts to browser
        dgSocket.on('message', (data) => {
            try {
                if (clientSocket.readyState === WebSocket.OPEN) {
                    clientSocket.send(data);
                }
            } catch (error) {
                console.error('❌ Error sending transcript to client:', error);
            }
        });

        // Handle Deepgram errors
        dgSocket.on('error', (error) => {
            console.error('❌ Deepgram socket error:', error);
            if (clientSocket.readyState === WebSocket.OPEN) {
                clientSocket.close();
            }
        });

        // Handle Deepgram disconnection
        dgSocket.on('close', () => {
            console.log('🔌 Deepgram disconnected');
            if (clientSocket.readyState === WebSocket.OPEN) {
                clientSocket.close();
            }
        });

        // Handle client errors
        clientSocket.on('error', (error) => {
            console.error('❌ Client socket error:', error);
            if (dgSocket && dgSocket.readyState === WebSocket.OPEN) {
                dgSocket.close();
            }
        });

        // Handle client disconnection
        clientSocket.on('close', () => {
            console.log('🔌 Client disconnected');
            if (dgSocket && dgSocket.readyState === WebSocket.OPEN) {
                dgSocket.close();
            }
        });

    } catch (error) {
        console.error('❌ Error setting up WebSocket connection:', error);
        clientSocket.close();
    }
});

// Handle server-level errors
wss.on('error', (error) => {
    console.error('❌ WSS server error:', error);
});

// Global error handlers to prevent crashes
process.on('uncaughtException', (error) => {
    console.error('❌ Uncaught Exception:', error);
    // Log but don't exit - let the process continue
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
    // Log but don't exit
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
    console.log(`🖥️ WebSocket Proxy listening on ws://0.0.0.0:${PORT}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('📴 SIGTERM received, shutting down gracefully');

    // Close all client connections
    wss.clients.forEach((client) => {
        client.close();
    });

    // Close the server
    server.close(() => {
        console.log('💤 Server closed');
        process.exit(0);
    });

    // Force close after 10 seconds
    setTimeout(() => {
        console.error('❌ Forced shutdown after timeout');
        process.exit(1);
    }, 10000);
});