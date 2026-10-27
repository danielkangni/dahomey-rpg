import * as THREE from "three";
import { CLASSES, SPIRITS, STAGES, PROLOGUE, BACKSTORY, ITEMS, CODEX, SIDE } from "./data.js";
import { newState, gainItem, useItem, addXp } from "./state.js";
import { buildWorld, height, RIDGE, CAMP, LAIR } from "./world.js";
import { Player, Enemies, FX, Shots } from "./actors.js";
import { animate as animChar } from "./characters.js";
import { NPC } from "./presets.js";
import { runTrial, closeTrial } from "./trials.js";
import { createPost } from "./post.js";
import { dustField, emberField } from "./particles.js";
import { Cinematic } from "./cinematic.js";
import { manager, smooth } from "./assets.js";
import * as UI from "./ui.js";
import * as Audio from "./audio.js";
import * as Save from "./save.js";
import { preloadModels } from "./glbmodels.js";
import { playStory } from "./story.js";
const { $, toast, banner, say } = UI;

/* ---------- boot: renderer, world, loading screen ---------- */
manager.onProgress = (u, l, t) => { $("loadBar").style.width = Math.round(l / t * 100) + "%"; };
manager.onLoad = () => { setTimeout(() => $("loader").classList.add("off"), 400); };
setTimeout(() => $("loader").classList.add("off"), 9000);
const canvas = $("gl"), settings = Object.assign({ qual: 1 }, Save.loadSettings());
const coarse = matchMedia("(pointer:coarse)").matches;
const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: "high-performance" });
renderer.setPixelRatio(Math.min(devicePixelRatio, coarse ? 1.5 : 2)); renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 0.95; renderer.outputColorSpace = THREE.SRGBColorSpace;
const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(58, 1, 0.1, 700);
const loadedModels = await preloadModels();
const world = buildWorld(scene, renderer, settings.shadow), fx = new FX(scene, camera), shots = new Shots(scene), enemies = new Enemies(scene, world, camera), cine = new Cinematic(camera);
const dust = dustField(scene), embers = emberField(scene, world.fires.map((f) => ({ x: f.x, y: f.y, z: f.z })));
let post = createPost(renderer, scene, camera, settings.qual);
function resize() { const w = innerWidth, h = innerHeight; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); post.resize && post.resize(w, h); } addEventListener("resize", resize); resize();
Audio.setVol("music", settings.music / 100); Audio.setVol("sfx", settings.sfx / 100); world.setMood("gold");

/* ---------- state ---------- */
let S = null, P = null, mode = "title", chosen = "sorcier", sex = "m", camYaw = 2.4, camPitch = 0.38, camDist = 8.4, orbit = 0, saveTimer = 0, shake = 0, moodT = 0, musicMood = "title", moreau = null;
const keys = {}, inp = { mx: 0, mz: 0, run: false }; let joy = { id: null, x: 0, y: 0, ox: 0, oy: 0 }, look = { id: null, moved: 0, t: 0 }; const scripted = [];
const requiredTrials = () => Object.values(SPIRITS).filter((sp) => sp.classes.includes(S.cls));
const trialsDone = () => requiredTrials().every((sp) => S.powers[sp.power.id]);
const NPCS = () => world.npcs;
const codex = (k) => { if (S && !S.codex[k] && CODEX[k]) { S.codex[k] = true; toast("Journal : " + CODEX[k].t); } };

function objective() {
  if (!S) return null;
  switch (S.stage) {
    case 0: case 5: { const n = NPCS().find((x) => x.id === "doyen"); return [n.x, n.z]; }
    case 1: { const sp = requiredTrials().find((x) => !S.powers[x.power.id]); return sp ? sp.pos : null; }
    case 2: return RIDGE; case 3: return CAMP; case 4: return LAIR; default: return null;
  }
}
const MOOD_OF = [["gold"], ["gold"], ["gold"], ["dusk"], ["dusk"], ["gold"], ["day"]];
function stageSet(n, silent) {
  S.stage = n; world.showRidge = n === 2; world.setMood(MOOD_OF[Math.min(n, 6)][0]);
  if (!silent) { const q = STAGES[Math.min(n, STAGES.length - 1)]; banner(q.t, q.d); Audio.sfxs.win(); autosave(); }
  if (n === 4 && !S.bossDead && !enemies.list.some((e) => e.type === "boss" && !e.dead)) enemies.spawn("boss", world.bossSpawn[0], world.bossSpawn[1]);
}
function spawnEnemies() { enemies.clear(); shots.clear(); if (S.stage < 5) world.soldierSpawns.forEach(([x, z]) => enemies.spawn("soldat", x, z)); if (S.stage === 4 && !S.bossDead) enemies.spawn("boss", world.bossSpawn[0], world.bossSpawn[1]); ensureMoreau(); }
function ensureMoreau() { if (moreau) { scene.remove(moreau.root); moreau = null; } if (S && S.stage <= 3 && !S.flags.moreauGone) { moreau = NPC.officier(); moreau.root.position.set(CAMP[0] + 3.5, height(CAMP[0] + 3.5, CAMP[1] + 1), CAMP[1] + 1); moreau.root.rotation.y = 1.9; scene.add(moreau.root); } }
function autosave() { if (!S || !P) return; S.pos = [P.x, P.z]; Save.writeSave(S); }

