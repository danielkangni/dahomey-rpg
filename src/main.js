import * as THREE from "three";
import { CLASSES, SPIRITS, STAGES, PROLOGUE, ITEMS } from "./data.js";
import { newState, gainItem, useItem, addXp, xpNeed } from "./state.js";
import { buildWorld, height, VILLAGE, RIDGE, CAMP, LAIR } from "./world.js";
import { Player, Enemies, FX, Shots, moveCollide } from "./actors.js";
import { runTrial, closeTrial } from "./trials.js";
import * as UI from "./ui.js";
import * as Audio from "./audio.js";
import * as Save from "./save.js";
const { $, toast, banner, say } = UI;

/* ---------- renderer ---------- */
const canvas = $("gl"), settings = Save.loadSettings();
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
const coarse = matchMedia("(pointer:coarse)").matches; renderer.setPixelRatio(Math.min(devicePixelRatio, coarse ? 1.5 : 2)); renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05; renderer.outputColorSpace = THREE.SRGBColorSpace;
const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(60, 1, 0.1, 600);
const world = buildWorld(scene, settings.shadow), fx = new FX(scene, camera), shots = new Shots(scene), enemies = new Enemies(scene, world, camera);
function resize() { const w = innerWidth, h = innerHeight; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); } addEventListener("resize", resize); resize();
Audio.setVol("music", settings.music / 100); Audio.setVol("sfx", settings.sfx / 100);

/* ---------- game state ---------- */
let S = null, P = null, mode = "title", chosen = "sorcier", camYaw = 2.4, camPitch = 0.38, camDist = 7.5, orbit = 0, saveTimer = 0;
const keys = {}, inp = { mx: 0, mz: 0, run: false }; let joy = { id: null, x: 0, y: 0, ox: 0, oy: 0 }, look = { id: null, moved: 0, t: 0 };
const requiredTrials = () => Object.values(SPIRITS).filter((sp) => sp.classes.includes(S.cls));
const trialsDone = () => requiredTrials().every((sp) => S.powers[sp.power.id]);
const NPCS = () => world.npcs;

function objective() {
  if (!S) return null;
  switch (S.stage) {
    case 0: case 5: { const n = NPCS().find((x) => x.id === "doyen"); return [n.x, n.z]; }
    case 1: { const sp = requiredTrials().find((x) => !S.powers[x.power.id]); return sp ? sp.pos : null; }
    case 2: return RIDGE; case 3: return CAMP; case 4: return LAIR; default: return null;
  }
}
function stageSet(n, silent) {
  S.stage = n; world.showRidge = n === 2; if (!silent) { const q = STAGES[Math.min(n, STAGES.length - 1)]; banner(q.t, q.d); Audio.sfxs.win(); autosave(); }
  if (n === 4 && !S.bossDead && !enemies.list.some((e) => e.type === "boss" && !e.dead)) enemies.spawn("boss", world.bossSpawn[0], world.bossSpawn[1]);
}
function spawnEnemies() {
  enemies.clear(); shots.clear(); if (S.stage < 5) world.soldierSpawns.forEach(([x, z]) => enemies.spawn("soldat", x, z));
  if (S.stage === 4 && !S.bossDead) enemies.spawn("boss", world.bossSpawn[0], world.bossSpawn[1]);
}
function autosave() { if (!S) return; S.pos = [P.x, P.z]; Save.writeSave(S); }

