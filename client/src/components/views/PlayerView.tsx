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
  PLAYER_NAME_MAX_LENGTH
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

  // === JOIN SCREEN ===
  if (!hasJoined) {
    return (
      <JeopardyShell backgroundMode="viewport">
        <div className="min-h-dvh w-full flex items-center justify-center p-4">
          <div className={`${panelGold} w-full max-w-sm p-6 sm:p-8 animate-scale-in`}>
            <h1 className="font-display text-4xl sm:text-5xl text-amber-400 text-center tracking-wider mb-2">
              JOIN GAME
            </h1>
            <p className="text-slate-400 text-center text-sm mb-8">
              Enter your name to join
            </p>

            <form onSubmit={handleJoin} className="space-y-5">
              <input
                type="text"
                placeholder="Your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={`w-full p-4 rounded-xl bg-slate-900/60 border-2 border-amber-500/30 text-white text-xl text-center font-medium placeholder:text-slate-500 ${focusRing}`}
                maxLength={PLAYER_NAME_MAX_LENGTH}
                autoFocus
                autoComplete="off"
                autoCapitalize="words"
              />
              <button
                type="submit"
                disabled={!name.trim()}
                className={`w-full py-4 rounded-xl text-lg disabled:opacity-50 disabled:cursor-not-allowed ${buttonPrimary}`}
              >
                Enter Game
              </button>
            </form>
          </div>
        </div>
      </JeopardyShell>
    );
  }

  // === FINAL JEOPARDY ===
  if (round === 'final') {
    const canWager = fjPhase === 'wager' && score > 0 && myFjWager === null;
    const canAnswer = fjPhase === 'answer' && myFjWager !== null && !fjAnswerSubmitted;
    
    return (
      <JeopardyShell backgroundMode="viewport">
        <div className="min-h-dvh w-full flex flex-col">
          {/* Header */}
          <header className="shrink-0 px-4 pt-4 pb-3 flex items-center justify-between">
            <div>
              <div className="text-xs text-slate-500 uppercase tracking-widest font-bold">Final Jeopardy</div>
              <div className="text-lg font-bold text-amber-400 truncate max-w-[200px]">{fjCategory}</div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <div className="text-xs text-slate-500 uppercase tracking-widest">Score</div>
                <div className={`text-2xl font-mono font-bold ${getScoreColor(score)}`}>
                  ${score.toLocaleString()}
                </div>
              </div>
              {timerEndTime && <Timer endTime={timerEndTime} size="sm" />}
            </div>
          </header>

          {/* Main Content */}
          <main className="flex-1 flex flex-col items-center justify-center px-4 py-6">
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
                    <div className="text-2xl font-bold text-emerald-400 mb-3">Wager Locked!</div>
                    <div className="text-5xl font-mono font-bold text-white mb-4">${myFjWager}</div>
                    <div className="text-slate-500 text-sm">Waiting for others...</div>
                  </>
                ) : (
                  <div className="text-xl text-slate-400">
                    {score <= 0 ? "You can't wager with $0 or less" : "Waiting..."}
                  </div>
                )}
              </div>
            )}

            {fjPhase === 'category' && (
              <div className="text-center animate-scale-in">
                <div className="font-display text-4xl sm:text-5xl text-amber-400 mb-4">{fjCategory}</div>
                <div className="text-slate-400">The category has been revealed...</div>
              </div>
            )}

            {fjPhase === 'clue' && (
              <div className="text-center max-w-lg animate-scale-in px-4">
                <div className="text-xs text-slate-500 uppercase tracking-widest mb-3">{fjCategory}</div>
                <div className="text-xl sm:text-2xl font-serif leading-relaxed">{fjClue}</div>
                <div className="text-slate-400 mt-6">Get ready to answer...</div>
              </div>
            )}

            {canAnswer && (
              <div className="w-full max-w-md animate-scale-in px-4">
                <div className="text-center mb-6">
                  <div className="text-xs text-slate-500 uppercase tracking-widest mb-2">{fjCategory}</div>
                  <div className="text-lg font-serif mb-3">{fjClue}</div>
                  <div className="text-amber-400 text-sm">Wager: ${myFjWager}</div>
                </div>
                
                <form onSubmit={handleFjAnswerSubmit} className="space-y-4">
                  <input
                    type="text"
                    value={fjAnswer}
                    onChange={(e) => setFjAnswer(e.target.value)}
                    placeholder="What is..."
                    className={`w-full p-4 rounded-xl bg-slate-900/70 border-2 border-amber-500/30 text-white text-lg text-center ${focusRing}`}
                    autoFocus
                    autoComplete="off"
                  />
                  <button type="submit" className={`w-full py-4 rounded-xl text-lg ${buttonPrimary}`}>
                    Submit Answer
                  </button>
                </form>
              </div>
            )}

            {fjPhase === 'answer' && fjAnswerSubmitted && (
              <div className="text-center animate-scale-in">
                <div className="text-2xl font-bold text-emerald-400 mb-3">Answer Submitted!</div>
                <div className="text-lg text-slate-300 italic">"{fjAnswer}"</div>
                <div className="text-slate-500 mt-4 text-sm">Waiting for reveal...</div>
              </div>
            )}

            {fjPhase === 'reveal' && (
              <div className="text-center animate-scale-in">
                <div className="font-display text-3xl text-amber-400 mb-4">Revealing Answers...</div>
                {fjAnswerSubmitted && (
                  <div className="text-lg text-slate-300">Your answer: "{fjAnswer}"</div>
                )}
              </div>
            )}
          </main>
        </div>
      </JeopardyShell>
    );
  }

  // === GAME FINISHED ===
  if (round === 'finished') {
    return (
      <JeopardyShell backgroundMode="viewport">
        <div className="min-h-dvh w-full flex flex-col items-center justify-center p-6">
          <div className="text-center animate-bounce-in">
            <div className="font-display text-5xl sm:text-6xl text-amber-400 mb-6">GAME OVER!</div>
            <div className="text-slate-400 text-lg mb-3">Your Final Score</div>
            <div className={`text-6xl sm:text-7xl font-mono font-bold ${getScoreColor(score)}`}>
              ${score.toLocaleString()}
            </div>
          </div>
        </div>
      </JeopardyShell>
    );
  }

  // === MAIN GAME VIEW ===
  const iHaveControl = controllingPlayer === playerId;
  const controllerName = controllingPlayer && players[controllingPlayer]?.name;

  // Buzzer state
  let buzzerStyle = '';
  let buzzerText = 'BUZZ';
  let buzzerSubtext = '';
  let isDisabled = false;

  if (isPenaltyLocked) {
    buzzerStyle = 'bg-gradient-to-b from-slate-600 to-slate-700 border-slate-500 opacity-60';
    buzzerText = 'LOCKED';
    buzzerSubtext = 'Too early!';
    isDisabled = true;
  } else if (winner) {
    if (winner === playerId) {
      buzzerStyle = 'bg-gradient-to-b from-emerald-400 to-emerald-600 border-emerald-300 animate-winner-glow';
      buzzerText = 'YOU!';
      buzzerSubtext = 'Answer now!';
      isDisabled = true;
    } else {
      buzzerStyle = 'bg-gradient-to-b from-slate-600 to-slate-700 border-slate-500 opacity-50';
      buzzerText = 'TAKEN';
      buzzerSubtext = 'Another player buzzed';
      isDisabled = true;
    }
  } else if (isLocked) {
    buzzerStyle = 'bg-gradient-to-b from-amber-500 to-amber-600 border-amber-400';
    buzzerText = 'WAIT';
    buzzerSubtext = 'Buzzers locked...';
  } else {
    buzzerStyle = 'bg-gradient-to-b from-red-500 to-red-700 border-red-400 animate-buzzer-ready';
    buzzerText = 'BUZZ';
    buzzerSubtext = 'GO!';
  }

  return (
    <JeopardyShell backgroundMode="viewport">
      <div className="min-h-dvh w-full flex flex-col overflow-hidden">
        {/* Feedback Overlay */}
        {feedback && (
          <div className={`fixed inset-0 z-[100] flex flex-col items-center justify-center animate-scale-in ${
            feedback.type === 'correct' ? 'bg-emerald-600' : 'bg-red-600'
          }`}>
            <div className="text-8xl sm:text-9xl mb-4">{feedback.type === 'correct' ? '✓' : '✗'}</div>
            <div className="text-3xl sm:text-4xl font-bold uppercase tracking-wide mb-6">
              {feedback.type === 'correct' ? 'CORRECT!' : 'WRONG!'}
            </div>
            <div className="text-5xl sm:text-6xl font-mono font-bold">
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

        {/* Header */}
        <header className="shrink-0 px-4 pt-4 pb-2">
          <div className="flex items-center justify-between">
            {/* Round badge */}
            <div className={`px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider ${
              round === 'double' 
                ? 'bg-purple-500/25 text-purple-300 border border-purple-500/40' 
                : 'bg-blue-500/25 text-blue-300 border border-blue-500/40'
            }`}>
              {round === 'double' ? 'Double' : 'Jeopardy'}
            </div>
            
            {/* Score */}
            <div className="text-right">
              <div className={`text-3xl font-mono font-bold tracking-tight ${getScoreColor(score)}`}>
                ${score.toLocaleString()}
              </div>
            </div>
          </div>
          
          {/* Player Name */}
          <div className="mt-2">
            <span className="text-slate-500 text-xs uppercase tracking-widest">Playing as</span>
            <h1 className="text-lg font-semibold text-white truncate">{name}</h1>
          </div>
        </header>

        {/* Control Banner */}
        {!hasActiveQuestion && controllerName && (
          <div className={`mx-4 mb-2 rounded-xl py-3 px-4 text-center transition-all ${
            iHaveControl 
              ? 'bg-gradient-to-r from-amber-500/20 via-amber-500/30 to-amber-500/20 border-2 border-amber-400/50' 
              : 'bg-slate-800/50 border border-slate-700/50'
          }`}>
            {iHaveControl ? (
              <div className="text-amber-300 text-sm font-bold">★ Your Pick — Choose a clue! ★</div>
            ) : (
              <div className="text-slate-400 text-sm">
                <span className="text-white font-semibold">{controllerName}</span>'s pick
              </div>
            )}
          </div>
        )}

        {/* Main Buzzer Area */}
        <main className="flex-1 flex flex-col items-center justify-center px-4 relative">
          {/* Timer */}
          {timerEndTime && !feedback && !showWagerModal && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2">
              <Timer endTime={timerEndTime} size="md" />
            </div>
          )}

          {/* Buzzer Button */}
          <button 
            onClick={handleBuzz}
            disabled={isDisabled}
            className={`w-56 h-56 sm:w-64 sm:h-64 md:w-72 md:h-72 rounded-full flex flex-col items-center justify-center 
              border-[6px] ${buzzerStyle}
              shadow-[0_8px_30px_rgba(0,0,0,0.4),inset_0_-4px_20px_rgba(0,0,0,0.3)]
              transition-transform duration-100 active:scale-95
              no-select touch-target`}
            style={{ touchAction: 'manipulation' }}
          >
            {/* Inner highlight */}
            <div className="absolute inset-4 rounded-full bg-gradient-to-b from-white/20 to-transparent pointer-events-none" />
            
            <span className="text-3xl sm:text-4xl font-black uppercase tracking-wider text-white drop-shadow-lg z-10">
              {buzzerText}
            </span>
            {buzzerSubtext && (
              <span className="text-sm sm:text-base text-white/80 mt-1 font-medium z-10">
                {buzzerSubtext}
              </span>
            )}
          </button>
        </main>

        {/* Footer */}
        <footer className="shrink-0 px-4 pb-6 pt-4">
          <button 
            onClick={() => setShowRules(true)}
            className="w-full py-3 rounded-xl bg-slate-800/50 border border-slate-700/50 
              text-slate-400 hover:text-white hover:bg-slate-700/50 
              text-sm font-medium transition-colors"
          >
            How to Play
          </button>
        </footer>

        <RulesModal isOpen={showRules} onClose={() => setShowRules(false)} />
      </div>
    </JeopardyShell>
  );
};
