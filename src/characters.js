/* Articulated, smooth-shaded, semi-realistic characters built from lathe/capsule geometry with a real joint hierarchy.
   Procedural by design: no external model needed, every outfit/weapon/skin tone is data. */
import * as THREE from "three";
const V2 = THREE.Vector2, TAU = Math.PI * 2;

/* ---------- materials & textures ---------- */
const matCache = new Map(), texCache = new Map();
export function mat(color, o = {}) { const k = color + JSON.stringify(o); if (!matCache.has(k)) matCache.set(k, new THREE.MeshStandardMaterial(Object.assign({ color, roughness: 0.75, metalness: 0 }, o))); return matCache.get(k); }
function canvasTex(w, h, draw, rep = [1, 1]) { const c = document.createElement("canvas"); c.width = w; c.height = h; draw(c.getContext("2d"), w, h); const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rep[0], rep[1]); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t; }
export function pattern(kind, c1 = "#1d3a8a", c2 = "#f2eee0", c3 = "#e0a93b") {
  const k = kind + c1 + c2 + c3; if (texCache.has(k)) return texCache.get(k);
  const t = canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = c1; g.fillRect(0, 0, w, h);
    if (kind === "stripes") { g.fillStyle = c2; for (let x = 0; x < w; x += 32) g.fillRect(x, 0, 12, h); g.fillStyle = c3; for (let x = 16; x < w; x += 64) g.fillRect(x, 0, 3, h); }
    if (kind === "wax") { for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) { const cx = x * 64 + 32 + (y % 2) * 0, cy = y * 64 + 32; g.fillStyle = c2; g.beginPath(); g.arc(cx, cy, 22, 0, TAU); g.fill(); g.fillStyle = c1; g.beginPath(); g.arc(cx, cy, 14, 0, TAU); g.fill(); g.fillStyle = c3; g.beginPath(); g.arc(cx, cy, 6, 0, TAU); g.fill(); for (let a = 0; a < 8; a++) { g.fillRect(cx + Math.cos(a * 0.785) * 28 - 2, cy + Math.sin(a * 0.785) * 28 - 2, 4, 4); } } }
    if (kind === "kente") { for (let y = 0; y < 8; y++) { g.fillStyle = y % 2 ? c2 : c3; g.fillRect(0, y * 32, w, 14); } g.fillStyle = c1; for (let x = 0; x < w; x += 32) { g.fillRect(x, 0, 6, h); } g.fillStyle = c2; for (let y = 0; y < 8; y += 2) for (let x = 0; x < w; x += 64) g.fillRect(x + 8, y * 32 + 2, 14, 10); }
    if (kind === "indigo") { for (let i = 0; i < 1400; i++) { g.fillStyle = `rgba(${Math.random() < 0.5 ? 0 : 120},${Math.random() < 0.5 ? 0 : 150},255,0.05)`; g.fillRect(Math.random() * w, Math.random() * h, 3, 1); } g.strokeStyle = c2 + "55"; g.lineWidth = 2; for (let y = 24; y < h; y += 64) { g.beginPath(); for (let x = 0; x <= w; x += 8) g.lineTo(x, y + Math.sin(x * 0.1) * 5); g.stroke(); } }
    if (kind === "cloth") { for (let i = 0; i < 2000; i++) { g.fillStyle = `rgba(0,0,0,${Math.random() * 0.07})`; g.fillRect(Math.random() * w, Math.random() * h, 2, 1); g.fillStyle = `rgba(255,255,255,${Math.random() * 0.06})`; g.fillRect(Math.random() * w, Math.random() * h, 1, 2); } }
  }, [2, 2]);
  texCache.set(k, t); return t;
}
const cloth = (kind, c1, c2, c3, o = {}) => new THREE.MeshStandardMaterial(Object.assign({ map: pattern(kind, c1, c2, c3), roughness: 0.85, side: THREE.DoubleSide }, o));
const metal = (c = 0xc9ccd2) => mat(c, { metalness: 0.75, roughness: 0.3 });
export const SKIN = [0x3b2216, 0x4a2c1a, 0x5a3622, 0x6b4128, 0x7a4a2e];
const skinMat = (c) => new THREE.MeshPhysicalMaterial({ color: c, roughness: 0.55, sheen: 0.6, sheenColor: new THREE.Color(0x8a4a30), sheenRoughness: 0.5 });

/* ---------- geometry helpers ---------- */
function tcap(len, r0, r1, seg = 12) { // tapered capsule hanging down from y=0
  const p = []; for (let i = 0; i <= 4; i++) { const a = i / 4 * Math.PI / 2; p.push(new V2(Math.sin(a) * r0, Math.cos(a) * r0)); }
  p.push(new V2(r1, -len)); for (let i = 1; i <= 4; i++) { const a = i / 4 * Math.PI / 2; p.push(new V2(Math.cos(a) * r1, -len - Math.sin(a) * r1)); }
  return new THREE.LatheGeometry(p, seg);
}
function lathe(prof, seg = 20) { return new THREE.LatheGeometry(prof.map((q) => new V2(q[0], q[1])), seg); }
const mesh = (g, m, shadow = true) => { const o = new THREE.Mesh(g, m); o.castShadow = shadow; o.receiveShadow = true; return o; };
function joint(parent, x, y, z) { const g = new THREE.Group(); g.position.set(x, y, z); parent.add(g); return g; }
const lerpAng = (a, b, k) => a + (b - a) * k;

