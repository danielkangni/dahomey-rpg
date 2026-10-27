import * as THREE from "three";
import { SPIRITS } from "./data.js";
import { tex, pbr, boxUV, rng, smooth as sm, canvasTex, addWind, windU, manager } from "./assets.js";
import { buildFoliage } from "./foliage.js";
import { fonHouse, granary, mudWall, reliefPanel, jar, drumProp, stall, fire, buildShip } from "./buildings.js";
import { NPC } from "./presets.js";
import { cloth } from "./characters.js";

export const VILLAGE = [0, 0], RIDGE = [52, 6], CAMP = [76, 8], LAIR = [66, -24], SEA_LEVEL = -0.7;
const FLAT = [[...SPIRITS.legba.pos, 8, 0.4], [...SPIRITS.hevioso.pos, 8, 1.2], [...SPIRITS.gu.pos, 8, 0.3], [...SPIRITS.aziza.pos, 8, 0.3], [CAMP[0], CAMP[1], 12, 0.3], [LAIR[0], LAIR[1], 9, 0.2]];
export function height(x, z) {
  let h = Math.sin(x * 0.05) * Math.cos(z * 0.045) * 1.5 + Math.sin(x * 0.13 + z * 0.09) * 0.55 + Math.cos(z * 0.11 - x * 0.04) * 0.4 + Math.sin(x * 0.31 + z * 0.23) * 0.12;
  h *= sm(12, 32, Math.hypot(x, z)); h -= sm(66, 94, x) * 3.6; h += 3.2 * Math.exp(-((x - RIDGE[0]) ** 2 + (z - RIDGE[1]) ** 2) / 150);
  for (const f of FLAT) { const w = 1 - sm(f[2], f[2] + 8, Math.hypot(x - f[0], z - f[1])); h = h * (1 - w) + f[3] * w; }
  return h;
}
const PATHS = [[[0, 0], [26, 3], RIDGE, CAMP], [[0, 0], [-20, 12], SPIRITS.legba.pos], [[0, 0], [-14, -24], SPIRITS.hevioso.pos], [[0, 0], [18, -20], SPIRITS.gu.pos], [[0, 0], [-6, 30], SPIRITS.aziza.pos], [CAMP, [72, -8], LAIR]];
function segDist(px, pz, a, b) { const dx = b[0] - a[0], dz = b[1] - a[1], t = Math.max(0, Math.min(1, ((px - a[0]) * dx + (pz - a[1]) * dz) / (dx * dx + dz * dz))); return Math.hypot(px - (a[0] + dx * t), pz - (a[1] + dz * t)); }
export function pathDist(x, z) { let d = 99; for (const p of PATHS) for (let i = 0; i < p.length - 1; i++) d = Math.min(d, segDist(x, z, p[i], p[i + 1])); return d; }
const L = (x, z, f) => ({ x, z, y: height(x, z), ...f });