/* ---------- start / load ---------- */
function startPlay(state, fresh) {
  S = state; if (P) { scene.remove(P.mesh); scene.remove(P.shadow); } P = new Player(scene, S); ctx.player = P;
  for (const h of world.herbs) { h.taken = S.herbs.includes(h.x + "," + h.z); h.mesh.visible = !h.taken; }
  world.setMood(MOOD_OF[Math.min(S.stage, 6)][0]); spawnEnemies(); world.showRidge = S.stage === 2; camYaw = 2.4; $("hud").classList.remove("hide"); UI.noScreen(); Audio.init(); Audio.startMusic("village"); codex("dahomey"); updateHud();
  if (fresh) intro(); else mode = "play";
}
async function intro() {
  mode = "cine"; P.x = 4; P.z = -3.6; P.yaw = 2.4; const px = P.x, pz = P.z;
  await cine.play([{ from: [-30, 22, 32], to: [-8, 9, 16], look: [0, 4, -3], dur: 6, text: "Adjahoué, village du royaume du Dahomey. La fin de l'après-midi." }, { from: [-6, 3, 8], to: [1, 2.4, 3], look: [3, 1.6, -6], dur: 6, who: S.name, text: BACKSTORY[S.cls] }, { from: [px + 5, 2.4, pz + 5], to: [px + 2.6, 1.9, pz + 2.6], look: [px, 1.4, pz], dur: 4.5, who: "Doyen Adjovi", text: "« Viens, " + S.name + ". Il faut parler. »" }]);
  mode = "play"; await say([{ who: "", text: "Va voir le doyen Adjovi, près du grand arbre. Appuie sur E pour parler (ou touche le bouton E)." }]);
}
function onEnemyHit(e, dmg, kx, kz, magic) {
  if (e.type === "boss" && !S.flags.bossDecided && e.hp - dmg <= e.max * 0.2) { e.hp = Math.max(e.max * 0.2, 1); S.flags.bossDecided = "pending"; e.stun = 999; e.state = "yield"; fx.text(e.x, e.y, e.z, String(dmg), "#ffe08a"); bossYield(e); return; }
  const killed = enemies.damage(e, dmg, kx, kz); fx.text(e.x, e.y, e.z, String(dmg), magic ? "#c9b3ff" : "#ffe08a"); fx.hit(e.x, e.y, e.z); Audio.sfxs.hit(); shake = Math.max(shake, 0.12);
  if (killed) {
    S.kills++; const up = addXp(S, e.T.xp); fx.text(e.x, e.y + 0.8, e.z, "+" + e.T.xp + " XP", "#7fe3a0");
    if (up) { banner("Niveau " + S.lv, "Tes forces grandissent."); Audio.sfxs.level(); }
    if (Math.random() < 0.3 && gainItem(S, "herbe")) toast("Tu ramasses une plante médicinale.");
    if (e.type === "soldat" && Math.random() < 0.45 && gainItem(S, "fer")) toast("Tu ramasses un fer d'acier.");
    if (e.type === "soldat" && S.stage === 3) { S.patrol++; toast("Patrouille : " + Math.min(4, S.patrol) + " / 4"); if (S.patrol >= 4) patrolDone(); }
    autosave();
  }
}
const ctx = { enemies: enemies.list, fx, shots, world, player: null, toast, onEnemyHit, onPlayerHit: (d) => { if (P.hurt(d, ctx)) { shake = 0.3; hurt(); } }, onPlayerDamaged: () => { shake = 0.3; hurt(); } };
function hurt() { if (S.hp <= 0 && mode === "play") die(); }
function die() { mode = "dead"; Audio.sfxs.lose(); $("eT").textContent = "Tu es tombé"; $("eP").textContent = "Les anciens te ramènent au village. Le combat n'est pas fini."; $("eB").textContent = "Se relever"; $("eB").onclick = () => { S.hp = Math.round(S.maxhp * 0.6); P.x = 4; P.z = 4; P.inv = 2; spawnEnemies(); UI.noScreen(); mode = "play"; autosave(); }; UI.screen("end"); }

