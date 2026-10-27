/* Synthesized audio: no sound files needed. */
let ctx = null, master, music, sfx, started = false, timer = 0, step = 0, noiseBuf;
export const vol = { music: 0.5, sfx: 0.8 };
export function setVol(k, v) { vol[k] = v; if (music) { music.gain.value = vol.music * 0.5; sfx.gain.value = vol.sfx; } }
export function init() {
  if (ctx) { if (ctx.state === "suspended") ctx.resume(); return; }
  const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
  ctx = new AC(); master = ctx.createGain(); master.connect(ctx.destination);
  music = ctx.createGain(); sfx = ctx.createGain(); music.connect(master); sfx.connect(master); music.gain.value = vol.music * 0.5; sfx.gain.value = vol.sfx;
  noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 1.5, ctx.sampleRate); const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  // soft wind
  const n = ctx.createBufferSource(); n.buffer = noiseBuf; n.loop = true; const f = ctx.createBiquadFilter(); f.type = "lowpass"; f.frequency.value = 420; const g = ctx.createGain(); g.gain.value = 0.05; n.connect(f); f.connect(g); g.connect(music); n.start();
}
function env(node, t, a, d, peak) { node.gain.setValueAtTime(0.0001, t); node.gain.exponentialRampToValueAtTime(peak, t + a); node.gain.exponentialRampToValueAtTime(0.0001, t + a + d); }
export function drum(freq = 120, len = 0.3, v = 0.8, dest) {
  if (!ctx) return; const t = ctx.currentTime, o = ctx.createOscillator(), g = ctx.createGain(); o.type = "sine"; o.frequency.setValueAtTime(freq * 1.7, t); o.frequency.exponentialRampToValueAtTime(freq, t + 0.08);
  env(g, t, 0.005, len, v); o.connect(g); g.connect(dest || sfx); o.start(t); o.stop(t + len + 0.1);
  const n = ctx.createBufferSource(); n.buffer = noiseBuf; const ng = ctx.createGain(); env(ng, t, 0.002, 0.05, v * 0.25); const bf = ctx.createBiquadFilter(); bf.type = "bandpass"; bf.frequency.value = freq * 6; n.connect(bf); bf.connect(ng); ng.connect(dest || sfx); n.start(t); n.stop(t + 0.1);
}
export function tone(freq, len = 0.25, type = "triangle", v = 0.3, dest) {
  if (!ctx) return; const t = ctx.currentTime, o = ctx.createOscillator(), g = ctx.createGain(); o.type = type; o.frequency.value = freq; env(g, t, 0.01, len, v); o.connect(g); g.connect(dest || sfx); o.start(t); o.stop(t + len + 0.1);
}
function burst(len, hz, v, type = "lowpass") { if (!ctx) return; const t = ctx.currentTime, n = ctx.createBufferSource(); n.buffer = noiseBuf; const f = ctx.createBiquadFilter(); f.type = type; f.frequency.value = hz; const g = ctx.createGain(); env(g, t, 0.005, len, v); n.connect(f); f.connect(g); g.connect(sfx); n.start(t); n.stop(t + len + 0.1); }
export const sfxs = {
  click() { tone(520, 0.08, "square", 0.08); }, slash() { burst(0.14, 2400, 0.35, "bandpass"); }, hit() { drum(90, 0.18, 0.7); burst(0.1, 900, 0.3); },
  arrow() { burst(0.12, 3200, 0.22, "highpass"); tone(300, 0.1, "sawtooth", 0.05); }, bolt() { tone(660, 0.25, "sine", 0.25); tone(990, 0.2, "sine", 0.12); },
  hurt() { drum(70, 0.25, 0.8); }, pick() { tone(780, 0.1, "triangle", 0.25); setTimeout(() => tone(1040, 0.14, "triangle", 0.25), 90); },
  thunder() { burst(0.9, 260, 0.9); drum(55, 0.8, 0.9); }, dash() { burst(0.2, 1500, 0.3, "bandpass"); },
  level() { [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => tone(f, 0.3, "triangle", 0.3), i * 110)); },
  win() { [392, 523, 659].forEach((f, i) => setTimeout(() => tone(f, 0.4, "triangle", 0.3), i * 140)); }, lose() { [300, 240, 180].forEach((f, i) => setTimeout(() => tone(f, 0.35, "sawtooth", 0.15), i * 160)); },
  talk() { tone(300 + Math.random() * 80, 0.05, "square", 0.04); },
};
/* background drum + kora-like loop */
export function startMusic() {
  if (!ctx || started) return; started = true;
  const penta = [196, 220, 261.6, 293.7, 329.6, 392, 440];
  const pat = [1, 0, 0.6, 0, 0.8, 0, 0.5, 0.7];
  timer = setInterval(() => {
    if (!ctx || ctx.state !== "running") return; const i = step++ % 16;
    if (pat[i % 8] > 0) drum(i % 4 === 0 ? 78 : 118, 0.2, pat[i % 8] * 0.25, music);
    if (i % 2 === 0 && Math.random() < 0.55) tone(penta[Math.floor(Math.random() * penta.length)], 0.5, "triangle", 0.07, music);
  }, 300);
}
export function stopMusic() { clearInterval(timer); started = false; }
