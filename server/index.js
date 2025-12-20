const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Load Game Data
const gameDataPath = path.join(__dirname, 'games.json');
let gameData = {
  activeBoardId: "default",
  boards: {
    "default": {
      "name": "Default Game",
      "data": { categories: [] } // Will be populated
    }
  }
};

function loadGameData() {
  try {
    if (fs.existsSync(gameDataPath)) {
      const data = fs.readFileSync(gameDataPath, 'utf8');
      const loaded = JSON.parse(data);
      
      // Migration check: if old format (has 'categories' at top level), wrap it
      if (loaded.categories && Array.isArray(loaded.categories)) {
        console.log("Migrating old data format...");
        gameData = {
          activeBoardId: "default",
          boards: {
            "default": {
              name: "Default Game",
              data: loaded
            }
          }
        };
        saveGameData(gameData);
      } else {
        gameData = loaded;
      }
      console.log("Game data loaded successfully.");
    } else {
      console.log("No game data found, creating default.");
      createDefaultBoard();
    }
  } catch (err) {
    console.error("Error loading game data:", err);
  }
}

function saveGameData(newData) {
  try {
    fs.writeFileSync(gameDataPath, JSON.stringify(newData, null, 2));
    gameData = newData; // Update memory
    console.log("Game data saved successfully.");
    return true;
  } catch (err) {
    console.error("Error saving game data:", err);
    return false;
  }
}

function getActiveBoard() {
  const boardId = gameData.activeBoardId || Object.keys(gameData.boards)[0];
  return gameData.boards[boardId]?.data || { categories: [] };
}

function createDefaultBoard() {
  // Logic to create a blank starter board if needed
  // (omitted for brevity as we likely have data)
}

loadGameData();

// --- GAME STATE ---
let gameState = {
  players: {}, // { socketId: { name: "Player 1", score: 0 } }
  activePlayer: null, // socketId
  isBuzzersLocked: true, 
  currentQuestion: null, // { categoryIndex, questionIndex, value }
  playedQuestions: [], // ["0-0", "0-1"]
};