/* ---------- story beats ---------- */
async function patrolDone() {
  for (const x of enemies.list) if (!x.dead && x.type === "soldat") x.state = "idle";
  mode = "cine"; S.flags.moreauGone = true; const m = moreau, mx = m ? m.root.position.x : CAMP[0] + 3, mz = m ? m.root.position.z : CAMP[1] + 1;
  let walkT = 0; const walk = (dt) => { if (!m) return; walkT += dt; const k = Math.min(1, walkT / 9); m.root.position.x = mx + (86 - mx) * k; m.root.position.z = mz + (mz + 8 - mz) * k; m.root.position.y = height(m.root.position.x, m.root.position.z); m.root.rotation.y = Math.atan2(86 - mx, 8); animChar(m, dt, k < 1 ? 2.6 : 0, {}); }; scripted.push(walk);
  await cine.play([{ from: [mx - 9, 4.5, mz - 9], to: [mx - 6, 3.5, mz - 6], look: [mx, 1.6, mz], lookTo: [mx + 3, 1.5, mz + 3], dur: 5, who: "Capitaine Moreau", text: "« Replions-nous sur le navire. Cette terre se défend mieux que prévu… »" }, { from: [mx - 4, 3, mz + 6], to: [mx + 2, 2.5, mz + 8], look: [mx + 10, 1.5, mz + 6], lookTo: [86, 1.4, mz + 8], dur: 5, who: "Capitaine Moreau", text: "« Agbo ! Tenez-les jusqu'au retour des chaloupes. Vous avez ma parole. »" }, { from: [P.x + 6, 4, P.z + 6], look: [P.x, 1.5, P.z], dur: 3, who: S.name, text: "Agbo. Ce nom, le doyen l'a prononcé avec tristesse. Il faut le trouver." }]);
  scripted.splice(scripted.indexOf(walk), 1); if (moreau) { scene.remove(moreau.root); moreau = null; } mode = "play"; stageSet(4);
}
async function bossYield(e) {
  mode = "dialog"; const W = (t) => ({ who: "Agbo", text: t });
  await say([W("Assez… Assez ! Tu ne sais pas ce qu'on m'a promis."), W("Mon village a brûlé deux fois. Ils m'ont dit : « Aide-nous, et plus jamais personne ne touchera à ton peuple. »"), { who: "", text: "Il baisse son bâton. La lueur rouge s'éteint." }]);
  const c = await UI.choose(S.name, "Que fais-tu d'Agbo ?", ["Je t'épargne. Tu diras aux anciens tout ce que tu sais.", "Tu as vendu ton peuple. Je termine."]);
  S.flags.spared = c === 0; S.flags.bossDecided = c === 0 ? "spared" : "slain"; gainItem(S, "carte"); gainItem(S, "potion", 2); codex("agbo");
  if (c === 0) await say([W("…Il y a un navire de plus, bientôt. Et trois routes marquées sur cette carte. Elles mènent toutes à Abomey."), { who: "", text: "Agbo te tend sa carte et s'enfuit dans les fourrés." }]);
  else await say([{ who: "", text: "Agbo tombe. Dans sa ceinture, tu trouves une carte aux croix rouges. Trois routes. Toutes vers Abomey." }]);
  e.hp = 0; e.dead = true; e.fade = c === 0 ? 0.01 : 2.2; e.bar.visible = false; if (c === 1) { import("./characters.js").then((m) => m.kill(e.char)); }
  S.bossDead = true; S.kills++; addXp(S, e.T.xp); fx.ring(e.x, e.y, e.z, 0xffd36a, 8, 1); toast("Tu trouves la Carte d'Agbo et deux tisanes."); mode = "play"; stageSet(5);
}
async function ridgeScene() {
  mode = "cine"; world.showRidge = false; codex("navire"); const sh = world.ship.position;
  await cine.play([{ from: [RIDGE[0] - 4, height(RIDGE[0], RIDGE[1]) + 3, RIDGE[1] - 4], to: [RIDGE[0] + 5, height(RIDGE[0], RIDGE[1]) + 4, RIDGE[1] - 2], look: [60, 2, 8], lookTo: [sh.x, 8, sh.z], dur: 6, text: "Du haut de la colline, tu vois le navire. Il est immense. Des chaloupes touchent la plage." }, { from: [CAMP[0] - 12, 12, CAMP[1] - 14], to: [CAMP[0] - 6, 7, CAMP[1] - 8], look: [CAMP[0], 1, CAMP[1]], dur: 5.5, text: "Des tentes, des caisses, un canon. Et un drapeau que personne ici n'a jamais vu." }, { from: [RIDGE[0] + 4, height(RIDGE[0], RIDGE[1]) + 3, RIDGE[1] + 4], look: [RIDGE[0], height(RIDGE[0], RIDGE[1]) + 1.6, RIDGE[1]], dur: 3.5, who: S.name, text: "Il faut repousser cette patrouille avant qu'elle ne marche vers le village." }]);
  mode = "play"; stageSet(3);
}
async function bossIntro() { mode = "cine"; const b = enemies.list.find((e) => e.type === "boss"); if (b) { await cine.play([{ from: [b.x - 8, 3.2, b.z - 8], to: [b.x - 5, 2.4, b.z - 5], look: [b.x, 1.8, b.z], dur: 4.5, who: "Agbo", text: "« Alors c'est toi, le petit que le doyen envoie ? Vois ce que les anciens ne t'ont pas dit… »" }]); } mode = "play"; banner("Agbo le Traître", "Sorcier allié des étrangers"); }

