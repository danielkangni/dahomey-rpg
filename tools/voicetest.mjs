// Échantillons comparatifs de voix (même texte, noms propres écrits phonétiquement). Usage : node tools/voicetest.mjs
import { writeFileSync } from "node:fs";
import { api } from "./eleven.mjs";
const T = "Il fut un temps où le royaume du Daomé faisait chanter les tambours. Sa capitale, Abomé, et le port de Ouida gardaient l'histoire des rois. Les guerrières, les Agodjié, protégeaient le village d'Adjaoué.";
const V = [["kevan", "AYfOkr1hDQYbhigmRZ16", "Kevan (storytelling cinématique, grave)"], ["florian", "FL0d5832ACnJkBaedeKX", "Florian (narrateur français)"], ["henryd", "59dhv4BKONM60oDSKECM", "HenryD (âgé, calme)"], ["peter", "t4fHUMAMZxaaV2inHOnb", "Peter (âgé, narrateur)"], ["david", "fEtpdogpDkBrq53KdupV", "David (âgé, parisien)"], ["jean", "j0x5aBWfr9KRRExq1lTf", "Jean Maurice (âgé, accent africain)"], ["zion", "t2969wgUwHbBoVCZNHRU", "Zion Aquila (voix actuelle)"]];
const out = new URL("../assets/audio/narration/essais/", import.meta.url).pathname, list = [];
for (const [k, id, label] of V) {
  try { const r = await api(`/v1/text-to-speech/${id}`, { method: "POST", query: { output_format: "mp3_44100_128" }, json: { text: T, model_id: "eleven_multilingual_v2", voice_settings: { stability: 0.65, similarity_boost: 0.75, style: 0, use_speaker_boost: true, speed: 0.95 } } }); writeFileSync(out + k + ".mp3", Buffer.from(await r.arrayBuffer())); list.push({ k, id, label, model: "v2" }); console.log("ok", k); } catch (e) { console.log("échec", k, e.message.slice(0, 120)); }
}
try { const r = await api(`/v1/text-to-speech/AYfOkr1hDQYbhigmRZ16`, { method: "POST", query: { output_format: "mp3_44100_128" }, json: { text: T, model_id: "eleven_v3", voice_settings: { stability: 0.5 } } }); writeFileSync(out + "kevan_v3.mp3", Buffer.from(await r.arrayBuffer())); list.push({ k: "kevan_v3", id: "AYfOkr1hDQYbhigmRZ16", label: "Kevan avec le modèle v3 (plus récent)", model: "v3" }); console.log("ok kevan_v3"); } catch (e) { console.log("v3 indisponible:", e.message.slice(0, 140)); }
writeFileSync(new URL("../assets/audio/narration/essais/liste.json", import.meta.url).pathname, JSON.stringify(list));
