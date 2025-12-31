import React, { useEffect, useState } from 'react';
import io, { Socket } from 'socket.io-client';
import { RulesModal } from '../RulesModal';
import { WagerModal } from '../WagerModal';
import { Timer } from '../Timer';
import { playLock, playCorrect, playWrong, playDailyDoubleReveal, playThinkMusic, stopThinkMusic } from '../../utils/audio';
import { JeopardyShell } from '../theme/JeopardyShell';
import { buttonPrimary, focusRingGold, panelGold } from '../theme/theme';
import { 
  SERVER_URL, 
  PENALTY_LOCK_DURATION_MS, 
  FEEDBACK_DURATION_MS, 
  PLAYER_NAME_MAX_LENGTH
} from '../../constants';

const socket: Socket = io(SERVER_URL);

type Round = 'jeopardy' | 'double' | 'final' | 'finished';
type FJPhase = 'category' | 'wager' | 'clue' | 'answer' | 'reveal' | null;

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
  
  // New state for enhanced features
  const [round, setRound] = useState<Round>('jeopardy');
  const [timerEndTime, setTimerEndTime] = useState<number | null>(null);
  const [showWagerModal, setShowWagerModal] = useState(false);
  const [currentQuestionValue, setCurrentQuestionValue] = useState(0);
  
  // Final Jeopardy state
  const [fjPhase, setFjPhase] = useState<FJPhase>(null);
  const [fjCategory, setFjCategory] = useState('');
  const [fjClue, setFjClue] = useState('');
  const [myFjWager, setMyFjWager] = useState<number | null>(null);
  const [fjAnswer, setFjAnswer] = useState('');
  const [fjAnswerSubmitted, setFjAnswerSubmitted] = useState(false);

  useEffect(() => {
    // Restore session on mount
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
      
      // Update my score
      const myId = playerId || localStorage.getItem('jeopardy_player_id');
      if (myId && state.players && state.players[myId]) {
        setScore(state.players[myId].score);
      }
      
      // Track current question for wager
      if (state.currentQuestion) {
        setCurrentQuestionValue(state.currentQuestion.value || 0);
      }
      
      // Final Jeopardy state
      setFjPhase(state.finalJeopardyPhase);
      
      // Check if I've already wagered
      if (myId && state.finalJeopardyWagers && state.finalJeopardyWagers[myId] !== undefined) {
        setMyFjWager(state.finalJeopardyWagers[myId]);
      }
      
      // Check if I've already answered
      if (myId && state.finalJeopardyAnswers && state.finalJeopardyAnswers[myId] !== undefined) {
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

    socket.on('wager-confirmed', () => {
      setShowWagerModal(false);
    });

    socket.on('final-jeopardy-think', () => {
      playThinkMusic();
    });

    socket.on('timer-expired', () => {
      stopThinkMusic();
    });

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
      const newId = typeof crypto !== 'undefined' && crypto.randomUUID 
        ? crypto.randomUUID() 
        : `player-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        
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

  // Determine button state
  let buttonColor = "bg-red-600 border-red-800 hover:bg-red-500";
  let statusText = "BUZZ";

  if (isPenaltyLocked) {
    buttonColor = "bg-red-900 border-red-950 cursor-not-allowed opacity-50";
    statusText = "LOCKED";
  } else if (winner) {
    if (winner === playerId) {
      buttonColor = "bg-green-500 border-green-700 animate-pulse";
      statusText = "YOU WON!";
    } else {
      buttonColor = "bg-gray-600 border-gray-800 cursor-not-allowed";
      statusText = "LOCKED";
    }
  } else if (isLocked) {
    buttonColor = "bg-yellow-600 border-yellow-800 active:bg-yellow-700";
    statusText = "WAIT...";
  }

  if (!hasJoined) {
    return (
      <JeopardyShell backgroundMode="viewport">
        <div className="min-h-screen w-full flex items-center justify-center p-4">
          <div className={[panelGold, 'w-full max-w-md p-8'].join(' ')}>
            <h1 className="font-display text-4xl font-extrabold text-yellow-400 text-center tracking-wider drop-shadow mb-6">
              Join Game
            </h1>

            <form onSubmit={handleJoin} className="flex flex-col gap-4">
              <label className="text-slate-200/80 text-sm font-semibold text-center">
                Your name
              </label>
              <input
                type="text"
                placeholder="Enter your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={[
                  'p-4 rounded-lg bg-slate-950/40 border border-yellow-400/20 text-white text-lg text-center shadow-inner',
                  focusRingGold,
                ].join(' ')}
                maxLength={PLAYER_NAME_MAX_LENGTH}
                autoFocus
              />
              <button
                type="submit"
                className={['py-4 rounded-lg text-lg', buttonPrimary].join(' ')}
              >
                Enter
              </button>
            </form>
          </div>
        </div>
      </JeopardyShell>
    );
  }

  // Final Jeopardy View
  if (round === 'final') {
    const canWager = fjPhase === 'wager' && score > 0 && myFjWager === null;
    const canAnswer = fjPhase === 'answer' && myFjWager !== null && !fjAnswerSubmitted;
    
    return (
      <JeopardyShell backgroundMode="viewport">
        <div className="min-h-screen w-full text-white flex flex-col items-center justify-center p-4 relative">
          {/* Timer */}
          {timerEndTime && (
            <div className="absolute top-4 right-4">
              <Timer endTime={timerEndTime} size="md" />
            </div>
          )}

          {/* Header */}
          <div className="absolute top-4 left-4">
            <div className="text-sm text-slate-400 uppercase font-bold">Final Jeopardy</div>
            <div className="text-2xl font-bold text-yellow-400">{fjCategory}</div>
          </div>

          {/* Score */}
          <div className="absolute top-4 right-20">
            <div className="text-xs text-slate-500 uppercase font-bold">Your Score</div>
            <div className={`text-2xl font-mono font-bold ${score < 0 ? 'text-red-400' : 'text-green-400'}`}>
              ${score.toLocaleString()}
            </div>
          </div>

          {/* Wager Phase */}
          {canWager && (
            <WagerModal
              isOpen={true}
              playerScore={score}
              questionValue={0}
              isDailyDouble={false}
              onSubmit={handleFjWagerSubmit}
            />
          )}

          {/* Waiting for wagers */}
          {fjPhase === 'wager' && !canWager && (
            <div className="text-center">
              {myFjWager !== null ? (
                <>
                  <div className="text-3xl font-bold text-green-400 mb-4">Wager Locked!</div>
                  <div className="text-6xl font-mono font-bold text-white">${myFjWager}</div>
                  <div className="text-slate-400 mt-4">Waiting for other players...</div>
                </>
              ) : (
                <div className="text-2xl text-slate-400">
                  {score <= 0 ? "You don't have enough to wager" : "Waiting..."}
                </div>
              )}
            </div>
          )}

          {/* Category Only Phase */}
          {fjPhase === 'category' && (
            <div className="text-center">
              <div className="text-6xl font-bold text-yellow-400 mb-8">{fjCategory}</div>
              <div className="text-slate-400">The category has been revealed...</div>
            </div>
          )}

          {/* Clue Revealed (before answer phase) */}
          {fjPhase === 'clue' && (
            <div className="text-center max-w-2xl">
              <div className="text-slate-400 text-sm uppercase tracking-wider mb-4">{fjCategory}</div>
              <div className="text-3xl font-serif">{fjClue}</div>
              <div className="text-slate-400 mt-8">Get ready to answer...</div>
            </div>
          )}

          {/* Answer Phase */}
          {canAnswer && (
            <div className="w-full max-w-lg">
              <div className="text-center mb-6">
                <div className="text-slate-400 text-sm uppercase tracking-wider mb-2">{fjCategory}</div>
                <div className="text-2xl font-serif mb-4">{fjClue}</div>
                <div className="text-yellow-400 text-sm">Your wager: ${myFjWager}</div>
              </div>
              
              <form onSubmit={handleFjAnswerSubmit} className="space-y-4">
                <input
                  type="text"
                  value={fjAnswer}
                  onChange={(e) => setFjAnswer(e.target.value)}
                  placeholder="What is..."
                  className={[
                    'w-full p-4 rounded-lg bg-slate-950/60 border border-yellow-400/30 text-white text-xl text-center',
                    focusRingGold,
                  ].join(' ')}
                  autoFocus
                />
                <button
                  type="submit"
                  className={['w-full py-4 rounded-lg text-lg', buttonPrimary].join(' ')}
                >
                  Submit Answer
                </button>
              </form>
            </div>
          )}

          {/* Answer Submitted */}
          {fjPhase === 'answer' && fjAnswerSubmitted && (
            <div className="text-center">
              <div className="text-3xl font-bold text-green-400 mb-4">Answer Submitted!</div>
              <div className="text-xl text-slate-300 italic">"{fjAnswer}"</div>
              <div className="text-slate-400 mt-4">Waiting for reveal...</div>
            </div>
          )}

          {/* Reveal Phase */}
          {fjPhase === 'reveal' && (
            <div className="text-center">
              <div className="text-3xl font-bold text-yellow-400 mb-4">Revealing Answers...</div>
              {fjAnswerSubmitted && (
                <div className="text-xl text-slate-300">Your answer: "{fjAnswer}"</div>
              )}
            </div>
          )}
        </div>
      </JeopardyShell>
    );
  }

  // Game Finished View
  if (round === 'finished') {
    return (
      <JeopardyShell backgroundMode="viewport">
        <div className="min-h-screen w-full text-white flex flex-col items-center justify-center p-4">
          <div className="text-6xl font-bold text-yellow-400 mb-8">Game Over!</div>
          <div className="text-2xl text-slate-300 mb-4">Your Final Score</div>
          <div className={`text-8xl font-mono font-bold ${score < 0 ? 'text-red-400' : 'text-green-400'}`}>
            ${score.toLocaleString()}
          </div>
        </div>
      </JeopardyShell>
    );
  }

  // Regular Game View (Jeopardy / Double Jeopardy)
  return (
    <JeopardyShell backgroundMode="viewport">
      <div className="min-h-screen w-full text-white flex flex-col items-center justify-center p-4 overflow-hidden overscroll-none relative">
        {/* Feedback Overlay */}
        {feedback && (
          <div className={`absolute inset-0 z-50 flex flex-col items-center justify-center animate-in fade-in zoom-in duration-300
            ${feedback.type === 'correct' ? 'bg-green-600' : 'bg-red-600'}
          `}>
            <div className="text-9xl mb-4">{feedback.type === 'correct' ? '✓' : '✗'}</div>
            <div className="text-4xl font-bold uppercase">{feedback.type === 'correct' ? 'CORRECT!' : 'WRONG!'}</div>
            <div className="text-6xl font-mono mt-4 font-bold">
              {feedback.points > 0 ? '+' : ''}{feedback.points}
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

        {/* Timer (when active) */}
        {timerEndTime && !feedback && !showWagerModal && (
          <div className="absolute top-20 left-1/2 -translate-x-1/2">
            <Timer endTime={timerEndTime} size="md" />
          </div>
        )}

        {/* Header Info */}
        <div className="absolute top-4 left-0 w-full px-8 flex justify-between items-end">
          <div>
            <div className={`text-xs uppercase font-bold mb-1 ${round === 'double' ? 'text-purple-400' : 'text-blue-400'}`}>
              {round === 'double' ? 'Double Jeopardy' : 'Jeopardy'}
            </div>
            <h1 className="text-2xl font-bold text-slate-400">{name}</h1>
          </div>
          <div className="text-right">
            <div className="text-xs text-slate-500 uppercase font-bold">Score</div>
            <div className={`text-4xl font-mono font-bold ${score < 0 ? 'text-red-400' : 'text-green-400'}`}>
              ${score.toLocaleString()}
            </div>
          </div>
        </div>
        
        <button 
          onClick={handleBuzz}
          disabled={!!winner || isPenaltyLocked || showWagerModal}
          className={`w-72 h-72 rounded-full flex items-center justify-center shadow-[0_0_50px_rgba(0,0,0,0.5)] border-8 ${buttonColor} transition-all active:scale-95`}
        >
          <span className="text-4xl font-bold uppercase tracking-widest text-white drop-shadow-md select-none">
            {statusText}
          </span>
        </button>

        <div className="mt-12 text-slate-500 font-mono text-sm text-center">
          {winner && winner !== playerId ? "Another player buzzed in first." : 
           isPenaltyLocked ? "PENALTY! Too early!" :
           isLocked && !winner ? "Waiting for Host to unlock..." : 
           "GO! GO! GO!"}
        </div>

        <button 
          onClick={() => setShowRules(true)}
          className="mt-8 text-slate-600 hover:text-slate-400 text-xs underline underline-offset-4 transition-colors cursor-pointer"
        >
          How to play?
        </button>

        <RulesModal isOpen={showRules} onClose={() => setShowRules(false)} />
      </div>
    </JeopardyShell>
  );
};
