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
