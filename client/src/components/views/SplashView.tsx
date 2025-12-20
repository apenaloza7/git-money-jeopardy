import React from 'react';
import QRCode from 'react-qr-code';
import { useNavigate } from 'react-router-dom';

export const SplashView: React.FC = () => {
  const navigate = useNavigate();
  
  // Get the current host (e.g., 192.168.1.5:5173) to generate correct links
  const host = window.location.host;
  const protocol = window.location.protocol;
  const baseUrl = `${protocol}//${host}`;

  const playerUrl = `${baseUrl}/play`;
  const hostUrl = `${baseUrl}/host`;

  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-8">
      <h1 className="text-5xl font-bold text-yellow-400 mb-12 tracking-wider drop-shadow-lg text-center">
        GIT MONEY JEOPARDY
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-16 w-full max-w-4xl">
        {/* Player Join Card */}
        <div className="bg-slate-800 p-8 rounded-2xl shadow-2xl flex flex-col items-center border border-slate-700 transform hover:scale-105 transition-transform duration-300">
          <h2 className="text-3xl font-bold mb-6 text-blue-400">Join Game</h2>
          <div className="bg-white p-4 rounded-lg mb-6">
            <QRCode value={playerUrl} size={200} />
          </div>
          <p className="text-slate-400 mb-2 font-mono text-sm">{playerUrl}</p>
          <p className="text-center text-slate-300">
            Scan with your phone to become a player!
          </p>
        </div>

        {/* Host Control Card */}
        <div className="bg-slate-800 p-8 rounded-2xl shadow-2xl flex flex-col items-center border border-slate-700 transform hover:scale-105 transition-transform duration-300">
          <h2 className="text-3xl font-bold mb-6 text-red-400">Host Control</h2>
          <div className="bg-white p-4 rounded-lg mb-6">
            <QRCode value={hostUrl} size={200} />
          </div>
          <p className="text-slate-400 mb-2 font-mono text-sm">{hostUrl}</p>
          <p className="text-center text-slate-300">
            Scan to control the game board.
          </p>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="mt-16 flex gap-6">
        <button 
          onClick={() => navigate('/board')}
          className="bg-green-600 hover:bg-green-700 text-white text-xl font-bold py-4 px-12 rounded-full shadow-lg transition-colors cursor-pointer"
        >
          Launch Big Board
        </button>
        
        <button 
          onClick={() => navigate('/editor')}
          className="bg-slate-700 hover:bg-slate-600 text-white text-xl font-bold py-4 px-12 rounded-full shadow-lg transition-colors cursor-pointer"
        >
          Edit Questions
        </button>
      </div>
    </div>
  );
};
