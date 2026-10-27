import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { tex, canvasTex, addWind, scaleUV } from "./assets.js";

const V3 = THREE.Vector3;
function barkMat(scaleU = 3, scaleV = 6, tint = 0xffffff) { const m = new THREE.MeshStandardMaterial({ map: tex("bark_brown_01", "diff").clone(), normalMap: tex("bark_brown_01", "nor").clone(), roughness: 1, color: tint }); for (const t of [m.map, m.normalMap]) { t.repeat.set(scaleU, scaleV); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.needsUpdate = true; } return m; }
function leafTex() {
  return canvasTex(256, 256, (g, w, h) => { g.clearRect(0, 0, w, h); for (let i = 0; i < 90; i++) { const x = 20 + Math.random() * (w - 40), y = 20 + Math.random() * (h - 40), d = Math.hypot(x - w / 2, y - h / 2); if (d > 118) continue; const a = Math.random() * 6.28, L = 16 + Math.random() * 14, hue = 80 + Math.random() * 40, l = 18 + Math.random() * 24; g.save(); g.translate(x, y); g.rotate(a); g.fillStyle = `hsl(${hue},55%,${l}%)`; g.beginPath(); g.ellipse(0, 0, L, L * 0.38, 0, 0, 6.28); g.fill(); g.restore(); } });
}
/* a tapered trunk with a gentle bend, built from a lathe (bark UVs wrap around) */
function trunkGeo(h, r0, r1, bend, seg = 14, flare = 0) {
  const pts = []; for (let i = 0; i <= 12; i++) { const t = i / 12; const r = r0 + (r1 - r0) * Math.pow(t, 0.8) + flare * Math.exp(-t * 9) + Math.sin(t * 40) * 0.01; pts.push(new THREE.Vector2(r, t * h)); }
  const g = new THREE.LatheGeometry(pts, seg), p = g.attributes.position; for (let i = 0; i < p.count; i++) { const t = p.getY(i) / h; p.setX(i, p.getX(i) + bend * t * t); } g.computeVertexNormals(); return g;
}
function frondGeo(len = 3.6, n = 16, wd = 0.62) {
  const pos = [], col = [], idx = []; const rib = (t) => new V3(0, t * len * 0.28 - t * t * len * 0.5, t * len);
  for (let i = 0; i <= n; i++) { const t = i / n, p = rib(t), L = wd * (0.2 + Math.sin(Math.PI * Math.pow(t, 0.8)) * 0.95) * (i % 2 ? 0.82 : 1);
    for (const s of [-1, 1]) { pos.push(p.x + s * L, p.y - L * 0.5 - t * 0.25, p.z + L * 0.35); const k = 0.2 + t * 0.45; col.push(0.12 + k * 0.25, 0.28 + k * 0.45, 0.08 + k * 0.1); }
    pos.push(p.x, p.y, p.z); const k2 = 0.12 + t * 0.2; col.push(0.1 + k2 * 0.2, 0.2 + k2 * 0.5, 0.06); }
  for (let i = 0; i < n; i++) { const a = i * 3, b = (i + 1) * 3; idx.push(a, b, a + 2, b, b + 2, a + 2); idx.push(a + 1, a + 2, b + 1, b + 1, a + 2, b + 2); }
  const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute("color", new THREE.Float32BufferAttribute(col, 3)); g.setIndex(idx); g.computeVertexNormals(); return g;
}
function palmCrown() {
  const parts = []; for (let k = 0; k < 13; k++) { const g = frondGeo(3.3 + Math.random() * 0.8, 16, 0.55 + Math.random() * 0.15); const a = k / 13 * Math.PI * 2 + Math.random() * 0.3, pitch = -0.25 + Math.random() * 0.45 + (k % 2) * 0.3; g.rotateX(-pitch); g.rotateY(a); parts.push(g); } return mergeGeometries(parts);
}
function canopyGeo(R, n, spread = 1) {
  const parts = []; for (let i = 0; i < n; i++) { const g = new THREE.PlaneGeometry(2.3, 2.3), c = new V3(Math.random() * 2 - 1, Math.random() * 0.8 - 0.1, Math.random() * 2 - 1).normalize().multiplyScalar(R * (0.35 + Math.random() * 0.65) * spread); g.rotateY(Math.random() * 6.28); g.rotateX((Math.random() - 0.5) * 1.6); g.rotateZ(Math.random() * 6.28); g.translate(c.x, c.y * 0.8, c.z);
    const p = g.attributes.position, nrm = g.attributes.normal, col = new Float32Array(p.count * 3); for (let k = 0; k < p.count; k++) { const d = new V3(p.getX(k) - 0, p.getY(k) + R * 0.1, p.getZ(k) - 0).normalize(); nrm.setXYZ(k, d.x, d.y, d.z); const sh = 0.55 + Math.max(0, p.getY(k) / (R * 1.3)) * 0.6; col[k * 3] = sh; col[k * 3 + 1] = sh; col[k * 3 + 2] = sh * 0.9; } g.setAttribute("color", new THREE.BufferAttribute(col, 3)); parts.push(g); }
  return mergeGeometries(parts);
}

