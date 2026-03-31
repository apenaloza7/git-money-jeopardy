import React, { useState, useEffect } from 'react';
import { buttonPrimary, focusRing, panelGold } from './theme/theme';

interface WagerModalProps {
  isOpen: boolean;
  playerScore: number;
  questionValue: number;
  isDailyDouble: boolean;
  onSubmit: (amount: number) => void;
  onClose?: () => void;
}

export const WagerModal: React.FC<WagerModalProps> = ({
  isOpen,
  playerScore,
  questionValue,
  isDailyDouble,
  onSubmit,
  onClose
}) => {
  const minWager = isDailyDouble ? 5 : 0;
  const maxWager = isDailyDouble 
    ? Math.max(playerScore, questionValue >= 1000 ? 2000 : 1000)
    : Math.max(playerScore, 0);
  
  const [wager, setWager] = useState(minWager);
  const [inputValue, setInputValue] = useState(minWager.toString());

  useEffect(() => {
    if (isOpen) {
      setWager(minWager);
      setInputValue(minWager.toString());
    }
  }, [isOpen, minWager]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInputValue(val);
    const numVal = parseInt(val, 10);
    if (!isNaN(numVal)) {
      setWager(Math.min(Math.max(numVal, minWager), maxWager));
    }
  };

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value, 10);
    setWager(val);
    setInputValue(val.toString());
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(wager);
  };

  const quickWagers = [100, 500, 1000, maxWager]
    .filter((v, i, a) => a.indexOf(v) === i && v <= maxWager && v >= minWager);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className={`${panelGold} w-full max-w-sm p-6 animate-scale-in`}>
        <h2 className="font-display text-3xl text-amber-400 text-center tracking-wider mb-1">
          {isDailyDouble ? 'DAILY DOUBLE!' : 'FINAL JEOPARDY'}
        </h2>
        <p className="text-slate-400 text-center text-sm mb-6">
          {isDailyDouble ? 'Make your wager' : 'Enter your wager'}
        </p>

        {/* Current Score */}
        <div className="text-center mb-6">
          <div className="text-slate-500 text-xs uppercase tracking-wider mb-1">Your Score</div>
          <div className={`text-3xl font-mono font-bold ${playerScore < 0 ? 'text-red-400' : 'text-emerald-400'}`}>
            ${playerScore.toLocaleString()}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Wager Input */}
          <div>
            <label className="text-slate-500 text-xs uppercase tracking-wider block text-center mb-2">
              Your Wager
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-amber-400 text-xl font-bold">$</span>
              <input
                type="number"
                value={inputValue}
                onChange={handleInputChange}
                min={minWager}
                max={maxWager}
                className={`w-full p-4 pl-10 rounded-xl bg-slate-900/70 border-2 border-amber-500/30 text-white text-2xl text-center font-mono font-bold ${focusRing}`}
                autoFocus
              />
            </div>
          </div>

          {/* Slider */}
          <div className="px-1">
            <input
              type="range"
              min={minWager}
              max={maxWager}
              value={wager}
              onChange={handleSliderChange}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-slate-500 mt-1">
              <span>${minWager}</span>
              <span>${maxWager.toLocaleString()}</span>
            </div>
          </div>

          {/* Quick Wagers */}
          <div className="flex gap-2 flex-wrap justify-center">
            {quickWagers.map(amount => (
              <button
                key={amount}
                type="button"
                onClick={() => { setWager(amount); setInputValue(amount.toString()); }}
                className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                  wager === amount 
                    ? 'bg-amber-500 text-slate-900 scale-105' 
                    : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700'
                }`}
              >
                {amount === maxWager ? 'MAX' : `$${amount}`}
              </button>
            ))}
          </div>

          {/* Submit */}
          <button type="submit" className={`w-full py-4 rounded-xl text-lg ${buttonPrimary}`}>
            Lock In Wager
          </button>

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="w-full text-slate-500 hover:text-white text-sm py-2 transition-colors"
            >
              Cancel
            </button>
          )}
        </form>
      </div>
    </div>
  );
};
