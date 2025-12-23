const { gameState, socketIdToPlayerId } = require('../gameState');

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

