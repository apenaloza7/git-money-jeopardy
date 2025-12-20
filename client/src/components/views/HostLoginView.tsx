import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { HOST_PASSWORD } from '../../constants';

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
    <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center p-4">
      <div className="bg-slate-800 p-8 rounded-xl shadow-2xl w-full max-w-md border border-slate-700">
        <h2 className="text-3xl font-bold mb-6 text-center text-red-400">Host Access</h2>
        
        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label className="block text-slate-300 mb-2 font-medium">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-4 bg-slate-900 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-red-500 outline-none transition-all"
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
            className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-4 rounded-lg shadow-lg transition-colors text-lg"
          >
            Login
          </button>
        </form>
      </div>
    </div>
  );
};
