const { gameState, resetGameState, advanceRound, generateDailyDoubles } = require('../gameState');
const { getRoundCategories, getFinalJeopardy } = require('../gameStore');

// Timer constants
const ANSWER_TIME_LIMIT_MS = 5000; // 5 seconds to answer after buzzing
const FINAL_JEOPARDY_WAGER_TIME_MS = 30000; // 30 seconds to wager
const FINAL_JEOPARDY_ANSWER_TIME_MS = 30000; // 30 seconds to answer

let timerTimeout = null;

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

module.exports = (io, socket) => {
  socket.on('host-unlock-buzzers', () => {
    gameState.isBuzzersLocked = false;
    gameState.activePlayer = null;
    clearTimer(); // Timer starts when someone buzzes, not when unlocked
    io.emit('state-update', gameState);
  });

  socket.on('host-reset-buzzers', () => {
    gameState.isBuzzersLocked = true;
    gameState.activePlayer = null;
    gameState.currentWager = null;
    clearTimer();
    io.emit('state-update', gameState);
  });

  socket.on('host-award-points', ({ playerId, points, isCorrect }) => {
    if (gameState.players[playerId]) {
      // Check if this is a Daily Double with wager
      let actualPoints = points;
      if (gameState.currentWager && gameState.currentWager.playerId === playerId) {
        // Use wager amount instead of question value
        actualPoints = isCorrect !== false ? gameState.currentWager.amount : -gameState.currentWager.amount;
      }
      
      gameState.players[playerId].score += actualPoints;
      
      // If correct, this player now controls the board
      if (actualPoints > 0) {
        gameState.controllingPlayer = playerId;
      }
      
      // Emit feedback event for animations
      io.emit('feedback', {
        type: actualPoints > 0 ? 'correct' : 'wrong',
        playerId,
        playerName: gameState.players[playerId].name,
        points: actualPoints
      });

      // Clear timer and wager
      clearTimer();
      gameState.currentWager = null;
      
      io.emit('state-update', gameState);
    }
  });

  socket.on('host-open-question', ({ categoryIndex, questionIndex }) => {
    const categories = getRoundCategories(gameState.round);
    if (categories[categoryIndex] && categories[categoryIndex].questions[questionIndex]) {
      const question = categories[categoryIndex].questions[questionIndex];
      const ddPosition = `${categoryIndex}-${questionIndex}`;
      const isDailyDouble = gameState.dailyDoubles.includes(ddPosition);
      
      gameState.currentQuestion = {
        categoryIndex,
        questionIndex,
        value: question.value,
        isDailyDouble
      };
      gameState.isBuzzersLocked = true;
      gameState.activePlayer = null;
      gameState.currentWager = null;
      
      // For Daily Double, set the controlling player as the active player
      if (isDailyDouble && gameState.controllingPlayer) {
        gameState.activePlayer = gameState.controllingPlayer;
        io.emit('daily-double', {
          categoryIndex,
          questionIndex,
          playerId: gameState.controllingPlayer,
          playerName: gameState.players[gameState.controllingPlayer]?.name
        });
      }
      
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
      gameState.currentWager = null;
      clearTimer();
      
      // Check if all questions in this round are played
      const categories = getRoundCategories(gameState.round);
      const totalQuestions = categories.reduce((sum, cat) => sum + cat.questions.length, 0);
      
      if (gameState.playedQuestions.length >= totalQuestions) {
        io.emit('round-complete', { round: gameState.round });
      }
      
      io.emit('state-update', gameState);
    }
  });

  socket.on('host-unplay-question', ({ categoryIndex, questionIndex }) => {
    const key = `${categoryIndex}-${questionIndex}`;
    gameState.playedQuestions = gameState.playedQuestions.filter(q => q !== key);
    io.emit('state-update', gameState);
  });

  // Advance to next round
  socket.on('host-advance-round', () => {
    const previousRound = gameState.round;
    advanceRound();
    
    io.emit('round-transition', { 
      from: previousRound, 
      to: gameState.round 
    });
    io.emit('state-update', gameState);
    console.log(`Advanced from ${previousRound} to ${gameState.round}`);
  });

  // Final Jeopardy controls
  socket.on('host-start-final-jeopardy', () => {
    if (gameState.round !== 'final') {
      gameState.round = 'final';
    }
    gameState.finalJeopardyPhase = 'category';
    gameState.finalJeopardyWagers = {};
    gameState.finalJeopardyAnswers = {};
    gameState.finalJeopardyRevealed = [];
    
    io.emit('state-update', gameState);
  });

  socket.on('host-fj-show-category', () => {
    gameState.finalJeopardyPhase = 'category';
    io.emit('state-update', gameState);
  });

  socket.on('host-fj-start-wagers', () => {
    gameState.finalJeopardyPhase = 'wager';
    
    // Start wager timer
    startTimer(io, FINAL_JEOPARDY_WAGER_TIME_MS, () => {
      // Auto-advance to clue phase when timer expires
      gameState.finalJeopardyPhase = 'clue';
    });
    
    io.emit('state-update', gameState);
  });

  socket.on('host-fj-show-clue', () => {
    gameState.finalJeopardyPhase = 'clue';
    clearTimer();
    io.emit('state-update', gameState);
  });

  socket.on('host-fj-start-answers', () => {
    gameState.finalJeopardyPhase = 'answer';
    
    // Start answer timer (think music time)
    startTimer(io, FINAL_JEOPARDY_ANSWER_TIME_MS, () => {
      // Auto-advance to reveal phase when timer expires
      gameState.finalJeopardyPhase = 'reveal';
    });
    
    io.emit('final-jeopardy-think', {}); // Signal to play think music
    io.emit('state-update', gameState);
  });

  socket.on('host-fj-start-reveal', () => {
    gameState.finalJeopardyPhase = 'reveal';
    clearTimer();
    io.emit('state-update', gameState);
  });

  socket.on('host-fj-reveal-player', ({ playerId, isCorrect }) => {
    if (!gameState.finalJeopardyRevealed.includes(playerId)) {
      gameState.finalJeopardyRevealed.push(playerId);
      
      const wager = gameState.finalJeopardyWagers[playerId] || 0;
      const points = isCorrect ? wager : -wager;
      
      if (gameState.players[playerId]) {
        gameState.players[playerId].score += points;
      }
      
      io.emit('fj-player-revealed', {
        playerId,
        playerName: gameState.players[playerId]?.name,
        answer: gameState.finalJeopardyAnswers[playerId] || '(no answer)',
        wager,
        isCorrect,
        points,
        newScore: gameState.players[playerId]?.score
      });
      
      io.emit('state-update', gameState);
    }
  });

  socket.on('host-fj-finish', () => {
    gameState.round = 'finished';
    gameState.finalJeopardyPhase = null;
    io.emit('game-finished', { 
      players: gameState.players 
    });
    io.emit('state-update', gameState);
  });

  // Start answer timer (for buzzer scenarios)
  socket.on('host-start-timer', () => {
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
  });

  socket.on('host-reset-game', () => {
    resetGameState(true);
    clearTimer();
    
    io.emit('game-reset', {});
    io.emit('state-update', gameState);
    console.log("Game Reset by Host");
  });

  // Set controlling player manually
  socket.on('host-set-control', ({ playerId }) => {
    if (gameState.players[playerId]) {
      gameState.controllingPlayer = playerId;
      io.emit('state-update', gameState);
    }
  });
};