/* ---------- start / load ---------- */
function startPlay(state, fresh) {
  S = state; if (P) { scene.remove(P.mesh); scene.remove(P.shadow); } P = new Player(scene, S);
  for (const h of world.herbs) { h.taken = S.herbs.includes(h.x + "," + h.z); h.mesh.visible = !h.taken; }
  spawnEnemies(); world.showRidge = S.stage === 2; camYaw = 2.4; mode = "play"; UI.noScreen(); $("hud").classList.remove("hide"); Audio.init(); Audio.startMusic(); updateHud();
  if (fresh) setTimeout(() => say([{ who: "", text: "Le village s'éveille. Va voir le doyen Adjovi, près du grand arbre." }]), 400);
}
function onEnemyHit(e, dmg, kx, kz, magic) {
  const killed = enemies.damage(e, dmg, kx, kz); fx.text(e.x, e.y, e.z, String(dmg), magic ? "#c9b3ff" : "#ffe08a"); fx.hit(e.x, e.y, e.z); Audio.sfxs.hit();
  if (killed) {
    S.kills++; const up = addXp(S, e.T.xp); fx.text(e.x, e.y + 0.8, e.z, "+" + e.T.xp + " XP", "#7fe3a0");
    if (up) { banner("Niveau " + S.lv, "Tes forces grandissent."); Audio.sfxs.level(); }
    if (Math.random() < 0.3 && gainItem(S, "herbe")) toast("Tu ramasses une plante médicinale.");
    if (e.type === "soldat" && S.stage === 3) { S.patrol++; toast("Patrouille : " + Math.min(4, S.patrol) + " / 4"); if (S.patrol >= 4) { for (const x of enemies.list) if (!x.dead && x.type === "soldat") x.state = "idle"; stageSet(4); } }
    if (e.type === "boss") { S.bossDead = true; fx.ring(e.x, e.y, e.z, 0xffd36a, 8, 1); gainItem(S, "potion", 2); toast("Tu trouves deux tisanes des anciens."); stageSet(5); }
    autosave();
  }
}
const ctx = { enemies: enemies.list, fx, shots, world, player: null, toast, onEnemyHit, onPlayerHit: (d) => { if (P.hurt(d, ctx)) hurt(); }, onPlayerDamaged: () => hurt() };
function hurt() { if (S.hp <= 0 && mode === "play") die(); }
function die() {
  mode = "dead"; Audio.sfxs.lose(); $("eT").textContent = "Tu es tombé"; $("eP").textContent = "Les anciens te ramènent au village. Le combat n'est pas fini."; $("eB").textContent = "Se relever"; $("eB").onclick = () => { S.hp = Math.round(S.maxhp * 0.6); P.x = 4; P.z = 4; P.inv = 2; spawnEnemies(); UI.noScreen(); mode = "play"; autosave(); }; UI.screen("end");
}