/* ---------- body ---------- */
function torsoProfile(f, bulk) { // radius, y (pelvis group space: y=0 at hip line)
  const b = bulk;
  return f ? [[0, -0.12], [0.13 * b, -0.11], [0.185 * b, -0.02], [0.14 * b, 0.12], [0.135 * b, 0.2], [0.165 * b, 0.3], [0.17 * b, 0.4], [0.19 * b, 0.5], [0.2 * b, 0.56], [0.11, 0.62], [0.06, 0.66], [0.055, 0.7], [0, 0.71]]
    : [[0, -0.12], [0.14 * b, -0.11], [0.17 * b, -0.02], [0.155 * b, 0.12], [0.15 * b, 0.22], [0.175 * b, 0.34], [0.2 * b, 0.46], [0.215 * b, 0.55], [0.12, 0.61], [0.065, 0.65], [0.06, 0.7], [0, 0.71]];
}
function makeHead(o, skin, hairMat) {
  const head = new THREE.Group(), sm = skin;
  const skull = mesh(new THREE.SphereGeometry(0.108, 28, 22), sm); skull.scale.set(0.92, 1.08, 1.0); skull.position.y = 0.02;
  const p = skull.geometry.attributes.position; for (let i = 0; i < p.count; i++) { const y = p.getY(i); if (y < -0.02) { const k = 1 + (y + 0.02) * 1.9; p.setX(i, p.getX(i) * Math.max(0.55, k)); p.setZ(i, p.getZ(i) * (0.93 + Math.max(0, k - 0.7) * 0.1)); } } skull.geometry.computeVertexNormals();
  const eyeW = mat(0xf2eee6, { roughness: 0.3 }), iris = mat(0x120a06, { roughness: 0.2 });
  for (const s of [-1, 1]) { const w = mesh(new THREE.SphereGeometry(0.017, 10, 8), eyeW, false); w.scale.set(1.25, 0.8, 0.6); w.position.set(s * 0.04, 0.035, 0.093); const ir = mesh(new THREE.SphereGeometry(0.0085, 8, 6), iris, false); ir.position.set(s * 0.04, 0.035, 0.099); const br = mesh(new THREE.BoxGeometry(0.044, 0.008, 0.012), hairMat, false); br.position.set(s * 0.04, 0.061, 0.093); br.rotation.z = -s * 0.12; const ear = mesh(new THREE.SphereGeometry(0.024, 8, 6), sm, false); ear.scale.set(0.45, 1, 0.7); ear.position.set(s * 0.095, 0.015, -0.005); head.add(w, ir, br, ear); }
  const nose = mesh(new THREE.SphereGeometry(0.019, 10, 8), sm, false); nose.scale.set(0.95, 0.9, 1.15); nose.position.set(0, -0.005, 0.1); const bridge = mesh(new THREE.CapsuleGeometry(0.008, 0.035, 4, 6), sm, false); bridge.position.set(0, 0.025, 0.094);
  const lipT = mesh(new THREE.CapsuleGeometry(0.0055, 0.034, 4, 8), mat(0x4a2020, { roughness: 0.5 }), false); lipT.rotation.z = Math.PI / 2; lipT.position.set(0, -0.042, 0.092); const lipB = mesh(new THREE.CapsuleGeometry(0.0065, 0.03, 4, 8), mat(0x5a2828, { roughness: 0.5 }), false); lipB.rotation.z = Math.PI / 2; lipB.position.set(0, -0.052, 0.089);
  head.add(skull, nose, bridge, lipT, lipB);
  // hair
  const h = o.hair || "short";
  if (h === "afro") { const g = new THREE.IcosahedronGeometry(0.135, 3), q = g.attributes.position; for (let i = 0; i < q.count; i++) { const n = 1 + Math.sin(q.getX(i) * 90) * Math.cos(q.getY(i) * 80) * 0.04; q.setXYZ(i, q.getX(i) * n, q.getY(i) * n, q.getZ(i) * n); } g.computeVertexNormals(); const m = mesh(g, hairMat); m.scale.set(1, 0.92, 1.02); m.position.set(0, 0.06, -0.012); head.add(m); }
  if (h === "short") { const m = mesh(new THREE.SphereGeometry(0.113, 20, 14, 0, TAU, 0, 1.75), hairMat); m.scale.set(0.95, 1.08, 1.03); m.position.set(0, 0.025, -0.004); m.rotation.x = -0.1; head.add(m); }
  if (h === "braids") { const cap = mesh(new THREE.SphereGeometry(0.113, 20, 14, 0, TAU, 0, 1.7), hairMat); cap.scale.set(0.95, 1.08, 1.03); cap.position.set(0, 0.025, -0.004); head.add(cap); for (let i = 0; i < 14; i++) { const a = i / 14 * TAU; const b = mesh(tcap(0.2 + Math.random() * 0.08, 0.011, 0.007, 6), hairMat); b.position.set(Math.sin(a) * 0.1, 0.0, Math.cos(a) * 0.1 - 0.01); b.rotation.set(Math.cos(a) * 0.35, 0, -Math.sin(a) * 0.35); if (Math.cos(a) > 0.6) b.scale.y = 0.4; head.add(b); } }
  if (h === "wrap") { const w = mesh(new THREE.TorusGeometry(0.1, 0.045, 10, 22), o.wrapMat || cloth("wax", "#b02a2a", "#f2eee0", "#e0a93b")); w.rotation.x = Math.PI / 2 - 0.15; w.position.set(0, 0.07, -0.005); const top = mesh(new THREE.SphereGeometry(0.1, 14, 10), o.wrapMat || cloth("wax", "#b02a2a", "#f2eee0", "#e0a93b")); top.scale.set(1, 0.85, 1.05); top.position.set(0, 0.095, -0.012); head.add(w, top); }
  if (h === "white") { const m = mesh(new THREE.SphereGeometry(0.113, 20, 14, 0, TAU, 0, 1.55), mat(0xe8e8e8)); m.scale.set(0.95, 1.08, 1.03); m.position.set(0, 0.025, -0.004); head.add(m); const beard = mesh(tcap(0.1, 0.07, 0.03, 10), mat(0xe8e8e8)); beard.scale.set(1, 0.9, 0.7); beard.position.set(0, -0.045, 0.045); head.add(beard); }
  if (o.beard) { const b = mesh(tcap(0.07, 0.065, 0.03, 10), hairMat); b.scale.set(1, 0.9, 0.7); b.position.set(0, -0.035, 0.05); head.add(b); }
  if (o.chalk) { for (const s of [-1, 1]) { const l = mesh(new THREE.BoxGeometry(0.004, 0.05, 0.003), mat(0xf2eee0), false); l.position.set(s * 0.048, -0.01, 0.097); l.rotation.z = s * 0.2; head.add(l); const l2 = l.clone(); l2.position.set(s * 0.065, 0.015, 0.088); head.add(l2); } const dot = mesh(new THREE.SphereGeometry(0.007, 6, 5), mat(0xf2eee0), false); dot.position.set(0, 0.065, 0.1); head.add(dot); }
  if (o.mask) { const m = mesh(new THREE.BoxGeometry(0.17, 0.22, 0.04), mat(o.mask, { roughness: 0.6 })); m.position.set(0, 0.0, 0.1); m.scale.set(1, 1, 1); const eye = mat(0x050505); for (const s of [-1, 1]) { const e = mesh(new THREE.BoxGeometry(0.03, 0.012, 0.01), eye, false); e.position.set(s * 0.04, 0.03, 0.123); head.add(e); } const horn = mesh(new THREE.ConeGeometry(0.02, 0.1, 6), mat(0xe9e3d0)); horn.position.set(0.05, 0.14, 0.09); const horn2 = horn.clone(); horn2.position.x = -0.05; head.add(m, horn, horn2); }
  if (o.helmet) { const hm = mesh(new THREE.SphereGeometry(0.13, 18, 12, 0, TAU, 0, 1.6), mat(0xf4f0e2, { roughness: 0.7 })); hm.position.set(0, 0.04, -0.005); hm.scale.set(1, 0.95, 1.12); const br = mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.012, 22), mat(0xf4f0e2, { roughness: 0.7 })); br.position.set(0, 0.052, 0.035); br.scale.set(1, 1, 1.2); const band = mesh(new THREE.CylinderGeometry(0.133, 0.133, 0.02, 20, 1, true), mat(0x8a2a1a, { side: THREE.DoubleSide })); band.position.set(0, 0.058, -0.003); const sp = mesh(new THREE.ConeGeometry(0.012, 0.04, 6), metal(0xe0c060)); sp.position.set(0, 0.16, 0); head.add(hm, br, band, sp); }
  if (o.kepi) { const k = mesh(new THREE.CylinderGeometry(0.108, 0.125, 0.09, 18), mat(0x1a2a6a)); k.position.set(0, 0.095, -0.005); const vis = mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.008, 14, 1, false, 0, Math.PI), mat(0x120d08)); vis.position.set(0, 0.06, 0.07); vis.rotation.y = Math.PI / 2; const top = mesh(new THREE.CylinderGeometry(0.13, 0.11, 0.015, 18), mat(0xb02a2a)); top.position.set(0, 0.145, 0); head.add(k, vis, top); }
  if (o.feathers) { for (let i = 0; i < 6; i++) { const f = mesh(new THREE.BoxGeometry(0.03, 0.2, 0.004), mat([0xc2562d, 0xe0a93b, 0x2f8a52, 0xb02a2a, 0x2b3a8c, 0xe9e3d0][i], { roughness: 0.6 }), false); f.position.set((i - 2.5) * 0.04, 0.2, -0.02); f.rotation.z = (i - 2.5) * 0.2; f.rotation.x = -0.15; head.add(f); } const bd = mesh(new THREE.TorusGeometry(0.108, 0.01, 6, 22), cloth("stripes", "#8a2f1c", "#f2eee0", "#e0a93b")); bd.rotation.x = Math.PI / 2; bd.position.set(0, 0.07, 0); head.add(bd); }
  return head;
}

