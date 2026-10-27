import * as THREE from "three";
import { std, box, cyl, sph, makeHuman } from "./models.js";
import { SPIRITS } from "./data.js";

const sm = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
export const VILLAGE = [0, 0], RIDGE = [52, 6], CAMP = [76, 8], LAIR = [66, -24], SEA_LEVEL = -0.7;
const FLAT = [[...SPIRITS.legba.pos, 8, 0.4], [...SPIRITS.hevioso.pos, 8, 1.2], [...SPIRITS.gu.pos, 8, 0.3], [...SPIRITS.aziza.pos, 8, 0.3], [CAMP[0], CAMP[1], 12, 0.3], [LAIR[0], LAIR[1], 9, 0.2]];
export function height(x, z) {
  let h = Math.sin(x * 0.05) * Math.cos(z * 0.045) * 1.5 + Math.sin(x * 0.13 + z * 0.09) * 0.55 + Math.cos(z * 0.11 - x * 0.04) * 0.4;
  h *= sm(12, 32, Math.hypot(x, z));
  h -= sm(66, 94, x) * 3.6;
  h += 3.2 * Math.exp(-((x - RIDGE[0]) ** 2 + (z - RIDGE[1]) ** 2) / 150);
  for (const f of FLAT) { const w = 1 - sm(f[2], f[2] + 8, Math.hypot(x - f[0], z - f[1])); h = h * (1 - w) + f[3] * w; }
  return h;
}
const PATHS = [[[0, 0], [26, 3], RIDGE, CAMP], [[0, 0], [-20, 12], SPIRITS.legba.pos], [[0, 0], [-14, -24], SPIRITS.hevioso.pos], [[0, 0], [18, -20], SPIRITS.gu.pos], [[0, 0], [-6, 30], SPIRITS.aziza.pos], [CAMP, [72, -8], LAIR]];
function segDist(px, pz, a, b) { const dx = b[0] - a[0], dz = b[1] - a[1], t = Math.max(0, Math.min(1, ((px - a[0]) * dx + (pz - a[1]) * dz) / (dx * dx + dz * dz))); return Math.hypot(px - (a[0] + dx * t), pz - (a[1] + dz * t)); }
export function pathDist(x, z) { let d = 99; for (const p of PATHS) for (let i = 0; i < p.length - 1; i++) d = Math.min(d, segDist(x, z, p[i], p[i + 1])); return d; }
function rng(seed) { return () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

export function buildWorld(scene, shadowLevel) {
  const W = { colliders: [], npcs: [], shrines: {}, herbs: [], soldierSpawns: [[72, 3], [80, 13], [75, 16], [81, 3], [69, 13], [83, 9]], bossSpawn: [LAIR[0], LAIR[1] + 5], upd: [] };
  const R = rng(11), addC = (x, z, r) => W.colliders.push({ x, z, r });
  /* ---------- light & sky ---------- */
  const hemi = new THREE.HemisphereLight(0xcfe3ff, 0x8a6a40, 0.85); scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xffe2b0, 2.4); sun.position.set(40, 38, 24); sun.castShadow = shadowLevel > 0;
  const ms = shadowLevel > 1 ? 2048 : 1024; sun.shadow.mapSize.set(ms, ms); Object.assign(sun.shadow.camera, { left: -34, right: 34, top: 34, bottom: -34, near: 1, far: 140 }); sun.shadow.bias = -0.0005; sun.shadow.normalBias = 0.05;
  scene.add(sun, sun.target); W.sun = sun;
  const sky = new THREE.Mesh(new THREE.SphereGeometry(400, 24, 16), new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { top: { value: new THREE.Color(0x2e63a8) }, hor: { value: new THREE.Color(0xf5cf9c) } },
    vertexShader: "varying vec3 p;void main(){p=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}",
    fragmentShader: "uniform vec3 top;uniform vec3 hor;varying vec3 p;void main(){float h=clamp(normalize(p).y*1.6,0.,1.);gl_FragColor=vec4(pow(mix(hor,top,h),vec3(1./2.2)),1.);}" }));
  scene.add(sky); W.sky = sky; scene.fog = new THREE.Fog(0xf0cf9f, 70, 260);
  const sunDisc = new THREE.Mesh(new THREE.SphereGeometry(14, 16, 12), new THREE.MeshBasicMaterial({ color: 0xfff2c8, fog: false })); sunDisc.position.set(260, 150, 150); scene.add(sunDisc); W.sunDisc = sunDisc;

  /* ---------- terrain ---------- */
  const SX = 240, SZ = 200, NX = 150, NZ = 125, geo = new THREE.PlaneGeometry(SX, SZ, NX, NZ); geo.rotateX(-Math.PI / 2); geo.translate(15, 0, 0);
  const pos = geo.attributes.position, col = new Float32Array(pos.count * 3), c = new THREE.Color();
  const grassA = new THREE.Color(0x6e9a3a), grassB = new THREE.Color(0x9ab04d), dry = new THREE.Color(0xb59a52), ochre = new THREE.Color(0xb5651d), sand = new THREE.Color(0xe3c78f), wet = new THREE.Color(0x5b7d33);
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getZ(i), h = height(x, z); pos.setY(i, h);
    const n = (Math.sin(x * 0.31) * Math.cos(z * 0.27) + 1) * 0.5; c.copy(grassA).lerp(grassB, n * 0.8);
    c.lerp(dry, sm(30, 90, Math.hypot(x, z)) * 0.18 * (1 + Math.sin(x * 0.07 + z * 0.05)));
    c.lerp(sand, sm(0.1, -0.5, h) * 0.9 + sm(78, 92, x) * 0.6); if (h < -0.4) c.lerp(wet, 0.3);
    c.lerp(ochre, (1 - sm(1.2, 3.2, pathDist(x, z))) * 0.55);
    c.lerp(ochre, (1 - sm(14, 17, Math.hypot(x, z))) * 0.6 * (1 - sm(14, 17, Math.hypot(x, z)) * 0));
    col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
  }
  geo.setAttribute("color", new THREE.BufferAttribute(col, 3)); geo.computeVertexNormals();
  const ground = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, flatShading: true })); ground.receiveShadow = true; scene.add(ground);
  const sea = new THREE.Mesh(new THREE.PlaneGeometry(500, 500), new THREE.MeshStandardMaterial({ color: 0x2d8fa8, roughness: 0.25, metalness: 0.2, transparent: true, opacity: 0.88 }));
  sea.rotation.x = -Math.PI / 2; sea.position.set(220, SEA_LEVEL, 0); scene.add(sea);

  /* ---------- trees (instanced) ---------- */
  const keep = (x, z) => { if (Math.hypot(x, z) < 19 || pathDist(x, z) < 3.8 || height(x, z) < -0.2 || x > 86) return false; for (const f of FLAT) if (Math.hypot(x - f[0], z - f[1]) < f[2] + 2) return false; return Math.hypot(x - RIDGE[0], z - RIDGE[1]) > 6; };
  const rnd = [], palm = []; let tries = 0;
  while ((rnd.length < 170 || palm.length < 90) && tries++ < 6000) { const x = -95 + R() * 215, z = -95 + R() * 190; if (!keep(x, z)) continue; if (x > 30 && palm.length < 90 && R() < 0.7) palm.push([x, z]); else if (rnd.length < 170) rnd.push([x, z]); }
  const tg = new THREE.CylinderGeometry(0.28, 0.42, 3.4, 6), cg = new THREE.IcosahedronGeometry(2.3, 0), pg = new THREE.CylinderGeometry(0.2, 0.3, 7, 6), pc = new THREE.ConeGeometry(2.6, 1.1, 7);
  const trunkM = std(0x6b4a2b), canM = std(0xffffff), palmM = std(0x7a5d3a), crownM = std(0xffffff);
  const iTr = new THREE.InstancedMesh(tg, trunkM, rnd.length), iCa = new THREE.InstancedMesh(cg, canM, rnd.length), iPt = new THREE.InstancedMesh(pg, palmM, palm.length), iPc = new THREE.InstancedMesh(pc, crownM, palm.length);
  const M4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), sc = new THREE.Vector3(), p3 = new THREE.Vector3(), cc = new THREE.Color();
  rnd.forEach(([x, z], i) => { const y = height(x, z), s = 0.8 + R() * 0.7; q.setFromEuler(e.set(0, R() * 6, 0)); M4.compose(p3.set(x, y + 1.7 * s, z), q, sc.set(s, s, s)); iTr.setMatrixAt(i, M4); M4.compose(p3.set(x, y + 4.2 * s, z), q, sc.set(s * (1 + R() * 0.3), s * 0.9, s)); iCa.setMatrixAt(i, M4); iCa.setColorAt(i, cc.setHSL(0.25 + R() * 0.06, 0.45, 0.28 + R() * 0.1)); addC(x, z, 0.7 * s); });
  palm.forEach(([x, z], i) => { const y = height(x, z), s = 0.8 + R() * 0.5, tilt = (R() - 0.5) * 0.25; q.setFromEuler(e.set(0, R() * 6, tilt)); M4.compose(p3.set(x, y + 3.5 * s, z), q, sc.set(s, s, s)); iPt.setMatrixAt(i, M4); M4.compose(p3.set(x - Math.sin(tilt) * 3.5 * s, y + 7.1 * s, z), q.setFromEuler(e.set(0, R() * 6, 0)), sc.set(s, s, s)); iPc.setMatrixAt(i, M4); iPc.setColorAt(i, cc.setHSL(0.27 + R() * 0.05, 0.5, 0.25 + R() * 0.08)); addC(x, z, 0.5 * s); });
  for (const m of [iTr, iCa, iPt, iPc]) { m.castShadow = true; m.instanceMatrix.needsUpdate = true; if (m.instanceColor) m.instanceColor.needsUpdate = true; scene.add(m); }

  /* ---------- village ---------- */
  const clay = std(0xc98a5a), thatch = std(0xc9a24a), dark = std(0x2a1a0e), red = std(0xb5451d);
  function hut(x, z, r = 1.9, rot = 0) { const y = height(x, z), g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = rot;
    const w = cyl(r, r * 1.04, 1.9, clay, 10); w.position.y = 0.95; const rf = new THREE.Mesh(new THREE.ConeGeometry(r * 1.4, 1.9, 10), thatch); rf.position.y = 2.7; rf.castShadow = true;
    const dr = box(0.8, 1.4, 0.2, dark); dr.position.set(0, 0.7, r * 0.98); const band = cyl(r * 1.02, r * 1.02, 0.18, red, 10); band.position.y = 0.35; g.add(w, rf, dr, band); scene.add(g); addC(x, z, r + 0.3); }
  for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2 + 0.3, d = 12 + (i % 2) * 3; hut(Math.cos(a) * d, Math.sin(a) * d, 1.8 + (i % 3) * 0.2, -a + Math.PI / 2); }
  // big tree
  { const y = height(0, -3), g = new THREE.Group(); g.position.set(0, y, -3); const t = cyl(1.2, 1.7, 5, std(0x6b4a2b), 9); t.position.y = 2.5; g.add(t); for (let i = 0; i < 6; i++) { const b = sph(2.6 + R(), std(0x2f6b2e), 7); b.position.set(Math.cos(i) * 2.4, 5.8 + R(), Math.sin(i) * 2.4); b.scale.y = 0.7; g.add(b); } scene.add(g); addC(0, -3, 1.9); }
  // fire pit + stones + logs
  { const y = height(4, 3); const f = new THREE.PointLight(0xff9a3a, 14, 14, 2); f.position.set(4, y + 1, 3); scene.add(f); W.upd.push((t) => { f.intensity = 12 + Math.sin(t * 9) * 2.4 + Math.sin(t * 17) * 1.2; });
    const fl = new THREE.Mesh(new THREE.ConeGeometry(0.35, 1, 6), new THREE.MeshBasicMaterial({ color: 0xff9a3a })); fl.position.set(4, y + 0.55, 3); scene.add(fl); W.upd.push((t) => { fl.scale.y = 1 + Math.sin(t * 12) * 0.2; });
    for (let i = 0; i < 8; i++) { const s = box(0.4, 0.3, 0.4, std(0x77706a)); s.position.set(4 + Math.cos(i * 0.785) * 0.8, y + 0.15, 3 + Math.sin(i * 0.785) * 0.8); scene.add(s); } addC(4, 3, 1.1); }
  // market stalls
  for (const [x, z, cl] of [[-9, 6, 0xb02a2a], [-12, 2, 0x2b3a8c], [9, 8, 0xe0a93b]]) { const y = height(x, z), g = new THREE.Group(); g.position.set(x, y, z); const t = box(2.2, 0.8, 1, std(0x7a5233)); t.position.y = 0.4; g.add(t); for (const sx of [-1, 1]) { const p = cyl(0.06, 0.06, 2.3, std(0x4a2f1d), 5); p.position.set(sx * 1.05, 1.15, -0.4); g.add(p); } const cloth = box(2.6, 0.08, 1.9, std(cl)); cloth.position.set(0, 2.25, 0.1); cloth.rotation.x = 0.15; g.add(cloth);
    for (let i = 0; i < 5; i++) { const f = sph(0.14, std([0xe0a93b, 0xb02a2a, 0x6fae3a][i % 3]), 6); f.position.set(-0.8 + i * 0.4, 0.92, 0.1); g.add(f); } scene.add(g); addC(x, z, 1.6); }
  // royal wall with bas-reliefs (north of village)
  { const wallM = std(0xd6b98a); const emb = [[0xb02a2a, "lion"], [0x2b3a8c, "fish"], [0xe0a93b, "sun"], [0x2f8a52, "snake"], [0xb02a2a, "lion"]];
    for (let i = 0; i < 5; i++) { const x = -12 + i * 6, z = -27 - Math.abs(i - 2) * 0.4, y = height(x, z); const g = new THREE.Group(); g.position.set(x, y, z); const w = box(5.4, 3.3, 0.7, wallM); w.position.y = 1.65; g.add(w); const fr = box(3.6, 2.0, 0.08, std(0xa77a47)); fr.position.set(0, 1.75, 0.4); g.add(fr);
      const mk = new THREE.Mesh(emb[i][1] === "sun" ? new THREE.CircleGeometry(0.7, 12) : emb[i][1] === "fish" ? new THREE.ConeGeometry(0.5, 1.5, 3) : emb[i][1] === "snake" ? new THREE.TorusGeometry(0.5, 0.1, 5, 12) : new THREE.BoxGeometry(1, 1, 0.05), std(emb[i][0], { flatShading: false }));
      mk.position.set(0, 1.75, 0.46); if (emb[i][1] === "fish") mk.rotation.z = Math.PI / 2; g.add(mk); scene.add(g); for (let k = -2; k <= 2; k++) addC(x + k * 1.1, z, 0.9); } }
  // herbs
  for (const [x, z] of [[-6, -9], [9, -12], [-16, 6], [14, 14], [-3, 19], [20, -4]]) { const y = height(x, z), b = new THREE.Group(); b.position.set(x, y, z); const bs = sph(0.5, std(0x3b7a30), 6); bs.position.y = 0.4; bs.scale.y = 0.8; b.add(bs); for (let i = 0; i < 4; i++) { const f = sph(0.09, std(0xe85a9b, { emissive: 0x55102a }), 5); f.position.set(Math.cos(i * 1.6) * 0.4, 0.75, Math.sin(i * 1.6) * 0.4); b.add(f); } scene.add(b); W.herbs.push({ x, z, mesh: b, taken: false }); }

  /* ---------- NPCs ---------- */
  function npc(id, name, x, z, o, face = 0) { const m = makeHuman(o); const y = height(x, z); m.position.set(x, y, z); m.rotation.y = face; scene.add(m); addC(x, z, 0.6); const n = { id, name, x, z, mesh: m, y }; W.npcs.push(n); return n; }
  npc("doyen", "Doyen Adjovi", 3, -6, { cloth: 0xe9e3d0, hair: 0xd8d8d8, weapon: "stick", accent: 0x2b3a8c, skin: 0x5d3520, scale: 1.0, cape: 0x2b3a8c, sleeve: true }, -2.4);
  npc("enfant", "Tèwi", -6, 9, { cloth: 0xe0a93b, scale: 0.68, pants: 0xe0a93b }, 0.6);
  npc("marchande", "Mère Akossiba", -9.5, 8.5, { cloth: 0xb02a2a, skirt: true, skirtMat: std(0x2b3a8c), sleeve: false }, 2.8);
  npc("forgeron", "Hounsou", 10, 6.5, { cloth: 0x3a3a3a, accent: 0x777777, weapon: "stick", scale: 1.08, hair: 0x14100d }, 3.6);
  npc("agojie", "Nanou", 8, -9, { cloth: 0xc2562d, skirt: true, skirtMat: std(0x2b6aa3), hat: "plume", weapon: "sword" }, -2.2);

  /* ---------- shrines ---------- */
  function shrine(id, build) { const s = SPIRITS[id], y = height(s.pos[0], s.pos[1]), g = new THREE.Group(); g.position.set(s.pos[0], y, s.pos[1]); scene.add(g);
    for (let i = 0; i < 9; i++) { const a = i / 9 * Math.PI * 2, st = box(0.7, 0.9 + (i % 3) * 0.2, 0.5, std(0x7d756a)); st.position.set(Math.cos(a) * 4, 0.45, Math.sin(a) * 4); st.rotation.y = -a; g.add(st); }
    const ring = new THREE.Mesh(new THREE.TorusGeometry(2.2, 0.08, 6, 28), new THREE.MeshBasicMaterial({ color: s.color })); ring.rotation.x = Math.PI / 2; ring.position.y = 0.2; g.add(ring);
    const L = new THREE.PointLight(s.color, 10, 14, 2); L.position.y = 2.4; g.add(L); build(g, s); const cone = new THREE.Mesh(new THREE.ConeGeometry(0.4, 1.2, 4), new THREE.MeshBasicMaterial({ color: s.color })); cone.rotation.x = Math.PI; cone.position.y = 5; g.add(cone);
    W.upd.push((t) => { ring.scale.setScalar(1 + Math.sin(t * 2) * 0.06); cone.position.y = 5 + Math.sin(t * 2.4) * 0.3; cone.rotation.y = t; }); W.shrines[id] = { id, x: s.pos[0], z: s.pos[1], y, g }; addC(s.pos[0], s.pos[1], 1.3); }
  shrine("legba", (g) => { const p = cyl(0.25, 0.3, 3.4, std(0x3a1d12), 7); p.position.y = 1.7; const h = sph(0.5, std(0xb02a2a), 8); h.position.y = 3.6; const e1 = sph(0.1, std(0xffffff), 5), e2 = e1.clone(); e1.position.set(-0.2, 3.7, 0.4); e2.position.set(0.2, 3.7, 0.4); g.add(p, h, e1, e2); });
  shrine("hevioso", (g) => { const p = cyl(0.3, 0.4, 3, std(0x4a3a6a), 7); p.position.y = 1.5; g.add(p); for (const s of [-1, 1]) { const hn = new THREE.Mesh(new THREE.TorusGeometry(0.6, 0.12, 6, 10, Math.PI * 1.3), std(0xe9e3d0)); hn.position.set(s * 0.7, 3.1, 0); hn.rotation.z = s * 0.6; hn.rotation.y = Math.PI / 2; g.add(hn); } for (let i = 0; i < 3; i++) { const d = cyl(0.5, 0.42, 0.9, std(0x8a5a2b), 10); d.position.set(Math.cos(i * 2.1) * 2.6, 0.45, Math.sin(i * 2.1) * 2.6); g.add(d); } });
  shrine("gu", (g) => { const a = box(1.2, 0.7, 0.6, std(0x2a2d33)); a.position.y = 0.75; const b = box(0.6, 0.6, 0.5, std(0x2a2d33)); b.position.y = 0.3; const f = new THREE.Mesh(new THREE.ConeGeometry(0.5, 1.1, 6), new THREE.MeshBasicMaterial({ color: 0xff7a1a })); f.position.set(2, 0.6, 0); g.add(a, b, f); W.upd.push((t) => { f.scale.y = 1 + Math.sin(t * 11) * 0.25; }); const sw = box(0.12, 2.6, 0.05, std(0xb8bcc6, { metalness: 0.5 })); sw.position.set(-2, 1.4, 0); g.add(sw); });
  shrine("aziza", (g) => { const t = cyl(0.4, 0.55, 3.2, std(0x4a2f1d), 6); t.position.y = 1.6; const fc = box(0.7, 0.8, 0.4, std(0x2f8a52)); fc.position.y = 3.2; g.add(t, fc); for (let i = 0; i < 6; i++) { const f = sph(0.12, new THREE.MeshBasicMaterial({ color: 0xbfff80 }), 4); f.position.set(Math.cos(i) * 2.2, 1.5, Math.sin(i) * 2.2); g.add(f); W.upd.push((tt) => { f.position.y = 1.5 + Math.sin(tt * 2 + i) * 0.5; }); } });

  /* ---------- coast: camp, lair, ship ---------- */
  { const [cx, cz] = CAMP, y = height(cx, cz); const g = new THREE.Group(); g.position.set(cx, y, cz); scene.add(g);
    for (const [dx, dz, r] of [[-5, -4, 0], [4, -5, 0.5], [6, 4, 1], [-6, 5, 0.3], [0, 9, 0]]) { const t = new THREE.Mesh(new THREE.ConeGeometry(2.2, 2.4, 4), std(0xe8e0c8)); t.position.set(dx, 1.2, dz); t.rotation.y = r + 0.8; t.castShadow = true; g.add(t); addC(cx + dx, cz + dz, 2); }
    for (const [dx, dz] of [[1, -2], [2, 2], [-2, 0], [3, -1]]) { const b = box(1, 0.9, 1, std(0x7a5a33)); b.position.set(dx, 0.45, dz); g.add(b); addC(cx + dx, cz + dz, 0.8); }
    const pole = cyl(0.07, 0.07, 6, std(0x3a2a1a), 5); pole.position.set(-1, 3, 0); g.add(pole); const fl = new THREE.Group(); fl.position.set(-1, 5.4, 0); for (let i = 0; i < 3; i++) { const s = box(0.5, 0.9, 0.03, std([0x2b3a8c, 0xf2f2f2, 0xb02a2a][i])); s.position.x = 0.25 + i * 0.5; fl.add(s); } g.add(fl); W.upd.push((t) => { fl.rotation.y = Math.sin(t * 2) * 0.15; });
    const f = new THREE.PointLight(0xff9a3a, 9, 12, 2); f.position.set(0, 1.2, 1); g.add(f); }
  { const [lx, lz] = LAIR, y = height(lx, lz); const g = new THREE.Group(); g.position.set(lx, y, lz); scene.add(g); const h = cyl(2.4, 2.5, 2.2, std(0x3a2a22), 9); h.position.y = 1.1; const r = new THREE.Mesh(new THREE.ConeGeometry(3.3, 2.2, 9), std(0x2a1d16)); r.position.y = 3.2; r.castShadow = true; g.add(h, r);
    for (let i = 0; i < 5; i++) { const s = sph(0.28, new THREE.MeshBasicMaterial({ color: 0xff3a2a }), 6); const a = i / 5 * 6.28; s.position.set(Math.cos(a) * 4.5, 1.8, Math.sin(a) * 4.5); const sk = cyl(0.04, 0.04, 1.8, std(0x1d1210), 4); sk.position.set(s.position.x, 0.9, s.position.z); g.add(s, sk); }
    const L = new THREE.PointLight(0xff2a1a, 12, 16, 2); L.position.y = 2; g.add(L); addC(lx, lz, 3); }
  { const ship = new THREE.Group(); ship.position.set(125, SEA_LEVEL, -16); ship.rotation.y = 0.4; const hull = box(26, 5, 8, std(0x4a2f1d)); hull.position.y = 1.5; const bow = new THREE.Mesh(new THREE.ConeGeometry(4, 8, 4), std(0x4a2f1d)); bow.rotation.z = -Math.PI / 2; bow.rotation.y = Math.PI / 4; bow.position.set(16, 1.5, 0); ship.add(hull, bow);
    for (const x of [-7, 0, 7]) { const m = cyl(0.3, 0.4, 24, std(0x3a2a1a), 6); m.position.set(x, 14, 0); const s1 = box(0.2, 9, 11, std(0xf2eee0)); s1.position.set(x + 0.4, 15, 0); const s2 = box(0.2, 6, 8, std(0xf2eee0)); s2.position.set(x + 0.4, 23, 0); ship.add(m, s1, s2); }
    scene.add(ship); W.upd.push((t) => { ship.position.y = SEA_LEVEL + Math.sin(t * 0.8) * 0.35; ship.rotation.z = Math.sin(t * 0.7) * 0.03; }); W.ship = ship; }
  // ridge lookout marker
  { const y = height(RIDGE[0], RIDGE[1]), m = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 3, 5), new THREE.MeshBasicMaterial({ color: 0xe0a93b })); m.position.set(RIDGE[0], y + 1.5, RIDGE[1]); scene.add(m); W.ridgeMarker = m; W.upd.push((t) => { m.rotation.y = t; m.visible = W.showRidge !== false; }); }

  W.update = (t) => { for (const f of W.upd) f(t); sea.position.y = SEA_LEVEL + Math.sin(t * 0.9) * 0.08; };
  W.followSun = (x, z) => { sun.position.set(x + 40, 38, z + 24); sun.target.position.set(x, 0, z); };
  return W;
}