/* ---------- interactions ---------- */
function nearest() {
  let best = null, bd = 3.6; const test = (o, d) => { if (d < bd) { bd = d; best = o; } };
  for (const n of NPCS()) test({ kind: "npc", n }, Math.hypot(n.x - P.x, n.z - P.z));
  for (const sp of Object.values(SPIRITS)) { const sh = world.shrines[sp.id]; test({ kind: "shrine", sp }, Math.hypot(sh.x - P.x, sh.z - P.z) - 0.8); }
  for (const h of world.herbs) if (!h.taken) test({ kind: "herb", h }, Math.hypot(h.x - P.x, h.z - P.z));
  return best;
}
const lbl = (it) => !it ? "" : it.kind === "npc" ? "Parler à " + it.n.name : it.kind === "herb" ? "Cueillir" : (it.sp.classes.includes(S.cls) ? (S.powers[it.sp.power.id] ? "Sanctuaire de " + it.sp.name : "Épreuve de " + it.sp.name) : "Sanctuaire de " + it.sp.name);
async function interact() {
  if (mode !== "play") return; const it = nearest(); if (!it) return; mode = "dialog"; Audio.init();
  try { if (it.kind === "herb") { if (gainItem(S, "herbe")) { it.h.taken = true; it.h.mesh.visible = false; S.herbs.push(it.h.x + "," + it.h.z); Audio.sfxs.pick(); toast("+ Plante médicinale"); addXp(S, 4); } else toast("Inventaire plein."); } else if (it.kind === "npc") await talk(it.n); else await shrine(it.sp); }
  finally { if (mode === "dialog") mode = "play"; }
}
const count = (id) => (S.inv.find((i) => i.id === id) || { n: 0 }).n;
function take(id, n) { const s = S.inv.find((i) => i.id === id); if (!s) return; s.n -= n; if (s.n <= 0) S.inv.splice(S.inv.indexOf(s), 1); }
async function talk(n) {
  const W = (text) => ({ who: n.name, text }); S.talked[n.id] = true; const sp = S.flags.spared;
  if (n.id === "doyen") {
    if (S.stage === 0) {
      const t = { sorcier: "Tu lis les signes. Les Vodun jugeront ton esprit : va au carrefour de Legba, à l'ouest, puis chez Hévioso, au nord-ouest. On ne les combat pas : on passe leurs épreuves.", guerrier: "Ton bras est fort, mais un fer sans âme ne vaut rien. Va à la forge de Gu, au sud-est : il jugera ton geste.", archer: "Tu vois ce que les autres manquent. Va chez Aziza, dans la forêt du sud : elle apprend le silence à ceux qui tirent." }[S.cls];
      await say([W("Te voilà, " + S.name + ". J'ai vu que tu as aperçu le navire."), W("Ils ne viennent pas pour commercer. Ils comptent, ils dessinent, ils observent. Et certains des nôtres, dit-on, leur vendent déjà nos chemins."), W("Il y a longtemps, j'ai eu un élève, Agbo. Le plus doué que j'aie connu. S'il est avec eux… ce serait ma plus grande honte."), W(t), W("Prends ceci. Elle te protégera."), { who: "", text: "Tu reçois l'Amulette de Legba." }]);
      gainItem(S, "amulette"); S.maxhp += 5; S.hp += 5; stageSet(1);
    } else if (S.stage === 1) await say([W("Les esprits t'attendent. Cherche la colonne de lumière au-dessus de leur sanctuaire.")]);
    else if (S.stage === 2) await say([W("Monte sur la colline à l'est. Regarde le navire de tes propres yeux, puis reviens-moi.")]);
    else if (S.stage === 3) await say([W("Des soldats campent sur la plage. Repousse-les, mais ne te laisse pas encercler.")]);
    else if (S.stage === 4) await say([W("Agbo se terre dans sa case, au sud du camp. Méfie-toi : il connaît chaque sort que je lui ai appris.")]);
    else if (S.stage === 5) {
      await say([W("Agbo est tombé ?" + (sp ? " Tu l'as laissé partir… Peut-être as-tu raison. Un homme qui a des regrets peut encore servir." : " Je savais qu'un jour quelqu'un devrait le faire. Que les esprits l'accueillent malgré tout.")), W("Cette carte… trois routes vers Abomey. Ils savent où nous sommes faibles. Le roi doit être prévenu avant que les chaloupes reviennent."), W("Tu partiras à l'aube, " + S.name + ". Nanou t'accompagnera. Rends-toi à Abomey."), { who: "", text: "Fin du chapitre 1 : « L'ombre sur la côte »." }]);
      stageSet(6, true); chapterEnd();
    } else await say([W("Que les esprits guident tes pas. La route d'Abomey t'attend.")]);
    return;
  }
  if (n.id === "marchande") {
    const sd = S.side.herbes || (S.side.herbes = {});
    if (!sd.started) { sd.started = true; await say([W("Mon enfant, tu as l'air fatigué. Si tu me rapportes trois plantes médicinales, je te prépare une tisane des anciens."), W("Ce sont des fleurs roses, dans les buissons autour du village.")]); toast("Quête secondaire : les herbes de Mère Akossiba"); }
    else if (!sd.done) { if (count("herbe") >= 3) { take("herbe", 3); sd.done = true; gainItem(S, "potion"); addXp(S, 45); Audio.sfxs.win(); await say([W("Merci. Voici ta tisane."), W("Mon fils Kossi est parti porter des caisses pour les étrangers, sur la plage. Ils lui paient en pièces. Si tu le croises, dis-lui de rentrer."), { who: "", text: "Tu reçois une Tisane des anciens et 45 XP." }]); } else await say([W("Il me faut encore trois plantes médicinales. " + (count("herbe") + " dans ton sac."))]); }
    else await say([W("Si seulement mon fils revenait de la plage…")]);
    return;
  }
  if (n.id === "forgeron") {
    const sd = S.side.fer || (S.side.fer = {});
    if (!sd.started) { sd.started = true; await say([W("Le fer qu'ils portent est dur, mais il n'a pas de mémoire. Le nôtre se souvient de la main qui l'a forgé."), W("Rapporte-moi deux morceaux de leur acier. Je veux voir comment ils le fondent."), W("Et respire avant de frapper. C'est le secret.")]); toast("Quête secondaire : le fer de Hounsou"); }
    else if (!sd.done) { if (count("fer") >= 2) { take("fer", 2); sd.done = true; gainItem(S, "talisman"); S.maxhp += 10; S.hp += 10; addXp(S, 50); Audio.sfxs.win(); await say([W("Hm. Bon acier, mais cassant. Voilà : un talisman de fer, forgé avec ce que tu m'as apporté."), { who: "", text: "Talisman de fer : +10 PV max, et 50 XP." }]); } else await say([W("Il me faut deux fers d'acier. Les soldats en portent. " + (count("fer") + " dans ton sac."))]); }
    else await say([W("Que ton talisman te garde, " + S.name + ".")]);
    return;
  }
  if (n.id === "enfant") return say([W(S.stage >= 2 ? "On voit le navire de la colline ! Il est plus grand que dix cases ensemble." : "Moi aussi, quand je serai grand, je serai " + (S.cls === "sorcier" ? "Bokɔnɔ" : S.cls === "guerrier" ? "guerrier" : "chasseur") + " comme toi !"), W("Tu sais, le doyen dit que celui qui garde les histoires garde le pays. Je veux être celui qui raconte la tienne.")]);
  if (n.id === "agojie") { codex("agojie"); return say([W("Je m'entraîne avec les guerrières du roi. Garde ce rythme : attaque, esquive, recule. Ne reste jamais immobile devant un fusil."), W("Les touches : ZQSD ou WASD pour te déplacer, Espace pour frapper, 1 et 2 pour tes pouvoirs, H pour te soigner, E pour parler.")]); }
}
async function shrine(sp) {
  codex("vodun"); const mine = sp.classes.includes(S.cls);
  if (!mine) return say([{ who: sp.name, text: "Ce sanctuaire ne répond pas à ta voie. Cherche celui de ton chemin." }]);
  if (S.powers[sp.power.id]) return say([{ who: sp.name, text: "Tu portes déjà mon don. Va, et utilise-le bien." }]);
  if (S.stage < 1) return say([{ who: sp.name, text: "Va d'abord voir le doyen." }]);
  await say([{ who: sp.name + ", " + sp.title, text: sp.intro }]); Audio.init(); mode = "trial"; Audio.setMood("shrine");
  const ok = await runTrial(sp); mode = "dialog";
  if (ok) { S.powers[sp.power.id] = true; S.trials[sp.id] = true; if (S.cls === "sorcier") S.stats.spi += 2; if (S.cls === "guerrier") { S.stats.str += 3; S.maxhp += 15; codex("fer"); } if (S.cls === "archer") S.stats.agi += 3;
    Audio.sfxs.level(); banner("Pouvoir : " + sp.power.name, sp.power.desc); fx.ring(P.x, P.y, P.z, sp.color, 6, 1); await say([{ who: sp.name, text: sp.win }]);
    if (S.stage === 1 && trialsDone()) stageSet(2); else autosave(); }
  else await say([{ who: sp.name, text: sp.lose }]);
}
function chapterEnd() {
  mode = "end"; codex("reliefs"); const big = world.ship.position;
  cine.play([{ from: [-4, 3, 6], to: [-2, 2.5, 2], look: [3, 1.6, -6], dur: 4, text: "À l'aube, tu quitteras Adjahoué avec la carte d'Agbo." }, { from: [60, 9, -6], to: [88, 8, -16], look: [big.x, 7, big.z], dur: 7, text: "Au large, le navire ne bouge pas. Il attend." }]).then(() => {
    $("eT").textContent = "Chapitre 1 terminé"; $("eP").textContent = "« L'ombre sur la côte » · niveau " + S.lv + " · " + S.kills + " ennemis vaincus. Prochain chapitre : « La route d'Abomey »."; $("eB").textContent = "Continuer d'explorer"; $("eB").onclick = () => { UI.noScreen(); mode = "play"; autosave(); }; UI.screen("end"); autosave();
  });
}

