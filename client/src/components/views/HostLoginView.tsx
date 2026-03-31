import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { HOST_PASSWORD } from '../../constants';
import { JeopardyShell } from '../theme/JeopardyShell';
import { buttonPrimary, focusRing, panelGold } from '../theme/theme';

export const HostLoginView: React.FC = () => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isShaking, setIsShaking] = useState(false);
  const navigate = useNavigate();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === HOST_PASSWORD) {
      localStorage.setItem('host_token', 'true');
      navigate('/host/dashboard');
    } else {
      setError('Incorrect password');
      setPassword('');
      setIsShaking(true);
      setTimeout(() => setIsShaking(false), 500);
    }
  };

  return (
    <JeopardyShell backgroundMode="viewport">
      <div className="min-h-dvh w-full flex items-center justify-center p-4">
        <div className={`${panelGold} w-full max-w-sm p-6 sm:p-8 animate-scale-in ${isShaking ? 'animate-[shake_0.5s_ease-in-out]' : ''}`}>
          <h1 className="font-display text-4xl sm:text-5xl text-amber-400 text-center tracking-wider mb-2">
            HOST ACCESS
          </h1>
          <p className="text-slate-400 text-center text-sm mb-8">
            Enter the host password to continue
          </p>
          
          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-slate-500 text-xs uppercase tracking-wider mb-2 font-semibold">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(''); }}
                className={`w-full p-4 rounded-xl bg-slate-900/60 border-2 ${
                  error ? 'border-red-500/50' : 'border-amber-500/30'
                } text-white text-lg text-center ${focusRing}`}
                placeholder="••••••••"
                autoFocus
                autoComplete="off"
              />
            </div>

            {error && (
              <div className="bg-red-900/30 border border-red-500/30 text-red-300 p-3 rounded-xl text-center text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              className={`w-full py-4 rounded-xl text-lg ${buttonPrimary}`}
            >
              Enter
            </button>
          </form>

          <button 
            onClick={() => navigate('/')}
            className="w-full mt-4 py-2 text-slate-500 hover:text-white text-sm transition-colors"
          >
            ← Back to Home
          </button>
        </div>
      </div>

      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          10%, 30%, 50%, 70%, 90% { transform: translateX(-4px); }
          20%, 40%, 60%, 80% { transform: translateX(4px); }
        }
      `}</style>
    </JeopardyShell>
  );
};
