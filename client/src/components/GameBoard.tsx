import React, { useEffect, useState } from 'react';
import { Socket } from 'socket.io-client';
import { playBuzz, playCorrect, playWrong } from '../utils/audio';

interface Question {
  value: number;
  question: string;
  answer: string;
}

interface Category {
  name: string;
  questions: Question[];
}

interface GameData {
  categories: Category[];
}

interface GameBoardProps {
  gameData: GameData;
  socket: Socket;
}

export const GameBoard: React.FC<GameBoardProps> = ({ gameData, socket }) => {
  const [activePlayerName, setActivePlayerName] = useState<string | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState<{categoryIndex: number, questionIndex: number} | null>(null);
  const [playedQuestions, setPlayedQuestions] = useState<string[]>([]);
  const [scores, setScores] = useState<{[id: string]: {name: string, score: number}}>({});
  const [feedback, setFeedback] = useState<{type: 'correct'|'wrong', playerName: string, points: number} | null>(null);

  useEffect(() => {
    socket.on('state-update', (state: any) => {
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
      setTimeout(() => setFeedback(null), 3000); // Hide after 3s
    });

    return () => {
      socket.off('state-update');
      socket.off('buzz-winner');
      socket.off('feedback');
    };
  }, [socket]);

  // Derive the actual question object if one is active
  const activeQuestionData = currentQuestion 
    ? gameData.categories[currentQuestion.categoryIndex].questions[currentQuestion.questionIndex]
    : null;

  return (
    <div className="max-w-7xl mx-auto relative w-full h-full flex flex-col justify-center pb-24">
      
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
      {activeQuestionData && (
        <div className="absolute inset-0 bg-blue-900 z-40 flex flex-col items-center justify-center p-12 text-center animate-in fade-in duration-300">
           <div className="text-yellow-400 font-bold text-4xl mb-8 uppercase tracking-widest border-b-4 border-yellow-500 pb-2">
             {gameData.categories[currentQuestion!.categoryIndex].name} — ${activeQuestionData.value}
           </div>
           <div className="text-white text-6xl font-serif font-bold leading-tight drop-shadow-md max-w-5xl">
             {activeQuestionData.question}
           </div>
        </div>
      )}

      {/* 2. Buzzer Overlay (On top of everything, even the question, but below feedback) */}
      {activePlayerName && !feedback && (
        <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-50 animate-in fade-in zoom-in duration-200">
          <div className="bg-red-600 p-12 rounded-3xl border-8 border-red-800 shadow-[0_0_100px_rgba(220,38,38,1)] text-center transform scale-110">
            <div className="text-white text-3xl font-bold uppercase tracking-widest mb-4 opacity-90">Buzz!</div>
            <div className="text-white text-7xl font-black drop-shadow-lg whitespace-nowrap">{activePlayerName}</div>
          </div>
        </div>
      )}

      {/* 3. Game Board Grid */}
      <div className="grid grid-cols-5 gap-2 w-full h-full">
        {/* Categories Row */}
        {gameData.categories.map((category, idx) => (
          <div key={idx} className="bg-blue-800 p-4 text-center flex items-center justify-center h-24 border-b-4 border-blue-900 shadow-lg">
            <h2 className="text-xl font-bold uppercase tracking-wider text-white drop-shadow-md leading-tight">{category.name}</h2>
          </div>
        ))}

        {/* Questions Rows (Transposed for display) */}
        {Array.from({ length: 5 }).map((_, rowIndex) => (
          gameData.categories.map((category, colIndex) => {
            const question = category.questions[rowIndex];
            const isPlayed = playedQuestions.includes(`${colIndex}-${rowIndex}`);

            return (
              <div 
                key={`${colIndex}-${rowIndex}`} 
                className={`flex items-center justify-center border border-blue-800 shadow-inner group relative transition-colors duration-500
                  ${isPlayed ? 'bg-blue-900' : 'bg-blue-700'}
                `}
              >
                {!isPlayed && (
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
        <div className="fixed bottom-0 left-0 right-0 bg-slate-900/95 border-t-4 border-yellow-500 p-4 flex justify-center gap-8 z-30 shadow-2xl backdrop-blur">
           {Object.values(scores).map((player: any, idx) => (
             <div key={idx} className="flex flex-col items-center min-w-[120px]">
               <div className="text-slate-400 text-sm font-bold uppercase tracking-wider mb-1">{player.name}</div>
               <div className={`text-3xl font-mono font-bold ${player.score < 0 ? 'text-red-400' : 'text-green-400'}`}>
                 ${player.score}
               </div>
             </div>
           ))}
        </div>
      )}
    </div>
  );
};