/* ---------- menus & screens ---------- */
let menuTab = "stat", prevScreen = "title";
function menuCb() { return { useItem: (i) => { const r = useItem(S, i); if (r === "full") toast("Vie déjà pleine."); else if (r) { toast("+" + r.heal + " PV"); Audio.sfxs.pick(); } UI.renderMenu("inv", S, menuCb()); updateHud(); }, save: () => { S.pos = [P.x, P.z]; return Save.writeSave(S); }, settings: () => { prevScreen = "menu"; UI.screen("settings"); }, toTitle: () => { autosave(); backToTitle(); } }; }
function openMenu() { if (mode !== "play") return; mode = "menu"; UI.screen("menu"); UI.renderMenu(menuTab, S, menuCb()); }
function closeMenu() { UI.noScreen(); mode = "play"; autosave(); }
function backToTitle() { mode = "title"; $("hud").classList.add("hide"); Audio.setMood("title"); $("bCont").disabled = !Save.hasSave(); UI.screen("title"); }
document.querySelectorAll("#mTabs button").forEach((b) => (b.onclick = () => { menuTab = b.dataset.t; Audio.sfxs.click(); UI.renderMenu(menuTab, S, menuCb()); }));
$("mClose").onclick = closeMenu; $("bMenu").onclick = openMenu;
$("bNew").onclick = async () => { Audio.init(); Audio.startMusic("title"); Audio.sfxs.click(); UI.noScreen(); const ok = await playStory().catch(() => false); if (ok) toCreate(); else { UI.screen("prologue"); prologue(); } };
$("bCont").onclick = () => { Audio.init(); const sv = Save.loadSave(); if (sv) { Audio.sfxs.click(); startPlay(sv, false); } };
$("bSet").onclick = () => { Audio.init(); Audio.startMusic("title"); prevScreen = "title"; UI.screen("settings"); };
$("bSetBack").onclick = () => { Save.writeSettings(settings); UI.screen(prevScreen); if (prevScreen === "menu") UI.renderMenu(menuTab, S, menuCb()); };
$("bBack").onclick = () => UI.screen("title"); $("bCont").disabled = !Save.hasSave();
$("sexM").onclick = () => { sex = "m"; $("sexM").classList.add("on"); $("sexF").classList.remove("on"); }; $("sexF").onclick = () => { sex = "f"; $("sexF").classList.add("on"); $("sexM").classList.remove("on"); };
function bindSettings() {
  $("sMusic").value = settings.music; $("sSfx").value = settings.sfx; $("sShadow").value = settings.shadow; $("sSens").value = settings.sens; $("sQual").value = settings.qual;
  $("sMusic").oninput = (e) => { settings.music = +e.target.value; Audio.setVol("music", settings.music / 100); }; $("sSfx").oninput = (e) => { settings.sfx = +e.target.value; Audio.setVol("sfx", settings.sfx / 100); Audio.sfxs.click(); };
  $("sShadow").onchange = (e) => { settings.shadow = +e.target.value; world.sun.castShadow = settings.shadow > 0; if (settings.shadow > 0) { const ms = settings.shadow > 1 ? 4096 : 2048; world.sun.shadow.mapSize.set(ms, ms); if (world.sun.shadow.map) { world.sun.shadow.map.dispose(); world.sun.shadow.map = null; } } scene.traverse((o) => { if (o.material) o.material.needsUpdate = true; }); };
  $("sQual").onchange = (e) => { settings.qual = +e.target.value; post = createPost(renderer, scene, camera, settings.qual); resize(); };
  $("sSens").oninput = (e) => (settings.sens = +e.target.value);
} bindSettings();
let prIdx = 0, prTimer = 0;
function prologue() { prIdx = 0; showPrologue(); }
function showPrologue() { const t = PROLOGUE[prIdx], el = $("prText"); el.textContent = ""; let k = 0; clearInterval(prTimer); prTimer = setInterval(() => { k += 2; el.textContent = t.slice(0, k); if (k >= t.length) clearInterval(prTimer); }, 26); $("prNext").onclick = () => { if (k < t.length) { clearInterval(prTimer); el.textContent = t; k = t.length; return; } Audio.sfxs.click(); prIdx++; if (prIdx >= PROLOGUE.length) toCreate(); else showPrologue(); }; $("prSkip").onclick = () => { clearInterval(prTimer); toCreate(); }; }
function toCreate() { UI.screen("create"); UI.renderCards(chosen, pick); }
function pick(c) { chosen = c; UI.renderCards(chosen, pick); }
$("bStart").onclick = () => { Audio.sfxs.click(); startPlay(newState(chosen, $("hName").value.trim() || "Kofi", sex), true); };

