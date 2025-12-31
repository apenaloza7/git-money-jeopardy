const { v4: uuidv4 } = require('uuid');
const { getGameData, saveGameData, getActiveBoard, createEmptyCategories, createEmptyDoubleCategories } = require('../gameStore');
const { gameState, resetGameState, generateDailyDoubles } = require('../gameState');

module.exports = (io, socket) => {
  // General Data Request - now includes round info
  socket.on('request-game-data', () => {
    const boardData = getActiveBoard();
    socket.emit('init-game', {
      ...boardData,
      currentRound: gameState.round
    });
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
        rounds: {
          jeopardy: { categories: createEmptyCategories() },
          double: { categories: createEmptyDoubleCategories() }
        },
        finalJeopardy: {
          category: "Final Category",
          clue: "Enter final clue here...",
          answer: "Enter final answer here..."
        }
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
      
      // Full reset for new board
      resetGameState(true);
      
      io.emit('init-game', {
        ...getActiveBoard(),
        currentRound: gameState.round
      });
      io.emit('state-update', gameState);
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
        io.emit('init-game', {
          ...getActiveBoard(),
          currentRound: gameState.round
        });
      }
      socket.emit('save-success');
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
        resetGameState(true);
        io.emit('init-game', {
          ...getActiveBoard(),
          currentRound: gameState.round
        });
        io.emit('state-update', gameState);
      }
      
      saveGameData(gameData);
      socket.emit('all-boards-data', gameData);
    }
  });
};

