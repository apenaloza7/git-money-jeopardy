import React, { useState, useEffect } from 'react';
import { playTimerTick, playTimerExpired } from '../utils/audio';

interface TimerProps {
  endTime: number | null; // Unix timestamp when timer expires
  onExpire?: () => void;
  size?: 'sm' | 'md' | 'lg';
  showTicks?: boolean; // Play tick sounds in last 5 seconds
  className?: string;
}

export const Timer: React.FC<TimerProps> = ({
  endTime,
  onExpire,
  size = 'md',
  showTicks = true,
  className = ''
}) => {
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [hasExpired, setHasExpired] = useState(false);

  useEffect(() => {
    if (!endTime) {
      setTimeLeft(0);
      setHasExpired(false);
      return;
    }

    const updateTimer = () => {
      const now = Date.now();
      const remaining = Math.max(0, endTime - now);
      const seconds = Math.ceil(remaining / 1000);
      
      setTimeLeft(remaining);

      // Play tick sounds in last 5 seconds
      if (showTicks && seconds <= 5 && seconds > 0 && remaining > 0) {
        // Only tick on whole seconds
        const msInCurrentSecond = remaining % 1000;
        if (msInCurrentSecond > 900) {
          playTimerTick();
        }
      }

      if (remaining <= 0 && !hasExpired) {
        setHasExpired(true);
        playTimerExpired();
        if (onExpire) onExpire();
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 100);

    return () => clearInterval(interval);
  }, [endTime, onExpire, showTicks, hasExpired]);

  if (!endTime || timeLeft <= 0) return null;

  const seconds = Math.ceil(timeLeft / 1000);
  const progress = endTime ? (timeLeft / (endTime - Date.now() + timeLeft)) : 0;

  // Size classes
  const sizeClasses = {
    sm: 'w-16 h-16 text-xl',
    md: 'w-24 h-24 text-3xl',
    lg: 'w-32 h-32 text-5xl'
  };

  // Color based on time remaining
  const colorClass = seconds <= 2 ? 'text-red-500' : seconds <= 5 ? 'text-yellow-400' : 'text-white';
  const ringColor = seconds <= 2 ? 'stroke-red-500' : seconds <= 5 ? 'stroke-yellow-400' : 'stroke-blue-400';

  // SVG circle properties
  const strokeWidth = size === 'lg' ? 8 : size === 'md' ? 6 : 4;
  const radius = size === 'lg' ? 56 : size === 'md' ? 42 : 28;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - Math.min(progress, 1));

  return (
    <div className={`relative flex items-center justify-center ${sizeClasses[size]} ${className}`}>
      {/* Background circle */}
      <svg className="absolute inset-0 -rotate-90" viewBox="0 0 128 128">
        <circle
          cx="64"
          cy="64"
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-slate-700/50"
        />
        {/* Progress circle */}
        <circle
          cx="64"
          cy="64"
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          className={ringColor}
          style={{
            strokeDasharray: circumference,
            strokeDashoffset,
            transition: 'stroke-dashoffset 0.1s linear'
          }}
        />
      </svg>
      
      {/* Time text */}
      <span className={`font-mono font-bold ${colorClass} drop-shadow-lg z-10 ${seconds <= 2 ? 'animate-pulse' : ''}`}>
        {seconds}
      </span>
    </div>
  );
};

