import React from 'react';
import { buttonPrimary, panel } from './theme/theme';

interface RulesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const RulesModal: React.FC<RulesModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <div 
        className={`${panel} max-w-md w-full max-h-[85vh] flex flex-col bg-slate-900 border border-slate-700/50 rounded-2xl shadow-2xl animate-scale-in`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="shrink-0 p-4 border-b border-slate-700/50 flex items-center justify-between">
          <h2 className="font-display text-2xl text-amber-400">How to Play</h2>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5 custom-scrollbar">
          <section>
            <h3 className="font-bold text-white mb-2 flex items-center gap-2">
              <span className="text-lg">🎮</span> Buzzing In
            </h3>
            <ul className="space-y-2 text-sm text-slate-300">
              <li className="flex gap-2">
                <span className="text-amber-400">•</span>
                Wait for the host to finish reading the clue
              </li>
              <li className="flex gap-2">
                <span className="text-amber-400">•</span>
                Yellow button = Buzzers locked, wait for it
              </li>
              <li className="flex gap-2">
                <span className="text-amber-400">•</span>
                Red button = Buzzers open, tap fast!
              </li>
              <li className="flex gap-2">
                <span className="text-amber-400">•</span>
                Green button = You won the buzz!
              </li>
            </ul>
          </section>

          <section>
            <h3 className="font-bold text-white mb-2 flex items-center gap-2">
              <span className="text-lg">⚠️</span> Penalties
            </h3>
            <div className="bg-red-900/30 border border-red-500/30 p-3 rounded-xl text-sm text-red-200">
              <strong>Don't buzz too early!</strong><br/>
              Tapping before buzzers unlock results in a short lockout penalty.
            </div>
          </section>

          <section>
            <h3 className="font-bold text-white mb-2 flex items-center gap-2">
              <span className="text-lg">💰</span> Scoring
            </h3>
            <ul className="space-y-2 text-sm text-slate-300">
              <li className="flex gap-2">
                <span className="text-emerald-400">✓</span>
                <span>Correct answers add points</span>
              </li>
              <li className="flex gap-2">
                <span className="text-red-400">✗</span>
                <span>Wrong answers deduct points</span>
              </li>
              <li className="flex gap-2">
                <span className="text-amber-400">★</span>
                <span>Daily Doubles let you wager!</span>
              </li>
            </ul>
          </section>

          <section>
            <h3 className="font-bold text-white mb-2 flex items-center gap-2">
              <span className="text-lg">🏆</span> Winning
            </h3>
            <p className="text-sm text-slate-300">
              The player with the highest score after Final Jeopardy wins!
            </p>
          </section>
        </div>

        {/* Footer */}
        <div className="shrink-0 p-4 border-t border-slate-700/50">
          <button 
            onClick={onClose}
            className={`w-full py-3 rounded-xl ${buttonPrimary}`}
          >
            Got it!
          </button>
        </div>
      </div>
    </div>
  );
};