/* ---------- interactions ---------- */
function nearest() {
  let best = null, bd = 3.6;
  const test = (o, d) => { if (d < bd) { bd = d; best = o; } };
  for (const n of NPCS()) test({ kind: "npc", n }, Math.hypot(n.x - P.x, n.z - P.z));
  for (const sp of Object.values(SPIRITS)) { const sh = world.shrines[sp.id]; test({ kind: "shrine", sp }, Math.hypot(sh.x - P.x, sh.z - P.z) - 0.8); }
  for (const h of world.herbs) if (!h.taken) test({ kind: "herb", h }, Math.hypot(h.x - P.x, h.z - P.z));
  return best;
}
const lbl = (it) => !it ? "" : it.kind === "npc" ? "Parler à " + it.n.name : it.kind === "herb" ? "Cueillir" : (it.sp.classes.includes(S.cls) ? (S.powers[it.sp.power.id] ? "Sanctuaire de " + it.sp.name : "Épreuve de " + it.sp.name) : "Sanctuaire de " + it.sp.name);
async function interact() {
  if (mode !== "play") return; const it = nearest(); if (!it) return; mode = "dialog"; Audio.init();
  try {
    if (it.kind === "herb") { if (gainItem(S, "herbe")) { it.h.taken = true; it.h.mesh.visible = false; S.herbs.push(it.h.x + "," + it.h.z); Audio.sfxs.pick(); toast("+ Plante médicinale"); addXp(S, 4); } else toast("Inventaire plein."); }
    else if (it.kind === "npc") await talk(it.n);
    else await shrine(it.sp);
  } finally { if (mode === "dialog") mode = "play"; }
}
async function talk(n) {
  const cls = CLASSES[S.cls], W = (text) => ({ who: n.name, text }); S.talked[n.id] = true;
  if (n.id === "doyen") {
    if (S.stage === 0) {
      const t = { sorcier: "Tu lis les signes. Les Vodun jugeront ton esprit : va au carrefour de Legba, à l'ouest, puis chez Hévioso, au nord-ouest. On ne les combat pas : on passe leurs épreuves.", guerrier: "Ton bras est fort, mais un fer sans âme ne vaut rien. Va à la forge de Gu, au sud-est : il jugera ton geste.", archer: "Tu vois ce que les autres manquent. Va chez Aziza, dans la forêt du sud : elle apprend le silence à ceux qui tirent." }[S.cls];
      await say([W("Te voilà, " + S.name + ". J'ai vu que tu as aperçu le navire."), W("Ils ne viennent pas pour commercer. Ils comptent, ils dessinent, ils observent. Et certains des nôtres, dit-on, leur vendent déjà nos secrets."), W(t), W("Prends ceci. Elle te protégera."), { who: "", text: "Tu reçois l'Amulette de Legba." }]);
      gainItem(S, "amulette"); S.maxhp += 5; S.hp += 5; stageSet(1);
    } else if (S.stage === 1) await say([W("Les esprits t'attendent. " + (objective() ? "Cherche la lumière qui flotte au-dessus de leur sanctuaire." : ""))]);
    else if (S.stage === 2) await say([W("Monte sur la colline à l'est. Regarde le navire de tes propres yeux, puis reviens-moi.")]);
    else if (S.stage === 3) await say([W("Des soldats campent sur la plage. Repousse-les, mais sans te faire encercler.")]);
    else if (S.stage === 4) await say([W("Agbo, un sorcier de chez nous, a vendu nos chemins aux étrangers. Il se terre dans sa case, au sud du camp. Fais attention à ses sorts.")]);
    else if (S.stage === 5) { await say([W("Agbo est tombé ? Les esprits sont avec toi, " + S.name + "."), W("Mais le navire n'est que le premier. D'autres viendront, plus nombreux. Le roi doit savoir ce que tu as vu."), { who: "", text: "Fin du chapitre 1 : « L'ombre sur la côte »." }]); stageSet(6, true); chapterEnd(); }
    else await say([W("Que les esprits guident tes pas. Le prochain chapitre arrive.")]);
    return;
  }
  if (n.id === "marchande") { const first = !S.herbs.includes("gift"); await say([W(first ? "Mon enfant, prends ces plantes. Mâche-les si une plaie te fait mal." : "Les soldats étrangers ont acheté tout mon sel. Ils paient en pièces que je ne connais pas.")]); if (first) { S.herbs.push("gift"); gainItem(S, "herbe", 2); toast("+2 Plantes médicinales"); } return; }
  if (n.id === "enfant") return say([W(S.stage >= 2 ? "On voit le navire de la colline ! Il est plus grand que dix cases ensemble." : "Moi aussi, quand je serai grand, je serai " + (S.cls === "sorcier" ? "Bokɔnɔ" : S.cls === "guerrier" ? "guerrier" : "chasseur") + " comme toi !")]);
  if (n.id === "forgeron") return say([W("Le fer qu'ils portent est dur, mais il n'a pas de mémoire. Le nôtre se souvient de la main qui l'a forgé."), W("Si tu veux frapper juste, respire avant de frapper.")]);
  if (n.id === "agojie") return say([W("Je m'entraîne avec les guerrières du roi. Garde ce rythme : attaque, esquive, recule. Ne reste jamais immobile devant un fusil."), W("Les touches : déplace-toi avec ZQSD ou WASD, Espace pour frapper, 1 et 2 pour tes pouvoirs, H pour te soigner.")]);
}
async function shrine(sp) {
  const mine = sp.classes.includes(S.cls);
  if (!mine) return say([{ who: sp.name, text: "Ce sanctuaire ne répond pas à ta voie. Cherche celui de ton chemin." }]);
  if (S.powers[sp.power.id]) return say([{ who: sp.name, text: "Tu portes déjà mon don. Va, et utilise-le bien." }]);
  if (S.stage < 1) return say([{ who: sp.name, text: "Va d'abord voir le doyen." }]);
  await say([{ who: sp.name + ", " + sp.title, text: sp.intro }]); Audio.init(); mode = "trial";
  const ok = await runTrial(sp); mode = "dialog";
  if (ok) { S.powers[sp.power.id] = true; S.trials[sp.id] = true; if (S.cls === "sorcier") S.stats.spi += 2; if (S.cls === "guerrier") { S.stats.str += 3; S.maxhp += 15; } if (S.cls === "archer") S.stats.agi += 3;
    Audio.sfxs.level(); banner("Pouvoir : " + sp.power.name, sp.power.desc); fx.ring(P.x, P.y, P.z, sp.color, 6, 1); await say([{ who: sp.name, text: sp.win }]);
    if (S.stage === 1 && trialsDone()) stageSet(2); else autosave(); }
  else if (UI.dialogOpen()) {} else await say([{ who: sp.name, text: sp.lose }]);
}
function chapterEnd() { mode = "end"; $("eT").textContent = "Chapitre 1 terminé"; $("eP").textContent = "« L'ombre sur la côte ». Niveau " + S.lv + " · " + S.kills + " ennemis vaincus. Le chapitre 2 arrive : le roi doit être prévenu."; $("eB").textContent = "Continuer d'explorer"; $("eB").onclick = () => { UI.noScreen(); mode = "play"; autosave(); }; UI.screen("end"); autosave(); }

