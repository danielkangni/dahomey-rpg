import * as THREE from "three";

export const std = (color, o = {}) => new THREE.MeshStandardMaterial(Object.assign({ color, roughness: 0.85, metalness: 0, flatShading: true }, o));
const box = (w, h, d, m) => { const me = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); me.castShadow = true; me.receiveShadow = false; return me; };
const cyl = (r0, r1, h, m, seg = 8) => { const me = new THREE.Mesh(new THREE.CylinderGeometry(r0, r1, h, seg), m); me.castShadow = true; return me; };
const sph = (r, m, seg = 10) => { const me = new THREE.Mesh(new THREE.SphereGeometry(r, seg, seg - 2), m); me.castShadow = true; return me; };

/* A stylised low-poly person, ~1.75 m tall. Faces +Z. */
export function makeHuman(o = {}) {
  const skin = std(o.skin ?? 0x6b3f26), cloth = std(o.cloth ?? 0x8a2f1c), accent = std(o.accent ?? 0xe0a93b), pants = std(o.pants ?? 0x4a3322);
  const g = new THREE.Group(), body = new THREE.Group(); g.add(body);
  const hip = new THREE.Group(); hip.position.y = 0.95; body.add(hip);
  const torso = box(0.52, 0.62, 0.3, cloth); torso.position.y = 0.38; hip.add(torso);
  const belt = box(0.54, 0.09, 0.32, accent); belt.position.y = 0.07; hip.add(belt);
  if (o.skirt) { const sk = cyl(0.27, 0.42, 0.55, o.skirtMat || cloth, 8); sk.position.y = -0.22; hip.add(sk); }
  const head = sph(0.17, skin); head.position.y = 0.88; hip.add(head);
  const hair = sph(0.18, std(o.hair ?? 0x14100d), 8); hair.scale.set(1, 0.7, 1); hair.position.set(0, 0.95, -0.02); hip.add(hair);
  if (o.hat === "sorcier") { const h = cyl(0.04, 0.34, 0.12, std(0xe9e3d0)); h.position.y = 1.05; hip.add(h); const c = cyl(0, 0.2, 0.5, std(0xe9e3d0)); c.position.y = 1.3; hip.add(c); const b = cyl(0.205, 0.205, 0.07, std(0x2b3a8c)); b.position.y = 1.1; hip.add(b); }
  if (o.hat === "plume") { for (let i = 0; i < 5; i++) { const f = box(0.04, 0.3, 0.02, std([0xc2562d, 0xe0a93b, 0x2f8a52, 0xb02a2a, 0x2b3a8c][i])); f.position.set((i - 2) * 0.07, 1.12, 0); f.rotation.z = (i - 2) * 0.22; hip.add(f); } }
  if (o.helmet) { const hm = sph(0.19, std(0xf2eee0), 8); hm.scale.set(1, 0.75, 1); hm.position.y = 0.95; hip.add(hm); const br = cyl(0.26, 0.26, 0.03, std(0xf2eee0), 10); br.position.y = 0.93; hip.add(br); }
  if (o.mask) { const mk = box(0.24, 0.3, 0.05, std(o.mask)); mk.position.set(0, 0.88, 0.16); hip.add(mk); }
  const arms = [], legs = [];
  for (const s of [-1, 1]) {
    const a = new THREE.Group(); a.position.set(s * 0.33, 0.62, 0); const ar = box(0.12, 0.55, 0.12, o.sleeve ? cloth : skin); ar.position.y = -0.25; a.add(ar); hip.add(a); arms.push(a);
    const l = new THREE.Group(); l.position.set(s * 0.13, 0, 0); const lg = box(0.16, 0.9, 0.17, pants); lg.position.y = -0.45; l.add(lg); hip.add(l); legs.push(l);
  }
  if (o.cape) { const c = box(0.5, 0.75, 0.04, std(o.cape)); c.position.set(0, 0.3, -0.18); hip.add(c); }
  // weapon in right hand (arms[1])
  const hand = new THREE.Group(); hand.position.set(0, -0.55, 0.08); arms[1].add(hand);
  const wood = std(0x5b3a1d), steel = std(0xc9ccd2, { metalness: 0.4, roughness: 0.4 });
  if (o.weapon === "sword") { const bl = box(0.07, 0.95, 0.03, steel); bl.position.y = 0.4; const gd = box(0.3, 0.05, 0.06, accent); const hl = box(0.05, 0.18, 0.05, wood); hl.position.y = -0.1; hand.add(bl, gd, hl); hand.rotation.x = -0.4; }
  if (o.weapon === "staff") { const st = cyl(0.03, 0.04, 1.9, wood, 6); st.position.y = 0.4; const orb = sph(0.13, std(0xffd36a, { emissive: 0xffa31a, emissiveIntensity: 1.2 }), 8); orb.position.y = 1.4; orb.castShadow = false; hand.add(st, orb); hand.userData.orb = orb; hand.rotation.x = -0.15; }
  if (o.weapon === "bow") { const bw = new THREE.Mesh(new THREE.TorusGeometry(0.55, 0.025, 6, 14, Math.PI), wood); bw.rotation.z = Math.PI / 2; bw.position.set(0.02, 0.1, 0.1); bw.castShadow = true; hand.add(bw); const sr = box(0.01, 1.1, 0.01, std(0xeeeeee)); sr.position.set(-0.0, 0.1, 0.1); sr.position.x = -0.0; hand.add(sr); hand.rotation.x = -0.2; }
  if (o.weapon === "rifle") { const rf = box(0.06, 0.08, 1.2, wood); rf.position.set(0, 0.0, 0.5); const bl = box(0.04, 0.04, 0.5, std(0x3a3a3a)); bl.position.set(0, 0.02, 1.05); hand.add(rf, bl); hand.rotation.x = -1.2; }
  if (o.weapon === "dark") { const st = cyl(0.03, 0.05, 1.8, std(0x1d1210), 6); st.position.y = 0.4; const orb = sph(0.16, std(0xd0221f, { emissive: 0xaa0e0e, emissiveIntensity: 1.4 }), 8); orb.position.y = 1.4; orb.castShadow = false; hand.add(st, orb); hand.userData.orb = orb; hand.rotation.x = -0.15; }
  if (o.weapon === "stick") { const st = cyl(0.025, 0.03, 1.5, wood, 6); st.position.y = 0.3; hand.add(st); }
  g.userData = { body, hip, arms, legs, hand, phase: 0, swing: 0 };
  g.scale.setScalar(o.scale ?? 1);
  return g;
}

/* walk cycle driven by speed (m/s) */
export function animateHuman(g, dt, speed, attack = 0) {
  const u = g.userData; u.phase += dt * (3 + speed * 1.6); const k = Math.min(1, speed / 3), s = Math.sin(u.phase) * 0.9 * k;
  u.legs[0].rotation.x = s; u.legs[1].rotation.x = -s; u.arms[0].rotation.x = -s * 0.8;
  u.arms[1].rotation.x = attack > 0 ? -1.6 + attack * 2.2 : s * 0.8 * (g.userData.rifle ? 0.2 : 1);
  u.hip.position.y = 0.95 + Math.abs(Math.cos(u.phase)) * 0.04 * k;
  const orb = u.hand.userData.orb; if (orb) orb.material.emissiveIntensity = 1.0 + Math.sin(u.phase * 1.7) * 0.3;
}
export { box, cyl, sph };
