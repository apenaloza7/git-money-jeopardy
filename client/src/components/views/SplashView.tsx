import React, { useState } from 'react';
import QRCode from 'react-qr-code';
import { useNavigate } from 'react-router-dom';
import { JeopardyShell } from '../theme/JeopardyShell';
import { buttonPrimary, buttonSecondary, panel, panelGold } from '../theme/theme';

export const SplashView: React.FC = () => {
  const navigate = useNavigate();
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'error'>('idle');
  
  // Get the current host (e.g., 192.168.1.5:5173) to generate correct links
  const host = window.location.host;
  const protocol = window.location.protocol;
  const baseUrl = `${protocol}//${host}`;

  const playerUrl = `${baseUrl}/play`;
  const hostUrl = `${baseUrl}/host`;

  const copyToClipboardFallback = (text: string) => {
    const el = document.createElement('textarea');
    el.value = text;
    el.setAttribute('readonly', 'true');
    el.style.position = 'fixed';
    el.style.top = '0';
    el.style.left = '0';
    el.style.opacity = '0';
    document.body.appendChild(el);
    el.focus();
    el.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(el);
    return ok;
  };

  const handleCopy = async () => {
    // reset any previous state immediately on click
    setCopyState('idle');

    try {
      // Clipboard API may fail on non-secure contexts or due to permissions.
      if (navigator.clipboard?.writeText && window.isSecureContext) {
        await navigator.clipboard.writeText(playerUrl);
        setCopyState('copied');
        window.setTimeout(() => setCopyState('idle'), 1400);
        return;
      }

      const ok = copyToClipboardFallback(playerUrl);
      setCopyState(ok ? 'copied' : 'error');
      window.setTimeout(() => setCopyState('idle'), ok ? 1400 : 2000);
    } catch {
      const ok = copyToClipboardFallback(playerUrl);
      setCopyState(ok ? 'copied' : 'error');
      window.setTimeout(() => setCopyState('idle'), ok ? 1400 : 2000);
    }
  };

  return (
    <JeopardyShell withContainer>
        <header className="mb-10 md:mb-12">
          <h1 className="font-display text-center text-5xl md:text-6xl font-extrabold tracking-[0.22em] text-yellow-400 drop-shadow-lg">
            GIT MONEY JEOPARDY
          </h1>
          <p className="mt-4 text-center text-slate-200/90">
            Scan to join as a player, or scan the host code to run the game.
          </p>
        </header>

        <main className="grid grid-cols-1 gap-8 md:grid-cols-12 md:gap-10 items-start md:items-stretch">
          {/* Player Join (Hero) */}
          <section className="md:col-span-7 lg:col-span-8 order-1">
            <div className={[panelGold, 'h-full p-8 md:p-10'].join(' ')}>
              <div className="flex flex-col items-center text-center">
                <h2 className="font-display text-3xl md:text-5xl font-extrabold mb-2 text-blue-100">
                  Join Game
                </h2>
                <p className="text-slate-100/80 mb-6 md:mb-8">
                  Scan to join from your phone.
                </p>

                <div className="bg-white p-4 md:p-5 rounded-xl mb-5 md:mb-6 shadow-lg max-w-full">
                  <QRCode value={playerUrl} size={230} />
                </div>

                <div className="w-full max-w-xl">
                  <p className="text-slate-100/75 font-mono text-sm break-all">{playerUrl}</p>
                  <div className="mt-3 flex items-center justify-center gap-3">
                    <button
                      type="button"
                      onClick={handleCopy}
                      className={[
                        'border text-sm font-semibold px-4 py-2 rounded-lg shadow transition-colors cursor-pointer active:scale-[0.99]',
                        copyState === 'copied'
                          ? 'bg-emerald-500/90 hover:bg-emerald-500 text-white border-emerald-200/30 focus-visible:ring-emerald-300/40'
                          : copyState === 'error'
                            ? 'bg-red-500/80 hover:bg-red-500 text-white border-red-200/30 focus-visible:ring-red-300/40'
                            : buttonSecondary.replace('font-bold', 'font-semibold'),
                      ].join(' ')}
                      aria-label="Copy player link"
                    >
                      {copyState === 'copied' ? 'Copied!' : copyState === 'error' ? 'Copy failed' : 'Copy link'}
                    </button>

                    <span className="sr-only" aria-live="polite">
                      {copyState === 'copied'
                        ? 'Player link copied to clipboard.'
                        : copyState === 'error'
                          ? 'Copy failed.'
                          : ''}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Right rail: Host + Admin actions (secondary) */}
          <aside className="md:col-span-5 lg:col-span-4 order-2">
            <div className="h-full flex flex-col gap-8 md:gap-10">
              {/* Host Control */}
              <section className={[panel, 'p-6'].join(' ')}>
                <div className="flex flex-col items-center text-center">
                  <h2 className="font-display text-2xl font-bold mb-3 text-slate-100">
                    Host Control
                  </h2>

                  <div className="bg-white p-3 rounded-xl mb-4 shadow-md">
                    <QRCode value={hostUrl} size={160} />
                  </div>

                  <p className="text-slate-400 mb-2 font-mono text-xs break-all">
                    {hostUrl}
                  </p>
                  <p className="text-slate-100/75 text-sm">
                    Scan to control the game.
                  </p>
                </div>
              </section>

              {/* Admin actions */}
              <section className={[panel, 'flex-1 p-6 bg-[#0a1c5a]/40'].join(' ')}>
                <div className="h-full flex flex-col justify-end gap-4">
                  <button
                    onClick={() => navigate('/board')}
                    className={['w-full text-lg py-4 rounded-xl', buttonPrimary].join(' ')}
                  >
                    Launch Big Board
                  </button>

                  <button
                    onClick={() => navigate('/editor')}
                    className={['w-full text-lg py-4 rounded-xl', buttonSecondary].join(' ')}
                  >
                    Edit Boards
                  </button>
                </div>
              </section>
            </div>
          </aside>
        </main>
    </JeopardyShell>
  );
};
