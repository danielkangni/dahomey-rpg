/* Original synthesized soundtrack inspired by traditional rhythms of Benin (12/8 bell timeline, hun drums, shakers,
   marimba-like melody, call-and-response voices, evolving by game mood). No copyrighted material is used.
   To use real recordings you are licensed to use, drop files in assets/audio/<mood>.mp3 (village, explore, combat, boss, shrine, title). */
let ctx = null, master, comp, musicBus, sfxBus, rev, revSend, noiseBuf, timer = 0, step = 0, started = false, nextT = 0, bar = 0, phrase = [], amb = {}, mood = "title", extra = {};
export const vol = { music: 0.5, sfx: 0.8 };
const MOODS = {
  title:   { bpm: 84,  bell: 0.35, hun: 0.5, slap: 0.2, shake: 0.4, mel: 0.55, choir: 0.5, bass: 0, scale: "major" },
  village: { bpm: 92,  bell: 0.45, hun: 0.65, slap: 0.45, shake: 0.6, mel: 0.6, choir: 0.35, bass: 0, scale: "major" },
  explore: { bpm: 100, bell: 0.4, hun: 0.6, slap: 0.3, shake: 0.5, mel: 0.5, choir: 0.5, bass: 0, scale: "dorian" },
  shrine:  { bpm: 70,  bell: 0.2, hun: 0.3, slap: 0.0, shake: 0.2, mel: 0.35, choir: 0.9, bass: 0, scale: "dorian" },
  combat:  { bpm: 126, bell: 0.6, hun: 1.0, slap: 0.8, shake: 0.9, mel: 0.3, choir: 0.4, bass: 1, scale: "minor" },
  boss:    { bpm: 136, bell: 0.7, hun: 1.0, slap: 1.0, shake: 1.0, mel: 0.25, choir: 0.7, bass: 1, scale: "minor" },
  cine:    { bpm: 66,  bell: 0.1, hun: 0.25, slap: 0.0, shake: 0.1, mel: 0.3, choir: 1.0, bass: 0, scale: "dorian" },
};
const SCALES = { major: [293.7, 329.6, 370, 440, 493.9, 587.3, 659.3, 740], dorian: [293.7, 329.6, 349.2, 440, 493.9, 587.3, 659.3, 698.5], minor: [293.7, 349.2, 392, 440, 523.3, 587.3, 698.5, 784] };
const ROOTS = [146.8, 220, 196, 146.8]; // D, A, G, D (bar progression)
export function setVol(k, v) { vol[k] = v; if (musicBus) { musicBus.gain.value = vol.music * 0.7; sfxBus.gain.value = vol.sfx; } }
export function init() {
  if (ctx) { if (ctx.state === "suspended") ctx.resume(); return; }
  const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return; ctx = new AC();
  comp = ctx.createDynamicsCompressor(); comp.threshold.value = -16; comp.ratio.value = 4; master = ctx.createGain(); master.gain.value = 0.9; master.connect(comp); comp.connect(ctx.destination);
  musicBus = ctx.createGain(); sfxBus = ctx.createGain(); musicBus.connect(master); sfxBus.connect(master); musicBus.gain.value = vol.music * 0.7; sfxBus.gain.value = vol.sfx;
  noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate); const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  rev = ctx.createConvolver(); const len = ctx.sampleRate * 2.4, ir = ctx.createBuffer(2, len, ctx.sampleRate); for (let c = 0; c < 2; c++) { const ch = ir.getChannelData(c); for (let i = 0; i < len; i++) ch[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.6); } rev.buffer = ir; revSend = ctx.createGain(); revSend.gain.value = 0.35; revSend.connect(rev); rev.connect(musicBus);
  ambience(); tryFiles();
}
function loopNoise(freq, gain, type = "lowpass") { const n = ctx.createBufferSource(); n.buffer = noiseBuf; n.loop = true; const f = ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq; const g = ctx.createGain(); g.gain.value = gain; n.connect(f); f.connect(g); g.connect(musicBus); n.start(); return { g, f }; }
function ambience() {
  amb.wind = loopNoise(500, 0.05); amb.sea = loopNoise(380, 0.0); const lfo = ctx.createOscillator(), lg = ctx.createGain(); lfo.frequency.value = 0.11; lg.gain.value = 120; lfo.connect(lg); lg.connect(amb.sea.f.frequency); lfo.start();
  const cr = ctx.createOscillator(), cg = ctx.createGain(), am = ctx.createOscillator(), ag = ctx.createGain(); cr.frequency.value = 4300; cg.gain.value = 0.0; am.frequency.value = 7; ag.gain.value = 0.006; am.connect(ag); ag.connect(cg.gain); cr.connect(cg); cg.connect(musicBus); cr.start(); am.start(); amb.crickets = cg;
  setInterval(() => { if (!ctx || ctx.state !== "running" || Math.random() > 0.35) return; const t = ctx.currentTime, o = ctx.createOscillator(), g = ctx.createGain(); o.type = "sine"; const f0 = 2200 + Math.random() * 1600; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f0 * (1.3 + Math.random() * 0.4), t + 0.08); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.025 * (1 - amb.seaLevel * 0.7 || 1), t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.16); o.connect(g); g.connect(musicBus); g.connect(revSend); o.start(t); o.stop(t + 0.2); }, 900);
  amb.seaLevel = 0;
}
export function setAmbience(sea = 0, night = 0.3) { if (!ctx) return; amb.seaLevel = sea; amb.sea.g.gain.setTargetAtTime(0.02 + sea * 0.16, ctx.currentTime, 0.8); amb.wind.g.gain.setTargetAtTime(0.03 + (1 - sea) * 0.03, ctx.currentTime, 1); amb.crickets.gain.setTargetAtTime(0.0, ctx.currentTime, 1); }
async function tryFiles() { extra = {}; for (const k of Object.keys(MOODS)) { try { const r = await fetch(`assets/audio/${k}.mp3`, { method: "HEAD" }); if (r.ok) { const a = new Audio(`assets/audio/${k}.mp3`); a.loop = true; a.volume = 0; extra[k] = a; } } catch (e) {} } }
const env = (g, t, a, d, peak) => { g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + a + d); };
function n(t, hz, len, v, type = "bandpass", dest = musicBus, q = 1) { const s = ctx.createBufferSource(); s.buffer = noiseBuf; const f = ctx.createBiquadFilter(); f.type = type; f.frequency.value = hz; f.Q.value = q; const g = ctx.createGain(); env(g, t, 0.003, len, v); s.connect(f); f.connect(g); g.connect(dest); s.start(t, Math.random()); s.stop(t + len + 0.05); }
function hun(t, f0 = 82, v = 0.7, dest = musicBus) { const o = ctx.createOscillator(), g = ctx.createGain(); o.frequency.setValueAtTime(f0 * 2.1, t); o.frequency.exponentialRampToValueAtTime(f0, t + 0.09); env(g, t, 0.004, 0.32, v); o.connect(g); g.connect(dest); o.start(t); o.stop(t + 0.4); n(t, 300, 0.05, v * 0.2, "lowpass", dest); }
function slap(t, f0 = 330, v = 0.3, dest = musicBus) { const o = ctx.createOscillator(), g = ctx.createGain(); o.type = "triangle"; o.frequency.setValueAtTime(f0 * 1.5, t); o.frequency.exponentialRampToValueAtTime(f0, t + 0.05); env(g, t, 0.002, 0.14, v); o.connect(g); g.connect(dest); g.connect(revSend); o.start(t); o.stop(t + 0.2); n(t, 2400, 0.04, v * 0.5, "bandpass", dest, 1.4); }
function bell(t, hi, v) { for (const m of [1, 1.51]) { const o = ctx.createOscillator(), g = ctx.createGain(); o.type = "square"; o.frequency.value = (hi ? 1180 : 790) * m; const f = ctx.createBiquadFilter(); f.type = "bandpass"; f.frequency.value = 2000; env(g, t, 0.001, 0.12, v * 0.12 / m); o.connect(f); f.connect(g); g.connect(musicBus); g.connect(revSend); o.start(t); o.stop(t + 0.2); } }
function marimba(t, f, v, len = 0.45) { for (const [m, a] of [[1, 1], [4, 0.25]]) { const o = ctx.createOscillator(), g = ctx.createGain(); o.type = "sine"; o.frequency.value = f * m; env(g, t, 0.004, len / m, v * a); o.connect(g); g.connect(musicBus); g.connect(revSend); o.start(t); o.stop(t + len + 0.1); } n(t, f * 3, 0.03, v * 0.15, "bandpass"); }
function choir(t, root, len, v, up = 1) { for (const [r, det] of [[1, 0], [1.5, 3], [2, -4]]) { const o = ctx.createOscillator(), f = ctx.createBiquadFilter(), f2 = ctx.createBiquadFilter(), g = ctx.createGain(); o.type = "sawtooth"; o.frequency.value = root * r * up; o.detune.value = det; f.type = "bandpass"; f.frequency.value = 700; f.Q.value = 3; f2.type = "peaking"; f2.frequency.value = 1200; f2.gain.value = 6; g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(v * 0.05, t + len * 0.35); g.gain.linearRampToValueAtTime(0.0001, t + len); o.connect(f); f.connect(f2); f2.connect(g); g.connect(musicBus); g.connect(revSend); o.start(t); o.stop(t + len + 0.1); } }
function makePhrase(sc) { const S = SCALES[sc], notes = []; let i = 3 + Math.floor(Math.random() * 3); for (let b = 0; b < 4; b++) { const bar = []; const count = 2 + Math.floor(Math.random() * 3), slots = [0, 2, 3, 5, 6, 8, 9, 11].sort(() => Math.random() - 0.5).slice(0, count).sort((a, b2) => a - b2); for (const s of slots) { i = Math.max(0, Math.min(S.length - 1, i + Math.floor(Math.random() * 5) - 2)); bar.push([s, S[i]]); } if (b === 3) bar.push([10, S[0]]); notes.push(bar); } return notes; }
const BELL = { 0: 0, 2: 1, 4: 0, 5: 1, 7: 0, 9: 1, 11: 0 };
function schedule(t, st) {
  const M = MOODS[mood]; if (!M) return; if (extra[mood] && extra[mood].volume > 0) return; const s = st % 12, b = Math.floor(st / 12), sd = 60 / (M.bpm * 3), root = ROOTS[b % 4] * (M.scale === "minor" ? 1 : 1);
  if (s === 0) { choir(t, root, sd * 12, M.choir); if (b % 4 === 0) phrase = makePhrase(M.scale); }
  if (s in BELL) bell(t, BELL[s], M.bell);
  const hunP = M.bass ? [0, 3, 6, 9] : [0, 6]; if (hunP.includes(s)) hun(t, 78 + (s === 6 ? 14 : 0), M.hun * 0.8); if (M.hun > 0.55 && s === 10 && b % 2) hun(t, 98, M.hun * 0.45);
  if (M.slap > 0 && [2, 4, 5, 8, 10].includes(s) && Math.random() < 0.8) slap(t, [300, 380, 330, 420, 360][[2, 4, 5, 8, 10].indexOf(s)], M.slap * 0.35);
  if (M.shake > 0 && (s % 2 === 0 || Math.random() < 0.3)) n(t, 7000, 0.05, M.shake * (s % 3 === 0 ? 0.09 : 0.045), "highpass");
  if (M.bass && [0, 6].includes(s)) { const o = ctx.createOscillator(), g = ctx.createGain(); o.type = "sine"; o.frequency.value = root / 2; env(g, t, 0.01, 0.5, 0.5 * M.bass); o.connect(g); g.connect(musicBus); o.start(t); o.stop(t + 0.6); }
  const ph = phrase[b % 4]; if (ph) for (const [ps, f] of ph) if (ps === s && Math.random() < 0.95) marimba(t, f * (b % 8 >= 4 ? 1 : 1), M.mel * 0.28);
  if (M.bpm > 120 && s === 5 && b % 4 === 3) { const o = ctx.createOscillator(), g = ctx.createGain(); o.type = "sine"; o.frequency.setValueAtTime(260, t); o.frequency.exponentialRampToValueAtTime(520, t + sd * 2); env(g, t, 0.01, sd * 2, 0.2); o.connect(g); g.connect(musicBus); o.start(t); o.stop(t + sd * 2 + 0.1); } // talking-drum glide
}
export function setMood(m) {
  if (!MOODS[m] || m === mood) return; const old = mood; mood = m;
  if (extra[old]) fade(extra[old], 0); if (extra[m]) { extra[m].play().catch(() => {}); fade(extra[m], vol.music); }
}
function fade(a, to) { clearInterval(a._f); a._f = setInterval(() => { const d = to - a.volume; if (Math.abs(d) < 0.03) { a.volume = to; if (!to) a.pause(); clearInterval(a._f); } else a.volume = Math.max(0, Math.min(1, a.volume + Math.sign(d) * 0.03)); }, 60); }
export function startMusic(m) {
  if (!ctx) return; if (m) mood = m; if (started) return; started = true; step = 0; nextT = ctx.currentTime + 0.1;
  timer = setInterval(() => { if (!ctx || ctx.state !== "running") { nextT = ctx ? ctx.currentTime + 0.1 : 0; return; } const M = MOODS[mood], sd = 60 / (M.bpm * 3); if (nextT < ctx.currentTime - 0.5) nextT = ctx.currentTime + 0.05; while (nextT < ctx.currentTime + 0.18) { schedule(nextT, step++); nextT += sd; } }, 40);
}
export function stopMusic() { clearInterval(timer); started = false; }

