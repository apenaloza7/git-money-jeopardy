import React from 'react';

type JeopardyShellProps = {
  children: React.ReactNode;
  className?: string;
  withContainer?: boolean;
  containerClassName?: string;
};

const defaultContainer =
  'mx-auto w-full max-w-6xl px-6 py-10 md:px-10 md:py-14';

export const JeopardyShell: React.FC<JeopardyShellProps> = ({
  children,
  className,
  withContainer = false,
  containerClassName = defaultContainer,
}) => {
  return (
    <div className={['min-h-screen text-white relative overflow-hidden', className].filter(Boolean).join(' ')}>
      {/* Background layers */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#0b1b5a] via-[#06103a] to-[#020617]" />
      <div className="absolute inset-0 opacity-40 bg-[radial-gradient(ellipse_at_top,rgba(234,179,8,0.20),rgba(2,6,23,0)_55%)]" />
      <div className="absolute -top-24 left-1/2 h-[28rem] w-[28rem] -translate-x-1/2 rounded-full bg-yellow-400/10 blur-3xl" />
      <div className="absolute -bottom-40 right-[-8rem] h-[30rem] w-[30rem] rounded-full bg-blue-400/10 blur-3xl" />

      {withContainer ? (
        <div className={['relative', containerClassName].filter(Boolean).join(' ')}>{children}</div>
      ) : (
        <div className="relative">{children}</div>
      )}
    </div>
  );
};


