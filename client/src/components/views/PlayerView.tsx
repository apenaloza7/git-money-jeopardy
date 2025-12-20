import React, { useEffect, useState } from 'react';
import io, { Socket } from 'socket.io-client';

const socket: Socket = io(`http://${window.location.hostname}:3001`);

export const PlayerView: React.FC = () => {
  const [name, setName] = useState('');
  const [hasJoined, setHasJoined] = useState(false);
  const [isLocked, setIsLocked] = useState(true);
  const [winner, setWinner] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [feedback, setFeedback] = useState<{type: 'correct'|'wrong', points: number} | null>(null);

  useEffect(() => {
    socket.on('state-update', (state: any) => {
      setIsLocked(state.isBuzzersLocked);
      setWinner(state.activePlayer);
      
      // Update my score
      if (socket.id && state.players && state.players[socket.id]) {
        setScore(state.players[socket.id].score);
      }
    });

    socket.on('feedback', (data: any) => {
      if (data.playerId === socket.id) {
        setFeedback(data);
        setTimeout(() => setFeedback(null), 3000); // Hide after 3s
      }
    });

    return () => {
      socket.off('connect');
      socket.off('state-update');
      socket.off('feedback');
    };
  }, []);

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      socket.emit('join-game', name);
      setHasJoined(true);
    }
  };

  const handleBuzz = () => {
    if (navigator.vibrate) navigator.vibrate(50); // Haptic feedback
    if (!isLocked && !winner) {
      socket.emit('buzz');
    }
  };

  // Determine button state
  let buttonColor = "bg-red-600 border-red-800"; // Default
  let statusText = "BUZZ";

  if (winner) {
    if (winner === socket.id) {
      buttonColor = "bg-green-500 border-green-700 animate-pulse";
      statusText = "YOU WON!";
    } else {
      buttonColor = "bg-gray-600 border-gray-800 cursor-not-allowed";
      statusText = "LOCKED";
    }
  } else if (isLocked) {
    buttonColor = "bg-yellow-600 border-yellow-800 cursor-not-allowed";
    statusText = "WAIT...";
  }

  if (!hasJoined) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-4">
        <h1 className="text-3xl font-bold mb-8 text-yellow-400">Join Game</h1>
        <form onSubmit={handleJoin} className="flex flex-col gap-4 w-full max-w-xs">
          <input
            type="text"
            placeholder="Enter Your Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="p-4 rounded-lg bg-slate-800 border border-slate-600 text-white text-lg text-center focus:ring-2 focus:ring-yellow-500 outline-none"
            maxLength={12}
          />
          <button 
            type="submit" 
            className="bg-blue-600 text-white font-bold py-4 rounded-lg shadow-lg hover:bg-blue-500 transition-colors"
          >
            ENTER
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-4 relative overflow-hidden">
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

      {/* Header Info */}
      <div className="absolute top-4 left-0 w-full px-8 flex justify-between items-end">
         <h1 className="text-2xl font-bold text-slate-400">{name}</h1>
         <div className="text-right">
           <div className="text-xs text-slate-500 uppercase font-bold">Score</div>
           <div className={`text-4xl font-mono font-bold ${score < 0 ? 'text-red-400' : 'text-green-400'}`}>
             ${score}
           </div>
         </div>
      </div>
      
      <button 
        onClick={handleBuzz}
        disabled={isLocked || !!winner}
        className={`w-72 h-72 rounded-full flex items-center justify-center shadow-[0_0_50px_rgba(0,0,0,0.5)] border-8 ${buttonColor} transition-all active:scale-95`}
      >
        <span className="text-4xl font-bold uppercase tracking-widest text-white drop-shadow-md select-none">
          {statusText}
        </span>
      </button>

      <div className="mt-12 text-slate-500 font-mono text-sm text-center">
        {winner && winner !== socket.id ? "Another player buzzed in first." : 
         isLocked && !winner ? "Waiting for Host to unlock..." : 
         "GO! GO! GO!"}
      </div>
    </div>
  );
};