export function buildFoliage(scene, { R, keep, height, pathDist, addC, areaX = [-95, 120], areaZ = [-95, 95] }) {
  const upd = [];
  // --- round trees (iroko / silk-cotton style) ---
  const rnd = [], palm = []; let tries = 0;
  while ((rnd.length < 150 || palm.length < 80) && tries++ < 9000) { const x = areaX[0] + R() * (areaX[1] - areaX[0]), z = areaZ[0] + R() * (areaZ[1] - areaZ[0]); if (!keep(x, z)) continue; if (x > 30 && palm.length < 80 && R() < 0.7) palm.push([x, z]); else if (rnd.length < 150) rnd.push([x, z]); }
  const M4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), sc = new V3(), p3 = new V3(), cc = new THREE.Color();
  const tTrunk = trunkGeo(4.2, 0.34, 0.2, 0.2, 10, 0.45), tCan = canopyGeo(2.5, 34), leaf = leafTex();
  const treeTrunk = new THREE.InstancedMesh(tTrunk, barkMat(2, 3), rnd.length), canMat = new THREE.MeshStandardMaterial({ map: leaf, alphaTest: 0.5, vertexColors: true, side: THREE.DoubleSide, roughness: 0.9 }); addWind(canMat, 0.7);
  const treeCan = new THREE.InstancedMesh(tCan, canMat, rnd.length);
  rnd.forEach(([x, z], i) => { const y = height(x, z), s = 0.85 + R() * 0.8; q.setFromEuler(e.set(0, R() * 6.28, 0)); M4.compose(p3.set(x, y - 0.1, z), q, sc.set(s, s * (0.9 + R() * 0.3), s)); treeTrunk.setMatrixAt(i, M4); M4.compose(p3.set(x, y + 4.2 * s, z), q, sc.set(s * (1 + R() * 0.25), s * 0.95, s)); treeCan.setMatrixAt(i, M4); treeCan.setColorAt(i, cc.setHSL(0.22 + R() * 0.1, 0.5, 0.45 + R() * 0.15)); addC(x, z, 0.55 * s); });
  // --- palms ---
  const pTrunk = new THREE.InstancedMesh(trunkGeo(7, 0.22, 0.13, 0.9, 10, 0.1), barkMat(1.5, 5, 0xc8b9a0), palm.length);
  const pm = new THREE.MeshStandardMaterial({ vertexColors: true, side: THREE.DoubleSide, roughness: 0.75 }); addWind(pm, 1.6); const pCrown = new THREE.InstancedMesh(palmCrown(), pm, palm.length);
  palm.forEach(([x, z], i) => { const y = height(x, z), s = 0.8 + R() * 0.55, ry = R() * 6.28; q.setFromEuler(e.set(0, ry, 0)); M4.compose(p3.set(x, y - 0.1, z), q, sc.set(s, s, s)); pTrunk.setMatrixAt(i, M4); const top = new V3(0.9 * s, 7 * s, 0).applyQuaternion(q); M4.compose(p3.set(x + top.x, y + top.y - 0.15, z + top.z), q.setFromEuler(e.set(0, R() * 6.28, 0)), sc.set(s, s, s)); pCrown.setMatrixAt(i, M4); addC(x, z, 0.4 * s); });
  for (const m of [treeTrunk, treeCan, pTrunk, pCrown]) { m.castShadow = true; m.receiveShadow = true; m.instanceMatrix.needsUpdate = true; if (m.instanceColor) m.instanceColor.needsUpdate = true; scene.add(m); }
  treeCan.receiveShadow = false;
  // --- grass blades ---
  const blade = new THREE.BufferGeometry(); blade.setAttribute("position", new THREE.Float32BufferAttribute([-0.05, 0, 0, 0.05, 0, 0, -0.03, 0.5, 0.02, 0.03, 0.5, 0.02, 0, 1, 0.07], 3)); blade.setIndex([0, 1, 2, 1, 3, 2, 2, 3, 4]); blade.setAttribute("color", new THREE.Float32BufferAttribute([0.18, 0.3, 0.08, 0.18, 0.3, 0.08, 0.35, 0.5, 0.15, 0.35, 0.5, 0.15, 0.6, 0.75, 0.3], 3)); blade.computeVertexNormals();
  const gm = new THREE.MeshStandardMaterial({ vertexColors: true, side: THREE.DoubleSide, roughness: 0.9 }); addWind(gm, 3.4);
  const GN = 28000, grass = new THREE.InstancedMesh(blade, gm, GN); let gi = 0; tries = 0;
  while (gi < GN && tries++ < 60000) { const x = -85 + R() * 175, z = -85 + R() * 170; if (Math.hypot(x, z) < 8 || pathDist(x, z) < 1.8 || x > 80 || height(x, z) < 0.05) continue; const y = height(x, z), s = 0.6 + R() * 1.1; q.setFromEuler(e.set(0, R() * 6.28, (R() - 0.5) * 0.3)); M4.compose(p3.set(x, y, z), q, sc.set(s * 1.2, s * (0.28 + R() * 0.32), s)); grass.setMatrixAt(gi, M4); grass.setColorAt(gi, cc.setHSL(0.2 + R() * 0.08, 0.4 + R() * 0.2, 0.7 + R() * 0.5)); gi++; }
  grass.count = gi; grass.instanceMatrix.needsUpdate = true; grass.instanceColor.needsUpdate = true; grass.castShadow = false; grass.receiveShadow = false; scene.add(grass);
  // --- giant silk-cotton tree for the village centre ---
  const big = new THREE.Group(); big.position.set(0, height(0, -3) - 0.2, -3);
  const bt = new THREE.Mesh(trunkGeo(7, 1.0, 0.55, 0.3, 18, 1.6), barkMat(3, 4)); bt.castShadow = true; big.add(bt);
  for (let i = 0; i < 6; i++) { const a = i / 6 * 6.28, rt = new THREE.Mesh(new THREE.ConeGeometry(0.6, 3.2, 5), barkMat(1, 1)); rt.position.set(Math.cos(a) * 1.0, 1.1, Math.sin(a) * 1.0); rt.rotation.set(Math.sin(a) * 0.6, 0, -Math.cos(a) * 0.6); rt.scale.z = 0.4; rt.rotation.order = "YXZ"; rt.rotation.y = -a; rt.castShadow = true; big.add(rt); }
  const bigCan = new THREE.Mesh(canopyGeo(4.6, 110, 1.1), canMat.clone()); bigCan.material.map = leaf; addWind(bigCan.material, 0.5, false); bigCan.position.y = 8.2; bigCan.castShadow = true; big.add(bigCan); scene.add(big); addC(0, -3, 2.2);
  upd.push(() => {});
  return { update: (t) => {} };
}
