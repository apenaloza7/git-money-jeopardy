// --- GAME STATE ---
let gameState = {
  players: {}, // { playerId: { id, name, score, online } }
  activePlayer: null, // playerId
  isBuzzersLocked: true, 
  currentQuestion: null, // { categoryIndex, questionIndex, value }
  playedQuestions: [], // ["0-0", "0-1"]
};

// Map transient socket IDs to persistent player IDs
const socketIdToPlayerId = {};

function getGameState() {
  return gameState;
}

function getSocketIdToPlayerId() {
  return socketIdToPlayerId;
}

module.exports = {
  gameState,
  socketIdToPlayerId,
  getGameState,
  getSocketIdToPlayerId
};