/* ---------- input ---------- */
addEventListener("keydown", (e) => {
  if (e.repeat && e.code !== "Space") return; const k = e.code; keys[k] = true;
  if (mode === "play") { if (k === "Space") { e.preventDefault(); P.attack(ctx); } if (k === "Digit1") P.power(1, ctx); if (k === "Digit2") P.power(2, ctx); if (k === "KeyE") interact(); if (k === "KeyH") quickHeal(); if (k === "Escape" || k === "KeyI") openMenu(); }
  else if (mode === "menu" && k === "Escape") closeMenu(); else if (mode === "trial" && k === "Escape") closeTrial(); else if (mode === "cine" && (k === "Escape" || k === "Enter")) cine.skip();
});
addEventListener("keyup", (e) => (keys[e.code] = false));
function quickHeal() { const i = S.inv.findIndex((x) => ITEMS[x.id].heal); if (i < 0) return toast("Aucun soin dans ton inventaire."); const r = useItem(S, i); if (r === "full") toast("Vie déjà pleine."); else { toast("+" + r.heal + " PV"); Audio.sfxs.pick(); } }
$("tHeal").onclick = () => mode === "play" && quickHeal(); $("tAtk").onclick = () => mode === "play" && P.attack(ctx); $("tAct").onclick = interact; $("tP1").onclick = () => mode === "play" && P.power(1, ctx); $("tP2").onclick = () => mode === "play" && P.power(2, ctx);
canvas.addEventListener("pointerdown", (e) => { canvas.setPointerCapture(e.pointerId); Audio.init(); if (e.pointerType === "touch" && e.clientX < innerWidth * 0.42 && joy.id === null) joy = { id: e.pointerId, ox: e.clientX, oy: e.clientY, x: 0, y: 0 }; else if (look.id === null) look = { id: e.pointerId, moved: 0, t: performance.now(), x: e.clientX, y: e.clientY, mouse: e.pointerType === "mouse" }; });
canvas.addEventListener("pointermove", (e) => {
  if (e.pointerId === joy.id) { const dx = e.clientX - joy.ox, dy = e.clientY - joy.oy, d = Math.min(1, Math.hypot(dx, dy) / 55), a = Math.atan2(dy, dx); joy.x = Math.cos(a) * d; joy.y = Math.sin(a) * d; const j = $("joy").firstElementChild; if (j) j.style.transform = `translate(${joy.x * 40}px,${joy.y * 40}px)`; }
  else if (e.pointerId === look.id && (mode === "play" || mode === "dead")) { const dx = e.clientX - look.x, dy = e.clientY - look.y; look.x = e.clientX; look.y = e.clientY; look.moved += Math.abs(dx) + Math.abs(dy); const sens = 0.0045 * settings.sens / 100; camYaw -= dx * sens; camPitch = Math.max(0.05, Math.min(1.25, camPitch + dy * sens)); }
});
const up = (e) => { if (e.pointerId === joy.id) { joy = { id: null, x: 0, y: 0, ox: 0, oy: 0 }; const j = $("joy").firstElementChild; if (j) j.style.transform = ""; } if (e.pointerId === look.id) { if (look.mouse && look.moved < 6 && performance.now() - look.t < 300 && mode === "play") P.attack(ctx); look.id = null; } };
canvas.addEventListener("pointerup", up); canvas.addEventListener("pointercancel", up);
canvas.addEventListener("wheel", (e) => { e.preventDefault(); camDist = Math.max(4, Math.min(14, camDist + e.deltaY * 0.01)); }, { passive: false });

