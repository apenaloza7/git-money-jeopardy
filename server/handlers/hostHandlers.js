const { gameState } = require('../gameState');
const { getActiveBoard } = require('../gameStore');

module.exports = (io, socket) => {
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
};

