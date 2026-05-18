import React, { useState } from 'react';
import QRCode from 'react-qr-code';
import { useNavigate } from 'react-router-dom';
import { JeopardyShell } from '../theme/JeopardyShell';

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
    <JeopardyShell backgroundMode="viewport" safeArea={false} className="lg:h-dvh lg:overflow-hidden">
      <div
        className="w-full flex flex-col lg:flex-row"
        style={{ minHeight: '100dvh' }}
      >

        {/* ── Left Panel: Branding + Actions ── */}
        <div className="flex-1 flex flex-col items-center justify-center lg:items-start text-center lg:text-left px-8 py-16 lg:py-0 lg:px-16 xl:px-24">

          {/* Title block */}
          <div className="animate-slide-down w-full">
            <div
              className="hidden lg:block mb-8"
              style={{
                width: '3rem',
                height: '2px',
                background: 'rgba(228,181,69,0.5)',
              }}
            />

            <h1
              className="font-display leading-none"
              style={{
                fontSize: 'clamp(5.5rem, 16vw, 13rem)',
                letterSpacing: '0.04em',
                color: '#e4b545',
                textShadow: '0 0 80px rgba(228,181,69,0.45), 0 0 160px rgba(228,181,69,0.15)',
                lineHeight: 0.88,
              }}
            >
              GIT
            </h1>
            <h1
              className="font-display leading-none"
              style={{
                fontSize: 'clamp(5.5rem, 16vw, 13rem)',
                letterSpacing: '0.04em',
                color: '#e4b545',
                textShadow: '0 0 80px rgba(228,181,69,0.45), 0 0 160px rgba(228,181,69,0.15)',
                lineHeight: 0.88,
              }}
            >
              MONEY
            </h1>

            <div
              className="font-display mt-4"
              style={{
                fontSize: 'clamp(1.1rem, 3.5vw, 2.5rem)',
                letterSpacing: '0.45em',
                color: '#93c5fd',
                opacity: 0.9,
              }}
            >
              JEOPARDY
            </div>
          </div>

          {/* Divider */}
          <div
            className="my-10 lg:my-12 mx-auto lg:mx-0"
            style={{
              width: '5rem',
              height: '1px',
              background: 'linear-gradient(90deg, rgba(228,181,69,0.7), transparent)',
            }}
          />

          {/* CTA Buttons */}
          <div className="w-full max-w-sm lg:max-w-md space-y-4 mx-auto lg:mx-0">
            <button
              id="launch-board-btn"
              onClick={() => navigate('/board')}
              className="w-full rounded-2xl font-bold uppercase tracking-widest transition-all duration-200 active:scale-[0.98]"
              style={{
                padding: 'clamp(1rem, 1.8vw, 1.4rem) 2rem',
                fontSize: 'clamp(0.9rem, 1.5vw, 1.1rem)',
                background: 'linear-gradient(135deg, #e4b545 0%, #d4a035 50%, #c09030 100%)',
                color: '#0a0800',
                boxShadow: '0 4px 32px rgba(228,181,69,0.4), 0 1px 0 rgba(255,255,255,0.2) inset',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.boxShadow = '0 8px 48px rgba(228,181,69,0.55), 0 1px 0 rgba(255,255,255,0.2) inset'; }}
              onMouseLeave={(e) => { e.currentTarget.style.boxShadow = '0 4px 32px rgba(228,181,69,0.4), 0 1px 0 rgba(255,255,255,0.2) inset'; }}
            >
              Launch Big Board
            </button>

            <button
              id="edit-boards-btn"
              onClick={() => navigate('/editor')}
              className="w-full rounded-2xl font-bold uppercase tracking-widest transition-all duration-200 active:scale-[0.98]"
              style={{
                padding: 'clamp(0.85rem, 1.5vw, 1.2rem) 2rem',
                fontSize: 'clamp(0.8rem, 1.3vw, 1rem)',
                background: 'transparent',
                border: '1.5px solid rgba(228,181,69,0.35)',
                color: '#e4b545',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(228,181,69,0.08)';
                e.currentTarget.style.borderColor = 'rgba(228,181,69,0.6)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.borderColor = 'rgba(228,181,69,0.35)';
              }}
            >
              Edit Game Boards
            </button>
          </div>

          {/* Bottom attribution */}
          <div className="mt-12 lg:mt-auto lg:pt-16 mx-auto lg:mx-0">
            <p
              className="text-xs uppercase tracking-widest"
              style={{ color: 'rgba(74,88,128,0.7)', fontSize: 'clamp(0.6rem, 1vw, 0.75rem)' }}
            >
              Developer Edition
            </p>
          </div>
        </div>

        {/* ── Vertical divider (desktop) ── */}
        <div
          className="hidden lg:block shrink-0"
          style={{
            width: '1px',
            margin: '5% 0',
            background: 'linear-gradient(to bottom, transparent, rgba(255,255,255,0.07), transparent)',
          }}
        />

        {/* ── Right Panel: QR Code ── */}
        <div className="flex-shrink-0 flex items-center justify-center px-8 py-12 lg:py-0 lg:px-16 xl:px-24">
          <div style={{ width: '100%', maxWidth: 'clamp(280px, 28vw, 380px)' }}>

            {/* Panel */}
            <div
              className="rounded-3xl"
              style={{
                padding: 'clamp(1.5rem, 2.5vw, 2.5rem)',
                background: 'linear-gradient(145deg, rgba(10,18,58,0.94), rgba(6,8,18,0.97))',
                border: '1.5px solid rgba(228,181,69,0.28)',
                borderTopColor: 'rgba(228,181,69,0.48)',
                boxShadow: '0 0 80px rgba(228,181,69,0.06), 0 32px 80px rgba(0,0,0,0.65)',
              }}
            >
              {/* Tab Switcher */}
              <div
                className="flex gap-2 rounded-xl"
                style={{
                  marginBottom: 'clamp(1.25rem, 2vw, 2rem)',
                  padding: '0.3rem',
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.06)',
                }}
              >
                {(['player', 'host'] as const).map((tab) => (
                  <button
                    key={tab}
                    id={`tab-${tab}`}
                    onClick={() => setActiveTab(tab)}
                    className="flex-1 rounded-lg font-bold uppercase tracking-widest transition-all duration-150"
                    style={{
                      padding: 'clamp(0.5rem, 1vw, 0.75rem)',
                      fontSize: 'clamp(0.65rem, 1vw, 0.75rem)',
                      ...(activeTab === tab
                        ? {
                            background: 'linear-gradient(135deg, #e4b545, #c49030)',
                            color: '#0a0800',
                            boxShadow: '0 2px 10px rgba(228,181,69,0.35)',
                          }
                        : { color: '#4a5880' }),
                    }}
                    onMouseEnter={(e) => { if (activeTab !== tab) e.currentTarget.style.color = '#eef2ff'; }}
                    onMouseLeave={(e) => { if (activeTab !== tab) e.currentTarget.style.color = '#4a5880'; }}
                  >
                    {tab === 'player' ? 'Player Link' : 'Host Link'}
                  </button>
                ))}
              </div>

              {/* QR Code */}
              <div className="flex flex-col items-center" style={{ gap: 'clamp(0.75rem, 1.5vw, 1.25rem)' }}>
                <div
                  className="rounded-2xl"
                  style={{
                    padding: 'clamp(0.75rem, 1.5vw, 1.25rem)',
                    background: '#ffffff',
                    boxShadow: '0 8px 40px rgba(0,0,0,0.55)',
                  }}
                >
                  <QRCode
                    value={currentUrl}
                    size={180}
                    style={{ width: '100%', height: 'auto', maxWidth: 'clamp(140px, 18vw, 200px)', display: 'block' }}
                  />
                </div>

                <p style={{ fontSize: 'clamp(0.75rem, 1.2vw, 0.9rem)', color: '#4a5880', textAlign: 'center' }}>
                  {activeTab === 'player' ? 'Scan to join the game' : 'Scan for host controls'}
                </p>

                {/* URL pill */}
                <div
                  className="w-full rounded-xl"
                  style={{
                    padding: 'clamp(0.5rem, 1vw, 0.85rem) clamp(0.75rem, 1.2vw, 1rem)',
                    background: 'rgba(3,4,12,0.7)',
                    border: '1px solid rgba(255,255,255,0.06)',
                  }}
                >
                  <p
                    className="font-mono-game text-center break-all"
                    style={{ fontSize: 'clamp(0.6rem, 0.9vw, 0.7rem)', color: '#4a5880', lineHeight: 1.5 }}
                  >
                    {currentUrl}
                  </p>
                </div>

                {/* Copy button */}
                <button
                  id="copy-link-btn"
                  onClick={handleCopy}
                  className="w-full rounded-xl font-bold uppercase tracking-widest transition-all duration-150"
                  style={{
                    padding: 'clamp(0.65rem, 1.2vw, 1rem)',
                    fontSize: 'clamp(0.7rem, 1.1vw, 0.85rem)',
                    ...(copyState === 'copied'
                      ? { background: '#16a34a', color: '#ffffff' }
                      : copyState === 'error'
                      ? { background: '#dc2626', color: '#ffffff' }
                      : {
                          background: 'rgba(255,255,255,0.06)',
                          color: '#8a9cc8',
                          border: '1px solid rgba(255,255,255,0.08)',
                        }),
                  }}
                >
                  {copyState === 'copied' ? '✓ Copied!' : copyState === 'error' ? 'Copy failed' : 'Copy Link'}
                </button>
              </div>
            </div>

            {/* Host link below panel */}
            <button
              onClick={() => navigate('/host')}
              className="w-full font-semibold uppercase tracking-widest transition-colors"
              style={{
                marginTop: '1rem',
                padding: '0.75rem',
                fontSize: 'clamp(0.65rem, 1vw, 0.75rem)',
                color: '#4a5880',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.color = '#8a9cc8'; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = '#4a5880'; }}
            >
              Host Login →
            </button>
          </div>
        </div>

      </div>
    </JeopardyShell>
  );
};
