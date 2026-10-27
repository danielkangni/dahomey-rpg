import * as THREE from "three";
import { pbr, boxUV, scaleUV, canvasTex, addWind } from "./assets.js";
import { cloth } from "./characters.js";

const mesh = (g, m, shadow = true, recv = true) => { const o = new THREE.Mesh(g, m); o.castShadow = shadow; o.receiveShadow = recv; return o; };
let M = null;
function mats() { return M || (M = {
  wall: pbr("clay_plaster", 2.2, { color: 0xe0b98a }), wallDark: pbr("brown_mud", 2, { color: 0xb08a63 }), earth: pbr("red_laterite_soil_stones", 2.5, { color: 0xc07a4a }), thatch: pbr("thatch_roof_angled", 2.2, { color: 0xd8c68a, side: THREE.DoubleSide }),
  wood: pbr("fine_grained_wood", 1.5, { color: 0xa6764a }), dark: pbr("dark_wood", 1.5, { color: 0x6a4a30 }), plank: pbr("dark_wood", 1.2, { color: 0x8a6a48 }),
}); }

/* ---------- Dahomean bas-relief panels (stylised appliqué art, flat bold colours) ---------- */
export function reliefTexture(kind) {
  return canvasTex(256, 320, (g, w, h) => {
    g.fillStyle = "#c98f5b"; g.fillRect(0, 0, w, h); g.strokeStyle = "#5a3418"; g.lineWidth = 8; g.strokeRect(10, 10, w - 20, h - 20); g.lineWidth = 3; g.strokeRect(22, 22, w - 44, h - 44);
    g.fillStyle = "#e9d6a0"; g.fillRect(24, 24, w - 48, h - 48); const O = () => { g.strokeStyle = "#2a160a"; g.lineWidth = 4; g.stroke(); };
    const C = { red: "#b02a2a", blue: "#2b4a9a", yellow: "#e0a93b", green: "#2f7a4a", dark: "#2a160a", white: "#f4efe0" };
    if (kind === "lion") { g.fillStyle = C.yellow; g.beginPath(); g.ellipse(120, 190, 70, 38, 0, 0, 6.28); g.fill(); O(); for (const x of [70, 100, 140, 168]) { g.fillRect(x, 200, 14, 56); g.strokeRect(x, 200, 14, 56); } g.fillStyle = C.red; for (let a = 0; a < 14; a++) { g.beginPath(); g.moveTo(180 + Math.cos(a / 14 * 6.28) * 22, 135 + Math.sin(a / 14 * 6.28) * 22); g.lineTo(180 + Math.cos(a / 14 * 6.28) * 48, 135 + Math.sin(a / 14 * 6.28) * 48); g.lineTo(180 + Math.cos((a + 0.5) / 14 * 6.28) * 22, 135 + Math.sin((a + 0.5) / 14 * 6.28) * 22); g.fill(); } g.fillStyle = C.yellow; g.beginPath(); g.arc(180, 135, 26, 0, 6.28); g.fill(); O(); g.fillStyle = C.dark; g.fillRect(172, 128, 6, 6); g.fillRect(188, 128, 6, 6); g.strokeStyle = C.dark; g.lineWidth = 7; g.beginPath(); g.moveTo(52, 175); g.quadraticCurveTo(30, 150, 44, 120); g.stroke(); }
    if (kind === "shark") { g.fillStyle = C.blue; g.beginPath(); g.moveTo(40, 190); g.quadraticCurveTo(120, 120, 215, 185); g.quadraticCurveTo(120, 240, 40, 190); g.fill(); O(); g.fillStyle = C.blue; g.beginPath(); g.moveTo(110, 150); g.lineTo(130, 90); g.lineTo(150, 158); g.fill(); O(); g.beginPath(); g.moveTo(40, 190); g.lineTo(18, 150); g.lineTo(22, 230); g.fill(); O(); g.fillStyle = C.white; for (let i = 0; i < 6; i++) { g.beginPath(); g.moveTo(190 + i * 4, 190); g.lineTo(194 + i * 4, 202); g.lineTo(198 + i * 4, 190); g.fill(); } g.fillStyle = C.dark; g.beginPath(); g.arc(188, 178, 5, 0, 6.28); g.fill(); g.strokeStyle = C.red; g.lineWidth = 5; for (let i = 0; i < 3; i++) { g.beginPath(); g.moveTo(80 + i * 22, 190); g.lineTo(88 + i * 22, 218); g.stroke(); } }
    if (kind === "buffalo") { g.fillStyle = C.dark; g.beginPath(); g.ellipse(125, 190, 78, 44, 0, 0, 6.28); g.fill(); g.fillStyle = "#4a2a14"; g.beginPath(); g.arc(190, 170, 30, 0, 6.28); g.fill(); g.strokeStyle = C.white; g.lineWidth = 9; g.beginPath(); g.arc(178, 140, 22, 3.6, 5.6); g.stroke(); g.beginPath(); g.arc(210, 140, 22, 3.9, 5.9); g.stroke(); g.fillStyle = C.dark; for (const x of [70, 100, 150, 170]) g.fillRect(x, 215, 14, 50); g.fillStyle = C.red; g.fillRect(100, 170, 40, 8); }
    if (kind === "sun") { g.fillStyle = C.red; for (let a = 0; a < 16; a++) { g.beginPath(); g.moveTo(128, 170); g.lineTo(128 + Math.cos(a / 16 * 6.28) * 92, 170 + Math.sin(a / 16 * 6.28) * 92); g.lineTo(128 + Math.cos((a + 0.5) / 16 * 6.28) * 92, 170 + Math.sin((a + 0.5) / 16 * 6.28) * 92); g.fill(); } g.fillStyle = C.yellow; g.beginPath(); g.arc(128, 170, 48, 0, 6.28); g.fill(); O(); g.fillStyle = C.dark; g.fillRect(110, 160, 10, 10); g.fillRect(138, 160, 10, 10); g.fillRect(114, 188, 30, 5); }
    if (kind === "snake") { g.strokeStyle = C.green; g.lineWidth = 22; g.lineCap = "round"; g.beginPath(); g.moveTo(60, 270); g.bezierCurveTo(200, 250, 40, 190, 190, 150); g.bezierCurveTo(230, 140, 210, 80, 150, 80); g.stroke(); g.strokeStyle = C.yellow; g.lineWidth = 6; g.setLineDash([10, 16]); g.stroke(); g.setLineDash([]); g.fillStyle = C.red; g.beginPath(); g.arc(148, 80, 16, 0, 6.28); g.fill(); }
    if (kind === "bird") { g.fillStyle = C.green; g.beginPath(); g.ellipse(120, 190, 52, 30, -0.3, 0, 6.28); g.fill(); O(); g.beginPath(); g.arc(165, 150, 20, 0, 6.28); g.fill(); O(); g.fillStyle = C.yellow; g.beginPath(); g.moveTo(182, 148); g.lineTo(214, 156); g.lineTo(182, 162); g.fill(); O(); g.fillStyle = C.red; g.beginPath(); g.moveTo(80, 170); g.lineTo(40, 120); g.lineTo(60, 200); g.fill(); O(); g.fillStyle = C.blue; g.beginPath(); g.moveTo(110, 170); g.lineTo(130, 110); g.lineTo(150, 178); g.fill(); O(); }
  });
}
export function reliefPanel(kind, w = 1.7, h = 2.1) { const m = new THREE.MeshStandardMaterial({ map: reliefTexture(kind), roughness: 0.9 }); const p = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.12), m); p.castShadow = true; return p; }

