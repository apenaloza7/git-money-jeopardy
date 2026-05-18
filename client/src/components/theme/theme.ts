/**
 * Git Money Jeopardy — Design System
 * Deep Space Broadcast aesthetic
 * Mobile-first design tokens
 */

// ===== FOCUS STATES =====
export const focusRing =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/50 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950';

export const focusRingGold = focusRing;

// ===== PANELS =====
export const panel = 'glass-panel';

export const panelGold = 'gold-panel';

export const panelSolid =
  'bg-slate-950/95 border border-slate-800/60 rounded-xl shadow-xl';

export const panelDark =
  'bg-slate-950/85 border border-slate-800/50 rounded-xl shadow-lg';

// ===== BUTTON BASE =====
const buttonBase = [
  'inline-flex items-center justify-center',
  'font-semibold tracking-wide',
  'rounded-xl',
  'transition-all duration-150',
  'cursor-pointer',
  'touch-target',
  'no-select',
  focusRing,
].join(' ');

// ===== BUTTONS =====
export const buttonPrimary = [
  buttonBase,
  'bg-gradient-to-b from-amber-400 via-amber-500 to-amber-600',
  'hover:from-amber-300 hover:via-amber-400 hover:to-amber-500',
  'active:from-amber-500 active:via-amber-600 active:to-amber-700',
  'text-slate-950 font-bold',
  'shadow-lg shadow-amber-500/25',
  'hover:shadow-xl hover:shadow-amber-500/35',
  'active:shadow-md',
  'active:scale-[0.98]',
].join(' ');

export const buttonSecondary = [
  buttonBase,
  'bg-slate-800/80 hover:bg-slate-700/80',
  'active:bg-slate-800',
  'border border-slate-700/60 hover:border-slate-600/60',
  'text-slate-100 font-semibold',
  'shadow-md',
  'active:scale-[0.98]',
].join(' ');

export const buttonDanger = [
  buttonBase,
  'bg-gradient-to-b from-red-500 via-red-600 to-red-700',
  'hover:from-red-400 hover:via-red-500 hover:to-red-600',
  'active:from-red-600 active:via-red-700 active:to-red-800',
  'text-white font-bold',
  'shadow-lg shadow-red-600/25',
  'active:scale-[0.98]',
].join(' ');

export const buttonSuccess = [
  buttonBase,
  'bg-gradient-to-b from-emerald-500 via-emerald-600 to-emerald-700',
  'hover:from-emerald-400 hover:via-emerald-500 hover:to-emerald-600',
  'active:from-emerald-600 active:via-emerald-700 active:to-emerald-800',
  'text-white font-bold',
  'shadow-lg shadow-emerald-600/25',
  'active:scale-[0.98]',
].join(' ');

export const buttonGhost = [
  buttonBase,
  'bg-transparent hover:bg-white/8',
  'active:bg-white/5',
  'text-slate-400 hover:text-white',
  'font-medium',
  'active:scale-[0.98]',
].join(' ');

export const buttonOutline = [
  buttonBase,
  'bg-transparent',
  'border-2 border-amber-500/45 hover:border-amber-400/70',
  'text-amber-400 hover:text-amber-300',
  'hover:bg-amber-500/8',
  'active:bg-amber-500/5',
  'active:scale-[0.98]',
].join(' ');

// ===== INPUTS =====
export const inputBase = [
  'w-full px-4 py-3',
  'bg-slate-950/70 border border-slate-700/60',
  'rounded-xl',
  'text-white placeholder:text-slate-600',
  'transition-all duration-150',
  'hover:border-slate-600/80',
  focusRing,
].join(' ');

export const inputGold = [
  'w-full px-4 py-3',
  'bg-slate-950/70 border-2 border-amber-500/25',
  'rounded-xl',
  'text-white placeholder:text-slate-600',
  'transition-all duration-150',
  'hover:border-amber-500/45',
  'focus:border-amber-400',
  focusRing,
].join(' ');

export const inputLarge = [
  'w-full px-5 py-4',
  'bg-slate-950/70 border-2 border-amber-500/25',
  'rounded-xl',
  'text-white text-xl text-center font-semibold',
  'placeholder:text-slate-600',
  'transition-all duration-150',
  'hover:border-amber-500/45',
  focusRing,
].join(' ');

// ===== BADGES =====
const badgeBase =
  'inline-flex items-center px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider';

export const badgeBlue   = `${badgeBase} bg-blue-500/15 text-blue-300 border border-blue-500/25`;
export const badgePurple = `${badgeBase} bg-purple-500/15 text-purple-300 border border-purple-500/25`;
export const badgeGold   = `${badgeBase} bg-amber-500/15 text-amber-300 border border-amber-500/25`;
export const badgeSuccess = `${badgeBase} bg-emerald-500/15 text-emerald-300 border border-emerald-500/25`;
export const badgeDanger = `${badgeBase} bg-red-500/15 text-red-300 border border-red-500/25`;

// ===== SCORE DISPLAY =====
export const scorePositive = 'score-positive font-bold tracking-tight';
export const scoreNegative = 'score-negative font-bold tracking-tight';

export const getScoreClass = (score: number): string =>
  score < 0 ? scoreNegative : scorePositive;

export const getScoreColor = (score: number): string =>
  score < 0 ? 'text-red-400' : 'text-emerald-400';

// ===== JEOPARDY TILES (Dashboard mini) =====
export const jeopardyTile =
  'jeopardy-tile flex items-center justify-center font-bold tracking-tight no-select';

export const jeopardyTilePlayed =
  'jeopardy-tile played flex items-center justify-center no-select cursor-default';

// ===== OVERLAYS =====
export const overlay = 'fixed inset-0 bg-black/85 backdrop-blur-sm z-50';
export const overlayLight = 'fixed inset-0 bg-black/65 backdrop-blur-sm z-50';

// ===== MODAL =====
export const modalContainer = [
  'fixed inset-0 z-50 flex items-center justify-center p-4',
  'bg-black/85 backdrop-blur-sm',
].join(' ');

export const modalContent = [
  'w-full max-w-md',
  'bg-slate-950 border border-slate-800/60',
  'rounded-2xl shadow-2xl',
  'animate-scale-in',
].join(' ');

// ===== CARD =====
export const card = [
  'bg-slate-900/60 border border-slate-800/60',
  'rounded-xl p-4',
  'transition-all duration-150',
].join(' ');

export const cardHover = [
  card,
  'hover:bg-slate-800/70 hover:border-slate-700/60',
  'cursor-pointer',
].join(' ');

// ===== LAYOUT HELPERS =====
export const screenContainer = 'min-h-dvh w-full flex flex-col';
export const centerContent   = 'flex items-center justify-center';
export const spacingY        = 'space-y-4';
export const spacingX        = 'space-x-4';

// ===== TEXT STYLES =====
export const heading1 =
  'font-display text-4xl md:text-5xl lg:text-6xl font-bold tracking-wider text-amber-400';

export const heading2 =
  'font-display text-2xl md:text-3xl font-bold tracking-wide text-white';

export const heading3 =
  'font-display text-xl md:text-2xl font-bold tracking-wide text-slate-100';

export const textMuted  = 'text-slate-500 text-sm';
export const textLabel  = 'text-slate-500 text-xs uppercase tracking-widest font-semibold';
