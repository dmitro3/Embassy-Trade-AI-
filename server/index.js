const express = require('express');
const { spawn } = require('child_process');
const cors = require('cors');
const WebSocket = require('ws');
const http = require('http');
const winston = require('winston');
const path = require('path');
const portfinder = require('portfinder');

// Configure winston logging
const logger = winston.createLogger({
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
    ),
    transports: [
        new winston.transports.File({ filename: 'logs/server.log' }),
        new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
        new winston.transports.Console()
    ]
});

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

app.use(cors());
app.use(express.json());

let pythonProcess = null;
let connectedClients = new Set();
let lastPythonOutput = null;
let processStartTime = null;

// Store auto-accept preferences (in-memory for now, could be moved to a database)
const userPreferences = new Map();

// Function to start Python process if not running
function startPythonProcess() {
    if (pythonProcess) return;
    
    processStartTime = Date.now();
    pythonProcess = spawn('python', ['-m', 'trading.main']);
    logger.info('Started Python trading process');
    
    pythonProcess.stdout.on('data', (data) => {
        try {
            const messages = data.toString().trim().split('\n');
            messages.forEach(msg => {
                if (!msg) return;
                
                const message = JSON.parse(msg);
                
                // Handle trade prompts based on auto-accept preferences
                if (message.type === 'trade_prompt') {
                    // Broadcast to all connected clients
                    broadcastToClients(message);
                } else if (message.type === 'trade_result' || message.type === 'trade_skipped') {
                    // Broadcast trade results
                    broadcastToClients(message);
                } else {
                    // Handle signal data with account info
                    const signals = message;
                    lastPythonOutput = {
                        timestamp: Date.now(),
                        data: signals
                    };
                    
                    // Broadcast signal data to all connected clients
                    broadcastToClients(signals);
                }
            });
        } catch (e) {
            logger.error('Error parsing Python output', { 
                error: e.message,
                data: data.toString()
            });
            
            // Notify clients of the error
            broadcastToClients({
                type: 'error',
                error: 'Trading signal processing error',
                timestamp: Date.now()
            });
        }
    });

    pythonProcess.stderr.on('data', (data) => {
        logger.error('Python Error', { error: data.toString() });
    });

    pythonProcess.on('close', (code) => {
        logger.warn(`Python process exited with code ${code}`);
        pythonProcess = null;
        processStartTime = null;
        setTimeout(startPythonProcess, 5000);
    });

    // Handle process errors
    pythonProcess.on('error', (err) => {
        logger.error('Python process error', { error: err.message });
        pythonProcess = null;
        processStartTime = null;
        setTimeout(startPythonProcess, 5000);
    });
}

// Helper function to broadcast messages to all connected clients
function broadcastToClients(message) {
    const messageStr = JSON.stringify(message);
    let failedClients = new Set();
    
    connectedClients.forEach(client => {
        try {
            if (client.readyState === WebSocket.OPEN) {
                client.send(messageStr);
            } else if (client.readyState === WebSocket.CLOSED || client.readyState === WebSocket.CLOSING) {
                failedClients.add(client);
            }
        } catch (err) {
            logger.error('Error sending to client', { error: err.message });
            failedClients.add(client);
        }
    });

    // Clean up failed clients
    failedClients.forEach(client => {
        connectedClients.delete(client);
        try {
            client.terminate();
        } catch (err) {
            logger.error('Error terminating client', { error: err.message });
        }
    });
}

// Validate WebSocket connection with ping/pong
function setupWebSocketHeartbeat(ws) {
    ws.isAlive = true;
    ws.on('pong', () => { ws.isAlive = true; });
    
    // Send initial ping
    ws.ping();
    
    // Setup periodic ping
    const pingInterval = setInterval(() => {
        if (ws.isAlive === false) {
            logger.info('WebSocket client failed heartbeat, terminating');
            connectedClients.delete(ws);
            clearInterval(pingInterval);
            return ws.terminate();
        }
        ws.isAlive = false;
        ws.ping();
    }, 30000);
    
    // Clear interval on close
    ws.on('close', () => {
        clearInterval(pingInterval);
    });
}