/* ---------- hipped thatch roof ---------- */
function hippedRoof(w, d, h, over, material) {
  const hw = w / 2 + over, hd = d / 2 + over, rl = Math.max(0.2, hw - hd * 0.85), P = [[-hw, 0, hd], [hw, 0, hd], [hw, 0, -hd], [-hw, 0, -hd], [-rl, h, 0], [rl, h, 0]], pos = [], uv = [], idx = [];
  const tri = (a, b, c, ua, ub, uc) => { const base = pos.length / 3; for (const k of [a, b, c]) pos.push(...P[k]); uv.push(...ua, ...ub, ...uc); idx.push(base, base + 1, base + 2); };
  const L = Math.hypot(h, hd), s = 2.2;
  tri(0, 1, 5, [0, 0], [2 * hw / s, 0], [(hw + rl) / s, L / s]); tri(0, 5, 4, [0, 0], [(hw + rl) / s, L / s], [(hw - rl) / s, L / s]);
  tri(2, 3, 4, [0, 0], [2 * hw / s, 0], [(hw - rl) / s, L / s]); tri(2, 4, 5, [0, 0], [(hw - rl) / s, L / s], [(hw + rl) / s, L / s]);
  const L2 = Math.hypot(h, hw - rl); tri(1, 2, 5, [0, 0], [2 * hd / s, 0], [hd / s, L2 / s]); tri(3, 0, 4, [0, 0], [2 * hd / s, 0], [hd / s, L2 / s]);
  const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals();
  const r = mesh(g, material); const ridge = mesh(new THREE.CylinderGeometry(0.09, 0.11, rl * 2, 8), material); ridge.rotation.z = Math.PI / 2; ridge.position.y = h + 0.02; r.add(ridge); return r;
}