/* ---------- menus & screens ---------- */
let menuTab = "stat", prevScreen = "title";
function menuCb() { return { useItem: (i) => { const r = useItem(S, i); if (r === "full") toast("Vie déjà pleine."); else if (r) { toast("+" + r.heal + " PV"); Audio.sfxs.pick(); } UI.renderMenu("inv", S, menuCb()); updateHud(); }, save: () => { S.pos = [P.x, P.z]; return Save.writeSave(S); }, settings: () => { prevScreen = "menu"; UI.screen("settings"); }, toTitle: () => { autosave(); backToTitle(); } }; }
function openMenu() { if (mode !== "play") return; mode = "menu"; UI.screen("menu"); UI.renderMenu(menuTab, S, menuCb()); }
function closeMenu() { UI.noScreen(); mode = "play"; autosave(); }
function backToTitle() { mode = "title"; $("hud").classList.add("hide"); Audio.stopMusic(); $("bCont").disabled = !Save.hasSave(); UI.screen("title"); }
document.querySelectorAll("#mTabs button").forEach((b) => (b.onclick = () => { menuTab = b.dataset.t; Audio.sfxs.click(); UI.renderMenu(menuTab, S, menuCb()); }));
$("mClose").onclick = closeMenu; $("bMenu").onclick = openMenu;
$("bNew").onclick = () => { Audio.init(); Audio.sfxs.click(); UI.screen("prologue"); prologue(); };
$("bCont").onclick = () => { Audio.init(); const sv = Save.loadSave(); if (sv) { Audio.sfxs.click(); startPlay(sv, false); } };
$("bSet").onclick = () => { Audio.init(); prevScreen = "title"; UI.screen("settings"); };
$("bSetBack").onclick = () => { Save.writeSettings(settings); UI.screen(prevScreen); if (prevScreen === "menu") UI.renderMenu(menuTab, S, menuCb()); };
$("bBack").onclick = () => UI.screen("title");
$("bCont").disabled = !Save.hasSave();
function bindSettings() {
  $("sMusic").value = settings.music; $("sSfx").value = settings.sfx; $("sShadow").value = settings.shadow; $("sSens").value = settings.sens;
  $("sMusic").oninput = (e) => { settings.music = +e.target.value; Audio.setVol("music", settings.music / 100); }; $("sSfx").oninput = (e) => { settings.sfx = +e.target.value; Audio.setVol("sfx", settings.sfx / 100); Audio.sfxs.click(); };
  $("sShadow").onchange = (e) => { settings.shadow = +e.target.value; world.sun.castShadow = settings.shadow > 0; if (settings.shadow > 0) { const ms = settings.shadow > 1 ? 2048 : 1024; world.sun.shadow.mapSize.set(ms, ms); if (world.sun.shadow.map) { world.sun.shadow.map.dispose(); world.sun.shadow.map = null; } } scene.traverse((o) => { if (o.material) o.material.needsUpdate = true; }); };
  $("sSens").oninput = (e) => (settings.sens = +e.target.value);
} bindSettings();
let prIdx = 0, prTimer = 0;
function prologue() { prIdx = 0; showPrologue(); }
function showPrologue() { const t = PROLOGUE[prIdx], el = $("prText"); el.textContent = ""; let k = 0; clearInterval(prTimer); prTimer = setInterval(() => { k += 2; el.textContent = t.slice(0, k); if (k >= t.length) clearInterval(prTimer); }, 26); $("prNext").onclick = () => { if (k < t.length) { clearInterval(prTimer); el.textContent = t; k = t.length; return; } Audio.sfxs.click(); prIdx++; if (prIdx >= PROLOGUE.length) toCreate(); else showPrologue(); }; $("prSkip").onclick = () => { clearInterval(prTimer); toCreate(); }; }
function toCreate() { UI.screen("create"); UI.renderCards(chosen, pick); }
function pick(c) { chosen = c; UI.renderCards(chosen, pick); }
$("bStart").onclick = () => { Audio.sfxs.click(); startPlay(newState(chosen, $("hName").value.trim() || "Kofi"), true); };