function handMesh(sm, s = 1) { const g = new THREE.Group(); const palm = mesh(new THREE.BoxGeometry(0.075 * s, 0.085 * s, 0.03 * s), sm, false); palm.position.y = -0.045; const fingers = mesh(new THREE.BoxGeometry(0.07 * s, 0.05 * s, 0.024 * s), sm, false); fingers.position.y = -0.105 * s; const th = mesh(new THREE.CapsuleGeometry(0.011 * s, 0.04 * s, 3, 6), sm, false); th.position.set(0.045 * s, -0.06, 0.012); th.rotation.z = 0.5; g.add(palm, fingers, th); return g; }

/* ---------- weapons (placed in the right hand, +Y along the grip) ---------- */
function weapon(kind) {
  const g = new THREE.Group(), wood = mat(0x5b3a1d, { roughness: 0.7 }), iron = metal();
  if (kind === "sword") { // curved machete-like blade
    const s = new THREE.Shape(); s.moveTo(0, 0); s.quadraticCurveTo(0.07, 0.35, 0.03, 0.78); s.lineTo(0.0, 0.8); s.quadraticCurveTo(0.03, 0.4, -0.03, 0); s.closePath();
    const bl = mesh(new THREE.ExtrudeGeometry(s, { depth: 0.012, bevelEnabled: true, bevelSize: 0.003, bevelThickness: 0.003, bevelSegments: 1 }), iron); bl.position.set(0, 0.05, -0.006); const gd = mesh(new THREE.BoxGeometry(0.12, 0.018, 0.03), mat(0xe0a93b, { metalness: 0.6, roughness: 0.35 })); gd.position.y = 0.045; const hl = mesh(new THREE.CylinderGeometry(0.017, 0.015, 0.14, 8), wood); hl.position.y = -0.03; const pom = mesh(new THREE.SphereGeometry(0.02, 8, 6), mat(0xe0a93b, { metalness: 0.6 })); pom.position.y = -0.105; g.add(bl, gd, hl, pom);
  }
  if (kind === "staff") { const st = mesh(new THREE.CylinderGeometry(0.022, 0.03, 1.9, 8), wood); st.position.y = 0.3; for (let i = 0; i < 5; i++) { const r = mesh(new THREE.TorusGeometry(0.03, 0.006, 5, 10), mat(0xe9e3d0)); r.rotation.x = Math.PI / 2; r.position.y = 0.75 + i * 0.08; g.add(r); } const head = mesh(new THREE.SphereGeometry(0.075, 12, 10), new THREE.MeshStandardMaterial({ color: 0xffd36a, emissive: 0xff9a1a, emissiveIntensity: 1.6, roughness: 0.3 }), false); head.position.y = 1.32; const cup = mesh(new THREE.CylinderGeometry(0.1, 0.03, 0.12, 8, 1, true), wood); cup.position.y = 1.25; cup.material = mat(0x5b3a1d, { side: THREE.DoubleSide }); g.add(st, head, cup); g.userData.orb = head; for (let i = 0; i < 6; i++) { const c = mesh(new THREE.SphereGeometry(0.014, 6, 5), mat(0xf2eee0), false); c.scale.set(1, 1.3, 0.7); c.position.set(Math.sin(i) * 0.04, 0.55 - i * 0.05, Math.cos(i) * 0.04); g.add(c); } }
  if (kind === "dark") { const st = mesh(new THREE.CylinderGeometry(0.025, 0.04, 1.8, 7), mat(0x1d1210)); st.position.y = 0.3; const sk = mesh(new THREE.SphereGeometry(0.09, 10, 8), mat(0xd9d2bd)); sk.position.y = 1.28; const orb = mesh(new THREE.SphereGeometry(0.065, 10, 8), new THREE.MeshStandardMaterial({ color: 0xff3a2a, emissive: 0xd0221f, emissiveIntensity: 2, roughness: 0.3 }), false); orb.position.y = 1.42; g.add(st, sk, orb); g.userData.orb = orb; }
  if (kind === "bow") { const curve = new THREE.QuadraticBezierCurve3(new THREE.Vector3(0, 0.62, 0), new THREE.Vector3(0, 0, 0.25), new THREE.Vector3(0, -0.62, 0)); const b = mesh(new THREE.TubeGeometry(curve, 16, 0.016, 6), wood); const str = mesh(new THREE.CylinderGeometry(0.003, 0.003, 1.24, 4), mat(0xeeeeee), false); str.position.set(0, 0, 0); g.add(b, str); g.rotation.set(0, 0, 0); g.userData.bow = true; }
  if (kind === "rifle") { const stock = mesh(new THREE.BoxGeometry(0.05, 0.16, 0.5), mat(0x6b4a2b, { roughness: 0.6 })); stock.position.set(0, 0, -0.1); const brl = mesh(new THREE.CylinderGeometry(0.012, 0.014, 0.85, 8), iron); brl.rotation.x = Math.PI / 2; brl.position.set(0, 0.05, 0.5); const byo = mesh(new THREE.ConeGeometry(0.008, 0.28, 4), iron); byo.rotation.x = Math.PI / 2; byo.position.set(0, 0.05, 1.1); const bolt = mesh(new THREE.BoxGeometry(0.03, 0.04, 0.08), iron); bolt.position.set(0, 0.07, 0.1); g.add(stock, brl, byo, bolt); g.userData.rifle = true; }
  if (kind === "stick") { const st = mesh(new THREE.CylinderGeometry(0.022, 0.03, 1.5, 7), wood); st.position.y = 0.3; const kn = mesh(new THREE.SphereGeometry(0.04, 8, 6), wood); kn.position.y = 1.05; g.add(st, kn); }
  if (kind === "hammer") { const hl = mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.5, 6), wood); const hd = mesh(new THREE.BoxGeometry(0.16, 0.09, 0.09), mat(0x3a3a40, { metalness: 0.7, roughness: 0.4 })); hd.position.y = 0.25; g.add(hl, hd); }
  return g;
}

