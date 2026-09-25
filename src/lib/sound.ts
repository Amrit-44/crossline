/**
 * Web Audio synthesiser for Crossline — no bundled assets, all original.
 * AudioContext is created lazily on first user gesture (autoplay-safe).
 */
export type SoundKind =
  | "select"
  | "move"
  | "invalid"
  | "win"
  | "draw"
  | "click"
  | "bot"
  | "join"
  | "chat"
  | "turn"
  | "start"
  | "countdown"
  | "victory"
  | "disconnect"
  | "rematch"
  | "error"
  | "room";

let context: AudioContext | null = null;

function getContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  context ??= new Ctor();
  if (context.state === "suspended") void context.resume();
  return context;
}

interface Tone {
  freq: number;
  at?: number;
  duration?: number;
  type?: OscillatorType;
  gain?: number;
  slide?: number;
}

const PATTERNS: Record<SoundKind, Tone[]> = {
  select: [{ freq: 660, duration: 0.06, type: "triangle", gain: 0.1 }],
  move: [{ freq: 420, duration: 0.09, type: "sine", gain: 0.15, slide: 540 }],
  turn: [{ freq: 520, duration: 0.06, type: "sine", gain: 0.08 }],
  bot: [{ freq: 380, duration: 0.09, type: "sine", gain: 0.13, slide: 300 }],
  invalid: [{ freq: 170, duration: 0.15, type: "square", gain: 0.05, slide: 120 }],
  error: [
    { freq: 220, duration: 0.1, type: "square", gain: 0.05 },
    { freq: 160, at: 0.1, duration: 0.16, type: "square", gain: 0.05 },
  ],
  click: [{ freq: 520, duration: 0.05, type: "triangle", gain: 0.07 }],
  join: [
    { freq: 523, duration: 0.09, type: "triangle", gain: 0.11 },
    { freq: 784, at: 0.1, duration: 0.14, type: "triangle", gain: 0.11 },
  ],
  room: [
    { freq: 440, duration: 0.08, type: "triangle", gain: 0.1 },
    { freq: 660, at: 0.09, duration: 0.12, type: "triangle", gain: 0.1 },
  ],
  chat: [{ freq: 880, duration: 0.05, type: "sine", gain: 0.05 }],
  start: [
    { freq: 392, duration: 0.1, type: "triangle", gain: 0.12 },
    { freq: 523, at: 0.1, duration: 0.1, type: "triangle", gain: 0.12 },
    { freq: 659, at: 0.2, duration: 0.18, type: "triangle", gain: 0.13 },
  ],
  countdown: [{ freq: 740, duration: 0.07, type: "sine", gain: 0.09 }],
  rematch: [
    { freq: 494, duration: 0.09, type: "triangle", gain: 0.11 },
    { freq: 659, at: 0.09, duration: 0.14, type: "triangle", gain: 0.11 },
  ],
  disconnect: [
    { freq: 330, duration: 0.12, type: "sine", gain: 0.1, slide: 220 },
    { freq: 220, at: 0.12, duration: 0.18, type: "sine", gain: 0.09 },
  ],
  win: [
    { freq: 523, duration: 0.12, type: "triangle", gain: 0.13 },
    { freq: 659, at: 0.12, duration: 0.12, type: "triangle", gain: 0.13 },
    { freq: 784, at: 0.24, duration: 0.12, type: "triangle", gain: 0.13 },
    { freq: 1047, at: 0.36, duration: 0.3, type: "triangle", gain: 0.15 },
  ],
  victory: [
    { freq: 523, duration: 0.1, type: "sawtooth", gain: 0.05 },
    { freq: 659, at: 0.1, duration: 0.1, type: "sawtooth", gain: 0.05 },
    { freq: 784, at: 0.2, duration: 0.1, type: "sawtooth", gain: 0.05 },
    { freq: 1047, at: 0.3, duration: 0.4, type: "triangle", gain: 0.14 },
  ],
  draw: [
    { freq: 440, duration: 0.14, type: "sine", gain: 0.11 },
    { freq: 392, at: 0.16, duration: 0.22, type: "sine", gain: 0.11 },
  ],
};

export function playSound(kind: SoundKind, masterVolume = 1): void {
  if (masterVolume <= 0) return;
  const ctx = getContext();
  if (!ctx) return;
  const now = ctx.currentTime;
  for (const tone of PATTERNS[kind]) {
    const start = now + (tone.at ?? 0);
    const duration = tone.duration ?? 0.1;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = tone.type ?? "sine";
    osc.frequency.setValueAtTime(tone.freq, start);
    if (tone.slide) osc.frequency.exponentialRampToValueAtTime(tone.slide, start + duration);
    const peak = (tone.gain ?? 0.1) * masterVolume;
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(Math.max(peak, 0.0002), start + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    osc.connect(gain).connect(ctx.destination);
    osc.start(start);
    osc.stop(start + duration + 0.02);
  }
}

/* ------- Subtle tactical ambient loop (generative, no assets) ------- */

let musicNodes: { osc: OscillatorNode[]; gain: GainNode } | null = null;

export function startMusic(volume = 0.35): void {
  const ctx = getContext();
  if (!ctx || musicNodes) return;
  const gain = ctx.createGain();
  gain.gain.value = 0.0;
  gain.gain.linearRampToValueAtTime(0.05 * volume, ctx.currentTime + 2);
  gain.connect(ctx.destination);
  // Low drone + slow fifth: tense, minimal, dark.
  const freqs = [55, 82.5, 110.2];
  const oscs = freqs.map((f, i) => {
    const o = ctx.createOscillator();
    o.type = i === 2 ? "triangle" : "sine";
    o.frequency.value = f;
    o.detune.value = i * 3 - 3;
    o.connect(gain);
    o.start();
    return o;
  });
  musicNodes = { osc: oscs, gain };
}

export function stopMusic(): void {
  if (!musicNodes || !context) return;
  const { osc, gain } = musicNodes;
  musicNodes = null;
  gain.gain.linearRampToValueAtTime(0.0001, context.currentTime + 0.6);
  window.setTimeout(() => osc.forEach((o) => {
    try { o.stop(); } catch { /* already stopped */ }
  }), 700);
}

export function isMusicPlaying(): boolean {
  return musicNodes !== null;
}
