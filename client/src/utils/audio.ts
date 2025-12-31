// Audio utility using Web Audio API

let audioContext: AudioContext | null = null;
let thinkMusicOscillators: OscillatorNode[] = [];
let thinkMusicGains: GainNode[] = [];
let thinkMusicInterval: ReturnType<typeof setInterval> | null = null;

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
};

// Think Music for Final Jeopardy - Approximation of the iconic melody
// Uses a looping pattern that plays for ~30 seconds
const THINK_MUSIC_NOTES = [
  // Simplified Jeopardy think music melody (frequencies in Hz)
  { freq: 392, dur: 0.25 },  // G4
  { freq: 523, dur: 0.25 },  // C5
  { freq: 587, dur: 0.25 },  // D5
  { freq: 523, dur: 0.25 },  // C5
  { freq: 392, dur: 0.5 },   // G4
  { freq: 440, dur: 0.25 },  // A4
  { freq: 494, dur: 0.25 },  // B4
  { freq: 523, dur: 0.5 },   // C5
  { freq: 587, dur: 0.25 },  // D5
  { freq: 523, dur: 0.25 },  // C5
  { freq: 494, dur: 0.25 },  // B4
  { freq: 440, dur: 0.25 },  // A4
  { freq: 392, dur: 0.5 },   // G4
  { freq: 330, dur: 0.25 },  // E4
  { freq: 392, dur: 0.25 },  // G4
  { freq: 440, dur: 0.5 },   // A4
];

export const playThinkMusic = () => {
  const ctx = getContext();
  if (ctx.state === 'suspended') ctx.resume();

  stopThinkMusic(); // Clear any existing

  let noteIndex = 0;

  const playNextNote = () => {
    if (thinkMusicInterval === null) return;

    const note = THINK_MUSIC_NOTES[noteIndex];
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(note.freq, ctx.currentTime);

    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + note.dur * 0.9);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + note.dur);

    thinkMusicOscillators.push(osc);
    thinkMusicGains.push(gain);

    noteIndex = (noteIndex + 1) % THINK_MUSIC_NOTES.length;
  };

  // Play first note immediately
  playNextNote();

  // Schedule subsequent notes
  thinkMusicInterval = setInterval(() => {
    playNextNote();
  }, 300); // ~300ms between notes for the think music tempo
};

export const stopThinkMusic = () => {
  if (thinkMusicInterval) {
    clearInterval(thinkMusicInterval);
    thinkMusicInterval = null;
  }

  const ctx = getContext();
  thinkMusicOscillators.forEach(osc => {
    try {
      osc.stop(ctx.currentTime);
    } catch (e) {
      // Already stopped
    }
  });
  thinkMusicGains.forEach(gain => {
    try {
      gain.disconnect();
    } catch (e) {
      // Already disconnected
    }
  });

  thinkMusicOscillators = [];
  thinkMusicGains = [];
};

export const playDailyDoubleReveal = () => {
  const ctx = getContext();
  if (ctx.state === 'suspended') ctx.resume();

  // Dramatic ascending fanfare
  const notes = [
    { freq: 262, time: 0, dur: 0.15 },     // C4
    { freq: 330, time: 0.1, dur: 0.15 },   // E4
    { freq: 392, time: 0.2, dur: 0.15 },   // G4
    { freq: 523, time: 0.3, dur: 0.4 },    // C5 (hold)
    { freq: 659, time: 0.5, dur: 0.5 },    // E5 (hold)
  ];

  notes.forEach(note => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'square';
    osc.frequency.setValueAtTime(note.freq, ctx.currentTime + note.time);

    gain.gain.setValueAtTime(0.2, ctx.currentTime + note.time);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + note.time + note.dur);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(ctx.currentTime + note.time);
    osc.stop(ctx.currentTime + note.time + note.dur);
  });
};

export const playRoundTransition = () => {
  const ctx = getContext();
  if (ctx.state === 'suspended') ctx.resume();

  // Double Jeopardy fanfare - triumphant ascending pattern
  const notes = [
    { freq: 392, time: 0, dur: 0.2 },      // G4
    { freq: 494, time: 0.15, dur: 0.2 },   // B4
    { freq: 587, time: 0.3, dur: 0.2 },    // D5
    { freq: 784, time: 0.45, dur: 0.6 },   // G5 (hold)
  ];

  notes.forEach(note => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(note.freq, ctx.currentTime + note.time);

    gain.gain.setValueAtTime(0.15, ctx.currentTime + note.time);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + note.time + note.dur);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(ctx.currentTime + note.time);
    osc.stop(ctx.currentTime + note.time + note.dur);
  });
};

export const playTimerTick = () => {
  const ctx = getContext();
  if (ctx.state === 'suspended') ctx.resume();

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = 'sine';
  osc.frequency.setValueAtTime(1000, ctx.currentTime);

  gain.gain.setValueAtTime(0.1, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start();
  osc.stop(ctx.currentTime + 0.05);
};

export const playTimerExpired = () => {
  const ctx = getContext();
  if (ctx.state === 'suspended') ctx.resume();

  // Two-tone "time's up" buzzer
  const osc1 = ctx.createOscillator();
  const osc2 = ctx.createOscillator();
  const gain = ctx.createGain();

  osc1.type = 'square';
  osc2.type = 'square';
  osc1.frequency.setValueAtTime(400, ctx.currentTime);
  osc2.frequency.setValueAtTime(300, ctx.currentTime);

  gain.gain.setValueAtTime(0.2, ctx.currentTime);
  gain.gain.linearRampToValueAtTime(0.001, ctx.currentTime + 0.6);

  osc1.connect(gain);
  osc2.connect(gain);
  gain.connect(ctx.destination);

  osc1.start();
  osc2.start();
  osc1.stop(ctx.currentTime + 0.6);
  osc2.stop(ctx.currentTime + 0.6);
};

