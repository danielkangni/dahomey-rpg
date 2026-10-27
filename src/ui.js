import { CLASSES, ITEMS, SPIRITS, STAGES, CODEX, SIDE } from "./data.js";
import { xpNeed, INV_MAX } from "./state.js";
import { sfxs } from "./audio.js";

export const $ = (id) => document.getElementById(id);
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
export function screen(id) { document.querySelectorAll(".scr").forEach((s) => s.classList.toggle("on", s.id === id)); }
export function noScreen() { document.querySelectorAll(".scr").forEach((s) => s.classList.remove("on")); }
export function toast(msg) { const d = document.createElement("div"); d.textContent = msg; $("toast").appendChild(d); setTimeout(() => d.remove(), 3100); }
export function banner(title, sub = "") { const b = $("banner"); b.innerHTML = `<div><b>${esc(title)}</b><span>${esc(sub)}</span></div>`; b.classList.remove("on"); void b.offsetWidth; b.classList.add("on"); setTimeout(() => b.classList.remove("on"), 3300); }

/* ---------- dialogue ---------- */
let dlg = null;
export const dialogOpen = () => !!dlg;
export function say(lines) {
  return new Promise((resolve) => {
    let i = 0, timer = 0; const box = $("dialog"); box.classList.remove("hide");
    const show = () => { const l = lines[i]; $("dWho").textContent = l.who || ""; const t = l.text; $("dTxt").textContent = ""; let k = 0; clearInterval(timer); timer = setInterval(() => { k += 2; $("dTxt").textContent = t.slice(0, k); if (k % 6 === 0) sfxs.talk(); if (k >= t.length) clearInterval(timer); }, 22); dlg.full = () => { clearInterval(timer); $("dTxt").textContent = t; k = t.length; }; dlg.len = () => k >= t.length; };
    const next = () => { if (!dlg.len()) { dlg.full(); return; } i++; if (i >= lines.length) { clearInterval(timer); box.classList.add("hide"); box.onclick = null; window.removeEventListener("keydown", key); dlg = null; resolve(); } else show(); };
    const key = (e) => { if (e.key === "Enter" || e.key === " " || e.key === "e" || e.key === "E") { e.preventDefault(); next(); } };
    dlg = {}; box.onclick = next; window.addEventListener("keydown", key); show();
  });
}

export function choose(who, text, options) {
  return new Promise((resolve) => { const box = $("dialog"); box.classList.remove("hide"); box.onclick = null; $("dWho").textContent = who; $("dTxt").textContent = text; $("dHint").style.display = "none"; const c = $("dChoices"); c.innerHTML = "";
    options.forEach((o, i) => { const b = document.createElement("button"); b.className = "b"; b.textContent = o; b.onclick = (e) => { e.stopPropagation(); c.innerHTML = ""; $("dHint").style.display = ""; box.classList.add("hide"); sfxs.click(); resolve(i); }; c.appendChild(b); }); });
}
/* ---------- HUD ---------- */
export function hud(s, stageInfo, dist, angle) {
  $("hN").textContent = s.name; $("hL").textContent = "Niv. " + s.lv; $("hHp").style.width = (s.hp / s.maxhp * 100) + "%"; $("hHpT").textContent = Math.ceil(s.hp) + " / " + s.maxhp; $("hXp").style.width = (s.xp / xpNeed(s.lv) * 100) + "%";
  $("qT").textContent = stageInfo.t; $("qD").textContent = stageInfo.d; $("qDist").textContent = dist > 0 ? Math.round(dist) + " m" : ""; $("arrow").style.display = dist > 0 ? "" : "none"; $("arrow").style.transform = `rotate(${angle}rad)`;
}
export function powersBar(s, cds) {
  const box = $("powers"); const html = [`<div class="pw"><small>␣</small>${CLASSES[s.cls].icon}</div>`];
  for (const k of [1, 2]) { const pw = Object.values(SPIRITS).map((x) => x.power).find((p) => p.key === k && s.powers[p.id]); if (pw) { const c = cds["p" + k] || 0; html.push(`<div class="pw" title="${esc(pw.name)}"><small>${k}</small>${pw.icon}<div class="cd" style="height:${c > 0 ? (c / pw.cd * 100) : 0}%"></div></div>`); } }
  html.push(`<div class="pw"><small>H</small>♥</div>`);
  const h = html.join(""); if (box.dataset.h !== h) { box.innerHTML = h; box.dataset.h = h; } else { box.querySelectorAll(".cd").forEach((el, i) => { const k = i + 1, pw = Object.values(SPIRITS).map((x) => x.power).find((p) => p.key === k && s.powers[p.id]); if (pw) el.style.height = ((cds["p" + k] || 0) > 0 ? (cds["p" + k] / pw.cd * 100) : 0) + "%"; }); }
  $("tP1").style.display = Object.values(SPIRITS).some((x) => x.power.key === 1 && s.powers[x.power.id]) ? "" : "none"; $("tP2").style.display = Object.values(SPIRITS).some((x) => x.power.key === 2 && s.powers[x.power.id]) ? "" : "none";
}
export function prompt(text) { const p = $("prompt"); if (text) { p.textContent = text; p.classList.remove("hide"); } else p.classList.add("hide"); }

