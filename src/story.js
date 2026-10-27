import { reliefTexture } from "./buildings.js";
import * as Snd from "./audio.js";
const $ = (id) => document.getElementById(id);
const el = (cls, html = "", parent) => { const d = document.createElement("div"); d.className = cls; d.innerHTML = html; parent && parent.appendChild(d); return d; };
const IMG = (n) => `assets/art/${n}`;

/* ---------- scene builders: each returns {update(k, t)} where k = 0..1 progress of the segment ---------- */
const SCENES = {
  palace(root) { const bg = el("st-img", "", root); bg.style.backgroundImage = `url(${IMG("title.jpg")})`; bg.style.backgroundSize = "auto 125%"; const a = el("st-relief l", "", root), b = el("st-relief r", "", root); for (const [n, k] of [[a, "lion"], [b, "sun"]]) { const i = new Image(); i.src = reliefTexture(k).image.toDataURL(); n.appendChild(i); }
    return { update(k) { bg.style.backgroundPosition = `${100 - k * 100}% 50%`; a.style.opacity = Math.min(1, Math.max(0, (k - 0.55) * 4)); b.style.opacity = Math.min(1, Math.max(0, (k - 0.7) * 4)); } }; },
  map(root) {
    const c = document.createElement("canvas"); c.className = "st-map"; root.appendChild(c); const g = c.getContext("2d"); let W = 0, H = 0; const note = el("st-note", "Schéma simplifié, non à l'échelle", root);
    const fit = () => { W = c.width = root.clientWidth; H = c.height = root.clientHeight; }; fit(); addEventListener("resize", fit);
    return { update(k, t) {
      if (!W) fit(); const horizon = H * 0.55; const sea = g.createLinearGradient(0, horizon, 0, H); sea.addColorStop(0, "#1c5a78"); sea.addColorStop(1, "#0b2c44"); g.fillStyle = "#2a1c12"; g.fillRect(0, 0, W, H); g.fillStyle = sea;
      g.beginPath(); g.moveTo(0, horizon + 20); for (let x = 0; x <= W; x += 20) g.lineTo(x, horizon + Math.sin(x * 0.012) * 18 + 10); g.lineTo(W, H); g.lineTo(0, H); g.fill();
      const land = g.createLinearGradient(0, 0, 0, horizon); land.addColorStop(0, "#5a3d22"); land.addColorStop(1, "#8a5a30"); g.fillStyle = land; g.beginPath(); g.moveTo(0, 0); g.lineTo(W, 0); g.lineTo(W, horizon - 4); for (let x = W; x >= 0; x -= 20) g.lineTo(x, horizon + Math.sin(x * 0.012) * 18 + 6); g.closePath(); g.fill();
      // kingdom region
      g.fillStyle = "rgba(224,169,59,0.22)"; g.strokeStyle = "rgba(224,169,59,0.8)"; g.lineWidth = 2; g.beginPath(); g.moveTo(W * 0.36, horizon - 10); g.quadraticCurveTo(W * 0.3, H * 0.3, W * 0.42, H * 0.08); g.lineTo(W * 0.66, H * 0.08); g.quadraticCurveTo(W * 0.72, H * 0.3, W * 0.62, horizon - 12); g.closePath(); g.fill(); g.setLineDash([8, 6]); g.stroke(); g.setLineDash([]);
      const ou = [W * 0.5, horizon - 8], ab = [W * 0.52, H * 0.22]; const pr = Math.min(1, Math.max(0, (k - 0.15) * 2));
      g.strokeStyle = "#f3c75c"; g.lineWidth = 3; g.setLineDash([10, 8]); g.lineDashOffset = -t * 18; g.beginPath(); g.moveTo(ou[0], ou[1]); g.lineTo(ou[0] + (ab[0] - ou[0]) * pr, ou[1] + (ab[1] - ou[1]) * pr); g.stroke(); g.setLineDash([]);
      const dot = (p, n, a) => { g.fillStyle = "#e0a93b"; g.beginPath(); g.arc(p[0], p[1], 8, 0, 6.28); g.fill(); g.strokeStyle = "#fff"; g.lineWidth = 2; g.stroke(); g.fillStyle = "#f6e9c8"; g.font = "bold 20px Georgia"; g.textAlign = a; g.fillText(n, p[0] + (a === "left" ? 16 : -16), p[1] + 6); };
      dot(ou, "Ouidah", "left"); if (pr > 0.9) dot(ab, "Abomey", "left");
      g.fillStyle = "#f6e9c8"; g.font = "italic 22px Georgia"; g.textAlign = "center"; g.fillText("Royaume du Dahomey", W * 0.52, H * 0.14); g.fillStyle = "#8fc6e0"; g.fillText("Océan Atlantique", W * 0.5, H * 0.9);
      for (let i = 0; i < 3; i++) { const q = ((t * 0.05 + i / 3) % 1), x = W * (0.95 - q * 0.45) + i * 6, y = H * 0.86 - q * (H * 0.86 - (horizon + 30)); g.fillStyle = "#f4efe0"; g.beginPath(); g.moveTo(x - 12, y); g.lineTo(x + 12, y); g.lineTo(x + 7, y + 8); g.lineTo(x - 7, y + 8); g.fill(); g.fillStyle = "#f4efe0"; g.beginPath(); g.moveTo(x, y - 22); g.lineTo(x + 12, y - 2); g.lineTo(x, y - 2); g.fill(); g.fillRect(x - 1, y - 24, 2, 24); }
      g.strokeStyle = "rgba(255,255,255,.18)"; g.lineWidth = 2; for (let r = 0; r < 6; r++) { g.beginPath(); for (let x = 0; x <= W; x += 14) g.lineTo(x, horizon + 40 + r * 36 + Math.sin(x * 0.03 + t * 1.4 + r) * 5); g.stroke(); }
    } }; },
  ship(root) { const bg = el("st-img px", "", root); bg.style.backgroundImage = `url(${IMG("prologue-ship.jpg")})`; bg.style.backgroundSize = "cover"; bg.style.transformOrigin = "65% 38%"; const hz = el("st-haze", "", root); return { update(k) { bg.style.transform = `scale(${1 + k * 0.6})`; hz.style.opacity = 0.15 + k * 0.3; } }; },
  agojie(root) { const bg = el("st-img", "", root); bg.style.backgroundImage = `url(${IMG("title.jpg")})`; bg.style.backgroundSize = "auto 190%"; el("st-sparks", "", root); return { update(k) { bg.style.backgroundPosition = `${4 + k * 14}% 62%`; } }; },
  reliefs(root) { el("st-clay", "", root); const row = el("st-row", "", root), items = ["lion", "shark", "buffalo", "sun", "bird", "snake"].map((k) => { const d = el("st-panel", "", row), i = new Image(); i.src = reliefTexture(k).image.toDataURL(); d.appendChild(i); return d; });
    return { update(k) { items.forEach((d, i) => { const s = Math.min(1, Math.max(0, (k - i * 0.1) * 5)); d.style.opacity = s; d.style.transform = `translateY(${(1 - s) * 40}px) scale(${0.9 + s * 0.1})`; d.classList.toggle("glow", k > 0.2 + i * 0.12 && k < 0.34 + i * 0.12); }); } }; },
  hero(root) { const bg = el("st-img px", "", root); bg.style.backgroundImage = `url(${IMG("prologue-ship.jpg")})`; bg.style.backgroundSize = "cover"; bg.style.transformOrigin = "30% 52%"; el("st-vig", "", root); return { update(k) { bg.style.transform = `scale(${1.2 + k * 0.35})`; } }; },
  paths(root) { el("st-clay", "", root); const row = el("st-cards", "", root); const defs = [["sorcerer.png", "Le Bokɔnɔ", "Parle aux esprits"], ["priest.jpg", "Le guerrier", "Tient la ligne"], ["", "L'archer", "Maître de la forêt"]]; const cards = defs.map(([im, t, s]) => { const d = el("st-card", `<div class="im" style="${im ? `background-image:url(${IMG(im)})` : ""}">${im ? "" : "➶"}</div><b>${t}</b><span>${s}</span>`, row); return d; });
    return { update(k) { cards.forEach((d, i) => { const s = Math.min(1, Math.max(0, (k - i * 0.28) * 5)); d.style.opacity = s; d.style.transform = `translateY(${(1 - s) * 50}px)`; }); } }; },
  king(root) { const bg = el("st-img", "", root); bg.style.backgroundImage = `url(${IMG("title.jpg")})`; bg.style.backgroundSize = "auto 160%"; bg.style.transformOrigin = "88% 40%"; const cr = el("st-crown", `<svg viewBox="0 0 120 80"><path d="M10 70 L20 20 L45 45 L60 8 L75 45 L100 20 L110 70 Z" fill="none" stroke="#f3c75c" stroke-width="3" stroke-linejoin="round" pathLength="1" /><g fill="#f3c75c"><circle cx="20" cy="18" r="5"/><circle cx="60" cy="6" r="6"/><circle cx="100" cy="18" r="5"/></g></svg>`, root); const rays = el("st-rays", "", root);
    return { update(k, t) { bg.style.backgroundPosition = `${100 - k * 12}% 40%`; bg.style.transform = `scale(${1 + k * 0.25})`; const p = cr.querySelector("path"); p.style.strokeDasharray = 1; p.style.strokeDashoffset = 1 - Math.min(1, k * 1.8); cr.style.opacity = Math.min(1, k * 3); rays.style.transform = `rotate(${t * 6}deg)`; rays.style.opacity = Math.min(0.6, k); } }; },
};

