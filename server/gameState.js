// --- GAME STATE ---
let gameState = {
  players: {}, // { playerId: { id, name, score, online } }
  activePlayer: null, // playerId
  isBuzzersLocked: true, 
  currentQuestion: null, // { categoryIndex, questionIndex, value }
  playedQuestions: [], // ["0-0", "0-1"] for current round
  
  // New fields for complete Jeopardy experience
  round: 'jeopardy', // 'jeopardy' | 'double' | 'final' | 'finished'
  dailyDoubles: [], // ["0-2", "3-4"] - positions of DDs for current round
  currentWager: null, // { playerId, amount } for DD/FJ
  controllingPlayer: null, // Who picks next clue
  timerEndTime: null, // Unix timestamp when timer expires
  
  // Final Jeopardy specific
  finalJeopardyPhase: null, // 'category' | 'wager' | 'clue' | 'answer' | 'reveal' | null
  finalJeopardyWagers: {}, // { playerId: amount }
  finalJeopardyAnswers: {}, // { playerId: answer }
  finalJeopardyRevealed: [], // [playerId, ...] order of reveals
  
  // Track played questions per round
  jeopardyPlayedQuestions: [],
  doublePlayedQuestions: [],
};

// Map transient socket IDs to persistent player IDs
const socketIdToPlayerId = {};

function getGameState() {
  return gameState;
}

function getSocketIdToPlayerId() {
  return socketIdToPlayerId;
}

// Generate random daily double positions for a round
function generateDailyDoubles(count = 1) {
  const positions = [];
  while (positions.length < count) {
    const catIdx = Math.floor(Math.random() * 5);
    const qIdx = Math.floor(Math.random() * 5);
    const pos = `${catIdx}-${qIdx}`;
    if (!positions.includes(pos)) {
      positions.push(pos);
    }
  }
  return positions;
}

// Reset game state for a new game or round transition
function resetGameState(fullReset = true) {
  gameState.activePlayer = null;
  gameState.isBuzzersLocked = true;
  gameState.currentQuestion = null;
  gameState.currentWager = null;
  gameState.timerEndTime = null;
  
  if (fullReset) {
    gameState.round = 'jeopardy';
    gameState.playedQuestions = [];
    gameState.jeopardyPlayedQuestions = [];
    gameState.doublePlayedQuestions = [];
    gameState.controllingPlayer = null;
    gameState.dailyDoubles = generateDailyDoubles(1); // 1 DD in round 1
    gameState.finalJeopardyPhase = null;
    gameState.finalJeopardyWagers = {};
    gameState.finalJeopardyAnswers = {};
    gameState.finalJeopardyRevealed = [];
    
    // Reset scores
    Object.keys(gameState.players).forEach(pid => {
      gameState.players[pid].score = 0;
    });
  }
}

// Transition to next round
function advanceRound() {
  if (gameState.round === 'jeopardy') {
    gameState.round = 'double';
    gameState.jeopardyPlayedQuestions = [...gameState.playedQuestions];
    gameState.playedQuestions = [];
    gameState.dailyDoubles = generateDailyDoubles(2); // 2 DDs in round 2
    gameState.currentQuestion = null;
    gameState.activePlayer = null;
    gameState.isBuzzersLocked = true;
    
    // Player with lowest score gets control
    const players = Object.values(gameState.players).filter(p => p.online);
    if (players.length > 0) {
      const lowestPlayer = players.reduce((min, p) => p.score < min.score ? p : min, players[0]);
      gameState.controllingPlayer = lowestPlayer.id;
    }
  } else if (gameState.round === 'double') {
    gameState.round = 'final';
    gameState.doublePlayedQuestions = [...gameState.playedQuestions];
    gameState.playedQuestions = [];
    gameState.finalJeopardyPhase = 'category';
    gameState.currentQuestion = null;
    gameState.activePlayer = null;
    gameState.isBuzzersLocked = true;
  } else if (gameState.round === 'final') {
    gameState.round = 'finished';
    gameState.finalJeopardyPhase = null;
  }
}

module.exports = {
  gameState,
  socketIdToPlayerId,
  getGameState,
  getSocketIdToPlayerId,
  generateDailyDoubles,
  resetGameState,
  advanceRound
};

