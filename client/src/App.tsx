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

// Connect to the backend
const socket: Socket = io(SERVER_URL);

// Types (should actully be in a shared types file)
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

// Protected Route Component for Host
const ProtectedHostRoute = ({ children }: { children: React.ReactNode }) => {
  const isAuth = localStorage.getItem('host_token') === 'true';
  return isAuth ? <>{children}</> : <Navigate to="/host" replace />;
};

function App() {
  const [isConnected, setIsConnected] = useState(false);
  const [gameData, setGameData] = useState<GameData | null>(null);

  useEffect(() => {
    // Handler for receiving game data
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

    // If socket is already connected when component mounts (e.g. navigation), request data immediately
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
            <div className="min-h-screen bg-slate-900 text-white p-4 overflow-hidden h-screen flex flex-col">
               <header className="flex justify-between items-center mb-4">
                <h1 className="text-3xl font-bold text-yellow-400">Git Money Jeopardy</h1>
                <div className="flex items-center space-x-2">
                  <span className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></span>
                  <span className="text-sm font-mono">{isConnected ? 'ONLINE' : 'OFFLINE'}</span>
                </div>
              </header>
              <div className="flex-1 flex items-center h-full">
                 <GameBoard gameData={gameData} socket={socket} />
              </div>
            </div>
          ) : (
            <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center">Loading Board...</div>
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