/* ---------- factory ---------- */
export function createCharacter(o = {}) {
  const f = o.sex === "f", bulk = o.bulk ?? 1, sc = (o.scale ?? 1) * (f ? 0.95 : 1) * 1.12, skinC = o.skin ?? SKIN[2], skin = skinMat(skinC), hairMat = mat(o.hairColor ?? 0x120d09, { roughness: 0.9 });
  const root = new THREE.Group(), rig = {}; const pelvis = joint(root, 0, 0.93, 0); rig.pelvis = pelvis;
  // torso body
  const tors = mesh(lathe(torsoProfile(f, bulk), 22), skin); tors.scale.z = 0.62; pelvis.add(tors);
  const chest = joint(pelvis, 0, 0.25, 0), neck = joint(pelvis, 0, 0.66, 0.0), head = joint(neck, 0, 0.1, 0.01); rig.chest = chest; rig.neck = neck; rig.head = head;
  const hd = makeHead(o, skin, hairMat); head.add(hd); const nk = mesh(new THREE.CylinderGeometry(0.05, 0.058, 0.1, 10), skin); nk.position.y = 0.0; neck.add(nk);
  // clothing (torso layer)
  const top = o.top; // {kind:'tunic'|'coat'|'robe'|'vest'|'drape'|'bare', mat}
  if (top && top.kind !== "bare") {
    const prof = torsoProfile(f, bulk).map(([r, y]) => [r + 0.014 + (top.kind === "coat" ? 0.012 : 0), y]); let cut = prof;
    if (top.kind === "tunic" || top.kind === "vest") cut = prof.map(([r, y]) => (y > 0.5 ? [r * (top.kind === "vest" ? 0.9 : 0.55), y] : [r, y]));
    const t = mesh(lathe(cut.filter((q) => q[1] < (top.kind === "vest" || top.kind === "tunic" ? 0.57 : 0.64)), 22), top.mat); t.scale.z = 0.66; pelvis.add(t);
    if (top.kind === "coat") { for (const s of [-1, 1]) { const sl = mesh(tcap(0.3, 0.062, 0.05, 10), top.mat); sl.position.set(0, 0, 0); sl.userData.sleeve = s; } const tail = mesh(new THREE.CylinderGeometry(0.2, 0.26, 0.28, 18, 1, true, Math.PI * 0.55, Math.PI * 0.9), top.mat); tail.position.set(0, -0.2, -0.04); tail.scale.z = 0.8; pelvis.add(tail); const col = mesh(new THREE.CylinderGeometry(0.07, 0.085, 0.045, 12), mat(0x8a2a1a)); col.position.y = 0.65; pelvis.add(col); for (let i = 0; i < 6; i++) { const bt = mesh(new THREE.SphereGeometry(0.012, 6, 5), metal(0xe0c060), false); bt.position.set(0, 0.0 + i * 0.1, 0.1 + 0.0); bt.position.z = Math.sqrt(Math.max(0.0001, (torsoProfile(f, bulk).find(([r, y]) => y >= bt.position.y)?.[0] || 0.17) ** 2)) * 0.66 + 0.016; pelvis.add(bt); } }
    if (top.kind === "drape") { const rb = lathe([[0.27, -0.56], [0.24, -0.3], [0.2, -0.08], [0.178, 0.12], [0.19, 0.34], [0.205, 0.5], [0.13, 0.6]].map(([r, y]) => [r * bulk, y]), 28); const dr = mesh(rb, top.mat); const p = dr.geometry.attributes.position; for (let i = 0; i < p.count; i++) { const a = Math.atan2(p.getX(i), p.getZ(i)), y = p.getY(i), k = 1 + Math.sin(a * 5 + y * 7) * 0.035 * (y < 0.3 ? 1 : 0.3); p.setX(i, p.getX(i) * k); p.setZ(i, p.getZ(i) * k); } dr.geometry.computeVertexNormals(); dr.scale.z = 0.7; pelvis.add(dr); const sh = mesh(new THREE.TorusGeometry(0.17 * bulk, 0.045, 8, 24, Math.PI * 1.25), top.mat); sh.rotation.set(Math.PI / 2 - 0.55, 0.15, 0.75); sh.position.set(0.0, 0.45, 0.01); sh.scale.z = 0.75; pelvis.add(sh); }
  }
  if (o.necklace) { const n = new THREE.Group(); for (let i = 0; i < 22; i++) { const a = i / 22 * TAU, c = mesh(new THREE.SphereGeometry(0.014, 6, 5), o.necklace === "cowrie" ? mat(0xf4efe0, { roughness: 0.3 }) : mat([0xb02a2a, 0xe0a93b, 0x2b3a8c][i % 3], { roughness: 0.4 }), false); c.scale.set(1, o.necklace === "cowrie" ? 1.4 : 1, 0.8); c.position.set(Math.sin(a) * 0.12, 0, Math.cos(a) * 0.1); n.add(c); } n.position.y = 0.6; n.rotation.x = 0.35; pelvis.add(n); }
  if (o.sash) { const s = mesh(new THREE.TorusGeometry(0.19, 0.03, 8, 24), o.sash); s.rotation.x = Math.PI / 2; s.position.y = 0.04; s.scale.set(1, 0.7, 1); pelvis.add(s); }
  // legs
  const bottom = o.bottom; // {kind:'pants'|'shorts'|'wrap'|'bare', mat}
  rig.legs = []; rig.arms = [];
  for (const s of [-1, 1]) {
    const hip = joint(pelvis, s * 0.095, -0.04, 0), th = mesh(tcap(0.43, 0.085 * bulk, 0.058), bottom && bottom.kind === "pants" ? bottom.mat : skin); hip.add(th);
    const knee = joint(hip, 0, -0.44, 0), sh = mesh(tcap(0.42, 0.05, 0.04), bottom && bottom.kind === "pants" ? bottom.mat : skin); knee.add(sh);
    const ankle = joint(knee, 0, -0.44, 0), foot = mesh(new THREE.BoxGeometry(0.09, 0.07, 0.24), o.boots ? mat(0x1a120c, { roughness: 0.5 }) : skin); foot.position.set(0, -0.03, 0.06); ankle.add(foot);
    if (bottom && bottom.kind === "shorts") { const sh2 = mesh(tcap(0.24, 0.092 * bulk, 0.075), bottom.mat); hip.add(sh2); }
    if (o.boots) { const bo = mesh(tcap(0.2, 0.05, 0.046), mat(0x1a120c, { roughness: 0.5 })); bo.position.y = 0.05; knee.add(bo); bo.position.y = -0.22; }
    rig.legs.push({ hip, knee, ankle, s });
  }
  if (bottom && bottom.kind === "wrap") { const w = mesh(new THREE.CylinderGeometry(0.17 * bulk, 0.26 * bulk, 0.62, 22, 5, true), bottom.mat); w.scale.z = 0.8; w.position.y = -0.27; const p = w.geometry.attributes.position; for (let i = 0; i < p.count; i++) { const a = Math.atan2(p.getX(i), p.getZ(i)); const k = 1 + Math.sin(a * 7 + p.getY(i) * 6) * 0.05; p.setX(i, p.getX(i) * k); p.setZ(i, p.getZ(i) * k); } w.geometry.computeVertexNormals(); pelvis.add(w); rig.wrap = w; }
  if (bottom && bottom.kind === "pants" || (bottom && bottom.kind === "shorts")) { const bt = mesh(new THREE.CylinderGeometry(0.15 * bulk, 0.165 * bulk, 0.1, 18), bottom.mat); bt.scale.z = 0.7; bt.position.y = -0.03; pelvis.add(bt); }
  // arms
  const sleeve = top && (top.kind === "coat" || top.kind === "robe") ? top.mat : null;
  for (const s of [-1, 1]) {
    const sh = joint(chest, s * (f ? 0.185 : 0.21) * bulk, 0.3, 0), up = mesh(tcap(0.29, 0.058 * bulk, 0.045), sleeve || skin); sh.add(up); const ball = mesh(new THREE.SphereGeometry(0.06 * bulk, 10, 8), sleeve || skin); sh.add(ball);
    const elbow = joint(sh, 0, -0.3, 0), fo = mesh(tcap(0.25, 0.044, 0.035), sleeve && top.kind === "coat" ? sleeve : skin); elbow.add(fo); if (o.bracelets) { const br = mesh(new THREE.TorusGeometry(0.04, 0.01, 6, 12), mat(0xe0a93b, { metalness: 0.7, roughness: 0.3 })); br.rotation.x = Math.PI / 2; br.position.y = -0.22; elbow.add(br); }
    const wrist = joint(elbow, 0, -0.27, 0), hand = handMesh(sleeve && top.kind === "coat" ? skin : skin); wrist.add(hand); rig.arms.push({ sh, elbow, wrist, s, hand });
  }
  // weapon in right hand (arm index 1 = +x side)
  if (o.weapon) { const w = weapon(o.weapon); const hold = joint(rig.arms[1].wrist, 0, -0.08, 0.02); hold.add(w); rig.weapon = w; rig.hold = hold; if (o.weapon === "bow") { hold.rotation.set(0, 0, 0); } if (o.weapon === "rifle") { hold.rotation.set(0.35, 0, 0.95); } if (o.weapon === "sword") hold.rotation.set(-0.15, 0, 0); if (o.weapon === "staff" || o.weapon === "dark" || o.weapon === "stick") hold.rotation.set(0, 0, 0); if (o.weapon === "hammer") hold.rotation.set(-0.3, 0, 0); }
  if (o.shield) { const sh = mesh(new THREE.CylinderGeometry(0.27, 0.27, 0.035, 20), cloth("wax", "#8a2f1c", "#f2eee0", "#e0a93b", { roughness: 0.7 })); sh.rotation.x = Math.PI / 2; const hold = joint(rig.arms[0].wrist, 0, -0.06, 0.1); hold.add(sh); const bs = mesh(new THREE.SphereGeometry(0.05, 8, 6), metal(0xe0c060)); bs.position.z = 0.03; sh.add(bs); }
  if (o.quiver) { const q = mesh(new THREE.CylinderGeometry(0.06, 0.05, 0.5, 10), mat(0x6b4a2b, { roughness: 0.8 })); q.position.set(0.05, 0.3, -0.19); q.rotation.z = 0.2; chest.add(q); for (let i = 0; i < 5; i++) { const ar = mesh(new THREE.CylinderGeometry(0.005, 0.005, 0.25, 4), mat(0xd8cba8), false); ar.position.set(0.05 + (i - 2) * 0.012, 0.58, -0.19); ar.rotation.z = 0.2; chest.add(ar); const fe = mesh(new THREE.BoxGeometry(0.03, 0.06, 0.004), mat([0xb02a2a, 0x2b3a8c][i % 2]), false); fe.position.set(0.05 + (i - 2) * 0.012 + 0.025, 0.7, -0.19); chest.add(fe); } }
  if (o.cape) { const c = mesh(new THREE.CylinderGeometry(0.17, 0.26, 0.9, 16, 3, true, Math.PI * 0.6, Math.PI * 0.8), o.cape); c.position.set(0, 0.2, -0.06); c.scale.z = 0.6; const p = c.geometry.attributes.position; for (let i = 0; i < p.count; i++) p.setZ(i, p.getZ(i) + Math.sin(p.getY(i) * 5) * 0.015); chest.add(c); rig.cape = c; }
  if (o.apron) { const a = mesh(new THREE.BoxGeometry(0.28, 0.6, 0.02), mat(0x4a2f1d, { roughness: 0.8 })); a.position.set(0, 0.28, 0.115); chest.add(a); }
  root.scale.setScalar(sc); root.traverse((m) => { if (m.isMesh) { m.castShadow = true; } });
  return { root, rig, o, t: Math.random() * 10, pose: {}, dead: false, atk: 0, atkT: 0, hurtT: 0, mode: "idle", blend: 1 };
}