export function fonHouse(group, { w = 6, d = 4.2, relief = null, doorSide = 1, tint = 0xe0b98a }) {
  const m = mats(), wallM = m.wall.clone(); wallM.color.setHex(tint); const H = 2.75;
  const body = mesh(boxUV(w, H, d, 2.2), wallM); body.position.y = H / 2 + 0.25; group.add(body);
  const plinth = mesh(boxUV(w + 0.12, 0.5, d + 0.12, 2), m.earth); plinth.position.y = 0.25; group.add(plinth);
  const band = mesh(new THREE.BoxGeometry(w + 0.04, 0.1, d + 0.04), mats().dark); band.position.y = 0.55; group.add(band);
  const roof = hippedRoof(w, d, 2.2, 0.75, m.thatch); roof.position.y = H + 0.25; group.add(roof);
  const dz = d / 2 * doorSide; const door = mesh(new THREE.BoxGeometry(1.05, 2.1, 0.1), m.plank); door.position.set(0, 1.3, dz + 0.04 * doorSide); group.add(door);
  const frame = mesh(new THREE.BoxGeometry(1.25, 2.25, 0.08), m.dark); frame.position.set(0, 1.38, dz + 0.01 * doorSide); group.add(frame);
  for (const s of [-1, 1]) { const win = mesh(new THREE.BoxGeometry(0.6, 0.5, 0.08), m.dark); win.position.set(s * (w / 2 - 1.3), 2.2, dz + 0.02 * doorSide); const sh = mesh(new THREE.BoxGeometry(0.5, 0.4, 0.04), new THREE.MeshStandardMaterial({ color: 0x120d08, roughness: 0.6 })); sh.position.set(s * (w / 2 - 1.3), 2.2, dz + 0.07 * doorSide); group.add(win, sh); }
  if (relief) for (const [i, k] of relief.entries()) { const p = reliefPanel(k, 0.9, 1.1); p.position.set(-1.9 + i * 1.9 + (relief.length === 1 ? 1.9 : 0), 2.05, dz + 0.07 * doorSide); group.add(p); }
  // veranda posts
  for (const s of [-1, 1]) { const po = mesh(new THREE.CylinderGeometry(0.09, 0.11, 2.9, 7), m.dark); po.position.set(s * (w / 2 - 0.2), 1.7, dz + 0.9 * doorSide); group.add(po); }
  const vroof = mesh(new THREE.BoxGeometry(w * 0.9, 0.14, 1.2), m.thatch); vroof.position.set(0, 3.15, dz + 0.85 * doorSide); vroof.rotation.x = -0.12 * doorSide; group.add(vroof);
  return group;
}
export function granary(group) { const m = mats(); const legs = []; for (let i = 0; i < 5; i++) { const a = i / 5 * 6.28, l = mesh(new THREE.CylinderGeometry(0.1, 0.12, 0.8, 6), m.dark); l.position.set(Math.cos(a) * 0.8, 0.4, Math.sin(a) * 0.8); group.add(l); }
  const b = mesh(new THREE.CylinderGeometry(1.05, 1.1, 1.5, 14), m.wall); b.position.y = 1.55; group.add(b); const r = mesh(new THREE.ConeGeometry(1.55, 1.5, 14), m.thatch); r.position.y = 3.05; group.add(r); const door = mesh(new THREE.BoxGeometry(0.4, 0.5, 0.1), m.dark); door.position.set(0, 1.4, 1.08); group.add(door); return group; }
