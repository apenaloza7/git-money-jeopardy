import React, { useEffect, useState } from 'react';
import io, { Socket } from 'socket.io-client';
import { useNavigate } from 'react-router-dom';
import { SERVER_URL } from '../../constants';
import { JeopardyShell } from '../theme/JeopardyShell';
import { Timer } from '../Timer';
import { panel, panelGold, buttonSecondary, buttonPrimary } from '../theme/theme';

const socket: Socket = io(SERVER_URL);

type Round = 'jeopardy' | 'double' | 'final' | 'finished';
type FJPhase = 'category' | 'wager' | 'clue' | 'answer' | 'reveal' | null;

interface Category {
  name: string;
  questions: { value: number; question: string; answer: string }[];
}

export const HostDashboardView: React.FC = () => {
  const [gameState, setGameState] = useState<any>(null);
  const [gameData, setGameData] = useState<any>(null);
  const [allBoards, setAllBoards] = useState<any>(null);
  const [showBoardSelect, setShowBoardSelect] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    socket.on('state-update', (state) => setGameState(state));
    socket.on('init-game', (data) => setGameData(data));
    socket.on('all-boards-data', (data) => setAllBoards(data));
    
    if (socket.connected) {
      socket.emit('request-game-data');
      socket.emit('request-all-boards');
    } else {
      socket.on('connect', () => {
        socket.emit('request-game-data');
        socket.emit('request-all-boards');
      });
    }

    return () => {
      socket.off('state-update');
      socket.off('init-game');
      socket.off('all-boards-data');
      socket.off('connect');
    };
  }, []);

  // Get categories for current round
  const getCategories = (): Category[] => {
    if (!gameData || !gameState) return [];
    
    const round: Round = gameState.round || 'jeopardy';
    
    if (round === 'jeopardy') return gameData.rounds?.jeopardy?.categories || [];
    if (round === 'double') return gameData.rounds?.double?.categories || [];
    return [];
  };

  const categories = getCategories();

  const openQuestion = (catIdx: number, qIdx: number) => {
    socket.emit('host-open-question', { categoryIndex: catIdx, questionIndex: qIdx });
  };

  const closeQuestion = (markAsPlayed: boolean) => {
    socket.emit('host-close-question', { markAsPlayed });
  };

  const unplayQuestion = (catIdx: number, qIdx: number) => {
    if (confirm("Re-open this question (mark as unplayed)?")) {
      socket.emit('host-unplay-question', { categoryIndex: catIdx, questionIndex: qIdx });
    }
  };

  const unlockBuzzers = () => {
    socket.emit('host-unlock-buzzers');
  };

  const resetBuzzers = () => socket.emit('host-reset-buzzers');

  const startTimer = () => socket.emit('host-start-timer');

  const awardPoints = (isCorrect: boolean) => {
    if (gameState.activePlayer) {
      const value = gameState.currentWager?.amount || gameState.currentQuestion?.value || 0;
      const points = isCorrect ? value : -value;
      socket.emit('host-award-points', { 
        playerId: gameState.activePlayer, 
        points,
        isCorrect 
      });
      resetBuzzers();
    }
  };

  const resetGame = () => {
    if (confirm("ARE YOU SURE? This will clear all scores and played questions.")) {
      socket.emit('host-reset-game');
    }
  };

  const switchBoard = (boardId: string) => {
    if (confirm("Switching boards will reset the current game state. Continue?")) {
      socket.emit('switch-board', boardId);
      setShowBoardSelect(false);
    }
  };

  const advanceRound = () => {
    const nextRound = gameState.round === 'jeopardy' ? 'Double Jeopardy' : 
                      gameState.round === 'double' ? 'Final Jeopardy' : 'End';
    if (confirm(`Advance to ${nextRound}?`)) {
      socket.emit('host-advance-round');
    }
  };

  const setPlayerControl = (playerId: string) => {
    socket.emit('host-set-control', { playerId });
  };

  // Final Jeopardy controls
  const fjShowCategory = () => socket.emit('host-fj-show-category');
  const fjStartWagers = () => socket.emit('host-fj-start-wagers');
  const fjShowClue = () => socket.emit('host-fj-show-clue');
  const fjStartAnswers = () => socket.emit('host-fj-start-answers');
  const fjStartReveal = () => socket.emit('host-fj-start-reveal');
  const fjRevealPlayer = (playerId: string, isCorrect: boolean) => {
    socket.emit('host-fj-reveal-player', { playerId, isCorrect });
  };
  const fjFinish = () => socket.emit('host-fj-finish');

  if (!gameState || !gameData) {
    return (
      <JeopardyShell withContainer backgroundMode="viewport">
        <div className={[panel, 'p-8'].join(' ')}>
          <h1 className="font-display text-3xl font-extrabold mb-4 text-yellow-400 tracking-wider">
            Connecting to Host...
          </h1>
          <div className="text-sm font-mono text-slate-200/70">
            Socket: {socket.connected ? "Connected" : "Connecting..."}<br/>
            Game State: {gameState ? "Loaded" : "Waiting"}<br/>
            Game Data: {gameData ? "Loaded" : "Waiting"}
          </div>
        </div>
      </JeopardyShell>
    );
  }

  const round: Round = gameState.round || 'jeopardy';
  const fjPhase: FJPhase = gameState.finalJeopardyPhase;
  const currentQ = gameState.currentQuestion;
  const activeQuestionData = currentQ && categories.length > 0
    ? categories[currentQ.categoryIndex]?.questions?.[currentQ.questionIndex]
    : null;
  
  const winnerId = gameState.activePlayer;
  const winnerName = winnerId ? gameState.players[winnerId]?.name : null;
  const controllingPlayer = gameState.controllingPlayer;
  const dailyDoubles = gameState.dailyDoubles || [];

  // Calculate round progress
  const totalQuestions = categories.length * 5;
  const playedCount = gameState.playedQuestions?.length || 0;
  const roundComplete = playedCount >= totalQuestions;

  // Final Jeopardy rendering
  if (round === 'final') {
    const fj = gameData.finalJeopardy;
    const fjWagers = gameState.finalJeopardyWagers || {};
    const fjAnswers = gameState.finalJeopardyAnswers || {};
    const fjRevealed = gameState.finalJeopardyRevealed || [];
    
    // Get eligible players (score > 0)
    const eligiblePlayers = Object.entries(gameState.players)
      .filter(([_, p]: [string, any]) => p.score > 0)
      .map(([id, p]: [string, any]) => ({ id, ...p }));
    
    // Players sorted by score (lowest first for reveal order)
    const sortedForReveal = [...eligiblePlayers].sort((a, b) => a.score - b.score);
    
    return (
      <JeopardyShell backgroundMode="viewport">
        <div className="min-h-screen text-white p-4 pb-24">
          {/* Header */}
          <div className={['flex justify-between items-center mb-6 p-4', panel].join(' ')}>
            <div className="flex items-center gap-4">
              <button onClick={() => navigate('/')} className="text-slate-400 hover:text-white font-bold text-sm">
                ← Exit
              </button>
              <h1 className="font-display text-2xl font-extrabold text-yellow-400 tracking-wide">
                Final Jeopardy
              </h1>
            </div>
            
            {gameState.timerEndTime && (
              <Timer endTime={gameState.timerEndTime} size="sm" showTicks={false} />
            )}
          </div>

          {/* FJ Content */}
          <div className={[panelGold, 'p-6 mb-6'].join(' ')}>
            <div className="text-center mb-6">
              <div className="text-yellow-300 text-xl uppercase tracking-widest mb-2 font-bold">
                {fj?.category || 'Final Category'}
              </div>
              {(fjPhase === 'clue' || fjPhase === 'answer' || fjPhase === 'reveal') && (
                <div className="text-white text-2xl font-serif mt-4">{fj?.clue}</div>
              )}
              {fjPhase === 'reveal' && (
                <div className="mt-4 p-3 bg-green-900/50 rounded-lg inline-block">
                  <span className="text-slate-400 text-sm">Answer: </span>
                  <span className="text-green-400 font-bold">{fj?.answer}</span>
                </div>
              )}
            </div>

            {/* Phase Controls */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mb-6">
              <button
                onClick={fjShowCategory}
                className={`py-3 rounded font-bold text-sm ${fjPhase === 'category' ? 'bg-yellow-500 text-black' : buttonSecondary}`}
              >
                1. Show Category
              </button>
              <button
                onClick={fjStartWagers}
                className={`py-3 rounded font-bold text-sm ${fjPhase === 'wager' ? 'bg-yellow-500 text-black' : buttonSecondary}`}
              >
                2. Start Wagers
              </button>
              <button
                onClick={fjShowClue}
                className={`py-3 rounded font-bold text-sm ${fjPhase === 'clue' ? 'bg-yellow-500 text-black' : buttonSecondary}`}
              >
                3. Show Clue
              </button>
              <button
                onClick={fjStartAnswers}
                className={`py-3 rounded font-bold text-sm ${fjPhase === 'answer' ? 'bg-yellow-500 text-black' : buttonSecondary}`}
              >
                4. Think Music
              </button>
              <button
                onClick={fjStartReveal}
                className={`py-3 rounded font-bold text-sm ${fjPhase === 'reveal' ? 'bg-yellow-500 text-black' : buttonSecondary}`}
              >
                5. Reveal Answers
              </button>
              <button
                onClick={fjFinish}
                className="py-3 rounded font-bold text-sm bg-purple-600 hover:bg-purple-500 text-white"
              >
                End Game
              </button>
            </div>
          </div>

          {/* Player Wagers & Answers */}
          <div className={[panel, 'p-4'].join(' ')}>
            <h2 className="text-sm font-bold mb-4 text-slate-400 uppercase tracking-wider">
              Players {fjPhase === 'reveal' ? '(Click to Reveal)' : ''}
            </h2>
            <div className="space-y-3">
              {sortedForReveal.map((player) => {
                const hasWagered = fjWagers[player.id] !== undefined;
                const hasAnswered = fjAnswers[player.id] !== undefined;
                const isRevealed = fjRevealed.includes(player.id);
                
                return (
                  <div key={player.id} className={`p-4 rounded-lg bg-slate-900 ${isRevealed ? 'opacity-60' : ''}`}>
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-bold text-lg">{player.name}</span>
                      <span className={`font-mono font-bold ${player.score < 0 ? 'text-red-400' : 'text-green-400'}`}>
                        ${player.score.toLocaleString()}
                      </span>
                    </div>
                    
                    <div className="flex gap-4 text-sm text-slate-400 mb-3">
                      <span>Wager: {hasWagered ? `$${fjWagers[player.id]}` : '...'}</span>
                      <span>Answer: {hasAnswered ? `"${fjAnswers[player.id]}"` : '...'}</span>
                    </div>
                    
                    {fjPhase === 'reveal' && !isRevealed && hasWagered && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => fjRevealPlayer(player.id, true)}
                          className="flex-1 bg-green-600 hover:bg-green-500 text-white py-2 rounded font-bold text-sm"
                        >
                          Correct (+${fjWagers[player.id]})
                        </button>
                        <button
                          onClick={() => fjRevealPlayer(player.id, false)}
                          className="flex-1 bg-red-600 hover:bg-red-500 text-white py-2 rounded font-bold text-sm"
                        >
                          Wrong (-${fjWagers[player.id]})
                        </button>
                      </div>
                    )}
                    
                    {isRevealed && (
                      <div className="text-center text-slate-500 text-sm">Revealed</div>
                    )}
                  </div>
                );
              })}
              
              {eligiblePlayers.length === 0 && (
                <div className="text-center text-slate-500 py-8">
                  No players with positive scores for Final Jeopardy
                </div>
              )}
            </div>
          </div>
        </div>
      </JeopardyShell>
    );
  }

  // Game Finished
  if (round === 'finished') {
    const sortedPlayers = Object.values(gameState.players).sort((a: any, b: any) => b.score - a.score);
    
    return (
      <JeopardyShell backgroundMode="viewport">
        <div className="min-h-screen text-white p-4 flex flex-col items-center justify-center">
          <div className="font-display text-6xl font-extrabold text-yellow-400 mb-8">
            GAME OVER
          </div>
          
          <div className="space-y-4 w-full max-w-md">
            {sortedPlayers.map((player: any, idx) => (
              <div key={idx} className={`p-4 rounded-lg flex justify-between items-center
                ${idx === 0 ? 'bg-yellow-500/20 border-2 border-yellow-500' : 'bg-slate-800'}
              `}>
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{idx === 0 ? '🏆' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : ''}</span>
                  <span className="font-bold text-xl">{player.name}</span>
                </div>
                <span className={`font-mono font-bold text-2xl ${player.score < 0 ? 'text-red-400' : 'text-green-400'}`}>
                  ${player.score.toLocaleString()}
                </span>
              </div>
            ))}
          </div>
          
          <button
            onClick={resetGame}
            className={['mt-8 px-8 py-3 rounded-lg', buttonPrimary].join(' ')}
          >
            New Game
          </button>
        </div>
      </JeopardyShell>
    );
  }

  // Regular Game View (Jeopardy / Double Jeopardy)
  return (
    <JeopardyShell backgroundMode="viewport">
    <div className="min-h-screen text-white p-4 pb-24">
      {/* HEADER CONTROLS */}
      <div className={['flex justify-between items-center mb-6 p-4', panel].join(' ')}>
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/')} className="text-slate-400 hover:text-white font-bold text-sm">
            ← Exit
          </button>
          <h1 className="font-display text-2xl font-extrabold text-slate-100 tracking-wide">Host Controls</h1>
          <div className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${
            round === 'double' ? 'bg-purple-600' : 'bg-blue-600'
          }`}>
            {round === 'double' ? 'Double Jeopardy' : 'Jeopardy'}
          </div>
        </div>
        
        <div className="flex gap-2 items-center">
          {/* Timer display */}
          {gameState.timerEndTime && (
            <Timer endTime={gameState.timerEndTime} size="sm" showTicks={false} />
          )}
          
          {/* Round progress */}
          <div className="text-xs text-slate-400 mr-4">
            {playedCount}/{totalQuestions} played
          </div>
          
          <div className="relative">
            <button 
              onClick={() => setShowBoardSelect(!showBoardSelect)}
              className={['px-4 py-2 rounded text-sm', buttonSecondary].join(' ')}
            >
              Change Board ▾
            </button>
            {showBoardSelect && allBoards && (
              <div className="absolute right-0 top-12 w-64 bg-[#07154a] border border-yellow-400/20 rounded shadow-xl z-50 overflow-hidden">
                <div className="p-2 text-xs text-slate-200/70 uppercase font-bold bg-[#06103a]">Select Board</div>
                {Object.entries(allBoards.boards).map(([id, board]: [string, any]) => (
                  <button
                    key={id}
                    onClick={() => switchBoard(id)}
                    className={`w-full text-left px-4 py-3 hover:bg-[#0a1c5a]/70 border-b border-yellow-400/10 last:border-0
                      ${allBoards.activeBoardId === id ? 'bg-blue-900/30 text-blue-300' : 'text-slate-300'}
                    `}
                  >
                    {board.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          <button 
            onClick={advanceRound}
            disabled={!roundComplete}
            className={`px-4 py-2 rounded font-bold text-sm ${
              roundComplete 
                ? 'bg-purple-600 hover:bg-purple-500 text-white animate-pulse' 
                : 'bg-slate-700 text-slate-500 cursor-not-allowed'
            }`}
          >
            Next Round →
          </button>

          <button 
            onClick={resetGame}
            className="bg-red-900/50 hover:bg-red-800 text-red-200 px-4 py-2 rounded font-bold text-sm border border-red-800"
          >
            Reset
          </button>
        </div>
      </div>

      {/* Controlling Player Banner */}
      {controllingPlayer && gameState.players[controllingPlayer] && !currentQ && (
        <div className="mb-4 p-3 bg-yellow-500/20 border border-yellow-500/50 rounded-lg flex items-center justify-between">
          <div>
            <span className="text-yellow-400 font-bold">
              {gameState.players[controllingPlayer].name}
            </span>
            <span className="text-slate-400 ml-2">has control of the board</span>
          </div>
          <div className="flex gap-2">
            {Object.entries(gameState.players).map(([id, player]: [string, any]) => (
              <button
                key={id}
                onClick={() => setPlayerControl(id)}
                className={`px-3 py-1 rounded text-xs font-bold ${
                  id === controllingPlayer 
                    ? 'bg-yellow-500 text-black' 
                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                }`}
              >
                {player.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* --- ACTIVE QUESTION CONTROL PANEL --- */}
      {currentQ && activeQuestionData ? (
        <div className={[panelGold, 'p-6 mb-8 sticky top-4 z-40'].join(' ')}>
          <div className="flex justify-between items-start mb-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                {currentQ.isDailyDouble && (
                  <span className="bg-orange-500 text-black px-2 py-1 rounded text-xs font-bold uppercase">
                    Daily Double
                  </span>
                )}
                <h2 className="text-yellow-400 font-bold uppercase tracking-wider text-sm">
                  Active Clue (${gameState.currentWager?.amount || activeQuestionData.value})
                </h2>
              </div>
              <p className="text-xl font-serif mt-2">{activeQuestionData.question}</p>
              <p className="text-green-200 font-bold mt-2 bg-slate-950/40 border border-yellow-400/10 p-2 rounded inline-block">
                Answer: {activeQuestionData.answer}
              </p>
            </div>
            <div className="flex flex-col gap-2">
              <button 
                onClick={() => closeQuestion(true)}
                className="bg-green-700 hover:bg-green-600 text-white px-4 py-2 rounded text-sm font-bold shadow-lg"
              >
                Close & Mark Played
              </button>
              <button 
                onClick={() => closeQuestion(false)}
                className={['px-4 py-2 rounded text-sm', buttonSecondary].join(' ')}
              >
                Close (Keep Unplayed)
              </button>
            </div>
          </div>

          {/* Buzzer Controls */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <button 
              onClick={unlockBuzzers}
              disabled={!gameState.isBuzzersLocked || !!winnerId || currentQ.isDailyDouble}
              className={`py-4 rounded-lg font-bold text-lg shadow-lg transition-colors
                ${!gameState.isBuzzersLocked ? 'bg-green-800 text-green-200 cursor-not-allowed' : 
                  currentQ.isDailyDouble ? 'bg-slate-700 text-slate-500 cursor-not-allowed' :
                  'bg-green-600 hover:bg-green-500 text-white'}
              `}
            >
              {gameState.isBuzzersLocked ? "UNLOCK BUZZERS" : "BUZZERS OPEN"}
            </button>
            
            <button 
              onClick={resetBuzzers}
              className="bg-slate-600 hover:bg-slate-500 text-white py-4 rounded-lg font-bold text-lg shadow-lg"
            >
              RESET BUZZERS
            </button>

            <button 
              onClick={startTimer}
              disabled={!winnerId}
              className={`py-4 rounded-lg font-bold text-lg shadow-lg transition-colors
                ${winnerId ? 'bg-orange-600 hover:bg-orange-500 text-white' : 'bg-slate-700 text-slate-500 cursor-not-allowed'}
              `}
            >
              START TIMER
            </button>
          </div>

          {/* Scoring Controls (Only shows if someone buzzed) */}
          {winnerName && (
            <div className="bg-slate-900 p-4 rounded-lg border border-yellow-500">
              <div className="text-center mb-4">
                <span className="text-slate-400 text-sm uppercase">
                  {currentQ.isDailyDouble ? 'Daily Double - ' : ''}Buzzed In:
                </span>
                <div className="text-3xl font-bold text-white">{winnerName}</div>
                {gameState.currentWager && (
                  <div className="text-yellow-400 text-sm mt-1">
                    Wager: ${gameState.currentWager.amount}
                  </div>
                )}
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={() => awardPoints(true)}
                  className="flex-1 bg-green-600 hover:bg-green-500 text-white py-3 rounded font-bold"
                >
                  Correct (+${gameState.currentWager?.amount || activeQuestionData.value})
                </button>
                <button 
                  onClick={() => awardPoints(false)}
                  className="flex-1 bg-red-600 hover:bg-red-500 text-white py-3 rounded font-bold"
                >
                  Wrong (-${gameState.currentWager?.amount || activeQuestionData.value})
                </button>
              </div>
            </div>
          )}

          {/* Daily Double waiting for wager */}
          {currentQ.isDailyDouble && !gameState.currentWager && (
            <div className="bg-orange-900/50 p-4 rounded-lg border border-orange-500 text-center">
              <div className="text-orange-300 font-bold">Waiting for player to submit wager...</div>
            </div>
          )}
        </div>
      ) : (
        /* --- GRID SELECTOR --- */
        <div className="mb-8">
          <h2 className="text-xl font-bold mb-4 text-slate-300">Select Question</h2>
          <div className="grid grid-cols-5 gap-1">
            {/* Categories Headers */}
            {categories.map((c: Category, i: number) => (
              <div key={i} className="text-[10px] md:text-xs text-center font-bold text-slate-400 uppercase truncate px-1">
                {c.name}
              </div>
            ))}
             
            {/* Tiles */}
            {Array.from({ length: 5 }).map((_, r) => (
              categories.map((c: Category, cIdx: number) => {
                const isPlayed = gameState.playedQuestions.includes(`${cIdx}-${r}`);
                const isActive = gameState.currentQuestion?.categoryIndex === cIdx && gameState.currentQuestion?.questionIndex === r;
                const isDailyDouble = dailyDoubles.includes(`${cIdx}-${r}`);
                
                return (
                  <button
                    key={`${cIdx}-${r}`}
                    disabled={!!gameState.currentQuestion}
                    onClick={() => isPlayed ? unplayQuestion(cIdx, r) : openQuestion(cIdx, r)}
                    className={`h-12 md:h-16 flex items-center justify-center font-bold text-sm md:text-lg rounded transition-colors relative
                      ${isPlayed ? 'bg-slate-800 text-slate-600 hover:bg-slate-700 hover:text-red-400' : 
                        isActive ? 'bg-yellow-500 text-black animate-pulse' :
                        isDailyDouble ? 'bg-orange-600 text-yellow-200 hover:bg-orange-500 ring-2 ring-orange-400' :
                        'bg-blue-600 text-yellow-300 hover:bg-blue-500'}
                    `}
                    title={isDailyDouble ? "DAILY DOUBLE!" : isPlayed ? "Click to Revert (Unplay)" : "Open Question"}
                  >
                    ${c.questions[r]?.value || 0}
                    {isPlayed && <span className="absolute top-1 right-1 text-[8px] opacity-50">↺</span>}
                    {isDailyDouble && !isPlayed && <span className="absolute top-1 left-1 text-[10px]">★</span>}
                  </button>
                );
              })
            ))}
          </div>
        </div>
      )}

      {/* Players List (Always Visible) */}
      <div className={[panel, 'p-4'].join(' ')}>
        <h2 className="text-sm font-bold mb-2 text-slate-400 uppercase tracking-wider">Scoreboard</h2>
        <div className="space-y-2">
          {Object.entries(gameState.players).map(([id, player]: [string, any]) => (
            <div key={id} className={`flex justify-between items-center p-3 rounded bg-slate-900 
              ${id === winnerId ? 'border border-yellow-500' : ''}
              ${id === controllingPlayer ? 'ring-2 ring-yellow-400' : ''}
              ${!player.online ? 'opacity-50' : ''}
            `}>
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${player.online ? 'bg-green-500' : 'bg-gray-500'}`} title={player.online ? "Online" : "Offline"} />
                <span className="font-medium">{player.name}</span>
                {id === controllingPlayer && <span className="text-yellow-400 text-xs">★ Control</span>}
              </div>
              <span className={`font-mono font-bold ${player.score < 0 ? 'text-red-400' : 'text-green-400'}`}>
                ${player.score.toLocaleString()}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
    </JeopardyShell>
  );
};
