// Audio utility using Web Audio API

let audioContext: AudioContext | null = null;

const getContext = () => {
  if (!audioContext) {
    audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  return audioContext;
};

const playTone = (freq: number, type: OscillatorType, duration: number, startTime = 0) => {
  const ctx = getContext();
  if (ctx.state === 'suspended') {
    ctx.resume();
  }
  
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = type;
  osc.frequency.setValueAtTime(freq, ctx.currentTime + startTime);
  
  gain.gain.setValueAtTime(0.1, ctx.currentTime + startTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + startTime + duration);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(ctx.currentTime + startTime);
  osc.stop(ctx.currentTime + startTime + duration);
};

export const playBuzz = () => {
  const ctx = getContext();
  if (ctx.state === 'suspended') ctx.resume();

  // Harsh buzzer sound
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(150, ctx.currentTime);
  osc.frequency.linearRampToValueAtTime(100, ctx.currentTime + 0.5);

  gain.gain.setValueAtTime(0.2, ctx.currentTime);
  gain.gain.linearRampToValueAtTime(0.001, ctx.currentTime + 0.5);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start();
  osc.stop(ctx.currentTime + 0.5);
};

export const playCorrect = () => {
  // Ding! (Rising interval)
  playTone(880, 'sine', 0.6, 0);   // A5
  playTone(1108, 'sine', 0.8, 0.1); // C#6
};

export const playWrong = () => {
  // Error buzzer (Descending low tone)
  const ctx = getContext();
  if (ctx.state === 'suspended') ctx.resume();

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(80, ctx.currentTime);
  osc.frequency.linearRampToValueAtTime(40, ctx.currentTime + 0.4);

  gain.gain.setValueAtTime(0.3, ctx.currentTime);
  gain.gain.linearRampToValueAtTime(0.001, ctx.currentTime + 0.4);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start();
  osc.stop(ctx.currentTime + 0.4);
};

export const playLock = () => {
  // Short click
  playTone(800, 'square', 0.05);
};

export const playUnlock = () => {
    // Two short ticks
    playTone(600, 'sine', 0.05, 0);
    playTone(800, 'sine', 0.05, 0.1);
}