export async function playStory() {
  let man; try { man = await (await fetch("assets/audio/narration/manifest.json")).json(); } catch (e) { return false; }
  const scr = $("storyScr"), root = $("stScene"), subs = $("stSub"); scr.classList.add("on"); Snd.setDuck(0.22);
  let skip = false; const done = new Promise((r) => { $("stSkip").onclick = () => { skip = true; r(); }; }); let curAudio = null;
  const run = async () => {
    for (let i = 0; i < man.segments.length && !skip; i++) {
      const seg = man.segments[i]; root.innerHTML = ""; const scene = (SCENES[seg.scene] || SCENES.palace)(root); root.classList.remove("in"); void root.offsetWidth; root.classList.add("in");
      subs.innerHTML = seg.words.map((w) => `<span>${w.w}</span>`).join(" "); const spans = [...subs.children]; $("stDots").innerHTML = man.segments.map((_, j) => `<i class="${j < i ? "d" : j === i ? "c" : ""}"></i>`).join("");
      const a = new window.Audio(seg.file); curAudio = a; let ended = false; a.onended = () => (ended = true); let t0 = performance.now(), usedAudio = true; try { await a.play(); } catch (e) { usedAudio = false; }
      await new Promise((res) => { const tick = () => { if (skip) return res(); const t = usedAudio ? a.currentTime : (performance.now() - t0) / 1000, k = Math.min(1, t / seg.dur); scene.update(k, performance.now() / 1000);
        spans.forEach((s, j) => s.classList.toggle("on", seg.words[j].t0 <= t)); if ((usedAudio && ended) || (!usedAudio && t >= seg.dur)) return res(); requestAnimationFrame(tick); }; tick(); });
      if (usedAudio && !skip) await new Promise((r) => setTimeout(r, 450));
    }
  };
  await Promise.race([run(), done]); skip = true; if (curAudio) { curAudio.pause(); } scr.classList.remove("on"); root.innerHTML = ""; Snd.setDuck(1); return true;
}
