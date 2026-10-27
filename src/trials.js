import { RIDDLES } from "./data.js";
import { drum, sfxs } from "./audio.js";

const $ = (id) => document.getElementById(id);
let abort = null;
export function closeTrial() { $("trial").classList.remove("on"); if (abort) { const a = abort; abort = null; a(false); } }
$("tClose").onclick = () => closeTrial();

function open(spirit) { $("tTitle").textContent = "Épreuve de " + spirit.name; $("tIntro").textContent = spirit.intro; $("tBody").innerHTML = ""; $("trial").classList.add("on"); }
export function runTrial(spirit) {
  return new Promise((resolve) => {
    open(spirit); let done = false; const finish = (ok) => { if (done) return; done = true; abort = null; $("trial").classList.remove("on"); resolve(ok); }; abort = finish;
    const body = $("tBody");
    if (spirit.type === "riddle") riddle(body, finish);
    else if (spirit.type === "rhythm") rhythm(body, finish);
    else timing(body, spirit.params, finish);
  });
}

function riddle(body, finish) {
  let i = 0, good = 0;
  const show = () => {
    const r = RIDDLES[i]; body.innerHTML = `<h3>${i + 1} / ${RIDDLES.length}</h3><p style="font-size:18px;margin:8px 0">${r.q}</p><div class="opts"></div><p class="msg" id="rMsg"></p>`;
    const box = body.querySelector(".opts"); const order = r.o.map((o, k) => k).sort(() => Math.random() - 0.5);
    order.forEach((k) => { const b = document.createElement("button"); b.className = "b opt"; b.textContent = r.o[k][0]; b.onclick = () => { sfxs.click(); const ok = r.o[k][1] === 1; good += ok ? 1 : 0; box.querySelectorAll("button").forEach((x) => (x.disabled = true));
      const m = $("rMsg"); m.className = "msg " + (ok ? "ok" : "bad"); m.textContent = ok ? "Legba hoche la tête." : "Legba reste silencieux."; (ok ? sfxs.win : sfxs.lose)(); setTimeout(() => { i++; if (i < RIDDLES.length) show(); else finish(good >= 2); }, 1300); }; box.appendChild(b); });
  };
  show();
}

function rhythm(body, finish) {
  body.innerHTML = `<p class="msg" id="rhMsg">Écoute…</p><div class="drums"></div><small>Touches 1-2-3-4 (ou D F J K), ou touche les tambours.</small>`;
  const pads = []; const freqs = [95, 120, 150, 190]; const dr = body.querySelector(".drums");
  for (let i = 0; i < 4; i++) { const d = document.createElement("button"); d.className = "drum"; d.textContent = i + 1; dr.appendChild(d); pads.push(d); }
  const msg = $("rhMsg"); let seq = [], pos = 0, accept = false, round = 0, errors = 0; const lens = [3, 4, 5, 6];
  const flash = (i) => { pads[i].classList.add("lit"); drum(freqs[i], 0.3, 0.9); setTimeout(() => pads[i].classList.remove("lit"), 220); };
  const play = async () => { accept = false; msg.className = "msg"; msg.textContent = "Écoute…"; await new Promise((r) => setTimeout(r, 700)); for (const n of seq) { if (!$("trial").classList.contains("on")) return; flash(n); await new Promise((r) => setTimeout(r, 520)); } msg.textContent = "À toi !"; pos = 0; accept = true; };
  const next = () => { if (round >= 3) { sfxs.win(); return finish(true); } seq = Array.from({ length: lens[round] }, () => Math.floor(Math.random() * 4)); play(); };
  const press = (i) => { if (!accept) return; flash(i); if (i === seq[pos]) { pos++; if (pos >= seq.length) { accept = false; round++; msg.className = "msg ok"; msg.textContent = "Le tonnerre s'apaise…"; setTimeout(next, 900); } } else { errors++; accept = false; msg.className = "msg bad"; sfxs.lose(); if (errors > 1) { msg.textContent = "Trop d'erreurs."; setTimeout(() => finish(false), 1100); } else { msg.textContent = "Faux. Écoute encore."; setTimeout(play, 1100); } } };
  pads.forEach((p, i) => (p.onclick = () => press(i)));
  const onKey = (e) => { if (!$("trial").classList.contains("on")) return window.removeEventListener("keydown", onKey); const k = { 1: 0, 2: 1, 3: 2, 4: 3, d: 0, f: 1, j: 2, k: 3 }[e.key.toLowerCase()]; if (k !== undefined) press(k); };
  window.addEventListener("keydown", onKey); next();
}

function timing(body, P, finish) {
  body.innerHTML = `<p class="msg" id="tmMsg">${P.label} : ${P.hits} essais, il faut en réussir ${P.need}.</p><div class="tbar"><div class="zone" id="tmZone"></div><div class="cur" id="tmCur"></div></div><div class="row" style="justify-content:center"><button class="b big" id="tmHit">Frapper !</button></div><small>Espace, Entrée ou clic.</small>`;
  const zone = $("tmZone"), cur = $("tmCur"), msg = $("tmMsg"); let t = 0, dir = 1, n = 0, ok = 0, zx = 0, raf = 0, last = performance.now(), lock = false;
  const newZone = () => { const w = Math.max(0.07, P.zone - n * 0.012); zx = 0.1 + Math.random() * (0.8 - w); zone.style.left = zx * 100 + "%"; zone.style.width = w * 100 + "%"; zone.dataset.w = w; };
  newZone();
  const loop = (now) => { if (!$("trial").classList.contains("on")) return; const dt = (now - last) / 1000; last = now; if (!lock) { t += dir * dt * P.speed * (1 + n * 0.12); if (t > 1) { t = 1; dir = -1; } if (t < 0) { t = 0; dir = 1; } } cur.style.left = `calc(${t * 100}% - 3px)`; raf = requestAnimationFrame(loop); };
  const hit = () => { if (lock) return; lock = true; const w = +zone.dataset.w, good = t >= zx && t <= zx + w; n++; if (good) { ok++; sfxs.hit(); msg.className = "msg ok"; msg.textContent = "Parfait ! (" + ok + " / " + P.need + ")"; } else { sfxs.lose(); msg.className = "msg bad"; msg.textContent = "Raté…"; }
    setTimeout(() => { if (ok >= P.need) { sfxs.win(); cancelAnimationFrame(raf); return finish(true); } if (n >= P.hits) { cancelAnimationFrame(raf); return finish(false); } lock = false; newZone(); }, 800); };
  $("tmHit").onclick = hit; const onKey = (e) => { if (!$("trial").classList.contains("on")) return window.removeEventListener("keydown", onKey); if (e.code === "Space" || e.code === "Enter") { e.preventDefault(); hit(); } }; window.addEventListener("keydown", onKey);
  raf = requestAnimationFrame(loop);
}
