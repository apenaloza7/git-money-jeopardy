import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import io, { Socket } from 'socket.io-client';
import { SERVER_URL } from './constants';

// Views
import { SplashView } from './components/views/SplashView';
import { HostLoginView } from './components/views/HostLoginView';
import { HostDashboardView } from './components/views/HostDashboardView';
import { PlayerView } from './components/views/PlayerView';
import { EditorView } from './components/views/EditorView';
import { GameBoard } from './components/GameBoard';
import { JeopardyShell } from './components/theme/JeopardyShell';

// Connect to backend
const socket: Socket = io(SERVER_URL);

// Types
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

// Protected Route for Host
const ProtectedHostRoute = ({ children }: { children: React.ReactNode }) => {
  const isAuth = localStorage.getItem('host_token') === 'true';
  return isAuth ? <>{children}</> : <Navigate to="/host" replace />;
};

function App() {
  const [isConnected, setIsConnected] = useState(false);
  const [gameData, setGameData] = useState<GameData | null>(null);

  useEffect(() => {
    const handleGameData = (data: GameData) => {
      console.log('Game data received:', data);
      setGameData(data);
    };

    socket.on('connect', () => {
      setIsConnected(true);
      console.log('Connected to server');
      socket.emit('request-game-data');
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
      console.log('Disconnected from server');
    });

    socket.on('init-game', handleGameData);

    if (socket.connected) {
      setIsConnected(true);
      socket.emit('request-game-data');
    }

    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('init-game', handleGameData);
    };
  }, []);

  return (
    <BrowserRouter>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<SplashView />} />
        
        <Route path="/board" element={
          gameData ? (
            <JeopardyShell backgroundMode="viewport" className="h-dvh overflow-hidden">
              <div className="h-dvh w-full flex flex-col overflow-hidden">
                {/* Header */}
                <header className="shrink-0 px-4 py-2 flex items-center justify-between border-b border-slate-700/50">
                  <h1 className="font-display text-xl md:text-2xl text-amber-400 tracking-wider">
                    Git Money Jeopardy
                  </h1>
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-500' : 'bg-red-500'}`} />
                    <span className="text-xs font-mono text-slate-400">{isConnected ? 'LIVE' : 'OFFLINE'}</span>
                  </div>
                </header>
                
                {/* Game Board - takes remaining height */}
                <div className="flex-1 min-h-0">
                  <GameBoard gameData={gameData} socket={socket} />
                </div>
              </div>
            </JeopardyShell>
          ) : (
            <JeopardyShell backgroundMode="viewport">
              <div className="min-h-dvh w-full flex items-center justify-center">
                <div className="text-center">
                  <div className="font-display text-2xl text-amber-400 mb-2">Loading Board...</div>
                  <div className="text-slate-500 text-sm">Connecting to server</div>
                </div>
              </div>
            </JeopardyShell>
          )
        } />

        <Route path="/play" element={<PlayerView />} />
        <Route path="/editor" element={<EditorView />} />

        {/* Host Routes */}
        <Route path="/host" element={<HostLoginView />} />
        <Route path="/host/dashboard" element={
          <ProtectedHostRoute>
            <HostDashboardView />
          </ProtectedHostRoute>
        } />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
