import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { HOST_PASSWORD } from '../../constants';
import { JeopardyShell } from '../theme/JeopardyShell';
import { buttonPrimary, focusRingGold, panelGold } from '../theme/theme';

export const HostLoginView: React.FC = () => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === HOST_PASSWORD) {
      localStorage.setItem('host_token', 'true');
      navigate('/host/dashboard');
    } else {
      setError('Incorrect password');
      setPassword('');
    }
  };

  return (
    <JeopardyShell>
      <div className="min-h-screen text-white flex items-center justify-center p-4">
      <div className={[panelGold, 'p-8 w-full max-w-md'].join(' ')}>
        <h2 className="font-display text-4xl font-extrabold mb-6 text-center text-yellow-400 tracking-wider">
          Host Access
        </h2>
        
        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label className="block text-slate-300 mb-2 font-medium">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={[
                'w-full p-4 bg-slate-950/40 border border-yellow-400/20 rounded-lg text-white transition-all shadow-inner',
                focusRingGold,
              ].join(' ')}
              placeholder="Enter host password"
              autoFocus
            />
          </div>

          {error && (
            <div className="bg-red-900/50 text-red-200 p-3 rounded text-center border border-red-800">
              {error}
            </div>
          )}

          <button
            type="submit"
            className={['w-full py-4 rounded-lg text-lg', buttonPrimary].join(' ')}
          >
            Login
          </button>
        </form>
      </div>
    </div>
    </JeopardyShell>
  );
};