/* ---------- hud ---------- */
let hudT = 0;
function updateHud() { const q = STAGES[Math.min(S.stage, STAGES.length - 1)], o = objective(); let dist = 0, ang = 0; if (o) { const dx = o[0] - P.x, dz = o[1] - P.z; dist = Math.hypot(dx, dz); const target = Math.atan2(dx, dz), face = Math.atan2(-Math.sin(camYaw), -Math.cos(camYaw)); ang = -(target - face); } UI.hud(S, q, dist, ang); UI.powersBar(S, P.cd); }
function updateMusic(dt) {
  moodT -= dt; if (moodT > 0 || !S) return; moodT = 0.6; let m = "explore"; const dv = Math.hypot(P.x, P.z);
  const hot = enemies.list.filter((e) => !e.dead && e.state === "chase"); if (hot.some((e) => e.type === "boss")) m = "boss"; else if (hot.length) m = "combat"; else if (mode === "trial" || Object.values(world.shrines).some((s) => Math.hypot(s.x - P.x, s.z - P.z) < 10)) m = "shrine"; else if (dv < 26) m = "village";
  if (mode === "cine") m = "cine"; if (m !== musicMood) { musicMood = m; Audio.setMood(m); } Audio.setAmbience(smooth(40, 85, P.x));
}

