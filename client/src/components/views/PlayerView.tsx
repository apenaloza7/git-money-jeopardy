import React, { useEffect, useState } from 'react';
import io, { Socket } from 'socket.io-client';
import { RulesModal } from '../RulesModal';
import { WagerModal } from '../WagerModal';
import { Timer } from '../Timer';
import { playLock, playCorrect, playWrong, playDailyDoubleReveal, playThinkMusic, stopThinkMusic } from '../../utils/audio';
import { JeopardyShell } from '../theme/JeopardyShell';
import { buttonPrimary, focusRing, panelGold, getScoreColor } from '../theme/theme';
import {
  SERVER_URL,
  PENALTY_LOCK_DURATION_MS,
  FEEDBACK_DURATION_MS,
  PLAYER_NAME_MAX_LENGTH,
} from '../../constants';

const socket: Socket = io(SERVER_URL);

type Round = 'jeopardy' | 'double' | 'final' | 'finished';
type FJPhase = 'category' | 'wager' | 'clue' | 'answer' | 'reveal' | null;

interface Player {
  id: string;
  name: string;
  score: number;
  online: boolean;
}

export const PlayerView: React.FC = () => {
  const [name, setName] = useState('');
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [hasJoined, setHasJoined] = useState(false);
  const [isLocked, setIsLocked] = useState(true);
  const [winner, setWinner] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [feedback, setFeedback] = useState<{type: 'correct'|'wrong', points: number} | null>(null);
  const [isPenaltyLocked, setIsPenaltyLocked] = useState(false);
  const [showRules, setShowRules] = useState(false);

  const [round, setRound] = useState<Round>('jeopardy');
  const [timerEndTime, setTimerEndTime] = useState<number | null>(null);
  const [showWagerModal, setShowWagerModal] = useState(false);
  const [currentQuestionValue, setCurrentQuestionValue] = useState(0);

  const [controllingPlayer, setControllingPlayer] = useState<string | null>(null);
  const [players, setPlayers] = useState<Record<string, Player>>({});
  const [hasActiveQuestion, setHasActiveQuestion] = useState(false);

  // Final Jeopardy
  const [fjPhase, setFjPhase] = useState<FJPhase>(null);
  const [fjCategory, setFjCategory] = useState('');
  const [fjClue, setFjClue] = useState('');
  const [myFjWager, setMyFjWager] = useState<number | null>(null);
  const [fjAnswer, setFjAnswer] = useState('');
  const [fjAnswerSubmitted, setFjAnswerSubmitted] = useState(false);

  useEffect(() => {
    const storedId = localStorage.getItem('jeopardy_player_id');
    const storedName = localStorage.getItem('jeopardy_player_name');
    if (storedId && storedName) {
      setPlayerId(storedId);
      setName(storedName);
      setHasJoined(true);
      socket.emit('join-game', { playerId: storedId, name: storedName });
    }
  }, []);

  useEffect(() => {
    socket.on('state-update', (state: any) => {
      setIsLocked(state.isBuzzersLocked);
      setWinner(state.activePlayer);
      setRound(state.round || 'jeopardy');
      setTimerEndTime(state.timerEndTime);
      setControllingPlayer(state.controllingPlayer);
      setPlayers(state.players || {});
      setHasActiveQuestion(!!state.currentQuestion);

      const myId = playerId || localStorage.getItem('jeopardy_player_id');
      if (myId && state.players?.[myId]) {
        setScore(state.players[myId].score);
      }
      if (state.currentQuestion) {
        setCurrentQuestionValue(state.currentQuestion.value || 0);
      }
      setFjPhase(state.finalJeopardyPhase);
      if (myId && state.finalJeopardyWagers?.[myId] !== undefined) {
        setMyFjWager(state.finalJeopardyWagers[myId]);
      }
      if (myId && state.finalJeopardyAnswers?.[myId] !== undefined) {
        setFjAnswerSubmitted(true);
      }
    });

    socket.on('init-game', (data: any) => {
      if (data.finalJeopardy) {
        setFjCategory(data.finalJeopardy.category);
        setFjClue(data.finalJeopardy.clue);
      }
    });

    socket.on('feedback', (data: any) => {
      const myId = playerId || localStorage.getItem('jeopardy_player_id');
      if (data.playerId === myId) {
        if (data.type === 'correct') playCorrect();
        else playWrong();
        setFeedback(data);
        setTimeout(() => setFeedback(null), FEEDBACK_DURATION_MS);
      }
    });

    socket.on('daily-double', (data: any) => {
      const myId = playerId || localStorage.getItem('jeopardy_player_id');
      if (data.playerId === myId) {
        playDailyDoubleReveal();
        setShowWagerModal(true);
      }
    });

    socket.on('wager-confirmed', () => setShowWagerModal(false));
    socket.on('final-jeopardy-think', () => playThinkMusic());
    socket.on('timer-expired', () => stopThinkMusic());
    socket.on('game-reset', () => {
      setMyFjWager(null);
      setFjAnswer('');
      setFjAnswerSubmitted(false);
      stopThinkMusic();
    });

    return () => {
      socket.off('connect');
      socket.off('state-update');
      socket.off('init-game');
      socket.off('feedback');
      socket.off('daily-double');
      socket.off('wager-confirmed');
      socket.off('final-jeopardy-think');
      socket.off('timer-expired');
      socket.off('game-reset');
      stopThinkMusic();
    };
  }, [playerId]);

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      const newId = crypto?.randomUUID?.() || `player-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem('jeopardy_player_id', newId);
      localStorage.setItem('jeopardy_player_name', name);
      setPlayerId(newId);
      setHasJoined(true);
      socket.emit('join-game', { playerId: newId, name });
    }
  };

  const handleBuzz = () => {
    if (isPenaltyLocked) return;
    playLock();
    if (isLocked) {
      setIsPenaltyLocked(true);
      setTimeout(() => setIsPenaltyLocked(false), PENALTY_LOCK_DURATION_MS);
      return;
    }
    if (!winner) {
      socket.emit('buzz');
    }
  };

  const handleWagerSubmit = (amount: number) => {
    socket.emit('submit-wager', { amount });
    setShowWagerModal(false);
  };

  const handleFjWagerSubmit = (amount: number) => {
    socket.emit('submit-wager', { amount });
    setMyFjWager(amount);
  };

  const handleFjAnswerSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    socket.emit('submit-final-answer', { answer: fjAnswer });
    setFjAnswerSubmitted(true);
  };

  // ========== JOIN SCREEN ==========
  if (!hasJoined) {
    return (
      <JeopardyShell backgroundMode="viewport" safeArea={false} className="lg:h-dvh lg:overflow-hidden">
        <div
          className="w-full flex items-center justify-center"
          style={{ minHeight: '100dvh', padding: 'clamp(1.5rem, 4vw, 3rem) clamp(1rem, 3vw, 2rem)' }}
        >
          <div
            className={`${panelGold} w-full animate-scale-in`}
            style={{ maxWidth: 'clamp(300px, 44vw, 440px)', padding: 'clamp(2rem, 5vw, 3.5rem)' }}
          >
            {/* Logo */}
            <div className="text-center" style={{ marginBottom: 'clamp(2rem, 4vw, 3rem)' }}>
              <div
                className="font-display text-amber-400 leading-none"
                style={{
                  fontSize: 'clamp(3rem, 8vw, 4.5rem)',
                  textShadow: '0 0 40px rgba(228,181,69,0.45)',
                  marginBottom: '0.25rem',
                }}
              >
                GIT MONEY
              </div>
              <div
                className="font-display tracking-[0.35em] text-blue-300"
                style={{ fontSize: 'clamp(0.85rem, 2.5vw, 1.2rem)' }}
              >
                JEOPARDY
              </div>
              <div
                style={{
                  width: '3rem',
                  height: '1px',
                  background: 'linear-gradient(90deg, transparent, rgba(228,181,69,0.6), transparent)',
                  margin: 'clamp(1rem, 2vw, 1.5rem) auto 0',
                }}
              />
            </div>

            <h2
              className="font-display text-white text-center tracking-wider"
              style={{
                fontSize: 'clamp(1.75rem, 4vw, 2.5rem)',
                marginBottom: '0.5rem',
              }}
            >
              JOIN GAME
            </h2>
            <p
              className="text-center tracking-wide"
              style={{
                color: '#4a5880',
                fontSize: 'clamp(0.8rem, 1.5vw, 1rem)',
                marginBottom: 'clamp(1.5rem, 3vw, 2.5rem)',
              }}
            >
              Enter your name to play
            </p>

            <form onSubmit={handleJoin} style={{ display: 'flex', flexDirection: 'column', gap: 'clamp(0.875rem, 2vw, 1.25rem)' }}>
              <input
                type="text"
                placeholder="Your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={`w-full text-white text-center font-semibold placeholder:text-slate-600 ${focusRing}`}
                style={{
                  padding: 'clamp(0.875rem, 2vw, 1.25rem) 1.25rem',
                  fontSize: 'clamp(1rem, 2.5vw, 1.35rem)',
                  borderRadius: '0.875rem',
                  background: 'rgba(3,4,12,0.7)',
                  border: '2px solid rgba(228,181,69,0.25)',
                  outline: 'none',
                }}
                onFocus={(e) => { e.target.style.borderColor = 'rgba(228,181,69,0.55)'; }}
                onBlur={(e) => { e.target.style.borderColor = 'rgba(228,181,69,0.25)'; }}
                maxLength={PLAYER_NAME_MAX_LENGTH}
                autoFocus
                autoComplete="off"
                autoCapitalize="words"
              />
              <button
                type="submit"
                disabled={!name.trim()}
                className={`w-full font-bold disabled:opacity-40 disabled:cursor-not-allowed ${buttonPrimary}`}
                style={{
                  padding: 'clamp(0.875rem, 2vw, 1.25rem)',
                  fontSize: 'clamp(0.9rem, 1.8vw, 1.1rem)',
                  borderRadius: '0.875rem',
                }}
              >
                Enter Game
              </button>
            </form>
          </div>
        </div>
      </JeopardyShell>
    );
  }

  // ========== FINAL JEOPARDY ==========
  if (round === 'final') {
    const canWager = fjPhase === 'wager' && score > 0 && myFjWager === null;
    const canAnswer = fjPhase === 'answer' && myFjWager !== null && !fjAnswerSubmitted;

    return (
      <JeopardyShell backgroundMode="viewport" safeArea={false} className="lg:h-dvh lg:overflow-hidden">
        <div className="w-full flex flex-col" style={{ minHeight: '100dvh' }}>
          <header
            className="shrink-0 flex items-center justify-between"
            style={{
              padding: 'clamp(1rem, 2.5vw, 1.75rem) clamp(1rem, 3vw, 2rem)',
              borderBottom: '1px solid rgba(255,255,255,0.05)',
            }}
          >
            <div>
              <div
                className="uppercase tracking-widest font-bold"
                style={{ fontSize: 'clamp(0.6rem, 1vw, 0.7rem)', color: '#4a5880', marginBottom: '0.25rem' }}
              >
                Final Jeopardy
              </div>
              <div
                className="font-display text-amber-400 truncate"
                style={{
                  fontSize: 'clamp(1rem, 2.5vw, 1.5rem)',
                  maxWidth: '60vw',
                  textShadow: '0 0 16px rgba(228,181,69,0.3)',
                }}
              >
                {fjCategory}
              </div>
            </div>
            <div className="flex items-center gap-5">
              <div className="text-right">
                <div
                  className="uppercase tracking-widest"
                  style={{ fontSize: 'clamp(0.6rem, 1vw, 0.7rem)', color: '#4a5880', marginBottom: '0.25rem' }}
                >
                  Score
                </div>
                <div className={`font-mono-game font-bold ${getScoreColor(score)}`}
                  style={{ fontSize: 'clamp(1.4rem, 3.5vw, 2rem)' }}>
                  ${score.toLocaleString()}
                </div>
              </div>
              {timerEndTime && <Timer endTime={timerEndTime} size="sm" />}
            </div>
          </header>

          <main className="flex-1 flex flex-col items-center justify-center" style={{ padding: 'clamp(1.5rem, 4vw, 3rem)' }}>
            {canWager && (
              <WagerModal
                isOpen={true}
                playerScore={score}
                questionValue={0}
                isDailyDouble={false}
                onSubmit={handleFjWagerSubmit}
              />
            )}

            {fjPhase === 'wager' && !canWager && (
              <div className="text-center animate-scale-in">
                {myFjWager !== null ? (
                  <>
                    <div className="font-bold text-emerald-400" style={{ fontSize: 'clamp(1.25rem, 3vw, 1.75rem)', marginBottom: '0.75rem' }}>Wager Locked!</div>
                    <div className="font-mono-game font-bold text-white" style={{ fontSize: 'clamp(2.5rem, 7vw, 4rem)', marginBottom: '1rem' }}>${myFjWager.toLocaleString()}</div>
                    <div style={{ color: '#4a5880', fontSize: 'clamp(0.8rem, 1.5vw, 1rem)' }}>Waiting for others…</div>
                  </>
                ) : (
                  <div style={{ fontSize: 'clamp(1rem, 2.5vw, 1.4rem)', color: '#8a9cc8' }}>
                    {score <= 0 ? "You can't wager with $0 or less" : 'Waiting…'}
                  </div>
                )}
              </div>
            )}

            {fjPhase === 'category' && (
              <div className="text-center animate-scale-in">
                <div
                  className="font-display text-amber-400"
                  style={{ fontSize: 'clamp(2.5rem, 8vw, 5rem)', textShadow: '0 0 40px rgba(228,181,69,0.4)', marginBottom: '1rem' }}
                >
                  {fjCategory}
                </div>
                <div style={{ color: '#8a9cc8', fontSize: 'clamp(0.9rem, 2vw, 1.15rem)' }}>The category has been revealed…</div>
              </div>
            )}

            {fjPhase === 'clue' && (
              <div className="text-center animate-scale-in" style={{ maxWidth: 'min(90%, 600px)', padding: '0 1rem' }}>
                <div
                  className="uppercase tracking-widest font-semibold"
                  style={{ fontSize: 'clamp(0.65rem, 1vw, 0.75rem)', color: '#4a5880', marginBottom: '1rem' }}
                >
                  {fjCategory}
                </div>
                <div className="font-serif leading-relaxed text-white" style={{ fontSize: 'clamp(1.1rem, 2.5vw, 1.5rem)' }}>{fjClue}</div>
                <div style={{ color: '#4a5880', marginTop: '1.5rem', fontSize: 'clamp(0.8rem, 1.5vw, 1rem)' }}>Get ready to answer…</div>
              </div>
            )}

            {canAnswer && (
              <div className="w-full animate-scale-in" style={{ maxWidth: 'min(90%, 480px)' }}>
                <div className="text-center" style={{ marginBottom: 'clamp(1.5rem, 3vw, 2.5rem)' }}>
                  <div
                    className="uppercase tracking-widest font-semibold"
                    style={{ fontSize: 'clamp(0.65rem, 1vw, 0.75rem)', color: '#4a5880', marginBottom: '0.75rem' }}
                  >
                    {fjCategory}
                  </div>
                  <div className="font-serif text-white" style={{ fontSize: 'clamp(1rem, 2.5vw, 1.35rem)', marginBottom: '0.75rem' }}>{fjClue}</div>
                  <div className="text-amber-400 font-semibold" style={{ fontSize: 'clamp(0.85rem, 1.5vw, 1rem)' }}>
                    Wager: ${myFjWager?.toLocaleString()}
                  </div>
                </div>
                <form onSubmit={handleFjAnswerSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <input
                    type="text"
                    value={fjAnswer}
                    onChange={(e) => setFjAnswer(e.target.value)}
                    placeholder="What is…"
                    className={`w-full text-white text-center ${focusRing}`}
                    style={{
                      padding: 'clamp(0.875rem, 2vw, 1.25rem)',
                      fontSize: 'clamp(1rem, 2.5vw, 1.35rem)',
                      borderRadius: '0.875rem',
                      background: 'rgba(3,4,12,0.7)',
                      border: '2px solid rgba(228,181,69,0.3)',
                    }}
                    autoFocus
                    autoComplete="off"
                  />
                  <button
                    type="submit"
                    className={`w-full font-bold ${buttonPrimary}`}
                    style={{ padding: 'clamp(0.875rem, 2vw, 1.25rem)', fontSize: 'clamp(0.9rem, 1.8vw, 1.1rem)', borderRadius: '0.875rem' }}
                  >
                    Submit Answer
                  </button>
                </form>
              </div>
            )}

            {fjPhase === 'answer' && fjAnswerSubmitted && (
              <div className="text-center animate-scale-in">
                <div className="font-bold text-emerald-400" style={{ fontSize: 'clamp(1.25rem, 3vw, 1.75rem)', marginBottom: '0.75rem' }}>Answer Submitted!</div>
                <div className="font-serif" style={{ fontSize: 'clamp(1rem, 2.5vw, 1.35rem)', color: '#cbd5e1' }}>"{fjAnswer}"</div>
                <div style={{ color: '#4a5880', marginTop: '1rem', fontSize: 'clamp(0.8rem, 1.5vw, 1rem)' }}>Waiting for reveal…</div>
              </div>
            )}

            {fjPhase === 'reveal' && (
              <div className="text-center animate-scale-in">
                <div
                  className="font-display text-amber-400"
                  style={{ fontSize: 'clamp(2rem, 6vw, 3.5rem)', textShadow: '0 0 24px rgba(228,181,69,0.4)', marginBottom: '1rem' }}
                >
                  Revealing Answers…
                </div>
                {fjAnswerSubmitted && (
                  <div style={{ fontSize: 'clamp(1rem, 2.5vw, 1.35rem)', color: '#cbd5e1' }}>
                    Your answer: "{fjAnswer}"
                  </div>
                )}
              </div>
            )}
          </main>
        </div>
      </JeopardyShell>
    );
  }

  // ========== GAME FINISHED ==========
  if (round === 'finished') {
    return (
      <JeopardyShell backgroundMode="viewport" safeArea={false} className="lg:h-dvh lg:overflow-hidden">
        <div className="w-full flex flex-col items-center justify-center" style={{ minHeight: '100dvh', padding: 'clamp(2rem, 5vw, 4rem)' }}>
          <div className="text-center animate-bounce-in">
            <div
              className="font-display text-amber-400"
              style={{
                fontSize: 'clamp(3.5rem, 10vw, 7rem)',
                textShadow: '0 0 60px rgba(228,181,69,0.55)',
                marginBottom: 'clamp(1.5rem, 4vw, 3rem)',
              }}
            >
              GAME OVER!
            </div>
            <div
              className="uppercase tracking-widest"
              style={{ fontSize: 'clamp(0.7rem, 1.5vw, 0.9rem)', color: '#4a5880', marginBottom: '0.75rem' }}
            >
              Your Final Score
            </div>
            <div className={`font-mono-game font-bold ${getScoreColor(score)}`} style={{ fontSize: 'clamp(3.5rem, 10vw, 6rem)' }}>
              ${score.toLocaleString()}
            </div>
          </div>
        </div>
      </JeopardyShell>
    );
  }

  // ========== MAIN GAME VIEW ==========
  const iHaveControl = controllingPlayer === playerId;
  const controllerName = controllingPlayer && players[controllingPlayer]?.name;

  type BuzzerState = 'penalty' | 'won' | 'taken' | 'locked' | 'ready';
  let buzzerState: BuzzerState = 'locked';
  let buzzerLabel = 'BUZZ';
  let buzzerSub = '';
  let isDisabled = false;

  if (isPenaltyLocked) {
    buzzerState = 'penalty';
    buzzerLabel = 'LOCKED';
    buzzerSub = 'Too early!';
    isDisabled = true;
  } else if (winner === playerId) {
    buzzerState = 'won';
    buzzerLabel = 'YOU!';
    buzzerSub = 'Answer now!';
    isDisabled = true;
  } else if (winner) {
    buzzerState = 'taken';
    buzzerLabel = 'TAKEN';
    buzzerSub = 'Another player buzzed';
    isDisabled = true;
  } else if (isLocked) {
    buzzerState = 'locked';
    buzzerLabel = 'WAIT';
    buzzerSub = 'Buzzers locked';
  } else {
    buzzerState = 'ready';
    buzzerLabel = 'BUZZ';
    buzzerSub = 'GO!';
  }

  const buzzerStyles: Record<BuzzerState, { outer: React.CSSProperties; inner: React.CSSProperties; labelColor: string; className: string }> = {
    penalty: {
      outer: { background: 'rgba(30,40,60,0.4)', boxShadow: 'none' },
      inner: { background: 'linear-gradient(145deg, #374151, #1f2937)', border: '5px solid #374151' },
      labelColor: '#6b7280',
      className: '',
    },
    taken: {
      outer: { background: 'rgba(30,40,60,0.3)', boxShadow: 'none' },
      inner: { background: 'linear-gradient(145deg, #374151, #1f2937)', border: '5px solid #374151' },
      labelColor: '#6b7280',
      className: '',
    },
    locked: {
      outer: { background: 'radial-gradient(circle, rgba(180,120,0,0.18) 0%, transparent 70%)', boxShadow: 'none' },
      inner: {
        background: 'linear-gradient(145deg, #b45309, #92400e, #78350f)',
        border: '5px solid rgba(180,83,9,0.6)',
        boxShadow: 'inset 0 3px 0 rgba(255,255,255,0.15), inset 0 -6px 0 rgba(0,0,0,0.45), 0 12px 48px rgba(0,0,0,0.7)',
      },
      labelColor: '#fde68a',
      className: '',
    },
    ready: {
      outer: { background: 'radial-gradient(circle, rgba(239,68,68,0.18) 0%, transparent 70%)', boxShadow: 'none' },
      inner: {
        background: 'linear-gradient(145deg, #ef4444, #dc2626, #b91c1c)',
        border: '5px solid rgba(239,68,68,0.7)',
        boxShadow: 'inset 0 3px 0 rgba(255,255,255,0.22), inset 0 -7px 0 rgba(0,0,0,0.45), 0 16px 64px rgba(0,0,0,0.8)',
      },
      labelColor: '#ffffff',
      className: 'animate-buzzer-ready',
    },
    won: {
      outer: { background: 'radial-gradient(circle, rgba(34,197,94,0.18) 0%, transparent 70%)', boxShadow: 'none' },
      inner: {
        background: 'linear-gradient(145deg, #22c55e, #16a34a, #15803d)',
        border: '5px solid rgba(34,197,94,0.7)',
        boxShadow: 'inset 0 3px 0 rgba(255,255,255,0.22), inset 0 -7px 0 rgba(0,0,0,0.4), 0 16px 64px rgba(0,0,0,0.8)',
      },
      labelColor: '#ffffff',
      className: 'animate-winner-glow',
    },
  };

  const bs = buzzerStyles[buzzerState];

  // Fluid buzzer size: large on desktop, fills most of viewport on mobile
  const buzzerContainerSize = 'min(72vmin, 380px)';
  const buzzerButtonSize = 'min(64vmin, 340px)';

  return (
    <JeopardyShell backgroundMode="viewport" safeArea={false} className="lg:h-dvh lg:overflow-hidden">
      <div className="w-full flex flex-col" style={{ minHeight: '100dvh' }}>

        {/* Feedback Overlay */}
        {feedback && (
          <div
            className="fixed inset-0 z-[100] flex flex-col items-center justify-center"
            style={{
              background: feedback.type === 'correct'
                ? 'linear-gradient(135deg, #064e3b 0%, #065f46 100%)'
                : 'linear-gradient(135deg, #7f1d1d 0%, #991b1b 100%)',
            }}
          >
            <div
              className="animate-bounce-in"
              style={{
                fontSize: 'clamp(5rem, 20vmin, 9rem)',
                marginBottom: '1rem',
                filter: `drop-shadow(0 0 40px ${feedback.type === 'correct' ? 'rgba(74,222,128,0.7)' : 'rgba(248,113,113,0.7)'})`,
              }}
            >
              {feedback.type === 'correct' ? '✓' : '✗'}
            </div>
            <div
              className="font-display text-white tracking-wider animate-slide-up stagger-2"
              style={{ fontSize: 'clamp(2.5rem, 8vmin, 5rem)' }}
            >
              {feedback.type === 'correct' ? 'CORRECT!' : 'WRONG!'}
            </div>
            <div
              className="font-mono-game font-bold text-white animate-slide-up stagger-3"
              style={{
                fontSize: 'clamp(2.5rem, 8vmin, 4rem)',
                marginTop: '1.25rem',
                padding: '0.75rem 1.75rem',
                borderRadius: '1rem',
                background: 'rgba(0,0,0,0.35)',
                border: '1px solid rgba(255,255,255,0.15)',
              }}
            >
              {feedback.points > 0 ? '+' : ''}{feedback.points.toLocaleString()}
            </div>
          </div>
        )}

        {/* Daily Double Wager Modal */}
        <WagerModal
          isOpen={showWagerModal}
          playerScore={score}
          questionValue={currentQuestionValue}
          isDailyDouble={true}
          onSubmit={handleWagerSubmit}
        />

        {/* Header */}
        <header
          className="shrink-0"
          style={{
            padding: 'clamp(1rem, 2.5vw, 1.5rem) clamp(1rem, 3vw, 2rem)',
            paddingTop: 'max(clamp(1rem, 2.5vw, 1.5rem), env(safe-area-inset-top, 0px))',
          }}
        >
          <div className="flex items-center justify-between">
            {/* Round badge */}
            <div
              className="rounded-full font-bold uppercase tracking-widest"
              style={{
                padding: 'clamp(0.35rem, 0.8vw, 0.5rem) clamp(0.75rem, 1.5vw, 1.25rem)',
                fontSize: 'clamp(0.6rem, 1.2vw, 0.75rem)',
                ...(round === 'double'
                  ? { background: 'rgba(88,28,135,0.55)', color: '#d8b4fe', border: '1px solid rgba(167,139,250,0.35)' }
                  : { background: 'rgba(14,30,120,0.55)', color: '#93c5fd', border: '1px solid rgba(59,130,246,0.35)' }),
              }}
            >
              {round === 'double' ? 'Double Jeopardy' : 'Jeopardy'}
            </div>

            {/* Score */}
            <div className="text-right">
              <div className={`font-mono-game font-bold ${getScoreColor(score)}`} style={{ fontSize: 'clamp(1.75rem, 5vw, 2.5rem)' }}>
                ${score.toLocaleString()}
              </div>
            </div>
          </div>

          {/* Player Name */}
          <div style={{ marginTop: '0.5rem' }}>
            <span
              className="uppercase tracking-widest"
              style={{ fontSize: 'clamp(0.55rem, 1vw, 0.65rem)', color: '#4a5880' }}
            >
              Playing as
            </span>
            <h1
              className="font-semibold text-white truncate"
              style={{ fontSize: 'clamp(1rem, 2.5vw, 1.35rem)', marginTop: '0.1rem' }}
            >
              {name}
            </h1>
          </div>
        </header>

        {/* Control Banner */}
        {!hasActiveQuestion && controllerName && (
          <div
            className="mx-4 rounded-xl text-center"
            style={{
              padding: 'clamp(0.75rem, 1.5vw, 1rem) 1rem',
              marginBottom: '0.5rem',
              ...(iHaveControl
                ? {
                    background: 'linear-gradient(135deg, rgba(120,80,0,0.25), rgba(180,120,0,0.15), rgba(120,80,0,0.25))',
                    border: '1.5px solid rgba(228,181,69,0.45)',
                  }
                : {
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.07)',
                  }),
            }}
          >
            {iHaveControl ? (
              <div
                className="font-semibold tracking-wide"
                style={{ color: '#e4b545', textShadow: '0 0 12px rgba(228,181,69,0.3)', fontSize: 'clamp(0.8rem, 1.5vw, 1rem)' }}
              >
                ★ Your Pick — Choose a clue! ★
              </div>
            ) : (
              <div style={{ color: '#8a9cc8', fontSize: 'clamp(0.8rem, 1.5vw, 1rem)' }}>
                <span className="text-white font-semibold">{controllerName}</span>'s pick
              </div>
            )}
          </div>
        )}

        {/* Main Buzzer Area */}
        <main className="flex-1 flex flex-col items-center justify-center relative" style={{ padding: '0.5rem 1rem' }}>
          {/* Timer */}
          {timerEndTime && !feedback && !showWagerModal && (
            <div className="absolute" style={{ top: '1rem', left: '50%', transform: 'translateX(-50%)' }}>
              <Timer endTime={timerEndTime} size="md" />
            </div>
          )}

          {/* Buzzer */}
          <div
            className="relative flex items-center justify-center"
            style={{ width: buzzerContainerSize, height: buzzerContainerSize }}
          >
            {/* Ambient glow */}
            <div className="absolute inset-0 rounded-full pointer-events-none" style={bs.outer} />

            {/* Button */}
            <button
              onClick={handleBuzz}
              disabled={isDisabled}
              className={`relative rounded-full no-select touch-target ${bs.className}`}
              style={{
                width: buzzerButtonSize,
                height: buzzerButtonSize,
                ...bs.inner,
                cursor: isDisabled ? 'not-allowed' : 'pointer',
                transition: 'transform 0.08s ease, filter 0.1s ease',
                touchAction: 'manipulation',
                overflow: 'hidden',
              }}
              onMouseDown={(e) => { if (!isDisabled) e.currentTarget.style.transform = 'scale(0.95) translateY(4px)'; }}
              onMouseUp={(e) => { e.currentTarget.style.transform = ''; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = ''; }}
              onTouchStart={(e) => { if (!isDisabled) e.currentTarget.style.transform = 'scale(0.95) translateY(4px)'; }}
              onTouchEnd={(e) => { e.currentTarget.style.transform = ''; }}
            >
              {/* Highlight sheen */}
              <div
                className="absolute rounded-full pointer-events-none"
                style={{
                  top: '8%', left: '12%',
                  width: '76%', height: '48%',
                  background: 'linear-gradient(to bottom, rgba(255,255,255,0.28), transparent)',
                  filter: 'blur(6px)',
                }}
              />

              {/* Label */}
              <div className="relative z-10 flex flex-col items-center justify-center">
                <span
                  className="font-display tracking-widest"
                  style={{
                    fontSize: 'clamp(2rem, 9vmin, 3.5rem)',
                    color: bs.labelColor,
                    textShadow: `0 0 24px ${bs.labelColor}55`,
                  }}
                >
                  {buzzerLabel}
                </span>
                {buzzerSub && (
                  <span
                    className="font-semibold tracking-wide"
                    style={{
                      fontSize: 'clamp(0.75rem, 2.5vmin, 1.1rem)',
                      marginTop: '0.35rem',
                      color: `${bs.labelColor}99`,
                    }}
                  >
                    {buzzerSub}
                  </span>
                )}
              </div>
            </button>
          </div>
        </main>

        {/* Footer */}
        <footer
          className="shrink-0"
          style={{
            padding: 'clamp(0.75rem, 1.5vw, 1.25rem) clamp(1rem, 3vw, 2rem)',
            paddingBottom: 'max(clamp(0.75rem, 1.5vw, 1.25rem), env(safe-area-inset-bottom, 0px))',
          }}
        >
          <button
            onClick={() => setShowRules(true)}
            className="w-full rounded-xl font-semibold tracking-wide transition-all"
            style={{
              padding: 'clamp(0.65rem, 1.5vw, 1rem)',
              fontSize: 'clamp(0.75rem, 1.5vw, 0.9rem)',
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.07)',
              color: '#6b7db0',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.07)'; e.currentTarget.style.color = '#eef2ff'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.color = '#6b7db0'; }}
          >
            How to Play
          </button>
        </footer>

        <RulesModal isOpen={showRules} onClose={() => setShowRules(false)} />
      </div>
    </JeopardyShell>
  );
};