wss.on('connection', (ws) => {
    logger.info('Client connected to trading signals WebSocket');
    connectedClients.add(ws);
    setupWebSocketHeartbeat(ws);
    
    startPythonProcess();

    // Send last known signals immediately if available
    if (lastPythonOutput) {
        try {
            ws.send(JSON.stringify(lastPythonOutput.data));
        } catch (err) {
            logger.error('Error sending cached data to new client', { error: err.message });
        }
    }

    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);
            
            if (data.type === 'set_auto_accept') {
                userPreferences.set(data.userId, data.autoAccept);
            } else if (data.type === 'trade_response') {
                // Forward trade response to Python process
                pythonProcess.stdin.write(JSON.stringify(data) + '\n');
            }
        } catch (err) {
            logger.error('Error processing WebSocket message', { error: err.message });
        }
    });

    ws.on('close', () => {
        logger.info('Client disconnected from trading signals WebSocket');
        connectedClients.delete(ws);
        
        if (connectedClients.size === 0 && pythonProcess) {
            logger.info('No active clients, stopping Python process');
            pythonProcess.kill();
            pythonProcess = null;
            processStartTime = null;
        }
    });

    ws.on('error', (error) => {
        logger.error('WebSocket client error', { error: error.message });
        connectedClients.delete(ws);
        ws.terminate();
    });
});

app.get('/api/trading/signals', async (req, res) => {
    try {
        // Return cached data if available and recent (less than 1 minute old)
        if (lastPythonOutput && (Date.now() - lastPythonOutput.timestamp) < 60000) {
            return res.json({ signals: lastPythonOutput.data });
        }

        const tempProcess = spawn('python', ['-m', 'trading.main']);
        let output = '';
        let errorOutput = '';
        
        tempProcess.stdout.on('data', (data) => {
            output += data.toString();
        });
        
        tempProcess.stderr.on('data', (data) => {
            errorOutput += data.toString();
            logger.error('Python Error in /api/trading/signals', { error: data.toString() });
        });
        
        tempProcess.on('close', (code) => {
            try {
                if (code !== 0) {
                    throw new Error(`Process exited with code ${code}: ${errorOutput}`);
                }
                const signals = JSON.parse(output);
                res.json({ signals });
            } catch (e) {
                res.status(500).json({ 
                    error: 'Error processing trading signals',
                    details: e.message,
                    output: output 
                });
            }
        });
    } catch (error) {
        logger.error('Error in /api/trading/signals', { error: error.message });
        res.status(500).json({ error: error.message });
    }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
    const health = {
        status: 'OK',
        timestamp: new Date().toISOString(),
        websocket: {
            clientCount: connectedClients.size,
            status: wss.clients.size > 0 ? 'active' : 'idle'
        },
        pythonProcess: {
            status: pythonProcess ? 'running' : 'stopped',
            uptime: processStartTime ? Math.floor((Date.now() - processStartTime) / 1000) : 0
        },
        lastUpdate: lastPythonOutput ? {
            timestamp: new Date(lastPythonOutput.timestamp).toISOString(),
            age: Math.floor((Date.now() - lastPythonOutput.timestamp) / 1000)
        } : null
    };

    if (!pythonProcess) {
        health.status = 'DEGRADED';
    }

    res.json(health);
});

// Error handling middleware
app.use((err, req, res, next) => {
    logger.error('Unhandled error', { error: err.message, stack: err.stack });
    res.status(500).json({ error: 'Internal server error' });
});

// Configure portfinder to start looking from port 4001
portfinder.basePort = 4001;
portfinder.getPort((err, port) => {
    if (err) {
        logger.error('Error finding available port:', err);
        process.exit(1);
    }
    
    server.listen(port, () => {
        logger.info(`Server running on port ${port}`);
        logger.info('WebSocket server ready for trade signal streaming');
        
        // Export port for other processes to use if needed
        process.env.BACKEND_PORT = port;
        
        // Log if we're using a different port than the default
        if (port !== 4001) {
            logger.info(`Note: Using alternate port ${port} because port 4001 was in use`);
        }
    });
});