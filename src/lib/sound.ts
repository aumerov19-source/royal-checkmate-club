import { getSettings } from "./settings";

let ctx: AudioContext | null = null;
function ac() {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const C = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!C) return null;
    ctx = new C();
  }
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

function knock(gain: number, freq: number, dur = 0.09) {
  const a = ac();
  if (!a) return;
  const len = Math.floor(a.sampleRate * dur);
  const buf = a.createBuffer(1, len, a.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 4);
  const src = a.createBufferSource();
  src.buffer = buf;
  const f = a.createBiquadFilter();
  f.type = "bandpass"; f.frequency.value = freq; f.Q.value = 1.2;
  const g = a.createGain(); g.gain.value = gain;
  src.connect(f).connect(g).connect(a.destination);
  src.start();
}

function tone(freq: number, start: number, dur: number, gain = 0.08) {
  const a = ac();
  if (!a) return;
  const o = a.createOscillator();
  const g = a.createGain();
  o.type = "sine"; o.frequency.value = freq;
  const t = a.currentTime + start;
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(gain, t + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(a.destination);
  o.start(t); o.stop(t + dur + 0.05);
}

export type SoundKind = "move" | "capture" | "check" | "castle" | "end" | "start" | "notify";

export function playSound(kind: SoundKind) {
  if (!getSettings().sound) return;
  switch (kind) {
    case "move": knock(1.4, 900); break;
    case "capture": knock(2.2, 600, 0.13); knock(0.8, 1600, 0.05); break;
    case "castle": knock(1.3, 900); setTimeout(() => knock(1.3, 800), 90); break;
    case "check": knock(1.4, 900); tone(880, 0.02, 0.25, 0.06); break;
    case "end": tone(523, 0, 0.5); tone(659, 0.12, 0.5); tone(784, 0.24, 0.8); break;
    case "start": tone(659, 0, 0.3, 0.05); tone(988, 0.1, 0.4, 0.05); break;
    case "notify": tone(988, 0, 0.2, 0.05); break;
  }
}

export function soundForSan(san: string): SoundKind {
  if (san.includes("#")) return "end";
  if (san.includes("+")) return "check";
  if (san.startsWith("O-O")) return "castle";
  if (san.includes("x")) return "capture";
  return "move";
}