/* ---------- input ---------- */
addEventListener("keydown", (e) => {
  if (e.repeat && e.code !== "Space") return; const k = e.code; keys[k] = true;
  if (mode === "play") { if (k === "Space") { e.preventDefault(); P.attack(ctx); } if (k === "Digit1") P.power(1, ctx); if (k === "Digit2") P.power(2, ctx); if (k === "KeyE") interact(); if (k === "KeyH") quickHeal(); if (k === "Escape" || k === "KeyI") openMenu(); }
  else if (mode === "menu" && (k === "Escape")) closeMenu();
  else if (mode === "trial" && k === "Escape") closeTrial();
});
addEventListener("keyup", (e) => (keys[e.code] = false));
function quickHeal() { const i = S.inv.findIndex((x) => ITEMS[x.id].heal); if (i < 0) return toast("Aucun soin dans ton inventaire."); const r = useItem(S, i); if (r === "full") toast("Vie déjà pleine."); else { toast("+" + r.heal + " PV"); Audio.sfxs.pick(); } }
$("tHeal").onclick = () => mode === "play" && quickHeal(); $("tAtk").onclick = () => mode === "play" && P.attack(ctx); $("tAct").onclick = interact; $("tP1").onclick = () => mode === "play" && P.power(1, ctx); $("tP2").onclick = () => mode === "play" && P.power(2, ctx);
canvas.addEventListener("pointerdown", (e) => {
  canvas.setPointerCapture(e.pointerId); Audio.init();
  if (e.pointerType === "touch" && e.clientX < innerWidth * 0.42 && joy.id === null) { joy = { id: e.pointerId, ox: e.clientX, oy: e.clientY, x: 0, y: 0 }; }
  else if (look.id === null) look = { id: e.pointerId, moved: 0, t: performance.now(), x: e.clientX, y: e.clientY, mouse: e.pointerType === "mouse" };
});
canvas.addEventListener("pointermove", (e) => {
  if (e.pointerId === joy.id) { const dx = e.clientX - joy.ox, dy = e.clientY - joy.oy, d = Math.min(1, Math.hypot(dx, dy) / 55), a = Math.atan2(dy, dx); joy.x = Math.cos(a) * d; joy.y = Math.sin(a) * d; const j = $("joy").firstElementChild; if (j) j.style.transform = `translate(${joy.x * 40}px,${joy.y * 40}px)`; }
  else if (e.pointerId === look.id && (mode === "play" || mode === "dead")) { const dx = e.clientX - look.x, dy = e.clientY - look.y; look.x = e.clientX; look.y = e.clientY; look.moved += Math.abs(dx) + Math.abs(dy); const sens = 0.0045 * settings.sens / 100; camYaw -= dx * sens; camPitch = Math.max(0.05, Math.min(1.25, camPitch + dy * sens)); }
});
const up = (e) => { if (e.pointerId === joy.id) { joy = { id: null, x: 0, y: 0, ox: 0, oy: 0 }; const j = $("joy").firstElementChild; if (j) j.style.transform = ""; } if (e.pointerId === look.id) { if (look.mouse && look.moved < 6 && performance.now() - look.t < 300 && mode === "play") P.attack(ctx); look.id = null; } };
canvas.addEventListener("pointerup", up); canvas.addEventListener("pointercancel", up);
canvas.addEventListener("wheel", (e) => { e.preventDefault(); camDist = Math.max(4, Math.min(14, camDist + e.deltaY * 0.01)); }, { passive: false });

