import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { HOST_PASSWORD } from '../../constants';
import { JeopardyShell } from '../theme/JeopardyShell';
import { focusRing } from '../theme/theme';

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
    <JeopardyShell backgroundMode="viewport" safeArea={false} className="lg:h-dvh lg:overflow-hidden">
      <div
        className="w-full flex flex-col lg:flex-row"
        style={{ minHeight: '100dvh' }}
      >

        {/* ── Left branding panel (desktop only) ── */}
        <div
          className="hidden lg:flex flex-1 flex-col items-center justify-center"
          style={{
            padding: '3rem clamp(2rem, 4vw, 5rem)',
            borderRight: '1px solid rgba(255,255,255,0.04)',
          }}
        >
          <div className="text-center">
            <div
              style={{
                width: '2.5rem',
                height: '2px',
                background: 'rgba(228,181,69,0.5)',
                margin: '0 auto 2.5rem',
              }}
            />

            <div
              className="font-display leading-none"
              style={{
                fontSize: 'clamp(5rem, 11vw, 10rem)',
                letterSpacing: '0.04em',
                color: '#e4b545',
                textShadow: '0 0 80px rgba(228,181,69,0.4), 0 0 160px rgba(228,181,69,0.12)',
                lineHeight: 0.88,
              }}
            >
              GIT
            </div>
            <div
              className="font-display leading-none"
              style={{
                fontSize: 'clamp(5rem, 11vw, 10rem)',
                letterSpacing: '0.04em',
                color: '#e4b545',
                textShadow: '0 0 80px rgba(228,181,69,0.4), 0 0 160px rgba(228,181,69,0.12)',
                lineHeight: 0.88,
              }}
            >
              MONEY
            </div>

            <div
              className="font-display"
              style={{
                marginTop: '1rem',
                fontSize: 'clamp(1rem, 2.5vw, 2rem)',
                letterSpacing: '0.45em',
                color: '#93c5fd',
                opacity: 0.85,
              }}
            >
              JEOPARDY
            </div>

            <div
              style={{
                width: '4rem',
                height: '1px',
                background: 'linear-gradient(90deg, transparent, rgba(228,181,69,0.5), transparent)',
                margin: '2rem auto',
              }}
            />

            <p
              className="text-xs uppercase tracking-widest font-semibold"
              style={{ color: '#4a5880' }}
            >
              Host Control Center
            </p>
          </div>
        </div>

        {/* ── Right login panel ── */}
        <div
          className="flex-1 flex flex-col items-center justify-center"
          style={{ padding: 'clamp(2.5rem, 5vw, 5rem) clamp(1.5rem, 4vw, 4rem)' }}
        >

          {/* Mobile title */}
          <div className="lg:hidden text-center mb-12">
            <div
              className="font-display leading-none text-amber-400"
              style={{
                fontSize: 'clamp(3.5rem, 14vw, 5rem)',
                textShadow: '0 0 40px rgba(228,181,69,0.4)',
              }}
            >
              GIT MONEY
            </div>
            <div
              className="font-display tracking-[0.35em] text-blue-300"
              style={{ fontSize: 'clamp(1rem, 4vw, 1.5rem)', marginTop: '0.5rem' }}
            >
              JEOPARDY
            </div>
          </div>

          {/* Card container */}
          <div
            className={`w-full ${isShaking ? 'animate-[shake_0.5s_ease-in-out]' : ''}`}
            style={{ maxWidth: 'clamp(320px, 40vw, 520px)' }}
          >
            {/* Lock icon — floats above card */}
            <div className="flex justify-center" style={{ marginBottom: '-2rem', position: 'relative', zIndex: 10 }}>
              <div
                className="inline-flex items-center justify-center rounded-2xl"
                style={{
                  width: 'clamp(3.5rem, 5vw, 4.5rem)',
                  height: 'clamp(3.5rem, 5vw, 4.5rem)',
                  background: 'linear-gradient(145deg, #0d1b5a, #060d3a)',
                  border: '1.5px solid rgba(228,181,69,0.45)',
                  boxShadow: '0 8px 32px rgba(0,0,0,0.5), 0 0 24px rgba(228,181,69,0.12)',
                }}
              >
                <svg
                  fill="none"
                  stroke="#e4b545"
                  viewBox="0 0 24 24"
                  strokeWidth={1.8}
                  style={{ width: '55%', height: '55%' }}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                </svg>
              </div>
            </div>

            {/* Card */}
            <div
              className="rounded-3xl"
              style={{
                paddingTop: 'clamp(3rem, 5vw, 4.5rem)',
                paddingBottom: 'clamp(2rem, 3.5vw, 3.5rem)',
                paddingLeft: 'clamp(1.75rem, 4vw, 3.5rem)',
                paddingRight: 'clamp(1.75rem, 4vw, 3.5rem)',
                background: 'linear-gradient(145deg, rgba(10,18,58,0.94), rgba(6,8,18,0.98))',
                border: '1.5px solid rgba(228,181,69,0.28)',
                borderTopColor: 'rgba(228,181,69,0.5)',
                boxShadow: '0 0 80px rgba(228,181,69,0.07), 0 32px 80px rgba(0,0,0,0.7)',
              }}
            >
              {/* Header */}
              <div className="text-center" style={{ marginBottom: 'clamp(2rem, 3.5vw, 3rem)' }}>
                <h1
                  className="font-display text-amber-400 tracking-wider"
                  style={{
                    fontSize: 'clamp(2.5rem, 5vw, 4rem)',
                    textShadow: '0 0 30px rgba(228,181,69,0.3)',
                    marginBottom: '0.75rem',
                  }}
                >
                  HOST ACCESS
                </h1>
                <p style={{ fontSize: 'clamp(0.8rem, 1.3vw, 1rem)', color: '#4a5880', letterSpacing: '0.05em' }}>
                  Enter the host password to continue
                </p>
              </div>

              <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 'clamp(1rem, 2vw, 1.5rem)' }}>
                <div>
                  <label
                    className="block uppercase tracking-widest font-semibold"
                    style={{
                      fontSize: 'clamp(0.65rem, 1vw, 0.75rem)',
                      color: '#4a5880',
                      marginBottom: '0.875rem',
                    }}
                  >
                    Password
                  </label>
                  <input
                    id="host-password-input"
                    type="password"
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); setError(''); }}
                    className={`w-full text-white text-center tracking-[0.3em] placeholder:tracking-normal placeholder:text-slate-700 transition-all ${focusRing}`}
                    style={{
                      padding: 'clamp(0.875rem, 1.5vw, 1.25rem) 1.25rem',
                      fontSize: 'clamp(1.1rem, 2vw, 1.5rem)',
                      borderRadius: '1rem',
                      background: 'rgba(3,4,12,0.7)',
                      border: `2px solid ${error ? 'rgba(239,68,68,0.55)' : 'rgba(228,181,69,0.22)'}`,
                      outline: 'none',
                    }}
                    onFocus={(e) => { if (!error) e.target.style.borderColor = 'rgba(228,181,69,0.55)'; }}
                    onBlur={(e) => { if (!error) e.target.style.borderColor = 'rgba(228,181,69,0.22)'; }}
                    placeholder="••••••••"
                    autoFocus
                    autoComplete="off"
                  />
                </div>

                {error && (
                  <div
                    className="text-center font-semibold animate-scale-in"
                    style={{
                      padding: '0.875rem 1rem',
                      borderRadius: '0.75rem',
                      fontSize: 'clamp(0.8rem, 1.2vw, 0.95rem)',
                      background: 'rgba(127,29,29,0.4)',
                      border: '1px solid rgba(239,68,68,0.3)',
                      color: '#fca5a5',
                    }}
                  >
                    {error}
                  </div>
                )}

                <button
                  id="host-login-btn"
                  type="submit"
                  className="w-full font-bold uppercase tracking-widest transition-all duration-150 active:scale-[0.98]"
                  style={{
                    padding: 'clamp(0.875rem, 1.5vw, 1.25rem)',
                    fontSize: 'clamp(0.85rem, 1.3vw, 1rem)',
                    borderRadius: '1rem',
                    background: 'linear-gradient(135deg, #e4b545 0%, #d4a035 50%, #c09030 100%)',
                    color: '#0a0800',
                    boxShadow: '0 4px 24px rgba(228,181,69,0.35), inset 0 1px 0 rgba(255,255,255,0.2)',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.boxShadow = '0 8px 40px rgba(228,181,69,0.5), inset 0 1px 0 rgba(255,255,255,0.2)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.boxShadow = '0 4px 24px rgba(228,181,69,0.35), inset 0 1px 0 rgba(255,255,255,0.2)'; }}
                >
                  Enter
                </button>
              </form>

              <button
                onClick={() => navigate('/')}
                className="w-full font-semibold tracking-wide transition-colors flex items-center justify-center gap-2"
                style={{
                  marginTop: 'clamp(1.5rem, 2.5vw, 2.5rem)',
                  padding: '0.75rem',
                  fontSize: 'clamp(0.8rem, 1.2vw, 0.95rem)',
                  color: '#4a5880',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.color = '#8a9cc8'; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = '#4a5880'; }}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Back to Home
              </button>
            </div>
          </div>
        </div>

      </div>

      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          10%, 30%, 50%, 70%, 90% { transform: translateX(-8px); }
          20%, 40%, 60%, 80% { transform: translateX(8px); }
        }
      `}</style>
    </JeopardyShell>
  );
};
