const { v4: uuidv4 } = require('uuid');
const { getGameData, saveGameData, getActiveBoard } = require('../gameStore');
const { gameState } = require('../gameState');

module.exports = (io, socket) => {
  // General Data Request
  socket.on('request-game-data', () => {
    socket.emit('init-game', getActiveBoard());
    socket.emit('state-update', gameState);
  });

  // Admin: Request All Boards
  socket.on('request-all-boards', () => {
    socket.emit('all-boards-data', getGameData());
  });

  socket.on('create-board', (name) => {
    const gameData = getGameData();
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
    const gameData = getGameData();
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
    const gameData = getGameData();
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
    const gameData = getGameData();
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
};

