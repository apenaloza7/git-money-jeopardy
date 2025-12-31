import React, { useEffect, useState } from 'react';
import { Socket } from 'socket.io-client';
import { playBuzz, playCorrect, playWrong, playDailyDoubleReveal, playRoundTransition, playThinkMusic, stopThinkMusic } from '../utils/audio';
import { FEEDBACK_DURATION_MS } from '../constants';
import { panel } from './theme/theme';
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
  const [fjAnswers, setFjAnswers] = useState<{[id: string]: string}>({});
  const [fjRevealed, setFjRevealed] = useState<string[]>([]);

  // Get categories for current round
  const getCategories = (): Category[] => {
    if (round === 'jeopardy') return gameData.rounds.jeopardy?.categories || [];
    if (round === 'double') return gameData.rounds.double?.categories || [];
    return [];
  };

  const categories = getCategories();

  useEffect(() => {
    socket.on('state-update', (state: any) => {
      // Handle Round
      if (state.round) setRound(state.round);
      
      // Handle Active Player (Buzzer)
      if (state.activePlayer) {
        setActivePlayerName(state.players[state.activePlayer]?.name || 'Unknown');
      } else {
        setActivePlayerName(null);
      }

      // Handle Current Question
      setCurrentQuestion(state.currentQuestion);
      setPlayedQuestions(state.playedQuestions || []);
      setScores(state.players || {});
      setTimerEndTime(state.timerEndTime);
      setControllingPlayer(state.controllingPlayer);
      
      // Final Jeopardy state
      setFjPhase(state.finalJeopardyPhase);
      setFjWagers(state.finalJeopardyWagers || {});
      setFjAnswers(state.finalJeopardyAnswers || {});
      setFjRevealed(state.finalJeopardyRevealed || []);
    });

    socket.on('buzz-winner', () => {
      playBuzz();
    });

    socket.on('feedback', (data: any) => {
      if (data.type === 'correct') {
        playCorrect();
      } else if (data.type === 'wrong') {
        playWrong();
      }
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

    socket.on('final-jeopardy-think', () => {
      playThinkMusic();
    });

    socket.on('timer-expired', () => {
      stopThinkMusic();
    });

    socket.on('game-finished', () => {
      stopThinkMusic();
    });

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

  // Derive the actual question object if one is active
  const activeQuestionData = currentQuestion && categories.length > 0
    ? categories[currentQuestion.categoryIndex]?.questions[currentQuestion.questionIndex]
    : null;

  // Render Final Jeopardy
  if (round === 'final' && gameData.finalJeopardy) {
    const fj = gameData.finalJeopardy;
    
    return (
      <div className="max-w-7xl mx-auto relative w-full h-full flex flex-col justify-center pb-24">
        {/* Feedback overlay */}
        {feedback && (
          <div className={`absolute inset-0 z-60 flex flex-col items-center justify-center animate-in fade-in zoom-in duration-300 backdrop-blur-sm
            ${feedback.type === 'correct' ? 'bg-green-600/90' : 'bg-red-600/90'}
          `}>
            <div className="text-white text-9xl font-black mb-4 drop-shadow-lg">
              {feedback.type === 'correct' ? 'CORRECT!' : 'WRONG!'}
            </div>
            <div className="text-white text-6xl font-bold uppercase tracking-widest mb-8">
              {feedback.playerName}
            </div>
            <div className="text-white text-8xl font-mono font-bold bg-black/30 px-12 py-4 rounded-xl backdrop-blur-md">
              {feedback.points > 0 ? '+' : ''}{feedback.points}
            </div>
          </div>
        )}

        {/* Timer */}
        {timerEndTime && (
          <div className="absolute top-8 right-8 z-50">
            <Timer endTime={timerEndTime} size="lg" />
          </div>
        )}

        {/* Final Jeopardy Content */}
        <div className="flex flex-col items-center justify-center h-full text-center p-8">
          <div className="font-display text-6xl font-extrabold text-yellow-400 mb-8 tracking-wider drop-shadow-lg">
            FINAL JEOPARDY
          </div>
          
          <div className="bg-blue-900/80 rounded-2xl p-12 max-w-4xl w-full border-4 border-yellow-500/50 shadow-2xl">
            <div className="text-yellow-300 text-2xl uppercase tracking-widest mb-6 font-bold">
              {fj.category}
            </div>
            
            {/* Show clue in clue/answer/reveal phases */}
            {(fjPhase === 'clue' || fjPhase === 'answer' || fjPhase === 'reveal') && (
              <div className="text-white text-4xl font-serif leading-relaxed">
                {fj.clue}
              </div>
            )}
            
            {/* Show answer in reveal phase */}
            {fjPhase === 'reveal' && (
              <div className="mt-8 pt-8 border-t border-yellow-500/30">
                <div className="text-slate-400 text-sm uppercase tracking-wider mb-2">Correct Response</div>
                <div className="text-green-400 text-3xl font-bold">{fj.answer}</div>
              </div>
            )}
            
            {/* Wager phase message */}
            {fjPhase === 'wager' && (
              <div className="text-slate-300 text-2xl italic mt-4">
                Players are making their wagers...
              </div>
            )}
            
            {/* Category only phase */}
            {fjPhase === 'category' && (
              <div className="text-slate-300 text-2xl italic mt-4">
                The category has been revealed...
              </div>
            )}
          </div>
        </div>

        {/* Score Footer */}
        {Object.keys(scores).length > 0 && (
          <div className={['fixed bottom-0 left-0 right-0 p-4 flex justify-center gap-8 z-30 shadow-2xl backdrop-blur border-t-4 border-yellow-500 bg-[#06103a]/85', panel].join(' ')}>
            {Object.entries(scores).map(([id, player]: [string, any]) => {
              const isRevealed = fjRevealed.includes(id);
              const wager = fjWagers[id];
              const answer = fjAnswers[id];
              
              return (
                <div key={id} className={`flex flex-col items-center min-w-[150px] p-3 rounded-lg transition-all ${isRevealed ? 'bg-slate-800/50' : ''}`}>
                  <div className="text-slate-400 text-sm font-bold uppercase tracking-wider mb-1">{player.name}</div>
                  <div className={`text-3xl font-mono font-bold ${player.score < 0 ? 'text-red-400' : 'text-green-400'}`}>
                    ${player.score.toLocaleString()}
                  </div>
                  {isRevealed && wager !== undefined && (
                    <div className="text-xs text-slate-500 mt-1">Wagered: ${wager}</div>
                  )}
                  {isRevealed && answer && (
                    <div className="text-xs text-slate-400 mt-1 italic truncate max-w-[140px]">"{answer}"</div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // Render Game Finished
  if (round === 'finished') {
    const sortedPlayers = Object.values(scores).sort((a: any, b: any) => b.score - a.score);
    const winner = sortedPlayers[0];
    
    return (
      <div className="max-w-7xl mx-auto relative w-full h-full flex flex-col items-center justify-center">
        <div className="text-center">
          <div className="font-display text-6xl font-extrabold text-yellow-400 mb-8 tracking-wider drop-shadow-lg animate-pulse">
            GAME OVER
          </div>
          
          {winner && (
            <div className="bg-gradient-to-b from-yellow-500/20 to-yellow-600/10 rounded-3xl p-12 border-4 border-yellow-500/50">
              <div className="text-slate-300 text-xl uppercase tracking-widest mb-4">Winner</div>
              <div className="text-white text-7xl font-black mb-4">{winner.name}</div>
              <div className="text-green-400 text-5xl font-mono font-bold">${winner.score.toLocaleString()}</div>
            </div>
          )}
          
          <div className="mt-12 flex gap-8 justify-center">
            {sortedPlayers.slice(1).map((player: any, idx) => (
              <div key={idx} className="text-center">
                <div className="text-slate-500 text-sm uppercase">{idx === 0 ? '2nd' : '3rd'}</div>
                <div className="text-white text-2xl font-bold">{player.name}</div>
                <div className={`text-xl font-mono ${player.score < 0 ? 'text-red-400' : 'text-slate-300'}`}>
                  ${player.score.toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto relative w-full h-full flex flex-col justify-center pb-24">
      
      {/* Round Transition Overlay */}
      {showRoundTransition && (
        <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-gradient-to-b from-blue-900 via-blue-800 to-blue-900 animate-in fade-in duration-500">
          <div className="font-display text-8xl font-black text-yellow-400 tracking-wider drop-shadow-2xl animate-in zoom-in duration-700">
            {showRoundTransition.to === 'double' ? 'DOUBLE JEOPARDY!' : 
             showRoundTransition.to === 'final' ? 'FINAL JEOPARDY!' : 
             showRoundTransition.to.toUpperCase()}
          </div>
          <div className="text-white text-2xl mt-8 opacity-75">
            {showRoundTransition.to === 'double' ? 'Values are doubled!' : ''}
          </div>
        </div>
      )}
      
      {/* Daily Double Overlay */}
      {showDailyDouble && (
        <div className="fixed inset-0 z-[90] flex flex-col items-center justify-center bg-gradient-to-br from-yellow-600 via-yellow-500 to-orange-500 animate-in zoom-in duration-300">
          <div className="font-display text-9xl font-black text-white tracking-wider drop-shadow-2xl animate-bounce">
            DAILY DOUBLE!
          </div>
        </div>
      )}
      
      {/* 0. Feedback Overlay (Highest Z-Index) */}
      {feedback && (
        <div className={`absolute inset-0 z-60 flex flex-col items-center justify-center animate-in fade-in zoom-in duration-300 backdrop-blur-sm
          ${feedback.type === 'correct' ? 'bg-green-600/90' : 'bg-red-600/90'}
        `}>
           <div className="text-white text-9xl font-black mb-4 drop-shadow-lg">
             {feedback.type === 'correct' ? 'CORRECT!' : 'OOPS!'}
           </div>
           <div className="text-white text-6xl font-bold uppercase tracking-widest mb-8">
             {feedback.playerName}
           </div>
           <div className="text-white text-8xl font-mono font-bold bg-black/30 px-12 py-4 rounded-xl backdrop-blur-md">
             {feedback.points > 0 ? '+' : ''}{feedback.points}
           </div>
        </div>
      )}

      {/* 1. Active Question Overlay (Full Screen) */}
      {activeQuestionData && !showDailyDouble && (
        <div className="absolute inset-0 z-40 flex flex-col items-center justify-center p-10 md:p-12 text-center animate-in fade-in duration-300 bg-gradient-to-b from-[#0b1b5a] via-[#06103a] to-[#020617]">
          {/* Timer */}
          {timerEndTime && (
            <div className="absolute top-8 right-8">
              <Timer endTime={timerEndTime} size="lg" />
            </div>
          )}
          
          <div className="font-display text-yellow-400 font-extrabold text-3xl md:text-4xl mb-8 uppercase tracking-widest border-b-4 border-yellow-500 pb-2 drop-shadow">
            {currentQuestion?.isDailyDouble && <span className="text-orange-400">★ </span>}
            {categories[currentQuestion!.categoryIndex]?.name} — ${activeQuestionData.value}
            {currentQuestion?.isDailyDouble && <span className="text-orange-400"> ★</span>}
          </div>
          <div className="text-white text-4xl md:text-6xl font-serif font-bold leading-tight drop-shadow-md max-w-5xl">
            {activeQuestionData.question}
          </div>
        </div>
      )}

      {/* 2. Buzzer Overlay (On top of everything, even the question, but below feedback) */}
      {activePlayerName && !feedback && !showDailyDouble && (
        <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-50 animate-in fade-in zoom-in duration-200">
          {/* Timer in buzzer overlay */}
          {timerEndTime && (
            <div className="absolute top-8 right-8">
              <Timer endTime={timerEndTime} size="lg" />
            </div>
          )}
          
          <div className="bg-red-600 p-12 rounded-3xl border-8 border-red-800 shadow-[0_0_100px_rgba(220,38,38,1)] text-center transform scale-110">
            <div className="text-white text-3xl font-bold uppercase tracking-widest mb-4 opacity-90">Buzz!</div>
            <div className="text-white text-7xl font-black drop-shadow-lg whitespace-nowrap">{activePlayerName}</div>
          </div>
        </div>
      )}

      {/* Round Indicator */}
      <div className="absolute top-4 left-4 z-20">
        <div className={`px-4 py-2 rounded-full text-sm font-bold uppercase tracking-wider ${
          round === 'double' ? 'bg-purple-600 text-white' : 'bg-blue-600 text-white'
        }`}>
          {round === 'jeopardy' ? 'Jeopardy!' : 'Double Jeopardy!'}
        </div>
      </div>

      {/* Controlling Player Indicator */}
      {controllingPlayer && scores[controllingPlayer] && (
        <div className="absolute top-4 right-4 z-20 bg-yellow-500/20 border border-yellow-500/50 px-4 py-2 rounded-full">
          <span className="text-yellow-400 text-sm font-bold">
            {scores[controllingPlayer].name}'s pick
          </span>
        </div>
      )}

      {/* 3. Game Board Grid */}
      <div className="grid grid-cols-5 gap-2 w-full h-full">
        {/* Categories Row */}
        {categories.map((category, idx) => (
          <div key={idx} className="bg-blue-800 p-4 text-center flex items-center justify-center h-24 border-b-4 border-blue-900 shadow-lg">
            <h2 className="text-xl font-bold uppercase tracking-wider text-white drop-shadow-md leading-tight">{category.name}</h2>
          </div>
        ))}

        {/* Questions Rows (Transposed for display) */}
        {Array.from({ length: 5 }).map((_, rowIndex) => (
          categories.map((category, colIndex) => {
            const question = category.questions[rowIndex];
            const isPlayed = playedQuestions.includes(`${colIndex}-${rowIndex}`);

            return (
              <div 
                key={`${colIndex}-${rowIndex}`} 
                className={`flex items-center justify-center border border-blue-800 shadow-inner group relative transition-colors duration-500
                  ${isPlayed ? 'bg-blue-900' : 'bg-blue-700'}
                `}
              >
                {!isPlayed && question && (
                  <span className="text-5xl font-bold text-yellow-400 font-mono block drop-shadow-md">
                    ${question.value}
                  </span>
                )}
              </div>
            );
          })
        ))}
      </div>

      {/* 4. Score Footer */}
      {Object.keys(scores).length > 0 && (
        <div className={['fixed bottom-0 left-0 right-0 p-4 flex justify-center gap-8 z-30 shadow-2xl backdrop-blur border-t-4 border-yellow-500 bg-[#06103a]/85', panel].join(' ')}>
           {Object.entries(scores).map(([id, player]: [string, any]) => (
             <div key={id} className={`flex flex-col items-center min-w-[120px] ${controllingPlayer === id ? 'ring-2 ring-yellow-400 rounded-lg p-2' : ''}`}>
               <div className="text-slate-400 text-sm font-bold uppercase tracking-wider mb-1">
                 {player.name}
                 {controllingPlayer === id && <span className="text-yellow-400 ml-1">★</span>}
               </div>
               <div className={`text-3xl font-mono font-bold ${player.score < 0 ? 'text-red-400' : 'text-green-400'}`}>
                 ${player.score.toLocaleString()}
               </div>
             </div>
           ))}
        </div>
      )}
    </div>
  );
};
