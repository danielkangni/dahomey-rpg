/* Optional photoreal/AI-made characters: drop <key>.glb files into assets/models/characters/ and they replace the procedural
   ones automatically (see docs/PERSONNAGES.md). Animation clips are matched by name: idle, walk, run, attack, shoot, hit, die. */
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { clone } from "three/addons/utils/SkeletonUtils.js";
import { manager } from "./assets.js";
const KEYS = ["hero_sorcier_m", "hero_sorcier_f", "hero_guerrier_m", "hero_guerrier_f", "hero_archer_m", "hero_archer_f", "doyen", "enfant", "marchande", "forgeron", "agojie", "soldat", "officier", "agbo"];
const cache = new Map(); const loader = new GLTFLoader(manager);
export async function preloadModels() {
  await Promise.all(KEYS.map(async (k) => { try { const r = await fetch(`assets/models/characters/${k}.glb`, { method: "HEAD" }); if (!r.ok) return; const g = await loader.loadAsync(`assets/models/characters/${k}.glb`); cache.set(k, g); } catch (e) {} }));
  return [...cache.keys()];
}
const find = (clips, re) => clips.find((c) => re.test(c.name));
export function glbCharacter(key, targetHeight = 1.75) {
  const g = cache.get(key); if (!g) return null;
  const root = new THREE.Group(), model = clone(g.scene); const box = new THREE.Box3().setFromObject(model), h = box.max.y - box.min.y || 1; model.scale.setScalar(targetHeight / h); model.position.y -= box.min.y * (targetHeight / h); root.add(model);
  model.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; if (o.material) o.material.envMapIntensity = 0.8; } });
  const mixer = new THREE.AnimationMixer(model), clips = g.animations || [], A = {};
  for (const [n, re] of [["idle", /idle|stand|breath/i], ["walk", /walk/i], ["run", /run|jog|sprint/i], ["attack", /attack|slash|strike|sword|punch|cast/i], ["shoot", /shoot|aim|bow|rifle|fire/i], ["hit", /hit|hurt|react|damage/i], ["die", /die|death|fall/i]]) { const c = find(clips, re); if (c) { A[n] = mixer.clipAction(c); if (n === "die" || n === "hit" || n === "attack" || n === "shoot") A[n].setLoop(THREE.LoopOnce, 1), A[n].clampWhenFinished = n === "die"; } }
  A.idle = A.idle || A.walk; const c = { root, glb: { mixer, A, cur: null }, rig: {}, o: {}, t: 0, dead: false, hurtT: 0, atk: 0 }; play(c, "idle", 0); return c;
}
function play(c, name, fade = 0.2) { const G = c.glb, a = G.A[name]; if (!a || G.cur === a) return; if (G.cur) G.cur.fadeOut(fade); a.reset().fadeIn(fade).play(); G.cur = a; }
export function animateGLB(c, dt, speed, st) {
  const G = c.glb; c.t += dt; if (c.dead) { play(c, "die", 0.1); } else if (st.attack > 0.5 && G.A.attack) { if (G.cur !== G.A.attack) { G.A.attack.reset(); } play(c, st.aim && G.A.shoot ? "shoot" : "attack", 0.08); } else if (c.hurtT > 0 && G.A.hit) { play(c, "hit", 0.05); } else if (speed > 5.5 && G.A.run) play(c, "run"); else if (speed > 0.3 && (G.A.walk || G.A.run)) play(c, G.A.walk ? "walk" : "run"); else play(c, "idle");
  if (c.hurtT > 0) c.hurtT -= dt; G.mixer.update(dt);
}
