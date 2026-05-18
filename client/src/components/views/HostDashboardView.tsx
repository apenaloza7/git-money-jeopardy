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

  const openQuestion  = (catIdx: number, qIdx: number) => socket.emit('host-open-question', { categoryIndex: catIdx, questionIndex: qIdx });
  const closeQuestion = (markAsPlayed: boolean) => socket.emit('host-close-question', { markAsPlayed });
  const unplayQuestion = (catIdx: number, qIdx: number) => {
    if (confirm('Re-open this question (mark as unplayed)?')) {
      socket.emit('host-unplay-question', { categoryIndex: catIdx, questionIndex: qIdx });
    }
  };
  const unlockBuzzers = () => socket.emit('host-unlock-buzzers');
  const resetBuzzers  = () => socket.emit('host-reset-buzzers');

  const awardPoints = (isCorrect: boolean) => {
    if (gameState.activePlayer) {
      const value  = gameState.currentWager?.amount || gameState.currentQuestion?.value || 0;
      const points = isCorrect ? value : -value;
      socket.emit('host-award-points', { playerId: gameState.activePlayer, points, isCorrect });
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
    const next = gameState.round === 'jeopardy' ? 'Double Jeopardy'
               : gameState.round === 'double'   ? 'Final Jeopardy' : 'End';
    if (confirm(`Advance to ${next}?`)) {
      socket.emit('host-advance-round');
    }
  };

  const setPlayerControl = (playerId: string) => socket.emit('host-set-control', { playerId });

  // Final Jeopardy controls
  const fjShowCategory = () => socket.emit('host-fj-show-category');
  const fjStartWagers  = () => socket.emit('host-fj-start-wagers');
  const fjShowClue     = () => socket.emit('host-fj-show-clue');
  const fjStartAnswers = () => socket.emit('host-fj-start-answers');
  const fjStartReveal  = () => socket.emit('host-fj-start-reveal');
  const fjRevealPlayer = (playerId: string, isCorrect: boolean) => socket.emit('host-fj-reveal-player', { playerId, isCorrect });
  const fjFinish       = () => socket.emit('host-fj-finish');

  // ── Loading ──
  if (!gameState || !gameData) {
    return (
      <JeopardyShell backgroundMode="viewport" safeArea={false}>
        <div className="w-full flex items-center justify-center" style={{ minHeight: '100dvh', padding: '1.5rem' }}>
          <div className={`${panel} p-8 text-center max-w-sm w-full`}>
            <div
              className="font-display text-2xl text-amber-400 mb-4"
              style={{ textShadow: '0 0 20px rgba(228,181,69,0.3)' }}
            >
              Connecting…
            </div>
            <div className="text-sm space-y-1" style={{ color: '#4a5880' }}>
              <div>Socket: {socket.connected ? '✓ Connected' : '⏳ Connecting…'}</div>
              <div>Game Data: {gameData ? '✓ Loaded' : '⏳ Loading…'}</div>
            </div>
          </div>
        </div>
      </JeopardyShell>
    );
  }

  const round: Round  = gameState.round || 'jeopardy';
  const fjPhase: FJPhase = gameState.finalJeopardyPhase;
  const currentQ = gameState.currentQuestion;
  const activeQuestionData = currentQ && categories.length > 0
    ? categories[currentQ.categoryIndex]?.questions?.[currentQ.questionIndex]
    : null;

  const winnerId       = gameState.activePlayer;
  const winnerName     = winnerId ? gameState.players[winnerId]?.name : null;
  const controllingPlayer = gameState.controllingPlayer;
  const dailyDoubles   = gameState.dailyDoubles || [];

  const totalQuestions = categories.length * 5;
  const playedCount    = gameState.playedQuestions?.length || 0;
  const roundComplete  = playedCount >= totalQuestions;

  // ── FINAL JEOPARDY ──
  if (round === 'final') {
    const fj = gameData.finalJeopardy;
    const fjWagers   = gameState.finalJeopardyWagers  || {};
    const fjAnswers  = gameState.finalJeopardyAnswers  || {};
    const fjRevealed = gameState.finalJeopardyRevealed || [];

    const eligiblePlayers = Object.entries(gameState.players)
      .filter(([_, p]: [string, any]) => p.score > 0)
      .map(([id, p]: [string, any]) => ({ id, ...p }));

    const sortedForReveal = [...eligiblePlayers].sort((a, b) => a.score - b.score);

    return (
      <JeopardyShell backgroundMode="viewport" safeArea={false}>
        <div className="w-full flex flex-col" style={{ minHeight: '100dvh' }}>
          <header
            className="shrink-0 flex items-center justify-between"
            style={{ padding: 'clamp(0.75rem, 2vw, 1.25rem) clamp(1rem, 3vw, 1.75rem)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}
          >
            <div className="flex items-center gap-3">
              <button onClick={() => navigate('/')} className="text-slate-500 hover:text-white p-1 transition-colors">←</button>
              <h1 className="font-display text-lg text-amber-400">Final Jeopardy</h1>
            </div>
            {gameState.timerEndTime && <Timer endTime={gameState.timerEndTime} size="sm" showTicks={false} />}
          </header>

          <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
            {/* Category & Clue */}
            <div className={`${panelGold} p-4`}>
              <div className="text-center mb-4">
                <div
                  className="font-display text-sm text-amber-400 uppercase tracking-widest mb-2"
                  style={{ textShadow: '0 0 12px rgba(228,181,69,0.3)' }}
                >
                  {fj?.category || 'Category'}
                </div>
                {(fjPhase === 'clue' || fjPhase === 'answer' || fjPhase === 'reveal') && (
                  <div className="text-white text-base font-serif leading-relaxed">{fj?.clue}</div>
                )}
                {fjPhase === 'reveal' && (
                  <div
                    className="mt-3 px-3 py-2 rounded-lg inline-block"
                    style={{ background: 'rgba(21,128,61,0.3)', border: '1px solid rgba(34,197,94,0.3)' }}
                  >
                    <span className="text-slate-400 text-xs">Answer: </span>
                    <span className="text-emerald-400 font-bold">{fj?.answer}</span>
                  </div>
                )}
              </div>

              {/* Phase Buttons */}
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: '1. Category', fn: fjShowCategory, active: fjPhase === 'category' },
                  { label: '2. Wagers',   fn: fjStartWagers,  active: fjPhase === 'wager' },
                  { label: '3. Clue',     fn: fjShowClue,     active: fjPhase === 'clue' },
                  { label: '4. Think',    fn: fjStartAnswers,  active: fjPhase === 'answer' },
                  { label: '5. Reveal',   fn: fjStartReveal,  active: fjPhase === 'reveal' },
                  { label: 'End Game',    fn: fjFinish,        active: false, variant: 'purple' },
                ].map((btn, i) => (
                  <button
                    key={i}
                    onClick={btn.fn}
                    className={`py-2 px-1 rounded-lg text-xs font-bold transition-all ${
                      btn.active
                        ? 'text-slate-900'
                        : btn.variant === 'purple'
                        ? 'bg-purple-600 hover:bg-purple-500 text-white'
                        : buttonSecondary
                    }`}
                    style={btn.active ? { background: 'linear-gradient(135deg, #e4b545, #c49030)', color: '#0a0800' } : {}}
                  >
                    {btn.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Players */}
            <div className={`${panel} p-4`}>
              <h2 className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: '#4a5880' }}>
                Players {fjPhase === 'reveal' ? '(Tap to Reveal)' : ''}
              </h2>
              <div className="space-y-3">
                {sortedForReveal.map((player) => {
                  const hasWagered  = fjWagers[player.id]  !== undefined;
                  const hasAnswered = fjAnswers[player.id]  !== undefined;
                  const isRevealed  = fjRevealed.includes(player.id);

                  return (
                    <div
                      key={player.id}
                      className={`p-3 rounded-xl ${isRevealed ? 'opacity-50' : ''}`}
                      style={{ background: 'rgba(3,4,12,0.7)', border: '1px solid rgba(255,255,255,0.05)' }}
                    >
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-semibold text-white">{player.name}</span>
                        <span className={`font-mono-game font-bold ${getScoreColor(player.score)}`}>
                          ${player.score.toLocaleString()}
                        </span>
                      </div>
                      <div className="text-xs mb-2 space-y-0.5" style={{ color: '#4a5880' }}>
                        <div>Wager: {hasWagered ? `$${fjWagers[player.id].toLocaleString()}` : '…'}</div>
                        <div className="truncate">Answer: {hasAnswered ? `"${fjAnswers[player.id]}"` : '…'}</div>
                      </div>
                      {fjPhase === 'reveal' && !isRevealed && hasWagered && (
                        <div className="grid grid-cols-2 gap-2">
                          <button onClick={() => fjRevealPlayer(player.id, true)}  className={`py-2 rounded-lg text-xs font-bold ${buttonSuccess}`}>✓ Correct</button>
                          <button onClick={() => fjRevealPlayer(player.id, false)} className={`py-2 rounded-lg text-xs font-bold ${buttonDanger}`}>✗ Wrong</button>
                        </div>
                      )}
                      {isRevealed && <div className="text-center text-xs" style={{ color: '#4a5880' }}>Revealed</div>}
                    </div>
                  );
                })}
                {eligiblePlayers.length === 0 && (
                  <div className="text-center py-4 text-sm" style={{ color: '#4a5880' }}>No eligible players</div>
                )}
              </div>
            </div>
          </div>
        </div>
      </JeopardyShell>
    );
  }

  // ── GAME FINISHED ──
  if (round === 'finished') {
    const sortedPlayers = Object.values(gameState.players).sort((a: any, b: any) => b.score - a.score);
    return (
      <JeopardyShell backgroundMode="viewport" safeArea={false}>
        <div className="w-full flex flex-col items-center justify-center" style={{ minHeight: '100dvh', padding: 'clamp(2rem, 5vw, 4rem)' }}>
          <div
            className="font-display text-4xl sm:text-5xl text-amber-400 mb-8 text-center"
            style={{ textShadow: '0 0 40px rgba(228,181,69,0.4)' }}
          >
            GAME OVER
          </div>
          <div className="space-y-3 w-full max-w-sm mb-8">
            {sortedPlayers.map((player: any, idx) => (
              <div
                key={idx}
                className="p-4 rounded-xl flex justify-between items-center"
                style={
                  idx === 0
                    ? {
                        background: 'rgba(120,80,0,0.2)',
                        border: '2px solid rgba(228,181,69,0.45)',
                        boxShadow: '0 0 24px rgba(228,181,69,0.1)',
                      }
                    : { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }
                }
              >
                <div className="flex items-center gap-3">
                  <span className="text-xl">{idx === 0 ? '🏆' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : ''}</span>
                  <span className="font-bold text-white">{player.name}</span>
                </div>
                <span className={`font-mono-game font-bold text-lg ${getScoreColor(player.score)}`}>
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

  // ── MAIN GAME VIEW ──
  return (
    <JeopardyShell backgroundMode="viewport" safeArea={false}>
      <div className="w-full flex flex-col" style={{ minHeight: '100dvh' }}>
        {/* Header */}
        <header
          className="shrink-0"
          style={{ padding: 'clamp(0.75rem, 2vw, 1.25rem) clamp(1rem, 3vw, 1.75rem)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button onClick={() => navigate('/')} className="text-slate-500 hover:text-white p-1 transition-colors">←</button>
              <div
                className="px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest"
                style={
                  round === 'double'
                    ? { background: 'rgba(88,28,135,0.5)', color: '#d8b4fe', border: '1px solid rgba(167,139,250,0.3)' }
                    : { background: 'rgba(14,30,120,0.5)', color: '#93c5fd', border: '1px solid rgba(59,130,246,0.3)' }
                }
              >
                {round === 'double' ? 'Double' : 'Jeopardy'}
              </div>
              <span className="font-mono-game text-xs" style={{ color: '#4a5880' }}>
                {playedCount}/{totalQuestions}
              </span>
            </div>
            <div className="flex items-center gap-3">
              {gameState.timerEndTime && <Timer endTime={gameState.timerEndTime} size="sm" showTicks={false} />}
            </div>
          </div>
        </header>

        {/* Content */}
        <div className="flex-1 overflow-y-auto custom-scrollbar" style={{ padding: 'clamp(0.75rem, 2vw, 1.25rem)', display: 'flex', flexDirection: 'column', gap: 'clamp(0.75rem, 2vw, 1.25rem)' }}>

          {/* Control Banner */}
          {controllingPlayer && gameState.players[controllingPlayer] && !currentQ && (
            <div
              className="p-3 rounded-xl flex flex-wrap items-center justify-between gap-2"
              style={{
                background: 'rgba(120,80,0,0.15)',
                border: '1px solid rgba(228,181,69,0.35)',
              }}
            >
              <div className="text-sm">
                <span className="font-bold" style={{ color: '#e4b545' }}>{gameState.players[controllingPlayer].name}</span>
                <span className="text-slate-400 ml-1">picks</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {Object.entries(gameState.players).map(([id, player]: [string, any]) => (
                  <button
                    key={id}
                    onClick={() => setPlayerControl(id)}
                    className="px-2.5 py-1 rounded text-xs font-bold transition-all"
                    style={
                      id === controllingPlayer
                        ? { background: 'linear-gradient(135deg, #e4b545, #c49030)', color: '#0a0800' }
                        : { background: 'rgba(255,255,255,0.06)', color: '#8a9cc8', border: '1px solid rgba(255,255,255,0.08)' }
                    }
                    onMouseEnter={(e) => { if (id !== controllingPlayer) e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; }}
                    onMouseLeave={(e) => { if (id !== controllingPlayer) e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; }}
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
              <div>
                <div className="flex items-center gap-2 mb-2">
                  {currentQ.isDailyDouble && (
                    <span
                      className="px-2 py-0.5 rounded text-xs font-bold uppercase"
                      style={{ background: 'linear-gradient(135deg, #92400e, #b45309)', color: '#fde68a' }}
                    >
                      Daily Double
                    </span>
                  )}
                  <span className="font-mono-game text-amber-400 font-bold">
                    ${(gameState.currentWager?.amount || activeQuestionData.value).toLocaleString()}
                  </span>
                </div>
                <p className="text-base font-serif leading-relaxed text-white">{activeQuestionData.question}</p>
                <div
                  className="mt-3 p-3 rounded-lg"
                  style={{ background: 'rgba(3,4,12,0.6)', border: '1px solid rgba(228,181,69,0.1)' }}
                >
                  <span className="text-emerald-400 font-bold text-sm">Answer: </span>
                  <span className="text-emerald-200">{activeQuestionData.answer}</span>
                </div>
              </div>

              {/* Close Buttons */}
              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => closeQuestion(true)}  className={`py-3 rounded-xl text-sm font-bold ${buttonSuccess}`}>Close ✓</button>
                <button onClick={() => closeQuestion(false)} className={`py-3 rounded-xl text-sm ${buttonSecondary}`}>Unplayed</button>
              </div>

              {/* Buzzer Controls */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={unlockBuzzers}
                  disabled={!gameState.isBuzzersLocked || !!winnerId || currentQ.isDailyDouble}
                  className={`py-3 rounded-xl font-bold text-sm disabled:cursor-not-allowed ${
                    !gameState.isBuzzersLocked ? 'bg-emerald-900 text-emerald-300' :
                    currentQ.isDailyDouble ? 'bg-slate-800 text-slate-600' :
                    buttonSuccess
                  }`}
                >
                  {gameState.isBuzzersLocked ? 'UNLOCK' : 'OPEN'}
                </button>
                <button onClick={resetBuzzers} className={`py-3 rounded-xl text-sm ${buttonSecondary}`}>RESET</button>
              </div>

              {/* Winner Scoring */}
              {winnerName && (
                <div
                  className="p-4 rounded-xl"
                  style={{ background: 'rgba(3,4,12,0.7)', border: '1px solid rgba(228,181,69,0.4)' }}
                >
                  <div className="text-center mb-3">
                    <div className="text-xs uppercase tracking-widest mb-1" style={{ color: '#4a5880' }}>Buzzed In</div>
                    <div className="text-xl font-bold text-white">{winnerName}</div>
                    {gameState.currentWager && (
                      <div className="font-mono-game text-amber-400 text-sm mt-1">Wager: ${gameState.currentWager.amount.toLocaleString()}</div>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button onClick={() => awardPoints(true)}  className={`py-3 rounded-xl text-sm font-bold ${buttonSuccess}`}>✓ Correct</button>
                    <button onClick={() => awardPoints(false)} className={`py-3 rounded-xl text-sm font-bold ${buttonDanger}`}>✗ Wrong</button>
                  </div>
                </div>
              )}

              {/* Daily Double Waiting */}
              {currentQ.isDailyDouble && !gameState.currentWager && !winnerName && (
                <div
                  className="p-3 rounded-lg text-center"
                  style={{ background: 'rgba(146,64,14,0.3)', border: '1px solid rgba(180,83,9,0.4)' }}
                >
                  <div className="text-sm font-bold" style={{ color: '#fde68a' }}>Waiting for wager…</div>
                </div>
              )}
            </div>
          ) : (
            /* Board Grid */
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-bold uppercase tracking-widest" style={{ color: '#4a5880' }}>Select Clue</h2>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowBoardSelect(!showBoardSelect)}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                    style={{ background: 'rgba(255,255,255,0.05)', color: '#8a9cc8', border: '1px solid rgba(255,255,255,0.07)' }}
                  >
                    Boards
                  </button>
                  <button
                    onClick={advanceRound}
                    disabled={!roundComplete}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      roundComplete ? '' : 'opacity-40 cursor-not-allowed'
                    }`}
                    style={roundComplete ? { background: 'rgba(88,28,135,0.6)', color: '#d8b4fe', border: '1px solid rgba(167,139,250,0.3)' } : { background: 'rgba(255,255,255,0.04)', color: '#4a5880' }}
                  >
                    Next →
                  </button>
                </div>
              </div>

              {/* Board Selector */}
              {showBoardSelect && allBoards && (
                <div
                  className="mb-4 p-3 rounded-xl"
                  style={{ background: 'rgba(3,4,12,0.8)', border: '1px solid rgba(255,255,255,0.07)' }}
                >
                  <div className="text-xs uppercase tracking-widest mb-2 font-semibold" style={{ color: '#4a5880' }}>Switch Board</div>
                  <div className="space-y-1">
                    {Object.entries(allBoards.boards).map(([id, board]: [string, any]) => (
                      <button
                        key={id}
                        onClick={() => switchBoard(id)}
                        className="w-full text-left p-2 rounded-lg text-sm transition-all"
                        style={
                          allBoards.activeBoardId === id
                            ? { background: 'rgba(14,30,120,0.5)', color: '#93c5fd' }
                            : { color: '#8a9cc8' }
                        }
                        onMouseEnter={(e) => { if (allBoards.activeBoardId !== id) e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; }}
                        onMouseLeave={(e) => { if (allBoards.activeBoardId !== id) e.currentTarget.style.background = ''; }}
                      >
                        {board.name}
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={resetGame}
                    className="w-full mt-3 py-2 rounded-lg text-xs font-medium transition-all"
                    style={{ background: 'rgba(127,29,29,0.4)', color: '#fca5a5', border: '1px solid rgba(239,68,68,0.2)' }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(127,29,29,0.6)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(127,29,29,0.4)'; }}
                  >
                    Reset Game
                  </button>
                </div>
              )}

              {/* Grid */}
              <div className="grid grid-cols-5 gap-1 sm:gap-1.5">
                {categories.map((c, i) => (
                  <div
                    key={i}
                    className="text-[7px] sm:text-[9px] text-center font-bold uppercase leading-tight px-0.5 pb-1 truncate"
                    style={{ color: '#4a5880' }}
                  >
                    {c.name}
                  </div>
                ))}

                {Array.from({ length: 5 }).map((_, r) => (
                  categories.map((c, cIdx) => {
                    const isPlayed     = gameState.playedQuestions.includes(`${cIdx}-${r}`);
                    const isActive     = currentQ?.categoryIndex === cIdx && currentQ?.questionIndex === r;
                    const isDailyDouble = dailyDoubles.includes(`${cIdx}-${r}`);

                    return (
                      <button
                        key={`${cIdx}-${r}`}
                        disabled={!!currentQ}
                        onClick={() => isPlayed ? unplayQuestion(cIdx, r) : openQuestion(cIdx, r)}
                        className={`aspect-square flex items-center justify-center font-bold text-xs sm:text-sm rounded-lg transition-all relative jeopardy-tile${isPlayed ? ' played' : ''}`}
                        style={
                          isActive
                            ? { background: 'linear-gradient(135deg, #e4b545, #c49030)', color: '#0a0800' }
                            : isDailyDouble && !isPlayed
                            ? {}
                            : {}
                        }
                      >
                        {!isPlayed && (
                          <span
                            className="font-mono-game text-xs sm:text-sm font-bold"
                            style={{ color: isDailyDouble ? '#fde68a' : '#e4b545' }}
                          >
                            ${c.questions[r]?.value || 0}
                          </span>
                        )}
                        {isDailyDouble && !isPlayed && (
                          <span className="absolute top-0.5 left-0.5 text-[8px]" style={{ color: '#fde68a' }}>★</span>
                        )}
                      </button>
                    );
                  })
                ))}
              </div>
            </div>
          )}

          {/* Scoreboard */}
          <div className={`${panel} p-4`}>
            <h2 className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: '#4a5880' }}>Scoreboard</h2>
            <div className="space-y-2">
              {Object.entries(gameState.players).map(([id, player]: [string, any]) => (
                <div
                  key={id}
                  className={`flex justify-between items-center p-3 rounded-xl transition-all ${!player.online ? 'opacity-50' : ''}`}
                  style={{
                    background: 'rgba(3,4,12,0.6)',
                    border: id === winnerId
                      ? '1px solid rgba(228,181,69,0.45)'
                      : id === controllingPlayer
                      ? '1px solid rgba(228,181,69,0.3)'
                      : '1px solid rgba(255,255,255,0.04)',
                    boxShadow: id === controllingPlayer ? '0 0 0 1px rgba(228,181,69,0.15)' : 'none',
                  }}
                >
                  <div className="flex items-center gap-2">
                    <div
                      className="w-2 h-2 rounded-full"
                      style={{ background: player.online ? '#22c55e' : '#374151', boxShadow: player.online ? '0 0 6px rgba(34,197,94,0.5)' : 'none' }}
                    />
                    <span className="font-medium text-sm text-white">{player.name}</span>
                    {id === controllingPlayer && <span style={{ color: '#e4b545' }} className="text-xs">★</span>}
                  </div>
                  <span className={`font-mono-game font-bold ${getScoreColor(player.score)}`}>
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
