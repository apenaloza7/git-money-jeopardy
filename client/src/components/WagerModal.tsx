import React, { useState, useEffect } from 'react';
import { buttonPrimary, focusRingGold, panelGold } from './theme/theme';

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
  // For Daily Double: min $5, max is player's score OR $1000/$2000 if score is lower (True Daily Double)
  // For Final Jeopardy: min $0, max is player's score
  const minWager = isDailyDouble ? 5 : 0;
  const maxWager = isDailyDouble 
    ? Math.max(playerScore, questionValue >= 1000 ? 2000 : 1000) // True Daily Double rules
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

  const handleQuickWager = (amount: number) => {
    const finalAmount = Math.min(amount, maxWager);
    setWager(finalAmount);
    setInputValue(finalAmount.toString());
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className={[panelGold, 'w-full max-w-md p-8 animate-in zoom-in duration-300'].join(' ')}>
        <h2 className="font-display text-3xl font-extrabold text-yellow-400 text-center tracking-wider drop-shadow mb-2">
          {isDailyDouble ? 'DAILY DOUBLE!' : 'FINAL JEOPARDY'}
        </h2>
        
        <p className="text-center text-slate-300 mb-6">
          {isDailyDouble 
            ? "How much would you like to wager?"
            : "Enter your wager for Final Jeopardy"
          }
        </p>

        <div className="text-center mb-6">
          <div className="text-slate-400 text-sm uppercase font-bold">Your Score</div>
          <div className={`text-4xl font-mono font-bold ${playerScore < 0 ? 'text-red-400' : 'text-green-400'}`}>
            ${playerScore.toLocaleString()}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Wager Input */}
          <div className="text-center">
            <label className="text-slate-400 text-sm uppercase font-bold block mb-2">Your Wager</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-yellow-400 text-2xl font-bold">$</span>
              <input
                type="number"
                value={inputValue}
                onChange={handleInputChange}
                min={minWager}
                max={maxWager}
                className={[
                  'w-full p-4 pl-10 rounded-lg bg-slate-950/60 border border-yellow-400/30 text-white text-3xl text-center font-mono font-bold shadow-inner',
                  focusRingGold,
                ].join(' ')}
                autoFocus
              />
            </div>
          </div>

          {/* Slider */}
          <div className="px-2">
            <input
              type="range"
              min={minWager}
              max={maxWager}
              value={wager}
              onChange={handleSliderChange}
              className="w-full h-3 rounded-lg appearance-none cursor-pointer bg-slate-700 accent-yellow-500"
            />
            <div className="flex justify-between text-xs text-slate-500 mt-1">
              <span>${minWager}</span>
              <span>${maxWager.toLocaleString()}</span>
            </div>
          </div>

          {/* Quick Wager Buttons */}
          <div className="flex gap-2 flex-wrap justify-center">
            {[100, 500, 1000, maxWager].filter((v, i, a) => a.indexOf(v) === i && v <= maxWager && v >= minWager).map(amount => (
              <button
                key={amount}
                type="button"
                onClick={() => handleQuickWager(amount)}
                className={`px-4 py-2 rounded text-sm font-bold transition-colors
                  ${wager === amount 
                    ? 'bg-yellow-500 text-black' 
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }
                `}
              >
                {amount === maxWager ? 'MAX' : `$${amount}`}
              </button>
            ))}
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            className={['w-full py-4 rounded-lg text-lg font-bold transition-all hover:scale-[1.02]', buttonPrimary].join(' ')}
          >
            Lock In Wager
          </button>

          {/* Cancel (only for certain contexts) */}
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