export function buildWorld(scene, renderer, shadowLevel) {
  const W = { colliders: [], npcs: [], shrines: {}, herbs: [], fires: [], soldierSpawns: [[72, 3], [80, 13], [75, 16], [81, 3], [69, 13], [83, 9]], bossSpawn: [LAIR[0], LAIR[1] + 5], upd: [] };
  const R = rng(11), addC = (x, z, r) => W.colliders.push({ x, z, r });

  /* ---------- light & sky (HDRI image-based lighting) ---------- */
  const hemi = new THREE.HemisphereLight(0xbcd4ff, 0x8a6a40, 0.35); scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xffd9a0, 3.4); sun.position.set(40, 38, 24); sun.castShadow = shadowLevel > 0;
  const ms = shadowLevel > 1 ? 4096 : 2048; sun.shadow.mapSize.set(ms, ms); Object.assign(sun.shadow.camera, { left: -30, right: 30, top: 30, bottom: -30, near: 1, far: 140 }); sun.shadow.bias = -0.0003; sun.shadow.normalBias = 0.04; sun.shadow.radius = 3;
  scene.add(sun, sun.target); W.sun = sun; W.hemi = hemi;
  const sky = new THREE.Mesh(new THREE.SphereGeometry(450, 32, 20), new THREE.MeshBasicMaterial({ side: THREE.BackSide, depthWrite: false, fog: false, color: 0x9ec0e8 })); scene.add(sky); W.sky = sky;
  const pm = new THREE.PMREMGenerator(renderer); W.skies = {};
  W.setSky = (k) => { const s = W.skies[k]; if (!s) return; sky.material.map = s.tex; sky.material.color.set(0xffffff); sky.material.needsUpdate = true; scene.environment = s.env; W.curSky = k; };
  const loadSky = (k, f) => new THREE.TextureLoader(manager).load(f, (t) => { t.colorSpace = THREE.SRGBColorSpace; t.mapping = THREE.EquirectangularReflectionMapping; W.skies[k] = { tex: t, env: pm.fromEquirectangular(t).texture }; if (!W.curSky) W.setSky(k); });
  loadSky("day", "assets/hdri/kloofendal_43d_clear_puresky.jpg"); loadSky("dusk", "assets/hdri/belfast_sunset_puresky.jpg"); loadSky("gold", "assets/hdri/kiara_8_sunset.jpg");
  scene.fog = new THREE.FogExp2(0xe8cf9f, 0.0042); W.fogDay = new THREE.Color(0xe8d2a6);

  /* ---------- terrain with 4-way texture splatting ---------- */
  const SX = 240, SZ = 200, NX = 180, NZ = 150, geo = new THREE.PlaneGeometry(SX, SZ, NX, NZ); geo.rotateX(-Math.PI / 2); geo.translate(15, 0, 0);
  const pos = geo.attributes.position, wts = new Float32Array(pos.count * 4);
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getZ(i), h = height(x, z); pos.setY(i, h);
    const pd = pathDist(x, z), vd = Math.hypot(x, z); let g = 1, e = 0, s = 0, d = 0;
    d = sm(30, 95, vd) * 0.35 * (0.6 + 0.4 * Math.sin(x * 0.07 + z * 0.05)); g -= d;
    s = Math.max(sm(0.35, -0.45, h), sm(80, 91, x)); g -= s; e = (1 - sm(1.0, 3.4, pd)) * 0.8 + (1 - sm(11, 16, vd)) * 0.5; e = Math.min(1, e); g = Math.max(0, g - e); s = Math.max(0, s - e * 0.5); d = Math.max(0, d - e * 0.5);
    const n = g + e + s + d || 1; wts[i * 4] = g / n; wts[i * 4 + 1] = e / n; wts[i * 4 + 2] = s / n; wts[i * 4 + 3] = d / n;
  }
  geo.setAttribute("wts", new THREE.BufferAttribute(wts, 4)); geo.computeVertexNormals();
  const tm = new THREE.MeshStandardMaterial({ roughness: 1, metalness: 0 });
  tm.onBeforeCompile = (sh) => {
    sh.uniforms.tG = { value: tex("grass_ground", "diff") }; sh.uniforms.tE = { value: tex("red_laterite_soil_stones", "diff") }; sh.uniforms.tS = { value: tex("coast_sand_01", "diff") }; sh.uniforms.tD = { value: tex("dry_ground_01", "diff") };
    sh.vertexShader = sh.vertexShader.replace("#include <common>", "#include <common>\nattribute vec4 wts;\nvarying vec4 vW;\nvarying vec3 vWP;").replace("#include <begin_vertex>", "#include <begin_vertex>\nvW=wts;\nvWP=(modelMatrix*vec4(transformed,1.0)).xyz;");
    sh.fragmentShader = sh.fragmentShader.replace("#include <common>", "#include <common>\nuniform sampler2D tG;uniform sampler2D tE;uniform sampler2D tS;uniform sampler2D tD;\nvarying vec4 vW;varying vec3 vWP;\nvec3 trip(sampler2D t,vec2 p){return mix(texture2D(t,p*0.23).rgb,texture2D(t,p*0.047+vec2(.37,.11)).rgb,0.5);}")
      .replace("#include <map_fragment>", "vec2 pp=vWP.xz; vec4 w=vW; vec3 col=trip(tG,pp)*w.x+trip(tE,pp)*w.y*1.05+trip(tS,pp)*w.z+trip(tD,pp)*w.w; diffuseColor.rgb*=col*vec3(1.1,1.08,0.98);");
  };
  const ground = new THREE.Mesh(geo, tm); ground.receiveShadow = true; scene.add(ground);

  /* sea: animated normal map + foam on the shore */
  const waveN = canvasTex(256, 256, (g, w, h) => { const im = g.createImageData(w, h); const f = (x, y) => Math.sin(x * 0.12) * Math.cos(y * 0.1) + Math.sin(x * 0.31 + y * 0.17) * 0.5 + Math.cos(y * 0.23 - x * 0.19) * 0.4; for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const dx = f(x + 1, y) - f(x - 1, y), dy = f(x, y + 1) - f(x, y - 1); const i = (y * w + x) * 4; im.data[i] = 128 + dx * 40; im.data[i + 1] = 128 + dy * 40; im.data[i + 2] = 255; im.data[i + 3] = 255; } g.putImageData(im, 0, 0); }, false);
  waveN.wrapS = waveN.wrapT = THREE.RepeatWrapping; waveN.repeat.set(26, 34);
  const sea = new THREE.Mesh(new THREE.PlaneGeometry(520, 700), new THREE.MeshStandardMaterial({ color: 0x1f8aa0, roughness: 0.12, metalness: 0.25, normalMap: waveN, normalScale: new THREE.Vector2(0.28, 0.28), transparent: true, opacity: 0.9 })); sea.rotation.x = -Math.PI / 2; sea.position.set(335, SEA_LEVEL, 0); scene.add(sea);
  const foamT = canvasTex(256, 64, (g, w, h) => { g.clearRect(0, 0, w, h); for (let i = 0; i < 400; i++) { g.fillStyle = `rgba(255,255,255,${Math.random() * 0.5})`; g.beginPath(); g.arc(Math.random() * w, Math.random() * h, 1 + Math.random() * 4, 0, 6.28); g.fill(); } });
  foamT.wrapS = foamT.wrapT = THREE.RepeatWrapping; foamT.repeat.set(1, 18); const foam = new THREE.Mesh(new THREE.PlaneGeometry(5, 200), new THREE.MeshBasicMaterial({ map: foamT, transparent: true, depthWrite: false, opacity: 0.8 })); foam.rotation.x = -Math.PI / 2; foam.position.set(86.5, SEA_LEVEL + 0.04, 0); scene.add(foam);
  W.upd.push((t) => { waveN.offset.set(t * 0.012, t * 0.008); foam.position.x = 86.5 + Math.sin(t * 0.7) * 1.4; foam.material.opacity = 0.55 + Math.sin(t * 0.7) * 0.3; sea.position.y = SEA_LEVEL + Math.sin(t * 0.9) * 0.06; });

  /* ---------- foliage ---------- */
  const keep = (x, z) => { if (Math.hypot(x, z) < 20 || pathDist(x, z) < 4 || height(x, z) < -0.1 || x > 86) return false; for (const f of FLAT) if (Math.hypot(x - f[0], z - f[1]) < f[2] + 2) return false; if (z < -22 && z > -34 && Math.abs(x) < 16) return false; return Math.hypot(x - RIDGE[0], z - RIDGE[1]) > 6; };
  buildFoliage(scene, { R, keep, height, pathDist, addC });

  /* ---------- village: Fon houses, granaries, compound walls ---------- */
  const place = (g, x, z, ry = 0) => { g.position.set(x, height(x, z), z); g.rotation.y = ry; scene.add(g); return g; };
  const houses = [[11, 4, 0.2, 6, 4.2, ["lion"]], [-12, 3, 2.9, 6.4, 4.4, ["shark"]], [8, 13, 3.6, 5.6, 4, null], [-8, 13, 2.3, 6, 4.2, ["buffalo"]], [14, -9, 1.6, 5.4, 4, null], [-13, -8, 4.2, 6, 4, ["sun"]], [2, 17, 3.14, 5.6, 4.2, null], [-3, -14, 0, 5.4, 3.8, null]];
  const tints = [0xe0b98a, 0xd9a878, 0xe8cfa0, 0xc9936a, 0xe2c08e];
  houses.forEach(([x, z, ry, w, d, rel], i) => { const g = new THREE.Group(); fonHouse(g, { w, d, relief: rel, tint: tints[i % tints.length] }); place(g, x, z, ry); const c = Math.cos(ry), s = Math.sin(ry); for (const k of [-1.7, 0, 1.7]) addC(x + c * k * (w / 6) * 1.0 + s * 0, z - s * k * (w / 6), 2.1); });
  for (const [x, z] of [[17, 10], [-18, 9], [-17, -12], [18, -16]]) { const g = new THREE.Group(); granary(g); place(g, x, z, 0); addC(x, z, 1.5); }
  for (const [x, z, ry, len] of [[10, -2, 0.1, 9], [-10, -2, -0.2, 8], [3, 10, 1.57, 8]]) { const g = new THREE.Group(); mudWall(g, len); place(g, x, z, ry); }
  // central silk-cotton tree is built in foliage; fire pit, drum, market
  { const g = new THREE.Group(); const f = fire(g); place(g, 4, 3); addC(4, 3, 1.1); const L1 = new THREE.PointLight(0xff9a3a, 22, 16, 2); L1.position.set(4, height(4, 3) + 1.2, 3); scene.add(L1); W.fires.push({ light: L1, flame: f.userData.flame, core: f.userData.core, x: 4, y: height(4, 3), z: 3 }); }
  { const d = drumProp(); place(d, 6.5, 1.8); addC(6.5, 1.8, 0.5); const d2 = drumProp(); d2.scale.setScalar(0.75); place(d2, 7.4, 3.2); addC(7.4, 3.2, 0.4); }
  for (const [x, z, c, ry] of [[-9, 6.5, 0xb02a2a, 0.2], [-12.5, 1.5, 0x2b3a8c, -0.4], [9, 8.5, 0xe0a93b, 3.3]]) { place(stall(c), x, z, ry); addC(x, z, 1.6); }
  for (const [x, z] of [[-6.4, 8.3], [5, -5.5], [-14.2, -4.2], [12.2, 1.4]]) { const j = jar(0.3 + R() * 0.15); place(j, x, z); addC(x, z, 0.4); }
  // palace wall with bas-reliefs (north)
  { const kinds = ["lion", "shark", "sun", "buffalo", "bird"], base = pbr("red_laterite_soil_stones", 3, { color: 0xb86f45 });
    for (let i = 0; i < 5; i++) { const x = -13 + i * 6.5, z = -28 - Math.abs(i - 2) * 0.5, g = new THREE.Group(); const w = new THREE.Mesh(boxUV(6.4, 3.8, 0.8, 3), base); w.position.y = 1.9; w.castShadow = true; w.receiveShadow = true; g.add(w); const p = reliefPanel(kinds[i], 2.4, 3.0); p.position.set(0, 2.0, 0.45); g.add(p); const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 6.5, 8), pbr("thatch_roof_angled", 2, { color: 0xc8b078 })); cap.rotation.z = Math.PI / 2; cap.position.y = 4.0; cap.castShadow = true; g.add(cap); place(g, x, z); for (let k = -2; k <= 2; k++) addC(x + k * 1.25, z, 0.9); }
    const gate = new THREE.Group(); for (const s of [-1, 1]) { const po = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.4, 4.6, 8), pbr("dark_wood", 1.5, { color: 0x7a5a38 })); po.position.set(s * 2.2, 2.3, 0); po.castShadow = true; gate.add(po); } place(gate, 0, -24.5); }
  // herbs
  for (const [x, z] of [[-6, -9], [9, -12], [-16, 6], [14, 14], [-3, 19], [20, -4]]) { const y = height(x, z), b = new THREE.Group(); b.position.set(x, y, z); const bm = new THREE.MeshStandardMaterial({ color: 0x3b7a30, roughness: 0.9 }); for (let i = 0; i < 7; i++) { const l = new THREE.Mesh(new THREE.SphereGeometry(0.3, 6, 5), bm); l.scale.set(0.5, 1, 0.12); l.position.set(Math.cos(i * 0.9) * 0.28, 0.32, Math.sin(i * 0.9) * 0.28); l.rotation.set(Math.sin(i) * 0.5, i, Math.cos(i) * 0.5); l.castShadow = true; b.add(l); } for (let i = 0; i < 5; i++) { const f = new THREE.Mesh(new THREE.SphereGeometry(0.07, 6, 5), new THREE.MeshStandardMaterial({ color: 0xe85a9b, emissive: 0x55102a })); f.position.set(Math.cos(i * 1.4) * 0.3, 0.7 + i * 0.03, Math.sin(i * 1.4) * 0.3); b.add(f); } const glow = new THREE.Mesh(new THREE.RingGeometry(0.5, 0.62, 20), new THREE.MeshBasicMaterial({ color: 0xffe08a, transparent: true, opacity: 0.5, side: THREE.DoubleSide })); glow.rotation.x = -Math.PI / 2; glow.position.y = 0.05; b.add(glow); scene.add(b); W.herbs.push({ x, z, mesh: b, taken: false }); }

  /* ---------- NPCs (articulated characters) ---------- */
  const npc = (id, name, x, z, make, face = 0, look = 0) => { const c = make(); const y = height(x, z); c.root.position.set(x, y, z); c.root.rotation.y = face; scene.add(c.root); addC(x, z, 0.6); const n = { id, name, x, z, y, char: c, mesh: c.root, face }; W.npcs.push(n); return n; };
  npc("doyen", "Doyen Adjovi", 3, -6, NPC.doyen, -2.4); npc("enfant", "Tèwi", -6, 9, NPC.enfant, 0.6); npc("marchande", "Mère Akossiba", -9.5, 8.6, NPC.marchande, 2.8); npc("forgeron", "Hounsou", 10, 6.5, NPC.forgeron, 3.6); npc("agojie", "Nanou", 8, -9.5, NPC.agojie, -2.2);

  /* ---------- shrines ---------- */
  const stoneM = pbr("red_laterite_soil_stones", 2, { color: 0xb8a48a }), woodM = pbr("dark_wood", 1.5, { color: 0x7a5a38 }), clayM = new THREE.MeshStandardMaterial({ color: 0xa8402a, roughness: 0.9 });
  function shrine(id, build) { const s = SPIRITS[id], y = height(s.pos[0], s.pos[1]), g = new THREE.Group(); g.position.set(s.pos[0], y, s.pos[1]); scene.add(g);
    for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2, st = new THREE.Mesh(new THREE.DodecahedronGeometry(0.55 + (i % 3) * 0.12, 0), stoneM); st.scale.set(1, 1.1 + (i % 2) * 0.5, 0.8); st.position.set(Math.cos(a) * 4.2, 0.5, Math.sin(a) * 4.2); st.rotation.y = a; st.castShadow = true; st.receiveShadow = true; g.add(st); }
    const ring = new THREE.Mesh(new THREE.TorusGeometry(2.4, 0.07, 6, 40), new THREE.MeshBasicMaterial({ color: s.color })); ring.rotation.x = Math.PI / 2; ring.position.y = 0.15; g.add(ring);
    const Lg = new THREE.PointLight(s.color, 14, 16, 2); Lg.position.y = 2.6; g.add(Lg); build(g, s); const beacon = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 40, 6, 1, true), new THREE.MeshBasicMaterial({ color: s.color, transparent: true, opacity: 0.22, side: THREE.DoubleSide, depthWrite: false })); beacon.position.y = 20; g.add(beacon);
    W.upd.push((t) => { ring.scale.setScalar(1 + Math.sin(t * 2) * 0.05); beacon.material.opacity = 0.16 + Math.sin(t * 1.5) * 0.06; }); W.shrines[id] = { id, x: s.pos[0], z: s.pos[1], y, g }; addC(s.pos[0], s.pos[1], 1.3); }
  shrine("legba", (g) => { const b = new THREE.Mesh(new THREE.LatheGeometry([[0.001, 0], [0.5, 0.05], [0.55, 0.6], [0.4, 1.4], [0.42, 1.9], [0.3, 2.2], [0.34, 2.5], [0.001, 2.7]].map(([a, b2]) => new THREE.Vector2(a, b2)), 14), clayM); b.castShadow = true; g.add(b); for (const s of [-1, 1]) { const e = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 6), new THREE.MeshStandardMaterial({ color: 0xf4efe0 })); e.scale.set(1.3, 0.8, 0.8); e.position.set(s * 0.14, 2.3, 0.27); g.add(e); } for (let i = 0; i < 12; i++) { const c = new THREE.Mesh(new THREE.SphereGeometry(0.05, 6, 5), new THREE.MeshStandardMaterial({ color: 0xf4efe0 })); c.scale.set(1, 1.4, 0.7); const a = i / 12 * 6.28; c.position.set(Math.cos(a) * 0.5, 1.2, Math.sin(a) * 0.5 + 0.05); g.add(c); } const bowl = jar(0.25); bowl.position.set(1.4, 0, 0.8); g.add(bowl); const bowl2 = jar(0.2); bowl2.position.set(-1.3, 0, 1.0); g.add(bowl2); });
  shrine("hevioso", (g) => { const p = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.22, 3.4, 8), woodM); p.position.y = 1.7; p.castShadow = true; g.add(p); const sk = new THREE.Mesh(new THREE.SphereGeometry(0.28, 10, 8), new THREE.MeshStandardMaterial({ color: 0xe8e0c8, roughness: 0.8 })); sk.scale.set(1, 1.2, 1.3); sk.position.set(0, 3.5, 0.1); g.add(sk); for (const s of [-1, 1]) { const hn = new THREE.Mesh(new THREE.TorusGeometry(0.4, 0.07, 6, 14, Math.PI * 1.3), new THREE.MeshStandardMaterial({ color: 0xd8d0b8 })); hn.position.set(s * 0.32, 3.7, 0.0); hn.rotation.set(0, Math.PI / 2, s * 1.3); g.add(hn); } const rb = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.12, 0.02), cloth("stripes", "#b02a2a", "#f2eee0", "#e0a93b")); rb.position.set(0, 2.6, 0.2); g.add(rb); for (let i = 0; i < 3; i++) { const d = drumProp(); d.position.set(Math.cos(i * 2.1 + 0.5) * 2.8, 0, Math.sin(i * 2.1 + 0.5) * 2.8); g.add(d); } });
  shrine("gu", (g) => { const an = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.5, 0.5), new THREE.MeshStandardMaterial({ color: 0x2a2d33, metalness: 0.8, roughness: 0.35 })); an.position.y = 0.95; const bs = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.4, 0.7, 8), woodM); bs.position.y = 0.35; g.add(an, bs); const fl = new THREE.Mesh(new THREE.ConeGeometry(0.4, 1.0, 7), new THREE.MeshBasicMaterial({ color: 0xff7a1a })); fl.position.set(2, 0.5, 0); g.add(fl); W.upd.push((t) => { fl.scale.y = 1 + Math.sin(t * 11) * 0.25; }); for (let i = 0; i < 5; i++) { const sw = new THREE.Mesh(new THREE.BoxGeometry(0.12, 2.2 - i * 0.2, 0.04), new THREE.MeshStandardMaterial({ color: 0xb8bcc6, metalness: 0.85, roughness: 0.3 })); sw.position.set(-2 + (i - 2) * 0.22, 1.4, (i - 2) * 0.1); sw.rotation.z = (i - 2) * 0.15; sw.castShadow = true; g.add(sw); } });
  shrine("aziza", (g) => { const t = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.7, 3.4, 8), woodM); t.position.y = 1.7; t.castShadow = true; g.add(t); const fc = new THREE.Mesh(new THREE.BoxGeometry(0.8, 1.0, 0.5), woodM); fc.position.set(0, 3.1, 0.35); g.add(fc); for (const s of [-1, 1]) { const e = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 6), new THREE.MeshBasicMaterial({ color: 0xbfff80 })); e.position.set(s * 0.2, 3.25, 0.62); g.add(e); } for (let i = 0; i < 8; i++) { const f = new THREE.Mesh(new THREE.SphereGeometry(0.07, 6, 5), new THREE.MeshBasicMaterial({ color: 0xbfff80 })); f.position.set(Math.cos(i) * 2.4, 1.5, Math.sin(i) * 2.4); g.add(f); W.upd.push((tt) => { f.position.y = 1.5 + Math.sin(tt * 2 + i) * 0.6; f.position.x = Math.cos(i + tt * 0.3) * 2.4; f.position.z = Math.sin(i + tt * 0.3) * 2.4; }); } });

  /* ---------- coast: foreign camp, lair, ship ---------- */
  const canvasM = new THREE.MeshStandardMaterial({ color: 0xe8e0c8, roughness: 0.95, side: THREE.DoubleSide });
  { const [cx, cz] = CAMP, g = new THREE.Group(); place(g, cx, cz);
    for (const [dx, dz, r] of [[-5, -4, 0], [4, -5, 0.5], [6, 4, 1], [-6, 5, 0.3], [0, 9, 0]]) { const t = new THREE.Group(); const sh = new THREE.Shape(); sh.moveTo(-2, 0); sh.lineTo(0, 2.6); sh.lineTo(2, 0); sh.closePath(); const tg = new THREE.ExtrudeGeometry(sh, { depth: 4, bevelEnabled: false }); tg.translate(0, 0, -2); const tm2 = new THREE.Mesh(tg, canvasM); tm2.castShadow = true; tm2.receiveShadow = true; t.add(tm2); t.position.set(dx, 0, dz); t.rotation.y = r; g.add(t); addC(cx + dx, cz + dz, 2.2); for (const s of [-1, 1]) { const rope = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 3.2, 3), new THREE.MeshStandardMaterial({ color: 0x6b5a3a })); rope.position.set(s * 2.9, 0.8, 0); rope.rotation.z = s * 0.95; t.add(rope); } }
    const wd = pbr("dark_wood", 1, { color: 0x8a6a48 }); for (const [dx, dz, ry] of [[1, -2, 0.3], [2.2, 1.6, 0.9], [-2, 0, 0.1], [3, -1, 0.5], [-1, 3, 0.2]]) { const b = new THREE.Mesh(boxUV(1.1, 0.9, 1.1, 1), wd); b.position.set(dx, 0.45, dz); b.rotation.y = ry; b.castShadow = true; g.add(b); addC(cx + dx, cz + dz, 0.8); }
    for (let i = 0; i < 4; i++) { const br = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 0.9, 10), wd); br.position.set(-3.5 + i * 0.5, 0.45, 5.5); br.castShadow = true; g.add(br); }
    // field gun
    const gun = new THREE.Group(); const brl = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.22, 2.2, 10), new THREE.MeshStandardMaterial({ color: 0x3a3a40, metalness: 0.85, roughness: 0.35 })); brl.rotation.x = Math.PI / 2 - 0.15; brl.position.y = 1.0; brl.castShadow = true; gun.add(brl); for (const s of [-1, 1]) { const wh = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.07, 6, 16), wd); wh.rotation.y = Math.PI / 2; wh.position.set(s * 0.6, 0.55, 0); gun.add(wh); } gun.position.set(-3.5, 0, -1); gun.rotation.y = 0.9; g.add(gun); addC(cx - 3.5, cz - 1, 1.2);
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, 7, 6), wd); pole.position.set(-1, 3.5, 0); g.add(pole); const flag = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 1.4, 10, 1), new THREE.MeshStandardMaterial({ side: THREE.DoubleSide, map: canvasTex(3, 1, (c) => { c.fillStyle = "#2b3a8c"; c.fillRect(0, 0, 1, 1); c.fillStyle = "#f4f0e2"; c.fillRect(1, 0, 1, 1); c.fillStyle = "#b02a2a"; c.fillRect(2, 0, 1, 1); }), roughness: 0.9 })); flag.position.set(0.1, 6.2, 0); g.add(flag); W.upd.push((t) => { const p = flag.geometry.attributes.position; for (let i = 0; i < p.count; i++) p.setZ(i, Math.sin(p.getX(i) * 2.4 - t * 4) * 0.18 * (p.getX(i) + 1.1) / 2.2); p.needsUpdate = true; });
    const f = fire(g); f.position.set(1, 0, 1); const L2 = new THREE.PointLight(0xff9a3a, 18, 14, 2); L2.position.set(cx + 1, height(cx, cz) + 1.2, cz + 1); scene.add(L2); W.fires.push({ light: L2, flame: f.userData.flame, core: f.userData.core, x: cx + 1, y: height(cx, cz), z: cz + 1 });
    // boats on the beach
    for (const dz of [-14, 14]) { const bt = new THREE.Mesh(new THREE.CapsuleGeometry(0.7, 4, 4, 10), pbr("dark_wood", 1.5, { color: 0x6a4a30 })); bt.rotation.z = Math.PI / 2; bt.scale.set(1, 1, 0.55); const bg = new THREE.Group(); bg.add(bt); bt.position.y = 0.45; place(bg, 84, cz + dz, 0.4); } }
  { const [lx, lz] = LAIR, g = new THREE.Group(); place(g, lx, lz); const hut = new THREE.Mesh(new THREE.CylinderGeometry(2.6, 2.7, 2.4, 12), pbr("brown_mud", 2, { color: 0x4a3a30 })); hut.position.y = 1.2; hut.castShadow = true; const rf = new THREE.Mesh(new THREE.ConeGeometry(3.7, 2.6, 12), pbr("thatch_roof_angled", 2, { color: 0x4a4030 })); rf.position.y = 3.6; rf.castShadow = true; g.add(hut, rf);
    for (let i = 0; i < 6; i++) { const a = i / 6 * 6.28; const sk = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 2.1, 5), woodM); sk.position.set(Math.cos(a) * 4.8, 1.05, Math.sin(a) * 4.8); const o = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 6), new THREE.MeshBasicMaterial({ color: 0xff3a2a })); o.position.set(sk.position.x, 2.2, sk.position.z); g.add(sk, o); }
    const Lr = new THREE.PointLight(0xff2a1a, 16, 18, 2); Lr.position.y = 2.2; g.add(Lr); addC(lx, lz, 3); }
  { const ship = buildShip(); ship.position.set(128, SEA_LEVEL, -22); ship.rotation.y = 0.5; scene.add(ship); W.ship = ship; W.upd.push((t) => { ship.position.y = SEA_LEVEL + Math.sin(t * 0.8) * 0.4; ship.rotation.z = Math.sin(t * 0.7) * 0.03; ship.rotation.x = Math.sin(t * 0.55) * 0.015; const f = ship.userData.flag.geometry.attributes.position; for (let i = 0; i < f.count; i++) f.setZ(i, Math.sin(f.getX(i) * 2.2 - t * 5) * 0.2); f.needsUpdate = true; }); }
  { const y = height(RIDGE[0], RIDGE[1]), m = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 40, 6, 1, true), new THREE.MeshBasicMaterial({ color: 0xe0a93b, transparent: true, opacity: 0.35, side: THREE.DoubleSide, depthWrite: false })); m.position.set(RIDGE[0], y + 20, RIDGE[1]); scene.add(m); W.ridgeMarker = m; W.upd.push(() => { m.visible = W.showRidge !== false; }); }

  W.update = (t) => { windU.value = t; for (const f of W.upd) f(t); for (const f of W.fires) { f.light.intensity = 17 + Math.sin(t * 9 + f.x) * 3 + Math.sin(t * 17) * 1.5; f.flame.scale.set(1 + Math.sin(t * 8) * 0.1, 1 + Math.sin(t * 12 + f.x) * 0.22, 1); f.core.scale.y = 1 + Math.sin(t * 15) * 0.25; } for (const n of W.npcs) n.char.root.userData; };
  W.followSun = (x, z) => { sun.position.set(x + 45, 34, z + 28); sun.target.position.set(x, 0, z); };
  W.setMood = (k) => { const m = { day: { sun: 0xfff0d0, i: 3.0, fog: 0xdfe6e8, d: 0.0036, exp: 1.0 }, gold: { sun: 0xffc486, i: 3.6, fog: 0xe8c89a, d: 0.0044, exp: 1.05 }, dusk: { sun: 0xff9a5a, i: 2.4, fog: 0xc89a8a, d: 0.005, exp: 1.0 } }[k]; sun.color.setHex(m.sun); sun.intensity = m.i; scene.fog.color.setHex(m.fog); scene.fog.density = m.d; W.setSky(k); };
  return W;
}
