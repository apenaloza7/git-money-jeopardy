import React, { useEffect, useState } from 'react';
import { Socket } from 'socket.io-client';
import { playBuzz, playCorrect, playWrong, playDailyDoubleReveal, playRoundTransition, playThinkMusic, stopThinkMusic } from '../utils/audio';
import { FEEDBACK_DURATION_MS } from '../constants';
import { getScoreColor } from './theme/theme';
import { Timer } from './Timer';

interface Question {
  value: number;
  question: string;
  answer: string;
}

interface Category {
  name: string;
  questions: Question[];
}

interface RoundData {
  categories: Category[];
}

interface FinalJeopardyData {
  category: string;
  clue: string;
  answer: string;
}

interface GameData {
  rounds: {
    jeopardy: RoundData;
    double: RoundData;
  };
  finalJeopardy: FinalJeopardyData;
  currentRound?: string;
}

interface GameBoardProps {
  gameData: GameData;
  socket: Socket;
}

type Round = 'jeopardy' | 'double' | 'final' | 'finished';
type FJPhase = 'category' | 'wager' | 'clue' | 'answer' | 'reveal' | null;

export const GameBoard: React.FC<GameBoardProps> = ({ gameData, socket }) => {
  const [activePlayerName, setActivePlayerName] = useState<string | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState<{categoryIndex: number, questionIndex: number, isDailyDouble?: boolean} | null>(null);
  const [playedQuestions, setPlayedQuestions] = useState<string[]>([]);
  const [scores, setScores] = useState<{[id: string]: {name: string, score: number}}>({});
  const [feedback, setFeedback] = useState<{type: 'correct'|'wrong', playerName: string, points: number} | null>(null);
  const [round, setRound] = useState<Round>('jeopardy');
  const [timerEndTime, setTimerEndTime] = useState<number | null>(null);
  const [showDailyDouble, setShowDailyDouble] = useState(false);
  const [showRoundTransition, setShowRoundTransition] = useState<{from: string, to: string} | null>(null);
  const [controllingPlayer, setControllingPlayer] = useState<string | null>(null);
  const [fjPhase, setFjPhase] = useState<FJPhase>(null);
  const [fjWagers, setFjWagers] = useState<{[id: string]: number}>({});
  const [, setFjAnswers] = useState<{[id: string]: string}>({});
  const [fjRevealed, setFjRevealed] = useState<string[]>([]);

  const getCategories = (): Category[] => {
    if (round === 'jeopardy') return gameData.rounds.jeopardy?.categories || [];
    if (round === 'double') return gameData.rounds.double?.categories || [];
    return [];
  };

  const categories = getCategories();

  useEffect(() => {
    socket.on('state-update', (state: any) => {
      if (state.round) setRound(state.round);
      if (state.activePlayer) {
        setActivePlayerName(state.players[state.activePlayer]?.name || 'Unknown');
      } else {
        setActivePlayerName(null);
      }
      setCurrentQuestion(state.currentQuestion);
      setPlayedQuestions(state.playedQuestions || []);
      setScores(state.players || {});
      setTimerEndTime(state.timerEndTime);
      setControllingPlayer(state.controllingPlayer);
      setFjPhase(state.finalJeopardyPhase);
      setFjWagers(state.finalJeopardyWagers || {});
      setFjAnswers(state.finalJeopardyAnswers || {});
      setFjRevealed(state.finalJeopardyRevealed || []);
    });

    socket.on('buzz-winner', () => playBuzz());

    socket.on('feedback', (data: any) => {
      if (data.type === 'correct') playCorrect();
      else if (data.type === 'wrong') playWrong();
      setFeedback(data);
      setTimeout(() => setFeedback(null), FEEDBACK_DURATION_MS);
    });

    socket.on('daily-double', () => {
      setShowDailyDouble(true);
      playDailyDoubleReveal();
      setTimeout(() => setShowDailyDouble(false), 3000);
    });

    socket.on('round-transition', (data: {from: string, to: string}) => {
      setShowRoundTransition(data);
      playRoundTransition();
      setTimeout(() => setShowRoundTransition(null), 4000);
    });

    socket.on('final-jeopardy-think', () => playThinkMusic());
    socket.on('timer-expired', () => stopThinkMusic());
    socket.on('game-finished', () => stopThinkMusic());

    return () => {
      socket.off('state-update');
      socket.off('buzz-winner');
      socket.off('feedback');
      socket.off('daily-double');
      socket.off('round-transition');
      socket.off('final-jeopardy-think');
      socket.off('timer-expired');
      socket.off('game-finished');
      stopThinkMusic();
    };
  }, [socket]);

  const activeQuestionData = currentQuestion && categories.length > 0
    ? categories[currentQuestion.categoryIndex]?.questions[currentQuestion.questionIndex]
    : null;

  // ========== FINAL JEOPARDY ==========
  if (round === 'final' && gameData.finalJeopardy) {
    const fj = gameData.finalJeopardy;

    return (
      <div className="w-full h-full flex flex-col overflow-hidden relative">
        {/* Feedback Overlay */}
        {feedback && (
          <div
            className="fixed inset-0 z-[100] flex flex-col items-center justify-center"
            style={{
              background: feedback.type === 'correct'
                ? 'linear-gradient(135deg, #064e3b 0%, #065f46 50%, #047857 100%)'
                : 'linear-gradient(135deg, #7f1d1d 0%, #991b1b 50%, #b91c1c 100%)',
            }}
          >
            <div
              className="font-display text-white text-7xl md:text-9xl mb-4 animate-bounce-in"
              style={{ textShadow: `0 0 60px ${feedback.type === 'correct' ? 'rgba(74,222,128,0.6)' : 'rgba(248,113,113,0.6)'}` }}
            >
              {feedback.type === 'correct' ? 'CORRECT!' : 'WRONG!'}
            </div>
            <div className="text-white/90 text-3xl md:text-5xl font-bold uppercase tracking-widest mb-6 animate-slide-up stagger-2">
              {feedback.playerName}
            </div>
            <div
              className="font-mono-game text-white text-5xl md:text-7xl font-bold px-10 py-4 rounded-2xl animate-slide-up stagger-3"
              style={{
                background: 'rgba(0,0,0,0.35)',
                border: '1px solid rgba(255,255,255,0.15)',
              }}
            >
              {feedback.points > 0 ? '+' : ''}{feedback.points.toLocaleString()}
            </div>
          </div>
        )}

        {timerEndTime && (
          <div className="absolute top-6 right-6 z-50">
            <Timer endTime={timerEndTime} size="lg" />
          </div>
        )}

        {/* Main Content */}
        <div className="flex-1 min-h-0 flex flex-col items-center justify-center p-6 md:p-10 text-center overflow-auto">
          <div
            className="font-display text-5xl md:text-7xl text-amber-400 mb-8 tracking-wider animate-slide-down"
            style={{ textShadow: '0 0 40px rgba(228,181,69,0.4)' }}
          >
            FINAL JEOPARDY
          </div>

          <div
            className="w-full max-w-3xl rounded-3xl p-8 md:p-12"
            style={{
              background: 'linear-gradient(145deg, rgba(10,18,58,0.95), rgba(6,8,18,0.98))',
              border: '2px solid rgba(228,181,69,0.3)',
              borderTopColor: 'rgba(228,181,69,0.5)',
              boxShadow: '0 0 60px rgba(228,181,69,0.08), 0 24px 64px rgba(0,0,0,0.6)',
            }}
          >
            <div
              className="font-display text-xl md:text-2xl text-amber-400 mb-6 tracking-widest"
              style={{ textShadow: '0 0 20px rgba(228,181,69,0.3)' }}
            >
              {fj.category}
            </div>

            {(fjPhase === 'clue' || fjPhase === 'answer' || fjPhase === 'reveal') && (
              <div className="text-white text-2xl md:text-4xl font-serif leading-relaxed animate-scale-in">
                {fj.clue}
              </div>
            )}

            {fjPhase === 'reveal' && (
              <div className="mt-8 pt-8 border-t border-amber-500/20">
                <div className="text-slate-500 text-xs uppercase tracking-widest mb-2 font-semibold">Correct Response</div>
                <div
                  className="text-emerald-400 text-2xl md:text-3xl font-bold animate-scale-in"
                  style={{ textShadow: '0 0 20px rgba(74,222,128,0.3)' }}
                >
                  {fj.answer}
                </div>
              </div>
            )}

            {fjPhase === 'wager' && (
              <div className="text-slate-400 text-lg italic mt-2 animate-scale-in">
                Players are placing their wagers…
              </div>
            )}

            {fjPhase === 'category' && (
              <div className="text-slate-400 text-lg italic mt-2 animate-scale-in">
                The category has been revealed…
              </div>
            )}
          </div>
        </div>

        {/* Score Footer */}
        {Object.keys(scores).length > 0 && (
          <div
            className="shrink-0 py-3 px-4 flex justify-center gap-6 md:gap-12"
            style={{
              background: 'rgba(3,4,12,0.95)',
              borderTop: '2px solid rgba(228,181,69,0.3)',
              backdropFilter: 'blur(12px)',
            }}
          >
            {Object.entries(scores).map(([id, player]: [string, any]) => {
              const isRevealed = fjRevealed.includes(id);
              return (
                <div key={id} className={`flex flex-col items-center min-w-[70px] md:min-w-[110px] ${isRevealed ? 'opacity-50' : ''}`}>
                  <div className="text-slate-400 text-[10px] md:text-xs font-bold uppercase tracking-widest mb-0.5">{player.name}</div>
                  <div className={`font-mono-game text-lg md:text-2xl font-bold ${getScoreColor(player.score)}`}>
                    ${player.score.toLocaleString()}
                  </div>
                  {isRevealed && fjWagers[id] !== undefined && (
                    <div className="text-[10px] text-slate-600 mt-0.5">wagered ${fjWagers[id].toLocaleString()}</div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // ========== GAME FINISHED ==========
  if (round === 'finished') {
    const sortedPlayers = Object.values(scores).sort((a: any, b: any) => b.score - a.score);
    const winner = sortedPlayers[0];

    return (
      <div className="w-full h-full flex flex-col items-center justify-center p-6 overflow-auto">
        <div className="text-center animate-bounce-in">
          <div
            className="font-display text-5xl md:text-8xl text-amber-400 mb-10 tracking-wider"
            style={{ textShadow: '0 0 60px rgba(228,181,69,0.5)' }}
          >
            GAME OVER
          </div>

          {winner && (
            <div
              className="rounded-3xl p-8 md:p-10 mb-8 text-center"
              style={{
                background: 'linear-gradient(145deg, rgba(120,80,0,0.2), rgba(80,50,0,0.1))',
                border: '3px solid rgba(228,181,69,0.5)',
                boxShadow: '0 0 80px rgba(228,181,69,0.15), 0 24px 64px rgba(0,0,0,0.6)',
              }}
            >
              <div className="text-slate-400 text-sm uppercase tracking-widest mb-3 font-semibold">Winner</div>
              <div
                className="text-white text-4xl md:text-6xl font-black mb-4"
                style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
              >
                {winner.name}
              </div>
              <div
                className="font-mono-game text-emerald-400 text-3xl md:text-5xl font-bold"
                style={{ textShadow: '0 0 30px rgba(74,222,128,0.4)' }}
              >
                ${winner.score.toLocaleString()}
              </div>
            </div>
          )}

          <div className="flex gap-8 justify-center">
            {sortedPlayers.slice(1, 3).map((player: any, idx) => (
              <div key={idx} className="text-center">
                <div className="text-slate-500 text-xs uppercase tracking-widest mb-1">{idx === 0 ? '2nd' : '3rd'}</div>
                <div className="text-white text-xl font-bold" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
                  {player.name}
                </div>
                <div className={`font-mono-game text-base font-bold ${getScoreColor(player.score)}`}>
                  ${player.score.toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ========== MAIN GAME BOARD ==========
  return (
    <div className="w-full h-full flex flex-col relative overflow-hidden">

      {/* Round Transition Overlay */}
      {showRoundTransition && (
        <div
          className="fixed inset-0 z-[100] flex flex-col items-center justify-center"
          style={{ background: 'linear-gradient(145deg, #03040c 0%, #060d3a 50%, #03040c 100%)' }}
        >
          {/* Radial glow behind text */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: 'radial-gradient(ellipse 60% 40% at 50% 50%, rgba(228,181,69,0.12) 0%, transparent 70%)',
            }}
          />
          <div
            className="font-display text-7xl md:text-9xl text-amber-400 tracking-wider animate-bounce-in relative"
            style={{ textShadow: '0 0 80px rgba(228,181,69,0.6), 0 0 160px rgba(228,181,69,0.2)' }}
          >
            {showRoundTransition.to === 'double' ? 'DOUBLE JEOPARDY!'
              : showRoundTransition.to === 'final' ? 'FINAL JEOPARDY!'
              : showRoundTransition.to.toUpperCase()}
          </div>
          {showRoundTransition.to === 'double' && (
            <div className="text-white/70 text-xl md:text-3xl mt-6 font-semibold tracking-widest uppercase animate-slide-up stagger-3">
              Values are doubled!
            </div>
          )}
        </div>
      )}

      {/* Daily Double Overlay */}
      {showDailyDouble && (
        <div
          className="fixed inset-0 z-[90] flex items-center justify-center"
          style={{ background: 'linear-gradient(135deg, #92400e 0%, #b45309 30%, #d97706 60%, #f59e0b 100%)' }}
        >
          <div
            className="font-display text-7xl md:text-[10rem] text-white tracking-wider animate-bounce drop-shadow-2xl"
            style={{ textShadow: '0 0 40px rgba(0,0,0,0.5), 0 4px 24px rgba(0,0,0,0.8)' }}
          >
            DAILY DOUBLE!
          </div>
        </div>
      )}

      {/* Feedback Overlay */}
      {feedback && (
        <div
          className="fixed inset-0 z-[80] flex flex-col items-center justify-center"
          style={{
            background: feedback.type === 'correct'
              ? 'linear-gradient(135deg, #064e3b 0%, #065f46 50%, #047857 100%)'
              : 'linear-gradient(135deg, #7f1d1d 0%, #991b1b 50%, #b91c1c 100%)',
          }}
        >
          <div
            className="font-display text-white text-7xl md:text-9xl mb-4 animate-bounce-in"
            style={{ textShadow: `0 0 60px ${feedback.type === 'correct' ? 'rgba(74,222,128,0.5)' : 'rgba(248,113,113,0.5)'}` }}
          >
            {feedback.type === 'correct' ? 'CORRECT!' : 'OOPS!'}
          </div>
          <div className="text-white/90 text-4xl md:text-6xl font-bold uppercase tracking-widest mb-6 animate-slide-up stagger-2">
            {feedback.playerName}
          </div>
          <div
            className="font-mono-game text-white text-6xl md:text-8xl font-bold px-10 py-4 rounded-2xl animate-slide-up stagger-3"
            style={{ background: 'rgba(0,0,0,0.35)', border: '1px solid rgba(255,255,255,0.15)' }}
          >
            {feedback.points > 0 ? '+' : ''}{feedback.points.toLocaleString()}
          </div>
        </div>
      )}

      {/* Active Question Overlay */}
      {activeQuestionData && !showDailyDouble && (
        <div
          className="fixed inset-0 z-40 flex flex-col items-center justify-center p-6 md:p-14 text-center"
          style={{
            background: 'linear-gradient(165deg, #060d3a 0%, #030820 40%, #03040c 100%)',
          }}
        >
          {/* Radial glow */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: 'radial-gradient(ellipse 50% 35% at 50% 50%, rgba(91,141,239,0.12) 0%, transparent 70%)',
            }}
          />

          {timerEndTime && (
            <div className="absolute top-6 right-6 z-10">
              <Timer endTime={timerEndTime} size="lg" />
            </div>
          )}

          {/* Category + value strip */}
          <div className="relative mb-8 text-center">
            {currentQuestion?.isDailyDouble && (
              <div
                className="inline-block mb-3 px-5 py-1.5 rounded-full text-sm font-bold uppercase tracking-widest"
                style={{
                  background: 'linear-gradient(135deg, #92400e, #b45309)',
                  color: '#fde68a',
                  boxShadow: '0 0 20px rgba(180,83,9,0.4)',
                }}
              >
                ★ Daily Double ★
              </div>
            )}
            <div
              className="font-display text-xl md:text-3xl text-amber-400 tracking-widest"
              style={{ textShadow: '0 0 24px rgba(228,181,69,0.4)' }}
            >
              {categories[currentQuestion!.categoryIndex]?.name}
            </div>
            <div
              className="font-mono-game text-amber-300/80 text-2xl md:text-4xl font-bold mt-1"
            >
              ${activeQuestionData.value.toLocaleString()}
            </div>
          </div>

          {/* Divider */}
          <div className="relative w-24 h-0.5 mb-8 mx-auto" style={{ background: 'linear-gradient(90deg, transparent, rgba(228,181,69,0.5), transparent)' }} />

          {/* Question text */}
          <div
            className="relative text-white text-2xl md:text-5xl font-serif leading-relaxed max-w-5xl"
            style={{ lineHeight: 1.4 }}
          >
            {activeQuestionData.question}
          </div>
        </div>
      )}

      {/* Buzzer Overlay */}
      {activePlayerName && !feedback && !showDailyDouble && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50" style={{ backdropFilter: 'blur(4px)' }}>
          {timerEndTime && (
            <div className="absolute top-6 right-6">
              <Timer endTime={timerEndTime} size="lg" />
            </div>
          )}

          <div
            className="px-12 md:px-20 py-10 md:py-14 rounded-3xl text-center animate-scale-in"
            style={{
              background: 'linear-gradient(145deg, #7f1d1d, #991b1b)',
              border: '4px solid #ef4444',
              boxShadow: '0 0 80px rgba(239,68,68,0.6), 0 0 160px rgba(239,68,68,0.2), inset 0 1px 0 rgba(255,255,255,0.1)',
            }}
          >
            <div
              className="font-display text-white text-2xl mb-4 tracking-widest opacity-80"
              style={{ textShadow: '0 0 20px rgba(248,113,113,0.4)' }}
            >
              BUZZ!
            </div>
            <div
              className="text-white text-5xl md:text-7xl font-black"
              style={{ fontFamily: "'Barlow Condensed', sans-serif", textShadow: '0 0 30px rgba(255,255,255,0.3)' }}
            >
              {activePlayerName}
            </div>
          </div>
        </div>
      )}

      {/* Round Badge */}
      <div className="absolute top-3 left-3 z-20">
        <div
          className="px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest"
          style={
            round === 'double'
              ? { background: 'rgba(88,28,135,0.8)', color: '#d8b4fe', border: '1px solid rgba(167,139,250,0.3)', backdropFilter: 'blur(8px)' }
              : { background: 'rgba(14,30,120,0.8)', color: '#93c5fd', border: '1px solid rgba(59,130,246,0.3)', backdropFilter: 'blur(8px)' }
          }
        >
          {round === 'double' ? 'Double Jeopardy!' : 'Jeopardy!'}
        </div>
      </div>

      {/* Controlling Player */}
      {controllingPlayer && scores[controllingPlayer] && (
        <div
          className="absolute top-3 right-3 z-20 px-4 py-1.5 rounded-full"
          style={{
            background: 'rgba(120,80,0,0.4)',
            border: '1px solid rgba(228,181,69,0.35)',
            backdropFilter: 'blur(8px)',
          }}
        >
          <span
            className="text-sm font-bold"
            style={{ color: '#e4b545', textShadow: '0 0 12px rgba(228,181,69,0.3)' }}
          >
            {scores[controllingPlayer].name}'s pick
          </span>
        </div>
      )}

      {/* Game Board Grid */}
      <div
        className="flex-1 min-h-0 grid grid-cols-5 p-1 md:p-2"
        style={{
          gap: '3px',
          gridTemplateRows: 'minmax(0, 1.3fr) repeat(5, minmax(0, 1fr))',
          background: '#020510',
        }}
      >
        {/* Category Headers */}
        {categories.map((category, idx) => (
          <div
            key={idx}
            className="board-category flex items-center justify-center p-1 md:p-2 rounded-t-sm"
          >
            <h2
              className="font-display text-[10px] sm:text-xs md:text-sm lg:text-base text-center leading-tight text-white line-clamp-2"
              style={{ letterSpacing: '0.05em' }}
            >
              {category.name}
            </h2>
          </div>
        ))}

        {/* Question Tiles */}
        {Array.from({ length: 5 }).map((_, rowIndex) => (
          categories.map((category, colIndex) => {
            const question = category.questions[rowIndex];
            const isPlayed = playedQuestions.includes(`${colIndex}-${rowIndex}`);

            return (
              <div
                key={`${colIndex}-${rowIndex}`}
                className={`board-tile${isPlayed ? ' played' : ''}`}
                style={{ borderRadius: '3px' }}
              >
                {!isPlayed && question && (
                  <span
                    className="font-mono-game text-lg sm:text-2xl md:text-3xl lg:text-4xl xl:text-5xl font-bold relative z-10"
                    style={{ color: '#e4b545', textShadow: '0 0 16px rgba(228,181,69,0.25)' }}
                  >
                    ${question.value.toLocaleString()}
                  </span>
                )}
              </div>
            );
          })
        ))}
      </div>

      {/* Score Footer */}
      {Object.keys(scores).length > 0 && (
        <div
          className="shrink-0 py-2.5 px-4 flex justify-center gap-4 md:gap-10"
          style={{
            background: 'rgba(3,4,12,0.97)',
            borderTop: '2px solid rgba(228,181,69,0.25)',
            backdropFilter: 'blur(12px)',
          }}
        >
          {Object.entries(scores).map(([id, player]: [string, any]) => (
            <div
              key={id}
              className={`flex flex-col items-center min-w-[60px] md:min-w-[100px] ${
                controllingPlayer === id ? 'ring-1 ring-amber-400/60 rounded-lg px-2' : ''
              }`}
            >
              <div className="text-slate-500 text-[10px] md:text-xs font-bold uppercase tracking-widest leading-none mb-1">
                {player.name}
                {controllingPlayer === id && <span style={{ color: '#e4b545' }}> ★</span>}
              </div>
              <div className={`font-mono-game text-base md:text-2xl font-bold ${getScoreColor(player.score)}`}>
                ${player.score.toLocaleString()}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
