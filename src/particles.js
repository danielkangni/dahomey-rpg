import * as THREE from "three";
import { canvasTex } from "./assets.js";
const spr = canvasTex(64, 64, (g) => { const r = g.createRadialGradient(32, 32, 1, 32, 32, 30); r.addColorStop(0, "rgba(255,255,255,1)"); r.addColorStop(0.4, "rgba(255,255,255,.5)"); r.addColorStop(1, "rgba(255,255,255,0)"); g.fillStyle = r; g.fillRect(0, 0, 64, 64); });
/* Small point-sprite system: ambient dust/pollen around the player, embers over fires, fireflies at the forest shrine. */
export class Particles {
  constructor(scene, count, color, size, additive = true) {
    this.n = count; this.pos = new Float32Array(count * 3); this.vel = new Float32Array(count * 3); this.life = new Float32Array(count);
    const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.BufferAttribute(this.pos, 3));
    this.pts = new THREE.Points(g, new THREE.PointsMaterial({ map: spr, color, size, transparent: true, depthWrite: false, blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending, opacity: 0.8, sizeAttenuation: true })); this.pts.frustumCulled = false; scene.add(this.pts);
  }
}
export function dustField(scene) { const P = new Particles(scene, 260, 0xffe2a8, 0.1); for (let i = 0; i < P.n; i++) { P.pos[i * 3] = (Math.random() - 0.5) * 40; P.pos[i * 3 + 1] = Math.random() * 8; P.pos[i * 3 + 2] = (Math.random() - 0.5) * 40; P.vel[i * 3] = (Math.random() - 0.5) * 0.4; P.vel[i * 3 + 1] = (Math.random() - 0.3) * 0.15; P.vel[i * 3 + 2] = (Math.random() - 0.5) * 0.4; }
  P.update = (dt, cx, cy, cz) => { for (let i = 0; i < P.n; i++) { const k = i * 3; P.pos[k] += P.vel[k] * dt; P.pos[k + 1] += P.vel[k + 1] * dt; P.pos[k + 2] += P.vel[k + 2] * dt; for (const a of [0, 2]) if (P.pos[k + a] - (a ? cz : cx) > 20) P.pos[k + a] -= 40; else if (P.pos[k + a] - (a ? cz : cx) < -20) P.pos[k + a] += 40; if (P.pos[k + 1] > cy + 8 || P.pos[k + 1] < cy - 2) P.pos[k + 1] = cy + Math.random() * 6; } P.pts.geometry.attributes.position.needsUpdate = true; }; return P; }
export function emberField(scene, fires) { const P = new Particles(scene, 120, 0xff9a40, 0.16); P.src = fires; for (let i = 0; i < P.n; i++) P.life[i] = Math.random();
  P.update = (dt) => { for (let i = 0; i < P.n; i++) { const k = i * 3; P.life[i] -= dt * 0.35; if (P.life[i] <= 0) { const f = P.src[i % P.src.length]; P.life[i] = 0.6 + Math.random() * 0.8; P.pos[k] = f.x + (Math.random() - 0.5) * 0.4; P.pos[k + 1] = f.y + 0.7; P.pos[k + 2] = f.z + (Math.random() - 0.5) * 0.4; P.vel[k] = (Math.random() - 0.5) * 0.5; P.vel[k + 1] = 0.8 + Math.random() * 1.1; P.vel[k + 2] = (Math.random() - 0.5) * 0.5; } P.pos[k] += P.vel[k] * dt; P.pos[k + 1] += P.vel[k + 1] * dt; P.pos[k + 2] += P.vel[k + 2] * dt; } P.pts.geometry.attributes.position.needsUpdate = true; }; return P; }
