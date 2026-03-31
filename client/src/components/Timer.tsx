import React, { useState, useEffect } from 'react';
import { playTimerTick, playTimerExpired } from '../utils/audio';

interface TimerProps {
  endTime: number | null;
  onExpire?: () => void;
  size?: 'sm' | 'md' | 'lg';
  showTicks?: boolean;
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

      // Tick sounds in last 5 seconds
      if (showTicks && seconds <= 5 && seconds > 0 && remaining > 0) {
        const msInCurrentSecond = remaining % 1000;
        if (msInCurrentSecond > 900) {
          playTimerTick();
        }
      }

      if (remaining <= 0 && !hasExpired) {
        setHasExpired(true);
        playTimerExpired();
        onExpire?.();
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 100);
    return () => clearInterval(interval);
  }, [endTime, onExpire, showTicks, hasExpired]);

  if (!endTime || timeLeft <= 0) return null;

  const seconds = Math.ceil(timeLeft / 1000);
  
  // Calculate progress
  const initialDuration = endTime - (Date.now() - timeLeft + timeLeft);
  const progress = initialDuration > 0 ? timeLeft / initialDuration : 0;

  // Sizes
  const sizeConfig = {
    sm: { container: 'w-12 h-12', text: 'text-lg', stroke: 3, radius: 20 },
    md: { container: 'w-20 h-20', text: 'text-2xl', stroke: 4, radius: 34 },
    lg: { container: 'w-28 h-28', text: 'text-4xl', stroke: 6, radius: 48 },
  };

  const config = sizeConfig[size];
  const circumference = 2 * Math.PI * config.radius;
  const strokeDashoffset = circumference * (1 - Math.min(progress, 1));

  // Colors based on urgency
  const isUrgent = seconds <= 2;
  const isWarning = seconds <= 5;
  const textColor = isUrgent ? 'text-red-400' : isWarning ? 'text-amber-400' : 'text-white';
  const strokeColor = isUrgent ? '#f87171' : isWarning ? '#fbbf24' : '#60a5fa';

  return (
    <div className={`relative flex items-center justify-center ${config.container} ${className}`}>
      {/* Background ring */}
      <svg className="absolute inset-0 -rotate-90" viewBox="0 0 100 100">
        <circle
          cx="50"
          cy="50"
          r={config.radius}
          fill="none"
          stroke="rgba(255,255,255,0.1)"
          strokeWidth={config.stroke}
        />
        {/* Progress ring */}
        <circle
          cx="50"
          cy="50"
          r={config.radius}
          fill="none"
          stroke={strokeColor}
          strokeWidth={config.stroke}
          strokeLinecap="round"
          style={{
            strokeDasharray: circumference,
            strokeDashoffset,
            transition: 'stroke-dashoffset 0.1s linear, stroke 0.3s ease',
          }}
        />
      </svg>
      
      {/* Time display */}
      <span className={`font-mono font-bold ${config.text} ${textColor} z-10 ${
        isUrgent ? 'animate-pulse scale-110' : ''
      }`}>
        {seconds}
      </span>
    </div>
  );
};