/* ---------- class cards ---------- */
export function renderCards(sel, onPick) {
  $("cards").innerHTML = Object.values(CLASSES).map((c) => {
    const mx = 16, st = (l, v) => `<span>${l}</span><i style="width:${v / mx * 100}%"></i>`;
    return `<div class="card ${c.id === sel ? "sel" : ""}" data-c="${c.id}"><div class="im" style="${c.img ? `background-image:url(${c.img})` : ""}">${c.img ? "" : c.icon}</div><div class="t"><h3>${c.label}</h3><p>${c.desc}</p><div class="mini">${st("Vie", c.base.hp / 8)}${st("Force", c.base.str)}${st("Agilité", c.base.agi)}${st("Esprit", c.base.spi)}</div></div></div>`;
  }).join("");
  $("cards").querySelectorAll(".card").forEach((el) => (el.onclick = () => { sfxs.click(); onPick(el.dataset.c); }));
}

/* ---------- pause menu ---------- */
export function renderMenu(tab, s, cb) {
  document.querySelectorAll("#mTabs button").forEach((b) => b.classList.toggle("on", b.dataset.t === tab)); const body = $("mBody"); const c = CLASSES[s.cls];
  if (tab === "stat") body.innerHTML = `<h2>${esc(s.name)} · ${c.label}</h2><p class="lead">Niveau ${s.lv} · expérience ${s.xp} / ${xpNeed(s.lv)} · ${s.kills} ennemis vaincus</p><div class="g2"><div class="pan"><b>Vie</b><br>${Math.ceil(s.hp)} / ${s.maxhp}</div><div class="pan"><b>Force</b><br>${s.stats.str}</div><div class="pan"><b>Agilité</b><br>${s.stats.agi}</div><div class="pan"><b>Esprit</b><br>${s.stats.spi}</div></div><p class="lead" style="margin-top:14px">La force augmente les coups d'arme, l'agilité les tirs, l'esprit les sorts.</p>`;
  if (tab === "pow") { const rows = Object.values(SPIRITS).filter((sp) => sp.classes.includes(s.cls)).map((sp) => `<div class="pan"><b>${sp.power.icon} ${sp.power.name}</b> ${s.powers[sp.power.id] ? '<span style="color:var(--ok)">· acquis (touche ' + sp.power.key + ")</span>" : '<span style="color:var(--mut)">· épreuve de ' + sp.name + " à passer</span>"}<br><small>${sp.power.desc}</small></div>`).join(""); body.innerHTML = `<h2>Pouvoirs des esprits</h2><p class="lead">On ne combat pas les esprits : on passe leur épreuve.</p><div class="g2">${rows}</div>`; }
  if (tab === "inv") { let h = ""; for (let i = 0; i < INV_MAX; i++) { const it = s.inv[i]; h += it ? `<div class="slot" data-i="${i}" title="${esc(ITEMS[it.id].name + " — " + ITEMS[it.id].desc)}">${ITEMS[it.id].icon}<small>${it.n}</small></div>` : `<div class="slot"></div>`; } body.innerHTML = `<h2>Inventaire (${s.inv.length}/${INV_MAX})</h2><p class="lead">Touche un objet pour l'utiliser.</p><div class="inv">${h}</div>`; body.querySelectorAll(".slot[data-i]").forEach((el) => (el.onclick = () => cb.useItem(+el.dataset.i))); }
  if (tab === "quest") body.innerHTML = `<h2>Chapitre 1 · L'ombre sur la côte</h2>` + STAGES.slice(0, 6).map((q, i) => `<div class="pan" style="margin:8px 0;opacity:${i > s.stage ? 0.4 : 1}"><b>${i < s.stage ? "✔ " : i === s.stage ? "➤ " : "· "}${q.t}</b><br><small>${i <= s.stage ? q.d : "…"}</small></div>`).join("") + `<h2 style="margin-top:18px">Quêtes secondaires</h2>` + Object.entries(SIDE).map(([k, q]) => { const st = s.side[k]; return st && st.started ? `<div class="pan" style="margin:8px 0"><b>${st.done ? "✔ " : "➤ "}${q.t}</b><br><small>${q.d} ${st.done ? "" : "(" + Math.min(st.n || 0, q.need) + "/" + q.need + ")"}</small></div>` : ""; }).join("") || "";
  if (tab === "codex") { const rows = Object.entries(CODEX).filter(([k]) => s.codex[k]).map(([k, c]) => `<div class="pan"><b>${c.t}</b><p>${c.d}</p></div>`).join(""); body.innerHTML = `<h2>Journal</h2><p class="lead">Ce que ton héros apprend en chemin. Les faits sont à vérifier (voir docs/HISTOIRE.md).</p><div class="codex">${rows || "<p class='lead'>Rien pour l'instant.</p>"}</div>`; }
  if (tab === "sys") body.innerHTML = `<h2>Système</h2><div class="row" style="justify-content:flex-start"><button class="b big" id="mSave">Sauvegarder</button><button class="b" id="mSet">Réglages</button><button class="b ghost" id="mTitle">Retour au titre</button></div><p class="lead" id="mMsg"></p><p class="lead">Temps de jeu : ${Math.floor(s.playtime / 60)} min</p>`;
  if (tab === "sys") { $("mSave").onclick = () => { $("mMsg").textContent = cb.save() ? "Partie sauvegardée." : "Sauvegarde impossible."; }; $("mSet").onclick = cb.settings; $("mTitle").onclick = cb.toTitle; }
}
