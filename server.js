const http = require('http');
const { Server } = require('socket.io');

// Create HTTP server
const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('AIXBT WebSocket Server');
});

// Create Socket.io server
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Sample responses for demo
const responses = [
  "Based on current market analysis, I'm seeing a potential breakout for SOL in the next 24 hours.",
  "The EMB token has strong buy pressure currently. Consider accumulating during dips.",
  "BTC is showing consolidation patterns. I'd recommend waiting for a clear direction before entering positions.",
  "Latest on-chain metrics suggest increased wallet activity for AIXBT. This usually precedes market movements.",
  "My trading models indicate potential resistance at the $24,500 level for BTC.",
  "Technical analysis shows SOL is approaching a critical support zone. Watch closely for reversal signals.",
  "Sentiment analysis from social media shows overwhelmingly positive signals for EMB token.",
  "I've analyzed recent whale movements - several large wallets are accumulating AIXBT quietly.",
  "Market volatility is expected to increase in the next 48 hours based on options expiry data.",
  "Trading volume for SOL/USDC has been increasing steadily. This could be a precursor to a major move."
];

// Connection handler
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  // Handle incoming messages
  socket.on('message', (msg) => {
    console.log(`Received message from ${socket.id}: ${msg}`);

    // Simple delay to simulate processing
    setTimeout(() => {
      // Select random response for demo
      const response = responses[Math.floor(Math.random() * responses.length)];
      
      // Send response back to client
      socket.emit('message', response);
      
      console.log(`Sent response to ${socket.id}: ${response}`);
    }, 1000 + Math.random() * 2000); // Random delay between 1-3 seconds
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Start server on port 3009
const PORT = process.env.SOCKET_PORT || 3009;
server.listen(PORT, () => {
  console.log(`AIXBT WebSocket server running on port ${PORT}`);
});

// Handle shutdown gracefully
process.on('SIGINT', () => {
  console.log('Shutting down AIXBT WebSocket server...');
  io.close();
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});