/* ---------- main loop ---------- */
let last = performance.now(), T = 0;
function frame(now) {
  requestAnimationFrame(frame); const dt = Math.min(0.05, (now - last) / 1000); last = now; T += dt; world.update(T); post.grade && (post.grade.uniforms.time.value = T);
  if (S && (mode !== "title")) for (const n of NPCS()) { const dx = P.x - n.x, dz = P.z - n.z, d = Math.hypot(dx, dz); let lk = 0; if (d < 9) { const want = Math.atan2(dx, dz); let df = want - n.char.root.rotation.y; df = Math.atan2(Math.sin(df), Math.cos(df)); n.char.root.rotation.y += df * Math.min(1, dt * 2.5) * (d < 5 ? 1 : 0.3); lk = Math.max(-0.7, Math.min(0.7, df)); } animChar(n.char, dt, 0, { look: lk }); }
  else for (const n of NPCS()) animChar(n.char, dt, 0, {});
  for (const f of scripted) f(dt); if (moreau) animChar(moreau, dt, 0, { look: 0 });
  dust.update(dt, camera.position.x, camera.position.y, camera.position.z); embers.update(dt);
  if (mode === "title" || mode === "prologue" || mode === "create" || mode === "settings") { orbit += dt * 0.05; camera.position.set(Math.cos(orbit) * 34, 12 + Math.sin(orbit * 2) * 2, Math.sin(orbit) * 34 - 8); camera.lookAt(0, 3, -4); world.followSun(0, 0); world.sky.position.copy(camera.position); render(dt); return; }
  if (!S) return;
  if (cine.active) { cine.update(dt); fx.update(dt); world.followSun(camera.position.x, camera.position.z); world.sky.position.copy(camera.position); P.update(dt, { mx: 0, mz: 0, run: false }, world, ctx); enemies.update(0, ctx); updateMusic(dt); render(dt); return; }
  if (mode === "play") {
    S.playtime += dt; let ix = 0, iz = 0; if (keys.KeyW || keys.ArrowUp) iz += 1; if (keys.KeyS || keys.ArrowDown) iz -= 1; if (keys.KeyD || keys.ArrowRight) ix += 1; if (keys.KeyA || keys.ArrowLeft) ix -= 1; ix += joy.x; iz -= joy.y;
    const fx_ = -Math.sin(camYaw), fz_ = -Math.cos(camYaw), rx = Math.cos(camYaw), rz = -Math.sin(camYaw); inp.mx = fx_ * iz + rx * ix; inp.mz = fz_ * iz + rz * ix; inp.run = !!(keys.ShiftLeft || keys.ShiftRight);
    P.update(dt, inp, world, ctx); enemies.update(dt, ctx); shots.update(dt, { enemies: enemies.list, player: P, world, fx, onEnemyHit, onPlayerHit: ctx.onPlayerHit });
    if (S.hp <= 0) die(); S.hp = Math.min(S.maxhp, S.hp + dt * 0.4);
    if (S.stage === 2 && Math.hypot(P.x - RIDGE[0], P.z - RIDGE[1]) < 5) ridgeScene();
    if (S.stage === 4 && !S.flags.bossSeen && Math.hypot(P.x - LAIR[0], P.z - LAIR[1]) < 17) { S.flags.bossSeen = true; bossIntro(); }
    if (Math.hypot(P.x, P.z + 27) < 9) codex("reliefs");
    const it = nearest(); UI.prompt(it ? (coarse ? lbl(it) : "[E] " + lbl(it)) : "");
    hudT -= dt; if (hudT <= 0) { hudT = 0.1; updateHud(); } saveTimer += dt; if (saveTimer > 45) { saveTimer = 0; autosave(); }
  } else if (mode === "dialog" || mode === "trial") { P.update(dt, { mx: 0, mz: 0, run: false }, world, ctx); enemies.update(0, ctx); UI.prompt(""); }
  fx.update(dt); updateMusic(dt);
  const ty = P.y + 1.6, tx = P.x, tz = P.z, cp = Math.cos(camPitch);
  let cx = tx + Math.sin(camYaw) * cp * camDist, cz = tz + Math.cos(camYaw) * cp * camDist, cy = ty + Math.sin(camPitch) * camDist; const gy = height(cx, cz) + 0.8; if (cy < gy) cy = gy;
  camera.position.lerp(new THREE.Vector3(cx, cy, cz), Math.min(1, dt * 14)); shake = Math.max(0, shake - dt * 1.4); if (shake > 0) camera.position.add(new THREE.Vector3((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake) .multiplyScalar(0.5)); camera.lookAt(tx, ty, tz); world.followSun(P.x, P.z); world.sky.position.copy(camera.position);
  render(dt);
}
function render(dt) { if (post.composer) post.composer.render(dt); else renderer.render(scene, camera); }
requestAnimationFrame(frame);
window.__g = { get S() { return S; }, get P() { return P; }, enemies, world, fx, startPlay, newState, stageSet, say, get mode() { return mode; }, set mode(m) { mode = m; }, interact, camera, cine, scene, get post() { return post; }, ridgeScene, patrolDone, bossIntro };
