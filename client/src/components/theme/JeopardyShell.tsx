import React, { useEffect } from 'react';

type JeopardyShellProps = {
  children: React.ReactNode;
  className?: string;
  withContainer?: boolean;
  containerClassName?: string;
  /**
   * Controls whether the background is sized to the shell ("container") or
   * pinned to the viewport ("viewport"). Use "viewport" for full-screen views.
   */
  backgroundMode?: 'container' | 'viewport';
};

const defaultContainer =
  'mx-auto w-full max-w-6xl px-6 py-10 md:px-10 md:py-14';

export const JeopardyShell: React.FC<JeopardyShellProps> = ({
  children,
  className,
  withContainer = false,
  containerClassName = defaultContainer,
  backgroundMode = 'container',
}) => {
  const bgPos = backgroundMode === 'viewport' ? 'fixed' : 'absolute';
  const accentsHiddenOnMobile = backgroundMode === 'viewport' ? 'hidden sm:block' : '';
  const radialOpacity = backgroundMode === 'viewport' ? 'opacity-25' : 'opacity-40';

  useEffect(() => {
    if (backgroundMode !== 'viewport') return;

    const meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
    const previous = meta?.getAttribute('content');

    const el =
      meta ??
      (() => {
        const created = document.createElement('meta');
        created.setAttribute('name', 'theme-color');
        document.head.appendChild(created);
        return created;
      })();

    // Match the mid-tone of the Jeopardy gradient so iOS browser chrome doesn't turn white.
    el.setAttribute('content', '#06103a');

    return () => {
      if (!meta) {
        // we created it
        el.remove();
        return;
      }
      if (previous) el.setAttribute('content', previous);
      else el.removeAttribute('content');
    };
  }, [backgroundMode]);

  return (
    <div
      className={[
        'min-h-[100dvh] w-full text-white relative overflow-hidden',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {/* Background layers */}
      <div className={`pointer-events-none ${bgPos} inset-0 z-0 bg-gradient-to-b from-[#0b1b5a] via-[#06103a] to-[#020617]`} />
      <div className={`pointer-events-none ${bgPos} inset-0 z-0 ${radialOpacity} bg-[radial-gradient(ellipse_at_top,rgba(234,179,8,0.20),rgba(2,6,23,0)_55%)]`} />
      <div className={`pointer-events-none ${bgPos} -top-24 left-1/2 z-0 ${accentsHiddenOnMobile} h-[28rem] w-[28rem] -translate-x-1/2 rounded-full bg-yellow-400/10 blur-3xl`} />
      <div className={`pointer-events-none ${bgPos} -bottom-40 right-[-8rem] z-0 ${accentsHiddenOnMobile} h-[30rem] w-[30rem] rounded-full bg-blue-400/10 blur-3xl`} />

      {withContainer ? (
        <div className={['relative z-10', containerClassName].filter(Boolean).join(' ')}>
          {children}
        </div>
      ) : (
        <div className="relative z-10">{children}</div>
      )}
    </div>
  );
};