/* ---------- hud ---------- */
let hudT = 0;
function updateHud() {
  const q = STAGES[Math.min(S.stage, STAGES.length - 1)], o = objective(); let dist = 0, ang = 0;
  if (o) { const dx = o[0] - P.x, dz = o[1] - P.z; dist = Math.hypot(dx, dz); const target = Math.atan2(dx, dz), face = Math.atan2(-Math.sin(camYaw), -Math.cos(camYaw)); ang = -(target - face); }
  UI.hud(S, q, dist, ang); UI.powersBar(S, P.cd);
}

/* ---------- main loop ---------- */
let last = performance.now(), T = 0;
function frame(now) {
  requestAnimationFrame(frame); const dt = Math.min(0.05, (now - last) / 1000); last = now; T += dt; world.update(T);
  if (mode === "play" || mode === "dialog" || mode === "trial" || mode === "menu") { /* simulation below */ }
  if (mode === "title" || mode === "prologue" || mode === "create" || mode === "settings") { orbit += dt * 0.05; camera.position.set(Math.cos(orbit) * 30, 14 + Math.sin(orbit * 2) * 2, Math.sin(orbit) * 30); camera.lookAt(0, 3, 0); world.followSun(0, 0); renderer.render(scene, camera); return; }
  if (!S) return;
  if (mode === "play") {
    S.playtime += dt; let ix = 0, iz = 0; if (keys.KeyW || keys.ArrowUp) iz += 1; if (keys.KeyS || keys.ArrowDown) iz -= 1; if (keys.KeyD || keys.ArrowRight) ix += 1; if (keys.KeyA || keys.ArrowLeft) ix -= 1; ix += joy.x; iz -= joy.y;
    const fx_ = -Math.sin(camYaw), fz_ = -Math.cos(camYaw), rx = Math.cos(camYaw), rz = -Math.sin(camYaw); inp.mx = fx_ * iz + rx * ix; inp.mz = fz_ * iz + rz * ix; inp.run = !!(keys.ShiftLeft || keys.ShiftRight);
    P.update(dt, inp, world, ctx); ctx.player = P; enemies.update(dt, ctx); shots.update(dt, { enemies: enemies.list, player: P, world, fx, onEnemyHit, onPlayerHit: ctx.onPlayerHit });
    if (keys.KeyJ) {} if (S.hp <= 0) die();
    S.hp = Math.min(S.maxhp, S.hp + dt * 0.4);
    // ridge lookout
    if (S.stage === 2 && Math.hypot(P.x - RIDGE[0], P.z - RIDGE[1]) < 5) { S.seenShip = true; mode = "dialog"; world.showRidge = false; say([{ who: "", text: "Du haut de la colline, tu vois le navire. Des chaloupes déposent des hommes sur la plage. Des tentes, des caisses, un drapeau inconnu." }, { who: S.name, text: "Il faut repousser cette patrouille avant qu'elle n'avance vers le village." }]).then(() => { mode = "play"; stageSet(3); }); }
    const it = nearest(); UI.prompt(it ? (coarse ? lbl(it) : "[E] " + lbl(it)) : "");
    hudT -= dt; if (hudT <= 0) { hudT = 0.1; updateHud(); } saveTimer += dt; if (saveTimer > 45) { saveTimer = 0; autosave(); }
  } else if (mode === "dialog" || mode === "trial") { P.update(dt, { mx: 0, mz: 0, run: false }, world, ctx); enemies.update(0, ctx); UI.prompt(""); }
  fx.update(dt);
  // camera
  const ty = P.y + 1.6, tx = P.x, tz = P.z, cp = Math.cos(camPitch);
  let cx = tx + Math.sin(camYaw) * cp * camDist, cz = tz + Math.cos(camYaw) * cp * camDist, cy = ty + Math.sin(camPitch) * camDist; const gy = height(cx, cz) + 0.8; if (cy < gy) cy = gy;
  camera.position.lerp(new THREE.Vector3(cx, cy, cz), Math.min(1, dt * 14)); camera.lookAt(tx, ty, tz); world.followSun(P.x, P.z); world.sky.position.copy(camera.position);
  renderer.render(scene, camera);
}
requestAnimationFrame(frame);
window.__g = { get S() { return S; }, get P() { return P; }, enemies, world, fx, startPlay, newState, stageSet, say, get mode() { return mode; }, set mode(m) { mode = m; }, interact, camera };
