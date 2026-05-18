import React, { useEffect } from 'react';

interface JeopardyShellProps {
  children: React.ReactNode;
  className?: string;
  /** Wrap content in a centered container with max-width */
  withContainer?: boolean;
  /** Custom container classes */
  containerClassName?: string;
  /** 'viewport' pins background to screen, 'container' to content flow */
  backgroundMode?: 'container' | 'viewport';
  /** Enable safe-area padding for notched devices */
  safeArea?: boolean;
}

const defaultContainerClass =
  'mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8';

export const JeopardyShell: React.FC<JeopardyShellProps> = ({
  children,
  className = '',
  withContainer = false,
  containerClassName = defaultContainerClass,
  backgroundMode = 'container',
  safeArea = true,
}) => {
  const isViewport = backgroundMode === 'viewport';

  useEffect(() => {
    if (!isViewport) return;
    let meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
    const prev = meta?.getAttribute('content');
    if (!meta) {
      meta = document.createElement('meta');
      meta.setAttribute('name', 'theme-color');
      document.head.appendChild(meta);
    }
    meta.setAttribute('content', '#03040c');
    return () => {
      if (meta && prev) meta.setAttribute('content', prev);
      else if (meta && !prev) meta.remove();
    };
  }, [isViewport]);

  const pos = isViewport ? 'fixed' : 'absolute';

  const wrapperClasses = [
    'relative w-full text-white',
    isViewport ? 'min-h-dvh' : 'min-h-screen',
    safeArea && isViewport ? 'safe-y' : '',
    className,
  ].filter(Boolean).join(' ');

  return (
    <div className={wrapperClasses}>

      {/* === BACKGROUND LAYERS === */}

      {/* 1. Void base — cold near-black */}
      <div
        className={`${pos} inset-0 -z-30`}
        style={{ background: 'linear-gradient(145deg, #03040c 0%, #060810 30%, #090d1c 65%, #0c1228 100%)' }}
      />

      {/* 2. Gold ambient — top-left light source */}
      <div
        className={`${pos} inset-0 -z-20`}
        style={{
          background: 'radial-gradient(ellipse 75% 60% at 10% 0%, rgba(228,181,69,0.13) 0%, transparent 60%)',
        }}
      />

      {/* 3. Electric cobalt — bottom-right */}
      <div
        className={`${pos} inset-0 -z-20`}
        style={{
          background: 'radial-gradient(ellipse 70% 55% at 90% 100%, rgba(91,141,239,0.20) 0%, transparent 55%)',
        }}
      />

      {/* 4. Large gold orb — upper area (desktop only, performance) */}
      <div
        className={`${pos} -z-20 hidden md:block pointer-events-none`}
        style={{
          top: '-25%',
          left: '-5%',
          width: '55rem',
          height: '55rem',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(228,181,69,0.055) 0%, transparent 65%)',
          filter: 'blur(80px)',
        }}
      />

      {/* 5. Large cobalt orb — lower area (desktop only) */}
      <div
        className={`${pos} -z-20 hidden md:block pointer-events-none`}
        style={{
          bottom: '-30%',
          right: '-15%',
          width: '60rem',
          height: '60rem',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(74,125,232,0.10) 0%, transparent 65%)',
          filter: 'blur(100px)',
        }}
      />

      {/* 6. Diagonal light streak — subtle broadcast feel */}
      <div
        className={`${pos} inset-0 -z-20 opacity-[0.025] hidden md:block pointer-events-none`}
        style={{
          background: 'linear-gradient(125deg, transparent 30%, rgba(255,255,255,0.8) 50%, transparent 70%)',
          backgroundSize: '200% 200%',
          backgroundPosition: '110% 110%',
        }}
      />

      {/* 7. Fine noise texture */}
      <div
        className={`${pos} inset-0 -z-10 opacity-[0.018] pointer-events-none`}
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
          backgroundSize: '256px 256px',
        }}
      />

      {/* 8. Subtle grid overlay */}
      <div
        className={`${pos} inset-0 -z-10 opacity-[0.015] pointer-events-none`}
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='80' height='80' viewBox='0 0 80 80' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M40 0v80M0 40h80' stroke='%23fff' stroke-width='0.5' fill='none'/%3E%3C/svg%3E")`,
          backgroundSize: '80px 80px',
        }}
      />

      {/* === CONTENT === */}
      {withContainer ? (
        <div className={`relative ${containerClassName}`}>
          {children}
        </div>
      ) : (
        <div className="relative h-full">
          {children}
        </div>
      )}
    </div>
  );
};

export default JeopardyShell;
