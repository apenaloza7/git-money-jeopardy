import React from 'react';
import { buttonPrimary, panel, focusRingGold } from './theme/theme';

interface RulesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const RulesModal: React.FC<RulesModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className={['max-w-md w-full max-h-[80vh] flex flex-col shadow-2xl animate-in zoom-in-95 duration-200 bg-[#07154a] border border-yellow-400/20 rounded-xl', panel].join(' ')}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 border-b border-yellow-400/10 flex justify-between items-center bg-slate-950/20 rounded-t-xl">
          <h2 className="font-display text-2xl font-extrabold text-yellow-400 tracking-wide">Game Rules</h2>
          <button 
            onClick={onClose}
            className={['text-slate-200/70 hover:text-white transition-colors p-2 rounded-md hover:bg-slate-950/30', focusRingGold].join(' ')}
            aria-label="Close rules"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <div className="p-6 overflow-y-auto text-slate-200 space-y-4">
          <section>
            <h3 className="font-bold text-white mb-2">How to Play</h3>
            <ul className="list-disc pl-5 space-y-2 text-sm">
              <li>Wait for the host to read the clue completely.</li>
              <li>Your buzzer will show "WAIT..." while locked.</li>
              <li>Once the host unlocks the board, your button will turn RED and say "BUZZ".</li>
              <li>Tap as fast as you can!</li>
            </ul>
          </section>

          <section>
            <h3 className="font-bold text-white mb-2">Penalties</h3>
            <div className="bg-red-900/30 border border-red-900/50 p-3 rounded text-sm text-red-200">
              <strong>⚠️ Don't buzz too early!</strong><br/>
              If you tap before the buzzers are unlocked, you will be locked out for a short penalty duration.
            </div>
          </section>

          <section>
            <h3 className="font-bold text-white mb-2">Scoring</h3>
            <ul className="list-disc pl-5 space-y-2 text-sm">
              <li><span className="text-green-400">Correct answers</span> add to your score.</li>
              <li><span className="text-red-400">Wrong answers</span> deduct from your score.</li>
              <li>Highest score at the end wins!</li>
            </ul>
          </section>
        </div>

        <div className="p-4 border-t border-yellow-400/10 bg-slate-950/20 rounded-b-xl">
          <button 
            onClick={onClose}
            className={['w-full py-3 rounded text-base', buttonPrimary].join(' ')}
          >
            Got it!
          </button>
        </div>
      </div>
    </div>
  );
};

