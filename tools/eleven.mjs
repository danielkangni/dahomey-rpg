// Petit client ElevenLabs. La clé est lue au moment de l'appel dans un fichier .env HORS de ce dépôt
// (variable ELEVENLABS_ENV_FILE, ou le .env du projet Tekbot par défaut). Elle n'est ni affichée ni copiée.
import { readFileSync } from "node:fs";
const ENV = process.env.ELEVENLABS_ENV_FILE || "/home/black-nexus06/tekbot/Tekbot_Acad-mie/.env";
function key() { const l = readFileSync(ENV, "utf8").split("\n").find((x) => x.startsWith("ELEVENLABS_API_KEY=")); const k = l ? l.slice(19).trim() : ""; if (!k) throw new Error("ELEVENLABS_API_KEY introuvable"); return k; }
export async function api(path, { method = "GET", json, query } = {}) {
  const u = new URL("https://api.elevenlabs.io" + path); if (query) for (const [a, b] of Object.entries(query)) u.searchParams.set(a, b);
  const r = await fetch(u, { method, headers: { "xi-api-key": key(), ...(json ? { "content-type": "application/json" } : {}) }, body: json ? JSON.stringify(json) : undefined });
  if (!r.ok) throw new Error(`ElevenLabs ${r.status} ${path}: ${(await r.text()).slice(0, 300)}`);
  return r;
}
