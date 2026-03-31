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

  // Set iOS theme-color for browser chrome
  useEffect(() => {
    if (!isViewport) return;

    let meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
    const previousContent = meta?.getAttribute('content');

    if (!meta) {
      meta = document.createElement('meta');
      meta.setAttribute('name', 'theme-color');
      document.head.appendChild(meta);
    }
    meta.setAttribute('content', '#010409');

    return () => {
      if (meta && previousContent) {
        meta.setAttribute('content', previousContent);
      } else if (meta && !previousContent) {
        meta.remove();
      }
    };
  }, [isViewport]);

  const bgPositionClass = isViewport ? 'fixed' : 'absolute';
  
  const wrapperClasses = [
    'relative w-full text-white',
    isViewport ? 'min-h-dvh' : 'min-h-screen',
    safeArea && isViewport ? 'safe-y safe-x' : '',
    className,
  ].filter(Boolean).join(' ');

  return (
    <div className={wrapperClasses}>
      {/* === BACKGROUND LAYERS === */}
      
      {/* Base gradient */}
      <div 
        className={`${bgPositionClass} inset-0 -z-20`}
        style={{
          background: 'linear-gradient(135deg, #010409 0%, #0a1628 40%, #0f2847 80%, #1a3a5c 100%)',
        }}
      />
      
      {/* Radial glow from top-left */}
      <div 
        className={`${bgPositionClass} inset-0 -z-10 opacity-60`}
        style={{
          background: 'radial-gradient(ellipse 80% 60% at 20% 10%, rgba(245, 158, 11, 0.08) 0%, transparent 60%)',
        }}
      />
      
      {/* Radial glow from bottom-right */}
      <div 
        className={`${bgPositionClass} inset-0 -z-10 opacity-40`}
        style={{
          background: 'radial-gradient(ellipse 70% 50% at 80% 90%, rgba(59, 130, 246, 0.12) 0%, transparent 50%)',
        }}
      />
      
      {/* Ambient orb - top (hidden on mobile for performance) */}
      <div 
        className={`${bgPositionClass} -z-10 hidden md:block`}
        style={{
          top: '-15%',
          left: '5%',
          width: '40rem',
          height: '40rem',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(245, 158, 11, 0.06) 0%, transparent 70%)',
          filter: 'blur(60px)',
        }}
      />
      
      {/* Ambient orb - bottom (hidden on mobile for performance) */}
      <div 
        className={`${bgPositionClass} -z-10 hidden md:block`}
        style={{
          bottom: '-20%',
          right: '-10%',
          width: '50rem',
          height: '50rem',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(59, 130, 246, 0.08) 0%, transparent 70%)',
          filter: 'blur(80px)',
        }}
      />
      
      {/* Subtle grid overlay */}
      <div 
        className={`${bgPositionClass} inset-0 -z-10 opacity-[0.02]`}
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M30 0v60M0 30h60' stroke='%23fff' stroke-width='0.5' fill='none'/%3E%3C/svg%3E")`,
          backgroundSize: '60px 60px',
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