/* ---------- one-shot helpers used by trials and combat ---------- */
export function drum(freq = 120, len = 0.3, v = 0.8) { if (!ctx) return; hun(ctx.currentTime, freq, v, sfxBus); }
export function tone(freq, len = 0.25, type = "triangle", v = 0.3) { if (!ctx) return; const t = ctx.currentTime, o = ctx.createOscillator(), g = ctx.createGain(); o.type = type; o.frequency.value = freq; env(g, t, 0.01, len, v); o.connect(g); g.connect(sfxBus); o.start(t); o.stop(t + len + 0.1); }
function burst(len, hz, v, type = "lowpass") { if (!ctx) return; n(ctx.currentTime, hz, len, v, type, sfxBus); }
export const sfxs = {
  click() { tone(520, 0.08, "square", 0.08); }, slash() { burst(0.16, 2600, 0.4, "bandpass"); tone(180, 0.1, "sawtooth", 0.05); }, hit() { drum(90, 0.18, 0.7); burst(0.1, 900, 0.3); },
  arrow() { burst(0.12, 3400, 0.22, "highpass"); tone(300, 0.1, "sawtooth", 0.05); }, bolt() { tone(660, 0.25, "sine", 0.25); tone(990, 0.2, "sine", 0.12); },
  hurt() { drum(70, 0.25, 0.8); }, pick() { tone(780, 0.1, "triangle", 0.25); setTimeout(() => tone(1040, 0.14, "triangle", 0.25), 90); },
  thunder() { burst(1.1, 240, 0.9); drum(55, 0.8, 0.9); }, dash() { burst(0.22, 1600, 0.3, "bandpass"); },
  level() { [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => tone(f, 0.3, "triangle", 0.3), i * 110)); },
  win() { [392, 523, 659].forEach((f, i) => setTimeout(() => tone(f, 0.4, "triangle", 0.3), i * 140)); }, lose() { [300, 240, 180].forEach((f, i) => setTimeout(() => tone(f, 0.35, "sawtooth", 0.15), i * 160)); },
  talk() { tone(300 + Math.random() * 80, 0.05, "square", 0.04); }, gun() { burst(0.35, 800, 0.6); drum(60, 0.3, 0.6); }, step() { burst(0.05, 500, 0.05); },
};
