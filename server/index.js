const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

// Modules
const { getActiveBoard } = require('./gameStore');
const { gameState, generateDailyDoubles } = require('./gameState');
const registerPlayerHandlers = require('./handlers/playerHandlers');
const registerHostHandlers = require('./handlers/hostHandlers');
const registerBoardHandlers = require('./handlers/boardHandlers');

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Initialize daily doubles on server start if not already set
if (gameState.dailyDoubles.length === 0) {
  gameState.dailyDoubles = generateDailyDoubles(1);
}

io.on('connection', (socket) => {
  console.log(`User Connected: ${socket.id}`);

  // 1. Send initial data with round info
  socket.emit('init-game', {
    ...getActiveBoard(),
    currentRound: gameState.round
  });
  socket.emit('state-update', gameState);

  // 2. Register Handlers
  registerPlayerHandlers(io, socket);
  registerHostHandlers(io, socket);
  registerBoardHandlers(io, socket);
});

const PORT = 3001;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`SERVER RUNNING ON PORT ${PORT}`);
});
