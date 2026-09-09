let ctx: AudioContext | null = null;
let muted = false;

function getCtx(): AudioContext | null {
  if (muted) return null;
  if (!ctx) {
    const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    ctx = new Ctor();
  }
  return ctx;
}

export function resumeAudio(): void {
  getCtx()?.resume().catch(() => {});
}

export function setMuted(value: boolean): void {
  muted = value;
}

export function isMuted(): boolean {
  return muted;
}

function tone(freq: number, duration: number, type: OscillatorType, peak: number, delay = 0): void {
  const ac = getCtx();
  if (!ac) return;
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, ac.currentTime + delay);
  gain.gain.setValueAtTime(0, ac.currentTime + delay);
  gain.gain.linearRampToValueAtTime(peak, ac.currentTime + delay + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + delay + duration);
  osc.connect(gain).connect(ac.destination);
  osc.start(ac.currentTime + delay);
  osc.stop(ac.currentTime + delay + duration + 0.05);
}

function sweep(freqFrom: number, freqTo: number, duration: number, type: OscillatorType, peak: number): void {
  const ac = getCtx();
  if (!ac) return;
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freqFrom, ac.currentTime);
  osc.frequency.exponentialRampToValueAtTime(Math.max(1, freqTo), ac.currentTime + duration);
  gain.gain.setValueAtTime(0, ac.currentTime);
  gain.gain.linearRampToValueAtTime(peak, ac.currentTime + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + duration);
  osc.connect(gain).connect(ac.destination);
  osc.start(ac.currentTime);
  osc.stop(ac.currentTime + duration + 0.05);
}

export function sfxDash(): void {
  sweep(320, 900, 0.18, 'triangle', 0.16);
}

export function sfxPulse(): void {
  sweep(180, 60, 0.35, 'sine', 0.2);
  tone(720, 0.12, 'square', 0.08, 0.02);
}

export function sfxWispPop(): void {
  sweep(500, 1400, 0.22, 'sawtooth', 0.14);
}

export function sfxClick(): void {
  tone(520, 0.08, 'triangle', 0.16);
}

export function sfxSwitch(): void {
  tone(340, 0.12, 'square', 0.14);
  tone(680, 0.14, 'square', 0.1, 0.06);
}

export function sfxChime(freq = 880): void {
  tone(freq, 0.35, 'sine', 0.18);
  tone(freq * 1.5, 0.4, 'sine', 0.12, 0.05);
}

export function sfxCollect(): void {
  tone(660, 0.1, 'sine', 0.18);
  tone(880, 0.12, 'sine', 0.16, 0.08);
  tone(1180, 0.18, 'sine', 0.14, 0.16);
}

export function sfxBump(): void {
  tone(180, 0.15, 'sawtooth', 0.1);
}

export function sfxError(): void {
  tone(220, 0.18, 'sawtooth', 0.12);
  tone(160, 0.22, 'sawtooth', 0.1, 0.1);
}

export function sfxVictory(): void {
  [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => tone(f, 0.5, 'sine', 0.18, i * 0.12));
}
