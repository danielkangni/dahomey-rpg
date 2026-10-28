// Génère les images de personnages avec l'API Gemini, d'après tools/personnages.json.
// La clé est lue dans .env (GEMINI_API_KEY), jamais affichée ni écrite ailleurs.
// Usage : node tools/gemini_images.mjs --check            (vérifie la clé et les modèles d'image, sans rien générer)
//         node tools/gemini_images.mjs --only=doyen,soldat [--n=2] [--force]
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
const ENV = process.env.GEMINI_ENV_FILE || new URL("../.env", import.meta.url).pathname;
const env = {}; if (existsSync(ENV)) for (const l of readFileSync(ENV, "utf8").split("\n")) { const m = l.match(/^([A-Z_]+)=(.*)$/); if (m) env[m[1]] = m[2].trim(); }
const KEY = process.env.GEMINI_API_KEY || env.GEMINI_API_KEY, MODEL = env.GEMINI_IMAGE_MODEL || "gemini-2.5-flash-image";
if (!KEY) { console.error("Clé absente : ouvre le fichier .env à la racine du dépôt et remplis GEMINI_API_KEY="); process.exit(2); }
const H = { "x-goog-api-key": KEY, "content-type": "application/json" }, B = "https://generativelanguage.googleapis.com/v1beta";
const arg = (n) => (process.argv.find((a) => a.startsWith("--" + n + "=")) || "").split("=")[1];
if (process.argv.includes("--check")) {
  const r = await fetch(`${B}/models?pageSize=200`, { headers: H }); if (!r.ok) { console.error("Clé refusée ou erreur", r.status, (await r.text()).slice(0, 200)); process.exit(1); }
  const names = (await r.json()).models.filter((m) => /image/i.test(m.name) && (m.supportedGenerationMethods || []).includes("generateContent")).map((m) => m.name.replace("models/", ""));
  console.log("Clé valide. Modèles d'image disponibles :", names.join(", ") || "aucun"); console.log("Modèle utilisé :", MODEL); process.exit(0);
}
const cfg = JSON.parse(readFileSync(new URL("./personnages.json", import.meta.url))), out = new URL("../assets/art/characters/generes/", import.meta.url).pathname; mkdirSync(out, { recursive: true });
const only = (arg("only") || "").split(",").filter(Boolean), n = +(arg("n") || 1), force = process.argv.includes("--force"), keys = Object.keys(cfg.persos).filter((k) => !only.length || only.includes(k));
for (const k of keys) for (let v = 1; v <= n; v++) {
  const file = `${out}${k}_${v}.png`; if (!force && existsSync(file)) { console.log("déjà là", k, v); continue; }
  const prompt = `${cfg.base} ${cfg.persos[k]}`;
  const r = await fetch(`${B}/models/${MODEL}:generateContent`, { method: "POST", headers: H, body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { responseModalities: ["IMAGE"] } }) });
  if (!r.ok) { console.error("échec", k, r.status, (await r.text()).slice(0, 220)); continue; }
  const part = ((await r.json()).candidates?.[0]?.content?.parts || []).find((p) => p.inlineData || p.inline_data); const d = part && (part.inlineData || part.inline_data);
  if (!d) { console.error("pas d'image reçue pour", k, "(refus ou quota)"); continue; }
  writeFileSync(file, Buffer.from(d.data, "base64")); console.log("ok", k, v);
}
