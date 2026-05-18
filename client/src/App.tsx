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
            <JeopardyShell backgroundMode="viewport" safeArea={false} className="h-dvh overflow-hidden">
              <div className="h-dvh w-full flex flex-col overflow-hidden">
                {/* Header */}
                <header
                  className="shrink-0 flex items-center justify-between"
                  style={{
                    padding: 'clamp(0.5rem, 1.2vw, 0.875rem) clamp(0.75rem, 2vw, 1.5rem)',
                    borderBottom: '1px solid rgba(228,181,69,0.15)',
                    background: 'rgba(3,4,12,0.65)',
                    backdropFilter: 'blur(12px)',
                  }}
                >
                  <h1
                    className="font-display tracking-wider"
                    style={{
                      fontSize: 'clamp(1.1rem, 2.5vw, 1.75rem)',
                      color: '#e4b545',
                      textShadow: '0 0 24px rgba(228,181,69,0.35)',
                    }}
                  >
                    Git Money Jeopardy
                  </h1>
                  <div className="flex items-center gap-2">
                    <span
                      className="rounded-full"
                      style={{
                        width: '0.5rem', height: '0.5rem',
                        background: isConnected ? '#22c55e' : '#ef4444',
                        boxShadow: isConnected ? '0 0 8px rgba(34,197,94,0.7)' : '0 0 8px rgba(239,68,68,0.7)',
                      }}
                    />
                    <span
                      className="font-mono-game uppercase tracking-widest"
                      style={{ fontSize: 'clamp(0.55rem, 1vw, 0.7rem)', color: '#4a5880' }}
                    >
                      {isConnected ? 'LIVE' : 'OFFLINE'}
                    </span>
                  </div>
                </header>

                {/* Game Board */}
                <div className="flex-1 min-h-0">
                  <GameBoard gameData={gameData} socket={socket} />
                </div>
              </div>
            </JeopardyShell>
          ) : (
            <JeopardyShell backgroundMode="viewport" safeArea={false}>
              <div className="w-full flex items-center justify-center" style={{ minHeight: '100dvh' }}>
                <div className="text-center">
                  <div
                    className="font-display text-amber-400"
                    style={{ fontSize: 'clamp(1.75rem, 4vw, 2.5rem)', textShadow: '0 0 24px rgba(228,181,69,0.4)', marginBottom: '0.75rem' }}
                  >
                    Loading Board…
                  </div>
                  <div
                    className="font-semibold uppercase tracking-widest"
                    style={{ fontSize: 'clamp(0.7rem, 1.2vw, 0.9rem)', color: '#4a5880' }}
                  >
                    Connecting to server
                  </div>
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
