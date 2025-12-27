import React, { useEffect, useState } from 'react';
import io, { Socket } from 'socket.io-client';
import { useNavigate } from 'react-router-dom';
import { SERVER_URL } from '../../constants';
import { JeopardyShell } from '../theme/JeopardyShell';
import { panel, panelGold, buttonPrimary, buttonSecondary } from '../theme/theme';

const socket: Socket = io(SERVER_URL);

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

  const unlockBuzzers = () => socket.emit('host-unlock-buzzers');
  const resetBuzzers = () => socket.emit('host-reset-buzzers');

  const awardPoints = (points: number) => {
    if (gameState.activePlayer) {
      socket.emit('host-award-points', { playerId: gameState.activePlayer, points });
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

  const currentQ = gameState.currentQuestion;
  const activeQuestionData = currentQ 
    ? gameData.categories?.[currentQ.categoryIndex]?.questions?.[currentQ.questionIndex]
    : null;
  
  const winnerId = gameState.activePlayer;
  const winnerName = winnerId ? gameState.players[winnerId]?.name : null;

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
        </div>
        
        <div className="flex gap-2">
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
             onClick={resetGame}
             className="bg-red-900/50 hover:bg-red-800 text-red-200 px-4 py-2 rounded font-bold text-sm border border-red-800"
           >
             Reset Game
           </button>
        </div>
      </div>

      {/* --- ACTIVE QUESTION CONTROL PANEL --- */}
      {currentQ && activeQuestionData ? (
        <div className={[panelGold, 'p-6 mb-8 sticky top-4 z-40'].join(' ')}>
          <div className="flex justify-between items-start mb-4">
            <div>
              <h2 className="text-yellow-400 font-bold uppercase tracking-wider text-sm">Active Clue (${activeQuestionData.value})</h2>
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
          <div className="grid grid-cols-2 gap-4 mb-6">
            <button 
              onClick={unlockBuzzers}
              disabled={!gameState.isBuzzersLocked || !!winnerId}
              className={`py-4 rounded-lg font-bold text-lg shadow-lg transition-colors
                ${!gameState.isBuzzersLocked ? 'bg-green-800 text-green-200 cursor-not-allowed' : 'bg-green-600 hover:bg-green-500 text-white'}
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
          </div>

          {/* Scoring Controls (Only shows if someone buzzed) */}
          {winnerName && (
            <div className="bg-slate-900 p-4 rounded-lg border border-yellow-500 animate-pulse">
              <div className="text-center mb-4">
                <span className="text-slate-400 text-sm uppercase">Buzzed In:</span>
                <div className="text-3xl font-bold text-white">{winnerName}</div>
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={() => awardPoints(activeQuestionData.value)}
                  className="flex-1 bg-green-600 hover:bg-green-500 text-white py-3 rounded font-bold"
                >
                  Correct (+${activeQuestionData.value})
                </button>
                <button 
                  onClick={() => awardPoints(-activeQuestionData.value)}
                  className="flex-1 bg-red-600 hover:bg-red-500 text-white py-3 rounded font-bold"
                >
                  Wrong (-${activeQuestionData.value})
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* --- GRID SELECTOR --- */
        <div className="mb-8">
          <h2 className="text-xl font-bold mb-4 text-slate-300">Select Question</h2>
          <div className="grid grid-cols-5 gap-1">
             {/* Categories Headers */}
            {gameData.categories?.map((c: any, i: number) => (
              <div key={i} className="text-[10px] md:text-xs text-center font-bold text-slate-400 uppercase truncate px-1">
                {c.name}
              </div>
            ))}
             
             {/* Tiles */}
            {Array.from({ length: 5 }).map((_, r) => (
              gameData.categories?.map((c: any, cIdx: number) => {
                const isPlayed = gameState.playedQuestions.includes(`${cIdx}-${r}`);
                const isActive = gameState.currentQuestion?.categoryIndex === cIdx && gameState.currentQuestion?.questionIndex === r;
                
                return (
                  <button
                    key={`${cIdx}-${r}`}
                    disabled={!!gameState.currentQuestion}
                    onClick={() => isPlayed ? unplayQuestion(cIdx, r) : openQuestion(cIdx, r)}
                    className={`h-12 md:h-16 flex items-center justify-center font-bold text-sm md:text-lg rounded transition-colors relative
                      ${isPlayed ? 'bg-slate-800 text-slate-600 hover:bg-slate-700 hover:text-red-400' : 
                        isActive ? 'bg-yellow-500 text-black animate-pulse' :
                        'bg-blue-600 text-yellow-300 hover:bg-blue-500'}
                    `}
                    title={isPlayed ? "Click to Revert (Unplay)" : "Open Question"}
                  >
                    ${c.questions[r].value}
                    {isPlayed && <span className="absolute top-1 right-1 text-[8px] opacity-50">↺</span>}
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
              ${!player.online ? 'opacity-50' : ''}
            `}>
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${player.online ? 'bg-green-500' : 'bg-gray-500'}`} title={player.online ? "Online" : "Offline"} />
                <span className="font-medium">{player.name}</span>
              </div>
              <span className={`font-mono font-bold ${player.score < 0 ? 'text-red-400' : 'text-green-400'}`}>
                ${player.score}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
    </JeopardyShell>
  );
};