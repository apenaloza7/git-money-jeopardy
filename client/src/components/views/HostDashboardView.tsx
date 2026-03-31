import React, { useEffect, useState } from 'react';
import io, { Socket } from 'socket.io-client';
import { useNavigate } from 'react-router-dom';
import { SERVER_URL } from '../../constants';
import { JeopardyShell } from '../theme/JeopardyShell';
import { Timer } from '../Timer';
import { panel, panelGold, buttonSecondary, buttonPrimary, buttonSuccess, buttonDanger, getScoreColor } from '../theme/theme';

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
    socket.on('state-update', setGameState);
    socket.on('init-game', setGameData);
    socket.on('all-boards-data', setAllBoards);
    
    const requestData = () => {
      socket.emit('request-game-data');
      socket.emit('request-all-boards');
    };

    if (socket.connected) {
      requestData();
    } else {
      socket.on('connect', requestData);
    }

    return () => {
      socket.off('state-update');
      socket.off('init-game');
      socket.off('all-boards-data');
      socket.off('connect');
    };
  }, []);

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
    if (confirm('Re-open this question (mark as unplayed)?')) {
      socket.emit('host-unplay-question', { categoryIndex: catIdx, questionIndex: qIdx });
    }
  };

  const unlockBuzzers = () => socket.emit('host-unlock-buzzers');
  const resetBuzzers = () => socket.emit('host-reset-buzzers');

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
    if (confirm('Reset entire game? This clears all scores and progress.')) {
      socket.emit('host-reset-game');
    }
  };

  const switchBoard = (boardId: string) => {
    if (confirm('Switch boards? This will reset game state.')) {
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

  const setPlayerControl = (playerId: string) => socket.emit('host-set-control', { playerId });

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

  // === LOADING STATE ===
  if (!gameState || !gameData) {
    return (
      <JeopardyShell backgroundMode="viewport">
        <div className="min-h-dvh w-full flex items-center justify-center p-6">
          <div className={`${panel} p-8 text-center max-w-sm w-full`}>
            <h1 className="font-display text-2xl text-amber-400 mb-4">Connecting...</h1>
            <div className="text-sm text-slate-400 space-y-1">
              <div>Socket: {socket.connected ? '✓ Connected' : '⏳ Connecting...'}</div>
              <div>Game Data: {gameData ? '✓ Loaded' : '⏳ Loading...'}</div>
            </div>
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

  const totalQuestions = categories.length * 5;
  const playedCount = gameState.playedQuestions?.length || 0;
  const roundComplete = playedCount >= totalQuestions;

  // === FINAL JEOPARDY ===
  if (round === 'final') {
    const fj = gameData.finalJeopardy;
    const fjWagers = gameState.finalJeopardyWagers || {};
    const fjAnswers = gameState.finalJeopardyAnswers || {};
    const fjRevealed = gameState.finalJeopardyRevealed || [];
    
    const eligiblePlayers = Object.entries(gameState.players)
      .filter(([_, p]: [string, any]) => p.score > 0)
      .map(([id, p]: [string, any]) => ({ id, ...p }));
    
    const sortedForReveal = [...eligiblePlayers].sort((a, b) => a.score - b.score);
    
    return (
      <JeopardyShell backgroundMode="viewport">
        <div className="min-h-dvh w-full flex flex-col">
          {/* Header */}
          <header className="shrink-0 px-4 pt-4 pb-3 border-b border-slate-700/50 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button onClick={() => navigate('/')} className="text-slate-400 hover:text-white p-1">
                ←
              </button>
              <h1 className="font-display text-lg text-amber-400">Final Jeopardy</h1>
            </div>
            {gameState.timerEndTime && <Timer endTime={gameState.timerEndTime} size="sm" showTicks={false} />}
          </header>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
            {/* Category & Clue */}
            <div className={`${panelGold} p-4`}>
              <div className="text-center mb-4">
                <div className="text-amber-300 text-sm uppercase tracking-widest font-bold mb-2">
                  {fj?.category || 'Category'}
                </div>
                {(fjPhase === 'clue' || fjPhase === 'answer' || fjPhase === 'reveal') && (
                  <div className="text-white text-base font-serif">{fj?.clue}</div>
                )}
                {fjPhase === 'reveal' && (
                  <div className="mt-3 p-2 bg-emerald-900/50 rounded-lg inline-block">
                    <span className="text-slate-400 text-xs">Answer: </span>
                    <span className="text-emerald-400 font-bold">{fj?.answer}</span>
                  </div>
                )}
              </div>

              {/* Phase Buttons */}
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: '1. Category', fn: fjShowCategory, active: fjPhase === 'category' },
                  { label: '2. Wagers', fn: fjStartWagers, active: fjPhase === 'wager' },
                  { label: '3. Clue', fn: fjShowClue, active: fjPhase === 'clue' },
                  { label: '4. Think', fn: fjStartAnswers, active: fjPhase === 'answer' },
                  { label: '5. Reveal', fn: fjStartReveal, active: fjPhase === 'reveal' },
                  { label: 'End Game', fn: fjFinish, active: false, variant: 'purple' },
                ].map((btn, i) => (
                  <button
                    key={i}
                    onClick={btn.fn}
                    className={`py-2 px-1 rounded-lg text-xs font-bold transition-all ${
                      btn.active ? 'bg-amber-500 text-slate-900' : 
                      btn.variant === 'purple' ? 'bg-purple-600 hover:bg-purple-500 text-white' :
                      buttonSecondary
                    }`}
                  >
                    {btn.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Players */}
            <div className={`${panel} p-4`}>
              <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
                Players {fjPhase === 'reveal' ? '(Tap to Reveal)' : ''}
              </h2>
              <div className="space-y-3">
                {sortedForReveal.map((player) => {
                  const hasWagered = fjWagers[player.id] !== undefined;
                  const hasAnswered = fjAnswers[player.id] !== undefined;
                  const isRevealed = fjRevealed.includes(player.id);
                  
                  return (
                    <div key={player.id} className={`p-3 rounded-xl bg-slate-900/80 ${isRevealed ? 'opacity-50' : ''}`}>
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-semibold">{player.name}</span>
                        <span className={`font-mono font-bold ${getScoreColor(player.score)}`}>
                          ${player.score.toLocaleString()}
                        </span>
                      </div>
                      
                      <div className="text-xs text-slate-500 mb-2 space-y-0.5">
                        <div>Wager: {hasWagered ? `$${fjWagers[player.id]}` : '...'}</div>
                        <div className="truncate">Answer: {hasAnswered ? `"${fjAnswers[player.id]}"` : '...'}</div>
                      </div>
                      
                      {fjPhase === 'reveal' && !isRevealed && hasWagered && (
                        <div className="grid grid-cols-2 gap-2">
                          <button onClick={() => fjRevealPlayer(player.id, true)} className={`py-2 rounded-lg text-xs font-bold ${buttonSuccess}`}>
                            ✓ Correct
                          </button>
                          <button onClick={() => fjRevealPlayer(player.id, false)} className={`py-2 rounded-lg text-xs font-bold ${buttonDanger}`}>
                            ✗ Wrong
                          </button>
                        </div>
                      )}
                      
                      {isRevealed && <div className="text-center text-slate-600 text-xs">Revealed</div>}
                    </div>
                  );
                })}
                
                {eligiblePlayers.length === 0 && (
                  <div className="text-center text-slate-500 py-4">No eligible players</div>
                )}
              </div>
            </div>
          </div>
        </div>
      </JeopardyShell>
    );
  }

  // === GAME FINISHED ===
  if (round === 'finished') {
    const sortedPlayers = Object.values(gameState.players).sort((a: any, b: any) => b.score - a.score);
    
    return (
      <JeopardyShell backgroundMode="viewport">
        <div className="min-h-dvh w-full flex flex-col items-center justify-center p-6">
          <div className="font-display text-4xl sm:text-5xl text-amber-400 mb-8 text-center">
            GAME OVER
          </div>
          
          <div className="space-y-3 w-full max-w-sm mb-8">
            {sortedPlayers.map((player: any, idx) => (
              <div key={idx} className={`p-4 rounded-xl flex justify-between items-center ${
                idx === 0 ? 'bg-amber-500/20 border-2 border-amber-500' : 'bg-slate-800/80'
              }`}>
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{idx === 0 ? '🏆' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : ''}</span>
                  <span className="font-bold">{player.name}</span>
                </div>
                <span className={`font-mono font-bold text-lg ${getScoreColor(player.score)}`}>
                  ${player.score.toLocaleString()}
                </span>
              </div>
            ))}
          </div>
          
          <button onClick={resetGame} className={`w-full max-w-sm py-3 rounded-xl ${buttonPrimary}`}>
            New Game
          </button>
        </div>
      </JeopardyShell>
    );
  }

  // === MAIN GAME VIEW ===
  return (
    <JeopardyShell backgroundMode="viewport">
      <div className="min-h-dvh w-full flex flex-col">
        {/* Header */}
        <header className="shrink-0 px-4 pt-4 pb-3 border-b border-slate-700/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button onClick={() => navigate('/')} className="text-slate-400 hover:text-white p-1">←</button>
              <div className={`px-3 py-1.5 rounded-full text-xs font-bold uppercase ${
                round === 'double' ? 'bg-purple-600' : 'bg-blue-600'
              }`}>
                {round === 'double' ? 'Double' : 'Jeopardy'}
              </div>
              <span className="text-slate-500 text-xs font-mono">{playedCount}/{totalQuestions}</span>
            </div>
            
            <div className="flex items-center gap-3">
              {gameState.timerEndTime && <Timer endTime={gameState.timerEndTime} size="sm" showTicks={false} />}
            </div>
          </div>
        </header>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
          
          {/* Control Banner */}
          {controllingPlayer && gameState.players[controllingPlayer] && !currentQ && (
            <div className="p-3 bg-amber-500/15 border border-amber-500/40 rounded-xl flex flex-wrap items-center justify-between gap-2">
              <div className="text-sm">
                <span className="text-amber-400 font-bold">{gameState.players[controllingPlayer].name}</span>
                <span className="text-slate-400 ml-1">picks</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {Object.entries(gameState.players).map(([id, player]: [string, any]) => (
                  <button
                    key={id}
                    onClick={() => setPlayerControl(id)}
                    className={`px-2.5 py-1 rounded text-xs font-bold ${
                      id === controllingPlayer 
                        ? 'bg-amber-500 text-slate-900' 
                        : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                    }`}
                  >
                    {player.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Active Question Panel */}
          {currentQ && activeQuestionData ? (
            <div className={`${panelGold} p-4 space-y-4`}>
              {/* Question Info */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  {currentQ.isDailyDouble && (
                    <span className="bg-orange-500 text-slate-900 px-2 py-0.5 rounded text-xs font-bold uppercase">
                      Daily Double
                    </span>
                  )}
                  <span className="text-amber-400 font-bold">
                    ${gameState.currentWager?.amount || activeQuestionData.value}
                  </span>
                </div>
                <p className="text-base font-serif leading-relaxed">{activeQuestionData.question}</p>
                <div className="mt-3 p-3 bg-slate-950/50 border border-amber-400/10 rounded-lg">
                  <span className="text-emerald-400 font-bold text-sm">Answer: </span>
                  <span className="text-emerald-200">{activeQuestionData.answer}</span>
                </div>
              </div>

              {/* Close Buttons */}
              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => closeQuestion(true)} className={`py-3 rounded-xl text-sm font-bold ${buttonSuccess}`}>
                  Close ✓
                </button>
                <button onClick={() => closeQuestion(false)} className={`py-3 rounded-xl text-sm ${buttonSecondary}`}>
                  Unplayed
                </button>
              </div>

              {/* Buzzer Controls */}
              <div className="grid grid-cols-2 gap-2">
                <button 
                  onClick={unlockBuzzers}
                  disabled={!gameState.isBuzzersLocked || !!winnerId || currentQ.isDailyDouble}
                  className={`py-3 rounded-xl font-bold text-sm ${
                    !gameState.isBuzzersLocked ? 'bg-emerald-800 text-emerald-200' :
                    currentQ.isDailyDouble ? 'bg-slate-700 text-slate-500' :
                    buttonSuccess
                  } disabled:cursor-not-allowed`}
                >
                  {gameState.isBuzzersLocked ? 'UNLOCK' : 'OPEN'}
                </button>
                <button onClick={resetBuzzers} className={`py-3 rounded-xl text-sm ${buttonSecondary}`}>
                  RESET
                </button>
              </div>

              {/* Winner Scoring */}
              {winnerName && (
                <div className="bg-slate-900/80 p-4 rounded-xl border border-amber-500/50">
                  <div className="text-center mb-3">
                    <div className="text-slate-500 text-xs uppercase mb-1">Buzzed In</div>
                    <div className="text-xl font-bold text-white">{winnerName}</div>
                    {gameState.currentWager && (
                      <div className="text-amber-400 text-sm mt-1">Wager: ${gameState.currentWager.amount}</div>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button onClick={() => awardPoints(true)} className={`py-3 rounded-xl text-sm font-bold ${buttonSuccess}`}>
                      ✓ Correct
                    </button>
                    <button onClick={() => awardPoints(false)} className={`py-3 rounded-xl text-sm font-bold ${buttonDanger}`}>
                      ✗ Wrong
                    </button>
                  </div>
                </div>
              )}

              {/* Daily Double Waiting */}
              {currentQ.isDailyDouble && !gameState.currentWager && !winnerName && (
                <div className="bg-orange-900/50 p-3 rounded-lg border border-orange-500 text-center">
                  <div className="text-orange-300 font-bold text-sm">Waiting for wager...</div>
                </div>
              )}
            </div>
          ) : (
            /* Board Grid */
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wider">Select Clue</h2>
                <div className="flex gap-2">
                  <button 
                    onClick={() => setShowBoardSelect(!showBoardSelect)}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800/80 text-slate-400 hover:text-white"
                  >
                    Boards
                  </button>
                  <button 
                    onClick={advanceRound}
                    disabled={!roundComplete}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium ${
                      roundComplete ? 'bg-purple-600 text-white' : 'bg-slate-800 text-slate-600'
                    }`}
                  >
                    Next →
                  </button>
                </div>
              </div>

              {/* Board Selector Dropdown */}
              {showBoardSelect && allBoards && (
                <div className="mb-4 p-3 bg-slate-900/80 rounded-xl border border-slate-700">
                  <div className="text-xs text-slate-500 uppercase mb-2">Switch Board</div>
                  <div className="space-y-1">
                    {Object.entries(allBoards.boards).map(([id, board]: [string, any]) => (
                      <button
                        key={id}
                        onClick={() => switchBoard(id)}
                        className={`w-full text-left p-2 rounded-lg text-sm ${
                          allBoards.activeBoardId === id 
                            ? 'bg-blue-900/50 text-blue-300' 
                            : 'text-slate-400 hover:bg-slate-800'
                        }`}
                      >
                        {board.name}
                      </button>
                    ))}
                  </div>
                  <button onClick={resetGame} className="w-full mt-3 py-2 rounded-lg text-xs font-medium bg-red-900/50 text-red-300 hover:bg-red-900/70">
                    Reset Game
                  </button>
                </div>
              )}
              
              {/* Grid */}
              <div className="grid grid-cols-5 gap-1 sm:gap-1.5">
                {categories.map((c, i) => (
                  <div key={i} className="text-[7px] sm:text-[9px] text-center font-bold text-slate-500 uppercase leading-tight px-0.5 pb-1 truncate">
                    {c.name}
                  </div>
                ))}
                
                {Array.from({ length: 5 }).map((_, r) => (
                  categories.map((c, cIdx) => {
                    const isPlayed = gameState.playedQuestions.includes(`${cIdx}-${r}`);
                    const isActive = currentQ?.categoryIndex === cIdx && currentQ?.questionIndex === r;
                    const isDailyDouble = dailyDoubles.includes(`${cIdx}-${r}`);
                    
                    return (
                      <button
                        key={`${cIdx}-${r}`}
                        disabled={!!currentQ}
                        onClick={() => isPlayed ? unplayQuestion(cIdx, r) : openQuestion(cIdx, r)}
                        className={`aspect-square flex items-center justify-center font-bold text-xs sm:text-sm rounded-lg transition-all relative ${
                          isPlayed ? 'bg-slate-800/50 text-slate-700' :
                          isActive ? 'bg-amber-500 text-slate-900 animate-pulse' :
                          isDailyDouble ? 'bg-orange-600 text-amber-200 ring-1 ring-orange-400' :
                          'bg-blue-700 text-amber-300 hover:bg-blue-600 active:scale-95'
                        }`}
                      >
                        ${c.questions[r]?.value || 0}
                        {isDailyDouble && !isPlayed && <span className="absolute top-0.5 left-0.5 text-[8px]">★</span>}
                      </button>
                    );
                  })
                ))}
              </div>
            </div>
          )}

          {/* Scoreboard */}
          <div className={`${panel} p-4`}>
            <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Scoreboard</h2>
            <div className="space-y-2">
              {Object.entries(gameState.players).map(([id, player]: [string, any]) => (
                <div key={id} className={`flex justify-between items-center p-3 rounded-xl bg-slate-900/80 ${
                  id === winnerId ? 'border border-amber-500' : ''
                } ${id === controllingPlayer ? 'ring-2 ring-amber-400' : ''} ${!player.online ? 'opacity-50' : ''}`}>
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${player.online ? 'bg-emerald-500' : 'bg-slate-600'}`} />
                    <span className="font-medium text-sm">{player.name}</span>
                    {id === controllingPlayer && <span className="text-amber-400 text-xs">★</span>}
                  </div>
                  <span className={`font-mono font-bold ${getScoreColor(player.score)}`}>
                    ${player.score.toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </JeopardyShell>
  );
};
