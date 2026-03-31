import React, { useState } from 'react';
import QRCode from 'react-qr-code';
import { useNavigate } from 'react-router-dom';
import { JeopardyShell } from '../theme/JeopardyShell';
import { buttonPrimary, buttonSecondary, buttonOutline, panelGold } from '../theme/theme';

export const SplashView: React.FC = () => {
  const navigate = useNavigate();
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'error'>('idle');
  const [activeTab, setActiveTab] = useState<'player' | 'host'>('player');

  const host = window.location.host;
  const protocol = window.location.protocol;
  const baseUrl = `${protocol}//${host}`;
  const playerUrl = `${baseUrl}/play`;
  const hostUrl = `${baseUrl}/host`;

  const copyToClipboardFallback = (text: string): boolean => {
    const el = document.createElement('textarea');
    el.value = text;
    el.setAttribute('readonly', 'true');
    el.style.cssText = 'position:fixed;top:0;left:0;opacity:0;pointer-events:none;';
    document.body.appendChild(el);
    el.focus();
    el.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(el);
    return ok;
  };

  const handleCopy = async () => {
    setCopyState('idle');
    const url = activeTab === 'player' ? playerUrl : hostUrl;
    
    try {
      if (navigator.clipboard?.writeText && window.isSecureContext) {
        await navigator.clipboard.writeText(url);
        setCopyState('copied');
        setTimeout(() => setCopyState('idle'), 1500);
        return;
      }
      const ok = copyToClipboardFallback(url);
      setCopyState(ok ? 'copied' : 'error');
      setTimeout(() => setCopyState('idle'), ok ? 1500 : 2000);
    } catch {
      const ok = copyToClipboardFallback(url);
      setCopyState(ok ? 'copied' : 'error');
      setTimeout(() => setCopyState('idle'), ok ? 1500 : 2000);
    }
  };

  const currentUrl = activeTab === 'player' ? playerUrl : hostUrl;

  return (
    <JeopardyShell backgroundMode="viewport" className="h-dvh">
      <div className="h-dvh w-full flex flex-col overflow-hidden">
        {/* Header */}
        <header className="shrink-0 pt-4 md:pt-6 pb-3 md:pb-4 px-4 text-center">
          <h1 className="font-display text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold tracking-[0.15em] text-amber-400 drop-shadow-lg animate-slide-down">
            GIT MONEY
          </h1>
          <p className="font-display text-lg sm:text-xl md:text-2xl tracking-[0.2em] text-blue-300 mt-0.5 opacity-90">
            JEOPARDY
          </p>
        </header>

        {/* Main Content */}
        <main className="flex-1 min-h-0 flex flex-col items-center justify-center px-4 py-2 overflow-auto">
          {/* QR Card */}
          <div className={`${panelGold} w-full max-w-sm p-4 sm:p-6 animate-scale-in`}>
            {/* Tab Switcher */}
            <div className="flex gap-2 mb-4">
              <button
                onClick={() => setActiveTab('player')}
                className={`flex-1 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-bold uppercase tracking-wider transition-all ${
                  activeTab === 'player'
                    ? 'bg-amber-500 text-slate-900 shadow-lg'
                    : 'bg-slate-800/60 text-slate-400 hover:text-white hover:bg-slate-700/60'
                }`}
              >
                👤 Player
              </button>
              <button
                onClick={() => setActiveTab('host')}
                className={`flex-1 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-bold uppercase tracking-wider transition-all ${
                  activeTab === 'host'
                    ? 'bg-amber-500 text-slate-900 shadow-lg'
                    : 'bg-slate-800/60 text-slate-400 hover:text-white hover:bg-slate-700/60'
                }`}
              >
                🎮 Host
              </button>
            </div>

            {/* QR Code */}
            <div className="flex flex-col items-center">
              <div className="bg-white p-3 rounded-xl shadow-xl mb-3">
                <QRCode 
                  value={currentUrl} 
                  size={140}
                  style={{ width: '100%', height: 'auto', maxWidth: '140px' }}
                />
              </div>

              <p className="text-slate-300 text-center text-xs sm:text-sm mb-3">
                {activeTab === 'player' 
                  ? 'Scan to join the game'
                  : 'Scan for host controls'
                }
              </p>

              {/* URL + Copy */}
              <div className="w-full bg-slate-900/50 rounded-lg p-2 mb-3">
                <p className="text-slate-400 font-mono text-[10px] sm:text-xs text-center break-all leading-relaxed">
                  {currentUrl}
                </p>
              </div>

              <button
                onClick={handleCopy}
                className={`w-full py-2.5 rounded-xl text-sm font-bold transition-all ${
                  copyState === 'copied'
                    ? 'bg-emerald-500 text-white'
                    : copyState === 'error'
                    ? 'bg-red-500 text-white'
                    : buttonSecondary
                }`}
              >
                {copyState === 'copied' ? '✓ Copied!' : copyState === 'error' ? 'Copy failed' : 'Copy Link'}
              </button>
            </div>
          </div>
        </main>

        {/* Bottom Actions */}
        <footer className="shrink-0 px-4 pb-4 pt-2">
          <div className="max-w-sm mx-auto space-y-2">
            <button
              onClick={() => navigate('/board')}
              className={`w-full py-3 rounded-xl text-sm ${buttonPrimary}`}
            >
              🖥️ Launch Big Board
            </button>
            
            <button
              onClick={() => navigate('/editor')}
              className={`w-full py-2.5 rounded-xl text-xs ${buttonOutline}`}
            >
              ✏️ Edit Game Boards
            </button>
          </div>
        </footer>
      </div>
    </JeopardyShell>
  );
};
