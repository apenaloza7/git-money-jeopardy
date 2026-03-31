import React, { useEffect, useState } from 'react';
import { Socket } from 'socket.io-client';
import { playBuzz, playCorrect, playWrong, playDailyDoubleReveal, playRoundTransition, playThinkMusic, stopThinkMusic } from '../utils/audio';
import { FEEDBACK_DURATION_MS } from '../constants';
import { panel, getScoreColor } from './theme/theme';
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

  // === FINAL JEOPARDY ===
  if (round === 'final' && gameData.finalJeopardy) {
    const fj = gameData.finalJeopardy;
    
    return (
      <div className="w-full h-full flex flex-col overflow-hidden">
        {/* Feedback Overlay */}
        {feedback && (
          <div className={`fixed inset-0 z-[100] flex flex-col items-center justify-center ${
            feedback.type === 'correct' ? 'bg-emerald-600' : 'bg-red-600'
          }`}>
            <div className="text-white text-7xl md:text-9xl font-black mb-4">
              {feedback.type === 'correct' ? 'CORRECT!' : 'WRONG!'}
            </div>
            <div className="text-white text-4xl md:text-6xl font-bold uppercase tracking-wider mb-6">
              {feedback.playerName}
            </div>
            <div className="text-white text-6xl md:text-8xl font-mono font-bold bg-black/30 px-8 py-3 rounded-xl">
              {feedback.points > 0 ? '+' : ''}{feedback.points}
            </div>
          </div>
        )}

        {/* Timer */}
        {timerEndTime && (
          <div className="absolute top-6 right-6 z-50">
            <Timer endTime={timerEndTime} size="lg" />
          </div>
        )}

        {/* Main Content */}
        <div className="flex-1 min-h-0 flex flex-col items-center justify-center p-4 md:p-8 text-center overflow-auto">
          <div className="font-display text-4xl md:text-6xl text-amber-400 mb-6 tracking-wider">
            FINAL JEOPARDY
          </div>
          
          <div className="bg-blue-900/60 backdrop-blur rounded-2xl p-6 md:p-10 max-w-3xl w-full border-2 border-amber-500/40 shadow-2xl">
            <div className="text-amber-300 text-lg md:text-xl uppercase tracking-widest mb-4 font-bold">
              {fj.category}
            </div>
            
            {(fjPhase === 'clue' || fjPhase === 'answer' || fjPhase === 'reveal') && (
              <div className="text-white text-xl md:text-3xl font-serif leading-relaxed">
                {fj.clue}
              </div>
            )}
            
            {fjPhase === 'reveal' && (
              <div className="mt-6 pt-6 border-t border-amber-500/30">
                <div className="text-slate-400 text-xs uppercase tracking-wider mb-1">Correct Response</div>
                <div className="text-emerald-400 text-xl md:text-2xl font-bold">{fj.answer}</div>
              </div>
            )}
            
            {fjPhase === 'wager' && (
              <div className="text-slate-300 text-base italic mt-3">Players are making their wagers...</div>
            )}
            
            {fjPhase === 'category' && (
              <div className="text-slate-300 text-base italic mt-3">The category has been revealed...</div>
            )}
          </div>
        </div>

        {/* Score Footer */}
        {Object.keys(scores).length > 0 && (
          <div className="shrink-0 py-2 px-3 flex justify-center gap-4 md:gap-8 border-t-2 border-amber-500 bg-slate-900/90 backdrop-blur">
            {Object.entries(scores).map(([id, player]: [string, any]) => {
              const isRevealed = fjRevealed.includes(id);
              
              return (
                <div key={id} className={`flex flex-col items-center min-w-[70px] md:min-w-[100px] ${isRevealed ? 'opacity-60' : ''}`}>
                  <div className="text-slate-400 text-xs font-bold uppercase tracking-wider">{player.name}</div>
                  <div className={`text-lg md:text-2xl font-mono font-bold ${getScoreColor(player.score)}`}>
                    ${player.score.toLocaleString()}
                  </div>
                  {isRevealed && fjWagers[id] !== undefined && (
                    <div className="text-[10px] text-slate-500">Wagered: ${fjWagers[id]}</div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // === GAME FINISHED ===
  if (round === 'finished') {
    const sortedPlayers = Object.values(scores).sort((a: any, b: any) => b.score - a.score);
    const winner = sortedPlayers[0];
    
    return (
      <div className="w-full h-full flex flex-col items-center justify-center p-4 md:p-6 overflow-auto">
        <div className="text-center animate-bounce-in">
          <div className="font-display text-4xl md:text-6xl text-amber-400 mb-6 tracking-wider animate-text-glow">
            GAME OVER
          </div>
          
          {winner && (
            <div className="bg-gradient-to-b from-amber-500/20 to-amber-600/10 rounded-2xl p-6 md:p-8 border-4 border-amber-500/50 mb-6">
              <div className="text-slate-300 text-sm uppercase tracking-widest mb-2">Winner</div>
              <div className="text-white text-4xl md:text-5xl font-black mb-3">{winner.name}</div>
              <div className="text-emerald-400 text-3xl md:text-4xl font-mono font-bold">${winner.score.toLocaleString()}</div>
            </div>
          )}
          
          <div className="flex gap-6 justify-center">
            {sortedPlayers.slice(1, 3).map((player: any, idx) => (
              <div key={idx} className="text-center">
                <div className="text-slate-500 text-xs uppercase">{idx === 0 ? '2nd' : '3rd'}</div>
                <div className="text-white text-lg font-bold">{player.name}</div>
                <div className={`text-base font-mono ${getScoreColor(player.score)}`}>
                  ${player.score.toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // === MAIN GAME BOARD ===
  return (
    <div className="w-full h-full flex flex-col relative overflow-hidden">
      
      {/* Round Transition Overlay */}
      {showRoundTransition && (
        <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-gradient-to-b from-blue-900 via-blue-800 to-blue-900">
          <div className="font-display text-6xl md:text-8xl text-amber-400 tracking-wider animate-bounce-in">
            {showRoundTransition.to === 'double' ? 'DOUBLE JEOPARDY!' : 
             showRoundTransition.to === 'final' ? 'FINAL JEOPARDY!' : 
             showRoundTransition.to.toUpperCase()}
          </div>
          {showRoundTransition.to === 'double' && (
            <div className="text-white text-xl md:text-2xl mt-6 opacity-75">Values are doubled!</div>
          )}
        </div>
      )}
      
      {/* Daily Double Overlay */}
      {showDailyDouble && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-gradient-to-br from-amber-500 via-orange-500 to-red-500">
          <div className="font-display text-6xl md:text-9xl text-white tracking-wider animate-bounce drop-shadow-2xl">
            DAILY DOUBLE!
          </div>
        </div>
      )}
      
      {/* Feedback Overlay */}
      {feedback && (
        <div className={`fixed inset-0 z-[80] flex flex-col items-center justify-center ${
          feedback.type === 'correct' ? 'bg-emerald-600' : 'bg-red-600'
        }`}>
          <div className="text-white text-7xl md:text-9xl font-black mb-4">
            {feedback.type === 'correct' ? 'CORRECT!' : 'OOPS!'}
          </div>
          <div className="text-white text-4xl md:text-6xl font-bold uppercase tracking-wider mb-6">
            {feedback.playerName}
          </div>
          <div className="text-white text-6xl md:text-8xl font-mono font-bold bg-black/30 px-8 py-3 rounded-xl">
            {feedback.points > 0 ? '+' : ''}{feedback.points}
          </div>
        </div>
      )}

      {/* Active Question Overlay */}
      {activeQuestionData && !showDailyDouble && (
        <div className="fixed inset-0 z-40 flex flex-col items-center justify-center p-6 md:p-12 text-center bg-gradient-to-b from-blue-900 via-slate-900 to-slate-950">
          {timerEndTime && (
            <div className="absolute top-6 right-6">
              <Timer endTime={timerEndTime} size="lg" />
            </div>
          )}
          
          <div className="font-display text-amber-400 text-2xl md:text-4xl mb-6 uppercase tracking-widest border-b-4 border-amber-500 pb-2">
            {currentQuestion?.isDailyDouble && <span className="text-orange-400">★ </span>}
            {categories[currentQuestion!.categoryIndex]?.name} — ${activeQuestionData.value}
            {currentQuestion?.isDailyDouble && <span className="text-orange-400"> ★</span>}
          </div>
          <div className="text-white text-3xl md:text-6xl font-serif leading-relaxed max-w-5xl">
            {activeQuestionData.question}
          </div>
        </div>
      )}

      {/* Buzzer Overlay */}
      {activePlayerName && !feedback && !showDailyDouble && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          {timerEndTime && (
            <div className="absolute top-6 right-6">
              <Timer endTime={timerEndTime} size="lg" />
            </div>
          )}
          
          <div className="bg-red-600 p-10 md:p-16 rounded-3xl border-8 border-red-800 shadow-[0_0_100px_rgba(220,38,38,0.8)] text-center animate-scale-in">
            <div className="text-white text-2xl font-bold uppercase tracking-widest mb-4 opacity-80">Buzz!</div>
            <div className="text-white text-5xl md:text-7xl font-black">{activePlayerName}</div>
          </div>
        </div>
      )}

      {/* Round Badge */}
      <div className="absolute top-4 left-4 z-20">
        <div className={`px-4 py-2 rounded-full text-sm font-bold uppercase tracking-wider ${
          round === 'double' ? 'bg-purple-600' : 'bg-blue-600'
        }`}>
          {round === 'double' ? 'Double Jeopardy!' : 'Jeopardy!'}
        </div>
      </div>

      {/* Controlling Player */}
      {controllingPlayer && scores[controllingPlayer] && (
        <div className="absolute top-4 right-4 z-20 bg-amber-500/20 border border-amber-500/50 px-4 py-2 rounded-full">
          <span className="text-amber-400 text-sm font-bold">
            {scores[controllingPlayer].name}'s pick
          </span>
        </div>
      )}

      {/* Game Board Grid - 6 rows: 1 for categories, 5 for questions */}
      <div className="flex-1 min-h-0 grid grid-cols-5 grid-rows-6 gap-0.5 md:gap-1 p-1 md:p-2">
        {/* Category Headers */}
        {categories.map((category, idx) => (
          <div key={idx} className="bg-blue-800 p-1 md:p-2 text-center flex items-center justify-center border-b-2 border-blue-900 shadow-lg min-h-0">
            <h2 className="text-[10px] sm:text-xs md:text-sm lg:text-base font-bold uppercase tracking-wider text-white leading-tight line-clamp-2">{category.name}</h2>
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
                className={`flex items-center justify-center border border-blue-800/50 shadow-inner transition-colors duration-300 min-h-0 ${
                  isPlayed ? 'bg-blue-950' : 'bg-blue-700'
                }`}
              >
                {!isPlayed && question && (
                  <span className="text-xl sm:text-2xl md:text-3xl lg:text-4xl xl:text-5xl font-bold text-amber-400 font-mono">
                    ${question.value}
                  </span>
                )}
              </div>
            );
          })
        ))}
      </div>

      {/* Score Footer */}
      {Object.keys(scores).length > 0 && (
        <div className={`shrink-0 py-2 px-3 md:py-3 md:px-4 flex justify-center gap-3 md:gap-6 border-t-2 border-amber-500 bg-slate-900/95 backdrop-blur ${panel}`}>
          {Object.entries(scores).map(([id, player]: [string, any]) => (
            <div key={id} className={`flex flex-col items-center min-w-[60px] md:min-w-[100px] ${
              controllingPlayer === id ? 'ring-2 ring-amber-400 rounded-lg p-1' : ''
            }`}>
              <div className="text-slate-400 text-[10px] md:text-xs font-bold uppercase tracking-wider">
                {player.name}
                {controllingPlayer === id && <span className="text-amber-400 ml-1">★</span>}
              </div>
              <div className={`text-base md:text-2xl font-mono font-bold ${getScoreColor(player.score)}`}>
                ${player.score.toLocaleString()}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
