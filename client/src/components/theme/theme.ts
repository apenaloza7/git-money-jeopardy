/**
 * Git Money Jeopardy - Design System
 * Award-winning game show aesthetic
 * Mobile-first design tokens
 */

// ===== FOCUS STATES =====
export const focusRing = 
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/60 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900';

export const focusRingGold = focusRing;

// ===== PANELS =====
export const panel = 'glass-panel';

export const panelGold = 'gold-panel';

export const panelSolid = 
  'bg-slate-900/95 border border-slate-700/50 rounded-xl shadow-xl';

export const panelDark = 
  'bg-slate-950/80 border border-slate-800/50 rounded-xl shadow-lg';

// ===== BUTTONS =====
export const buttonBase = [
  'inline-flex items-center justify-center',
  'font-semibold',
  'rounded-xl',
  'transition-all duration-150',
  'cursor-pointer',
  'touch-target',
  'no-select',
  focusRing,
].join(' ');

export const buttonPrimary = [
  buttonBase,
  'bg-gradient-to-b from-amber-400 via-amber-500 to-amber-600',
  'hover:from-amber-300 hover:via-amber-400 hover:to-amber-500',
  'active:from-amber-500 active:via-amber-600 active:to-amber-700',
  'text-slate-900 font-bold',
  'shadow-lg shadow-amber-500/30',
  'hover:shadow-xl hover:shadow-amber-500/40',
  'active:shadow-md',
  'active:scale-[0.98]',
].join(' ');

export const buttonSecondary = [
  buttonBase,
  'bg-slate-800/90 hover:bg-slate-700/90',
  'active:bg-slate-800',
  'border border-slate-600/50',
  'text-white font-semibold',
  'shadow-lg',
  'hover:border-slate-500/50',
  'active:scale-[0.98]',
].join(' ');

export const buttonDanger = [
  buttonBase,
  'bg-gradient-to-b from-red-500 via-red-600 to-red-700',
  'hover:from-red-400 hover:via-red-500 hover:to-red-600',
  'active:from-red-600 active:via-red-700 active:to-red-800',
  'text-white font-bold',
  'shadow-lg shadow-red-500/30',
  'active:scale-[0.98]',
].join(' ');

export const buttonSuccess = [
  buttonBase,
  'bg-gradient-to-b from-emerald-500 via-emerald-600 to-emerald-700',
  'hover:from-emerald-400 hover:via-emerald-500 hover:to-emerald-600',
  'active:from-emerald-600 active:via-emerald-700 active:to-emerald-800',
  'text-white font-bold',
  'shadow-lg shadow-emerald-500/30',
  'active:scale-[0.98]',
].join(' ');

export const buttonGhost = [
  buttonBase,
  'bg-transparent hover:bg-white/10',
  'active:bg-white/5',
  'text-slate-300 hover:text-white',
  'font-medium',
  'active:scale-[0.98]',
].join(' ');

export const buttonOutline = [
  buttonBase,
  'bg-transparent',
  'border-2 border-amber-500/50 hover:border-amber-400',
  'text-amber-400 hover:text-amber-300',
  'hover:bg-amber-500/10',
  'active:bg-amber-500/5',
  'active:scale-[0.98]',
].join(' ');

// ===== INPUTS =====
export const inputBase = [
  'w-full px-4 py-3',
  'bg-slate-900/70 border border-slate-600/50',
  'rounded-xl',
  'text-white placeholder:text-slate-500',
  'transition-all duration-150',
  'hover:border-slate-500/70',
  focusRing,
].join(' ');

export const inputGold = [
  'w-full px-4 py-3',
  'bg-slate-900/70 border-2 border-amber-500/30',
  'rounded-xl',
  'text-white placeholder:text-slate-500',
  'transition-all duration-150',
  'hover:border-amber-400/50',
  'focus:border-amber-400',
  focusRing,
].join(' ');

export const inputLarge = [
  'w-full px-5 py-4',
  'bg-slate-900/70 border-2 border-amber-500/30',
  'rounded-xl',
  'text-white text-xl text-center font-semibold',
  'placeholder:text-slate-500',
  'transition-all duration-150',
  'hover:border-amber-400/50',
  focusRing,
].join(' ');

// ===== BADGES =====
const badgeBase = 
  'inline-flex items-center px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider';

export const badgeBlue = `${badgeBase} bg-blue-500/20 text-blue-300 border border-blue-500/30`;
export const badgePurple = `${badgeBase} bg-purple-500/20 text-purple-300 border border-purple-500/30`;
export const badgeGold = `${badgeBase} bg-amber-500/20 text-amber-300 border border-amber-500/30`;
export const badgeSuccess = `${badgeBase} bg-emerald-500/20 text-emerald-300 border border-emerald-500/30`;
export const badgeDanger = `${badgeBase} bg-red-500/20 text-red-300 border border-red-500/30`;

// ===== SCORE DISPLAY =====
export const scorePositive = 'score-positive font-mono font-bold tracking-tight';
export const scoreNegative = 'score-negative font-mono font-bold tracking-tight';

export const getScoreClass = (score: number): string => 
  score < 0 ? scoreNegative : scorePositive;

export const getScoreColor = (score: number): string =>
  score < 0 ? 'text-red-400' : 'text-emerald-400';

// ===== JEOPARDY TILES =====
export const jeopardyTile = 
  'jeopardy-tile flex items-center justify-center font-bold text-amber-300 rounded-lg cursor-pointer no-select';

export const jeopardyTilePlayed = 
  'jeopardy-tile played flex items-center justify-center text-slate-700 rounded-lg no-select cursor-default';

// ===== OVERLAYS =====
export const overlay = 
  'fixed inset-0 bg-black/80 backdrop-blur-sm z-50';

export const overlayLight = 
  'fixed inset-0 bg-black/60 backdrop-blur-sm z-50';

// ===== MODAL =====
export const modalContainer = [
  'fixed inset-0 z-50 flex items-center justify-center p-4',
  'bg-black/80 backdrop-blur-sm',
].join(' ');

export const modalContent = [
  'w-full max-w-md',
  'bg-slate-900 border border-slate-700/50',
  'rounded-2xl shadow-2xl',
  'animate-scale-in',
].join(' ');

// ===== CARD =====
export const card = [
  'bg-slate-800/60 border border-slate-700/50',
  'rounded-xl p-4',
  'transition-all duration-150',
].join(' ');

export const cardHover = [
  card,
  'hover:bg-slate-800/80 hover:border-slate-600/50',
  'cursor-pointer',
].join(' ');

// ===== LAYOUT HELPERS =====
export const screenContainer = 
  'min-h-dvh w-full flex flex-col';

export const centerContent = 
  'flex items-center justify-center';

export const spacingY = 
  'space-y-4';

export const spacingX = 
  'space-x-4';

// ===== TEXT STYLES =====
export const heading1 = 
  'font-display text-4xl md:text-5xl lg:text-6xl font-bold tracking-wider text-amber-400';

export const heading2 = 
  'font-display text-2xl md:text-3xl font-bold tracking-wide text-white';

export const heading3 = 
  'font-display text-xl md:text-2xl font-bold tracking-wide text-slate-100';

export const textMuted = 
  'text-slate-400 text-sm';

export const textLabel = 
  'text-slate-500 text-xs uppercase tracking-wider font-semibold';