/* ---------- animation: target angles per joint, smoothed ---------- */
import { animateGLB } from "./glbmodels.js";
export function animate(c, dt, speed = 0, st = {}) {
  if (c.glb) return animateGLB(c, dt, speed, st);
  const r = c.rig; c.t += dt; const run = speed > 5.5, w = c.t * (speed > 0.2 ? 5.5 + speed * 1.1 : 0), k = Math.min(1, speed / 3.2), sw = Math.sin(w) * (run ? 1.0 : 0.65) * k;
  const T = { pelvisY: 0.93 + (Math.abs(Math.cos(w)) * 0.035 * k) - (c.dead ? 0.85 : 0), pelvisRotY: Math.sin(w) * 0.12 * k, pelvisRotZ: Math.sin(w) * 0.04 * k, chestRotY: -Math.sin(w) * 0.16 * k, chestX: 0.02 + (run ? 0.18 : 0.04) * k + Math.sin(c.t * 1.6) * 0.012, headX: -0.03, legs: [0, 0], knees: [0, 0], arms: [[0, 0], [0, 0]], elbows: [0.25, 0.25], armZ: [0.08, -0.08], bodyRotX: 0 };
  T.legs = [sw * 0.9, -sw * 0.9]; T.knees = [Math.max(0, -Math.sin(w + 0.5)) * 1.0 * k + 0.05, Math.max(0, Math.sin(w + 0.5)) * 1.0 * k + 0.05];
  T.arms[0][0] = -sw * 0.8; T.arms[1][0] = sw * 0.8; T.elbows = [0.3 + (run ? 0.8 : 0.2) * k, 0.3 + (run ? 0.8 : 0.2) * k];
  const wk = c.o.weapon;
  if (wk === "rifle") { T.arms[1] = [-1.0, 0]; T.elbows[1] = 0.9; T.arms[0] = [-0.9, 0]; T.elbows[0] = 1.1; T.armZ = [0.25, -0.15]; }
  if (st.aim) { T.arms[1] = [-1.25, 0]; T.elbows[1] = 0.15; T.chestRotY = 0.1; if (wk === "bow") { T.arms[0] = [-1.25, 0]; T.armZ[0] = 0.0; T.elbows[0] = 0.1; T.arms[1] = [-1.25, 0]; T.elbows[1] = 1.2; } }
  const a = st.attack || 0; // 0..1 timeline
  if (a > 0) { // wind-up (0..0.4) -> strike (0.4..0.65) -> recover
    const ph = 1 - a; const wind = Math.min(1, ph / 0.35), strike = Math.max(0, Math.min(1, (ph - 0.35) / 0.2)), rec = Math.max(0, (ph - 0.55) / 0.45);
    if (wk === "sword") { const sx = -2.4 * wind * (1 - strike) + 0.9 * strike * (1 - rec); T.arms[1] = [-2.5 * wind * (1 - strike) + 0.3 * strike, 0]; T.armZ[1] = -0.25 - 0.4 * strike; T.elbows[1] = 0.6 * (1 - strike) + 0.3; T.chestRotY = -0.6 * wind * (1 - strike) + 0.8 * strike * (1 - rec); T.pelvisRotY += T.chestRotY * 0.4; T.chestX += 0.25 * strike; }
    else if (wk === "bow") { T.arms[0] = [-1.5, 0]; T.armZ[0] = -0.05; T.elbows[0] = 0.05; T.arms[1] = [-1.45 * (wind > 0.99 ? 1 : wind), 0]; T.elbows[1] = 1.7 * (1 - strike * 0.9); T.chestRotY = 0.5; }
    else { T.arms[1] = [-1.2 - 0.9 * wind * (1 - strike) + 0.7 * strike, 0]; T.armZ[1] = -0.2; T.elbows[1] = 0.4; T.chestX += 0.12 * strike; T.arms[0] = [-0.6 * wind, 0]; }
  }
  if (c.hurtT > 0) { const h = c.hurtT / 0.35; T.chestX -= 0.45 * h; T.headX -= 0.3 * h; T.arms[0][0] += 0.6 * h; T.arms[1][0] += 0.6 * h; }
  if (c.dead) { T.bodyRotX = -1.45; T.chestX = 0; T.legs = [0.1, -0.1]; T.knees = [0.1, 0.1]; T.arms = [[0.3, 0], [0.8, 0]]; }
  // speak/idle: subtle breathing and weight shift
  if (speed < 0.2 && a <= 0) { T.chestX += Math.sin(c.t * 1.5) * 0.015; T.armZ[0] = 0.1 + Math.sin(c.t * 1.5) * 0.01; T.pelvisRotZ = Math.sin(c.t * 0.5) * 0.02; }
  const L = Math.min(1, dt * 16);
  r.pelvis.position.y = lerpAng(r.pelvis.position.y, T.pelvisY, L); r.pelvis.rotation.y = lerpAng(r.pelvis.rotation.y, T.pelvisRotY, L); r.pelvis.rotation.z = lerpAng(r.pelvis.rotation.z, T.pelvisRotZ, L); r.pelvis.rotation.x = lerpAng(r.pelvis.rotation.x, T.bodyRotX, L);
  r.chest.rotation.y = lerpAng(r.chest.rotation.y, T.chestRotY, L); r.chest.rotation.x = lerpAng(r.chest.rotation.x, T.chestX, L); r.head.rotation.x = lerpAng(r.head.rotation.x, T.headX - T.chestX * 0.6, L); r.head.rotation.y = lerpAng(r.head.rotation.y, (st.look || 0) - T.chestRotY * 0.7, Math.min(1, dt * 6));
  r.legs.forEach((lg, i) => { lg.hip.rotation.x = lerpAng(lg.hip.rotation.x, T.legs[i], L); lg.knee.rotation.x = lerpAng(lg.knee.rotation.x, T.knees[i], L); lg.ankle.rotation.x = lerpAng(lg.ankle.rotation.x, -T.legs[i] * 0.3 - T.knees[i] * 0.3, L); });
  r.arms.forEach((ar, i) => { ar.sh.rotation.x = lerpAng(ar.sh.rotation.x, T.arms[i][0], L); ar.sh.rotation.z = lerpAng(ar.sh.rotation.z, T.armZ[i] * (i ? 1 : 1), L); ar.elbow.rotation.x = lerpAng(ar.elbow.rotation.x, -T.elbows[i], L); });
  if (r.cape) r.cape.rotation.x = lerpAng(r.cape.rotation.x, 0.05 + k * 0.35, Math.min(1, dt * 4));
  if (c.hurtT > 0) c.hurtT -= dt;
  const orb = r.weapon && r.weapon.userData.orb; if (orb) orb.material.emissiveIntensity = 1.6 + Math.sin(c.t * 4) * 0.5 + (st.attack ? 1.5 : 0);
}
export function hit(c) { c.hurtT = 0.35; }
export function kill(c) { c.dead = true; }
export { cloth, metal };