io.on('connection', (socket) => {
  console.log(`User Connected: ${socket.id}`);

  // 1. Send initial data (Active Board Only to Players/Board)
  socket.emit('init-game', getActiveBoard());
  socket.emit('state-update', gameState);

  // 1b. Admin: Request All Boards
  socket.on('request-all-boards', () => {
    socket.emit('all-boards-data', gameData);
  });

  // 2. Player Joins
  socket.on('join-game', (playerName) => {
    gameState.players[socket.id] = {
      name: playerName || `Player ${socket.id.substr(0,4)}`,
      score: 0
    };
    io.emit('state-update', gameState);
  });

  // 3. Player Buzzes
  socket.on('buzz', () => {
    if (!gameState.isBuzzersLocked && !gameState.activePlayer) {
      gameState.activePlayer = socket.id;
      gameState.isBuzzersLocked = true;
      
      io.emit('buzz-winner', { 
        winnerId: socket.id, 
        winnerName: gameState.players[socket.id]?.name 
      });
      
      io.emit('state-update', gameState);
    }
  });

  // 4. Host: Controls
  socket.on('host-unlock-buzzers', () => {
    gameState.isBuzzersLocked = false;
    gameState.activePlayer = null;
    io.emit('state-update', gameState);
  });

  socket.on('host-reset-buzzers', () => {
    gameState.isBuzzersLocked = true;
    gameState.activePlayer = null;
    io.emit('state-update', gameState);
  });

  // 5. Award Points & Feedback
  socket.on('host-award-points', ({ playerId, points }) => {
    if (gameState.players[playerId]) {
      gameState.players[playerId].score += points;
      
      // Emit feedback event for animations
      io.emit('feedback', {
        type: points > 0 ? 'correct' : 'wrong',
        playerId,
        playerName: gameState.players[playerId].name,
        points
      });

      io.emit('state-update', gameState);
    }
  });

  // 6. Question Management
  socket.on('host-open-question', ({ categoryIndex, questionIndex }) => {
    const board = getActiveBoard();
    if (board.categories[categoryIndex] && board.categories[categoryIndex].questions[questionIndex]) {
      gameState.currentQuestion = {
        categoryIndex,
        questionIndex,
        value: board.categories[categoryIndex].questions[questionIndex].value
      };
      gameState.isBuzzersLocked = true;
      gameState.activePlayer = null;
      io.emit('state-update', gameState);
    }
  });

  // Close question AND optionally mark as played
  socket.on('host-close-question', ({ markAsPlayed } = { markAsPlayed: true }) => {
    if (gameState.currentQuestion) {
      if (markAsPlayed) {
        const { categoryIndex, questionIndex } = gameState.currentQuestion;
        gameState.playedQuestions.push(`${categoryIndex}-${questionIndex}`);
      }
      
      gameState.currentQuestion = null;
      gameState.isBuzzersLocked = true;
      gameState.activePlayer = null;
      io.emit('state-update', gameState);
    }
  });

  // 7. Undo/Reset Logic
  socket.on('host-unplay-question', ({ categoryIndex, questionIndex }) => {
    const key = `${categoryIndex}-${questionIndex}`;
    gameState.playedQuestions = gameState.playedQuestions.filter(q => q !== key);
    io.emit('state-update', gameState);
  });

  socket.on('host-reset-game', () => {
    gameState.playedQuestions = [];
    gameState.currentQuestion = null;
    gameState.isBuzzersLocked = true;
    gameState.activePlayer = null;
    
    // Reset scores
    Object.keys(gameState.players).forEach(pid => {
      gameState.players[pid].score = 0;
    });

    io.emit('state-update', gameState);
    console.log("Game Reset by Host");
  });

  // 8. Board Management
  socket.on('create-board', (name) => {
    const id = uuidv4();
    const newBoard = {
      name: name || "New Game Board",
      data: {
        categories: Array(5).fill(null).map((_, i) => ({
          name: `Category ${i+1}`,
          questions: Array(5).fill(null).map((_, j) => ({
            value: (j + 1) * 200,
            question: "Enter question here...",
            answer: "Enter answer here..."
          }))
        }))
      }
    };
    
    gameData.boards[id] = newBoard;
    saveGameData(gameData);
    socket.emit('all-boards-data', gameData);
  });

  socket.on('switch-board', (boardId) => {
    if (gameData.boards[boardId]) {
      gameData.activeBoardId = boardId;
      saveGameData(gameData);
      
      // Reset game state for new board? 
      // Often desirable, but let's keep players connected.
      gameState.playedQuestions = [];
      gameState.currentQuestion = null;
      
      io.emit('init-game', getActiveBoard());
      io.emit('state-update', gameState);
      // Notify admins too
      io.emit('all-boards-data', gameData); 
    }
  });

  socket.on('save-board', ({ boardId, data, name }) => {
    if (gameData.boards[boardId]) {
      if (data) gameData.boards[boardId].data = data;
      if (name) gameData.boards[boardId].name = name;
      
      saveGameData(gameData);
      
      // If this is the active board, broadcast updates
      if (gameData.activeBoardId === boardId) {
        io.emit('init-game', getActiveBoard());
      }
      socket.emit('save-success');
      // Update admin view
      socket.emit('all-boards-data', gameData);
    }
  });

  socket.on('delete-board', (boardId) => {
    if (gameData.boards[boardId] && Object.keys(gameData.boards).length > 1) {
      delete gameData.boards[boardId];
      
      // If we deleted the active board, switch to another
      if (gameData.activeBoardId === boardId) {
        gameData.activeBoardId = Object.keys(gameData.boards)[0];
        io.emit('init-game', getActiveBoard());
      }
      
      saveGameData(gameData);
      socket.emit('all-boards-data', gameData);
    }
  });

  // Client requests
  socket.on('request-game-data', () => {
    socket.emit('init-game', getActiveBoard());
    socket.emit('state-update', gameState);
  });

  socket.on('disconnect', () => {
    console.log(`User Disconnected: ${socket.id}`);
    if (gameState.players[socket.id]) {
      delete gameState.players[socket.id];
      io.emit('state-update', gameState);
    }
  });
});

const PORT = 3001;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`SERVER RUNNING ON PORT ${PORT}`);
});
