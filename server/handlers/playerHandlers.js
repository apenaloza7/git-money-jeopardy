const { gameState, socketIdToPlayerId } = require('../gameState');
const { getRoundCategories } = require('../gameStore');

module.exports = (io, socket) => {
  // Player Joins
  socket.on('join-game', ({ playerId, name }) => {
    // Basic validation
    if (!playerId) return;

    // Map this socket to the player ID
    socketIdToPlayerId[socket.id] = playerId;

    // Create or Update Player
    if (!gameState.players[playerId]) {
      // New Player
      gameState.players[playerId] = {
        id: playerId,
        name: name || `Player ${playerId.substr(0,4)}`,
        score: 0,
        online: true
      };
    } else {
      // Rejoining Player
      gameState.players[playerId].online = true;
      if (name) gameState.players[playerId].name = name;
    }

    io.emit('state-update', gameState);
  });

  // Player Buzzes
  socket.on('buzz', () => {
    const playerId = socketIdToPlayerId[socket.id];
    
    // Only allow buzz if we know who this is
    if (playerId && !gameState.isBuzzersLocked && !gameState.activePlayer) {
      gameState.activePlayer = playerId;
      gameState.isBuzzersLocked = true;
      
      io.emit('buzz-winner', { 
        winnerId: playerId, 
        winnerName: gameState.players[playerId]?.name 
      });
      
      io.emit('state-update', gameState);
    }
  });

  // Player submits wager (Daily Double or Final Jeopardy)
  socket.on('submit-wager', ({ amount }) => {
    const playerId = socketIdToPlayerId[socket.id];
    if (!playerId) return;

    const player = gameState.players[playerId];
    if (!player) return;

    // Final Jeopardy wager
    if (gameState.round === 'final' && gameState.finalJeopardyPhase === 'wager') {
      // Validate: must have positive score and wager <= score
      if (player.score <= 0) return;
      const validAmount = Math.max(0, Math.min(amount, player.score));
      
      gameState.finalJeopardyWagers[playerId] = validAmount;
      console.log(`Player ${player.name} wagered $${validAmount} in Final Jeopardy`);
      
      io.emit('state-update', gameState);
      return;
    }

    // Daily Double wager
    if (gameState.currentQuestion && gameState.currentWager === null) {
      const categories = getRoundCategories(gameState.round);
      const question = categories[gameState.currentQuestion.categoryIndex]?.questions[gameState.currentQuestion.questionIndex];
      
      if (!question) return;
      
      // Only the controlling player (or active player for DD) can wager
      const ddPosition = `${gameState.currentQuestion.categoryIndex}-${gameState.currentQuestion.questionIndex}`;
      const isDailyDouble = gameState.dailyDoubles.includes(ddPosition);
      
      if (!isDailyDouble) return;
      if (gameState.activePlayer !== playerId) return;

      // Validate wager (min $5, max = score or True DD amount)
      const maxWager = Math.max(player.score, question.value >= 1000 ? 2000 : 1000);
      const validAmount = Math.max(5, Math.min(amount, maxWager));
      
      gameState.currentWager = { playerId, amount: validAmount };
      console.log(`Player ${player.name} wagered $${validAmount} on Daily Double`);
      
      // Now show the clue and start timer
      io.emit('wager-confirmed', { playerId, amount: validAmount });
      io.emit('state-update', gameState);
    }
  });

  // Player submits Final Jeopardy answer
  socket.on('submit-final-answer', ({ answer }) => {
    const playerId = socketIdToPlayerId[socket.id];
    if (!playerId) return;

    // Only during answer phase
    if (gameState.round !== 'final' || gameState.finalJeopardyPhase !== 'answer') return;

    // Only players who wagered can answer
    if (gameState.finalJeopardyWagers[playerId] === undefined) return;

    gameState.finalJeopardyAnswers[playerId] = answer || '';
    console.log(`Player ${gameState.players[playerId]?.name} submitted Final Jeopardy answer`);
    
    io.emit('state-update', gameState);
  });

  // Disconnect logic (shared concern but player-centric)
  socket.on('disconnect', () => {
    console.log(`User Disconnected: ${socket.id}`);
    
    const playerId = socketIdToPlayerId[socket.id];
    if (playerId && gameState.players[playerId]) {
      // Mark as offline instead of deleting
      gameState.players[playerId].online = false;
      delete socketIdToPlayerId[socket.id];
      io.emit('state-update', gameState);
    }
  });
};

