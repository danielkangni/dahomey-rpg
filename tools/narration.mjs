// Génère la voix off (un fichier par segment + minutage mot à mot) dans assets/audio/narration/.
// Usage : node tools/narration.mjs [--force]   (ne régénère que ce qui manque, pour économiser le crédit)
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { api } from "./eleven.mjs";
const cfg = JSON.parse(readFileSync(new URL("./narration.json", import.meta.url))), out = new URL("../assets/audio/narration/", import.meta.url).pathname; mkdirSync(out, { recursive: true });
const force = process.argv.includes("--force"), manifest = [];
const total = cfg.segments.reduce((a, s) => a + s.text.length, 0); console.log("Caractères au total :", total);
for (let i = 0; i < cfg.segments.length; i++) {
  const s = cfg.segments[i], mp3 = out + s.id + ".mp3", js = out + s.id + ".json";
  if (!force && existsSync(mp3) && existsSync(js)) { const d = JSON.parse(readFileSync(js)); manifest.push(d); console.log("déjà généré", s.id); continue; }
  const r = await (await api(`/v1/text-to-speech/${cfg.voice}/with-timestamps`, { method: "POST", query: { output_format: "mp3_44100_128" }, json: { text: s.text, model_id: "eleven_multilingual_v2", previous_text: cfg.segments[i - 1]?.text, next_text: cfg.segments[i + 1]?.text, voice_settings: { ...cfg.settings, use_speaker_boost: true } } })).json();
  writeFileSync(mp3, Buffer.from(r.audio_base64, "base64"));
  const A = r.alignment, ch = A.characters, st = A.character_start_times_seconds, en = A.character_end_times_seconds, words = []; let cur = "", t0 = 0;
  for (let k = 0; k < ch.length; k++) { if (/\s/.test(ch[k])) { if (cur) { words.push({ w: cur, t0, t1: en[k - 1] }); cur = ""; } } else { if (!cur) t0 = st[k]; cur += ch[k]; } } if (cur) words.push({ w: cur, t0, t1: en[ch.length - 1] });
  const d = { id: s.id, scene: s.scene, text: s.text, file: `assets/audio/narration/${s.id}.mp3`, dur: en[ch.length - 1] + 0.6, words }; writeFileSync(js, JSON.stringify(d)); manifest.push(d); console.log("généré", s.id, d.dur.toFixed(1) + " s");
}
writeFileSync(out + "manifest.json", JSON.stringify({ voice: cfg.voiceName, segments: manifest })); console.log("manifest écrit,", manifest.length, "segments, durée", manifest.reduce((a, m) => a + m.dur, 0).toFixed(0), "s");