export function mudWall(group, len, h = 1.1, thick = 0.38) { const m = mats(), w = mesh(boxUV(len, h, thick, 2), m.wallDark); w.position.y = h / 2; group.add(w); const cap = mesh(new THREE.CylinderGeometry(thick * 0.6, thick * 0.6, len, 8), m.thatch); cap.rotation.z = Math.PI / 2; cap.position.y = h + 0.04; group.add(cap); return group; }

/* ---------- small props ---------- */
export function jar(r = 0.3) { const pts = [[0.001, 0], [r * 0.7, 0.01], [r, r * 0.8], [r * 0.95, r * 1.7], [r * 0.55, r * 2.1], [r * 0.6, r * 2.35], [r * 0.5, r * 2.4]].map(([a, b]) => new THREE.Vector2(a, b)); const j = mesh(new THREE.LatheGeometry(pts, 14), new THREE.MeshStandardMaterial({ color: 0xa8532a, roughness: 0.8, side: THREE.DoubleSide })); return j; }
export function drumProp() { const g = new THREE.Group(), body = mesh(new THREE.CylinderGeometry(0.34, 0.26, 0.9, 14), pbr("fine_grained_wood", 1, { color: 0x8a5a2e })); body.position.y = 0.5; const skin = mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.03, 14), new THREE.MeshStandardMaterial({ color: 0xe8dcc0, roughness: 0.7 })); skin.position.y = 0.97; g.add(body, skin); for (let i = 0; i < 8; i++) { const a = i / 8 * 6.28, c = mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.6, 3), new THREE.MeshStandardMaterial({ color: 0xcbb98a })); c.position.set(Math.cos(a) * 0.32, 0.65, Math.sin(a) * 0.32); c.rotation.z = Math.cos(a) * 0.14; c.rotation.x = -Math.sin(a) * 0.14; g.add(c); } return g; }
export function stall(color = 0xb02a2a) { const g = new THREE.Group(), m = mats(); const t = mesh(new THREE.BoxGeometry(2.4, 0.85, 1.1), m.plank); t.position.y = 0.45; g.add(t); for (const sx of [-1, 1]) for (const sz of [-1, 1]) { const p = mesh(new THREE.CylinderGeometry(0.05, 0.06, 2.4, 6), m.dark); p.position.set(sx * 1.15, 1.2, sz * 0.5); g.add(p); }
  const cl = mesh(new THREE.BoxGeometry(2.8, 0.05, 1.9), cloth("wax", "#" + color.toString(16).padStart(6, "0"), "#f2eee0", "#e0a93b")); cl.position.set(0, 2.4, 0); cl.rotation.x = 0.18; g.add(cl);
  for (let i = 0; i < 6; i++) { const f = mesh(new THREE.SphereGeometry(0.13, 8, 6), new THREE.MeshStandardMaterial({ color: [0xe0a93b, 0xb02a2a, 0x6fae3a][i % 3], roughness: 0.6 })); f.position.set(-0.9 + i * 0.36, 0.98, 0.1); g.add(f); } const j = jar(0.22); j.position.set(1.7, 0, 0.3); g.add(j); return g; }
