const { gameState } = require('./gameState');

// Timer constants
const ANSWER_TIME_LIMIT_MS = 5000; // 5 seconds to answer after buzzing
const FINAL_JEOPARDY_WAGER_TIME_MS = 30000; // 30 seconds to wager
const FINAL_JEOPARDY_ANSWER_TIME_MS = 30000; // 30 seconds to answer

let timerTimeout = null;
let cachedIo = null;

// Initialize with io instance (call once from index.js)
function initTimer(io) {
  cachedIo = io;
}

function getIo() {
  return cachedIo;
}

function clearTimer() {
  if (timerTimeout) {
    clearTimeout(timerTimeout);
    timerTimeout = null;
  }
  gameState.timerEndTime = null;
}

function startTimer(io, durationMs, onExpire) {
  clearTimer();
  gameState.timerEndTime = Date.now() + durationMs;
  
  timerTimeout = setTimeout(() => {
    clearTimer();
    if (onExpire) onExpire();
    io.emit('state-update', gameState);
  }, durationMs);
  
  io.emit('state-update', gameState);
}

// Convenience function for answer timer with auto-penalty
function startAnswerTimer(io) {
  startTimer(io, ANSWER_TIME_LIMIT_MS, () => {
    // Time expired - mark as wrong
    if (gameState.activePlayer) {
      const playerId = gameState.activePlayer;
      const points = gameState.currentWager 
        ? -gameState.currentWager.amount 
        : -(gameState.currentQuestion?.value || 0);
      
      if (gameState.players[playerId]) {
        gameState.players[playerId].score += points;
        
        io.emit('feedback', {
          type: 'wrong',
          playerId,
          playerName: gameState.players[playerId].name,
          points
        });
      }
      
      gameState.activePlayer = null;
      gameState.isBuzzersLocked = true;
      gameState.currentWager = null;
    }
    io.emit('timer-expired', {});
  });
}

module.exports = {
  initTimer,
  getIo,
  clearTimer,
  startTimer,
  startAnswerTimer,
  ANSWER_TIME_LIMIT_MS,
  FINAL_JEOPARDY_WAGER_TIME_MS,
  FINAL_JEOPARDY_ANSWER_TIME_MS
};