export function fire(group) { const m = new THREE.Group(); for (let i = 0; i < 6; i++) { const l = mesh(new THREE.CylinderGeometry(0.05, 0.06, 0.8, 5), mats().dark); const a = i / 6 * 6.28; l.position.set(Math.cos(a) * 0.2, 0.25, Math.sin(a) * 0.2); l.rotation.set(Math.sin(a) * 0.9, 0, -Math.cos(a) * 0.9); m.add(l); } for (let i = 0; i < 9; i++) { const s = mesh(new THREE.DodecahedronGeometry(0.17, 0), new THREE.MeshStandardMaterial({ color: 0x77706a, roughness: 1 })); const a = i / 9 * 6.28; s.position.set(Math.cos(a) * 0.62, 0.1, Math.sin(a) * 0.62); s.scale.y = 0.7; m.add(s); }
  const flame = new THREE.Mesh(new THREE.ConeGeometry(0.28, 0.9, 7), new THREE.MeshBasicMaterial({ color: 0xff8a2a, transparent: true, opacity: 0.9 })); flame.position.y = 0.55; const core = new THREE.Mesh(new THREE.ConeGeometry(0.15, 0.55, 6), new THREE.MeshBasicMaterial({ color: 0xffe08a })); core.position.y = 0.4; m.add(flame, core); m.userData.flame = flame; m.userData.core = core; group.add(m); return m; }

/* ---------- ship ---------- */
export function buildShip() {
  const g = new THREE.Group(), wood = pbr("dark_wood", 3, { color: 0x6a4a30 }), deck = pbr("fine_grained_wood", 2, { color: 0xb8905f });
  const s = new THREE.Shape(); s.moveTo(-14, 1.5); s.lineTo(-13, -1.8); s.quadraticCurveTo(0, -3.2, 12, -1.5); s.quadraticCurveTo(17, 0.5, 19, 3.2); s.lineTo(-14, 3.2); s.closePath();
  const hull = mesh(new THREE.ExtrudeGeometry(s, { depth: 7, bevelEnabled: true, bevelSize: 0.5, bevelThickness: 0.5, bevelSegments: 2, steps: 1 }), wood); hull.position.z = -3.5; hull.geometry.translate(0, 0, 0); g.add(hull);
  const dk = mesh(new THREE.BoxGeometry(32, 0.15, 6.4), deck); dk.position.set(2.5, 3.3, 0); g.add(dk);
  const castle = mesh(new THREE.BoxGeometry(7, 2.6, 6.2), wood); castle.position.set(-10, 4.6, 0); g.add(castle); const stripe = mesh(new THREE.BoxGeometry(32.5, 0.25, 7.2), new THREE.MeshStandardMaterial({ color: 0xe9e3d0, roughness: 0.8 })); stripe.position.set(2.5, 2.2, 0); g.add(stripe);
  const sailM = new THREE.MeshStandardMaterial({ color: 0xf1ead6, roughness: 0.9, side: THREE.DoubleSide });
  for (const [x, hh, sw] of [[-6, 22, 13], [3, 26, 15], [11, 21, 12]]) { const mast = mesh(new THREE.CylinderGeometry(0.28, 0.4, hh, 8), wood); mast.position.set(x, 3.3 + hh / 2, 0); g.add(mast);
    for (const [yy, ww, hh2] of [[0.38, sw, 8], [0.72, sw * 0.8, 6]]) { const sg = new THREE.PlaneGeometry(ww, hh2, 12, 8), p = sg.attributes.position; for (let i = 0; i < p.count; i++) p.setZ(i, 1.7 * Math.sin((p.getX(i) / ww + 0.5) * Math.PI) * Math.cos(p.getY(i) / hh2 * 1.2)); sg.computeVertexNormals(); const sail = mesh(sg, sailM); sail.rotation.y = Math.PI / 2; sail.position.set(x + 0.5, 3.3 + hh * yy + hh2 / 2, 0); g.add(sail); const yard = mesh(new THREE.CylinderGeometry(0.16, 0.16, ww + 1, 6), wood); yard.rotation.x = Math.PI / 2; yard.position.set(x, 3.3 + hh * yy + hh2, 0); g.add(yard); } }
  const flag = mesh(new THREE.PlaneGeometry(3, 1.6, 6, 1), new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide, map: canvasTex(3, 1, (c) => { c.fillStyle = "#2b3a8c"; c.fillRect(0, 0, 1, 1); c.fillStyle = "#f4f0e2"; c.fillRect(1, 0, 1, 1); c.fillStyle = "#b02a2a"; c.fillRect(2, 0, 1, 1); }) }), false); flag.position.set(3, 3.3 + 26 + 1, 0.2); flag.rotation.y = Math.PI / 2; g.add(flag); g.userData.flag = flag; return g;
}
