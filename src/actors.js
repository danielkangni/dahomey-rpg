import * as THREE from "three";
import { makeHuman, animateHuman, std, sph } from "./models.js";
import { height, SEA_LEVEL } from "./world.js";
import { CLASSES, SPIRITS } from "./data.js";
import { dmgOf } from "./state.js";
import { sfxs } from "./audio.js";

const V = THREE.Vector3;
export const BOUNDS = { x0: -92, x1: 90, z0: -90, z1: 90 };
export function moveCollide(o, dx, dz, r, world) {
  const nx = o.x + dx, nz = o.z + dz;
  if (height(nx, nz) > SEA_LEVEL + 0.2 && nx > BOUNDS.x0 && nx < BOUNDS.x1 && nz > BOUNDS.z0 && nz < BOUNDS.z1) { o.x = nx; o.z = nz; }
  else if (height(nx, o.z) > SEA_LEVEL + 0.2 && nx > BOUNDS.x0 && nx < BOUNDS.x1) o.x = nx;
  else if (height(o.x, nz) > SEA_LEVEL + 0.2 && nz > BOUNDS.z0 && nz < BOUNDS.z1) o.z = nz;
  for (const c of world.colliders) { const ddx = o.x - c.x, ddz = o.z - c.z, rr = c.r + r; if (ddx * ddx + ddz * ddz < rr * rr) { const d = Math.sqrt(ddx * ddx + ddz * ddz) || 0.001; o.x = c.x + ddx / d * rr; o.z = c.z + ddz / d * rr; } }
}

/* ---------- effects ---------- */
export class FX {
  constructor(scene, camera) { this.scene = scene; this.cam = camera; this.list = []; }
  add(mesh, life, fn) { this.scene.add(mesh); this.list.push({ mesh, life, max: life, fn }); }
  ring(x, y, z, color, maxR = 4, life = 0.5) { const m = new THREE.Mesh(new THREE.RingGeometry(0.85, 1, 28), new THREE.MeshBasicMaterial({ color, transparent: true, side: THREE.DoubleSide, depthWrite: false })); m.rotation.x = -Math.PI / 2; m.position.set(x, y + 0.15, z); this.add(m, life, (t) => { m.scale.setScalar(0.3 + t * maxR); m.material.opacity = 1 - t; }); }
  bolt(x, y, z, color = 0xc9b3ff) { const m = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.5, 40, 6), new THREE.MeshBasicMaterial({ color, transparent: true })); m.position.set(x, y + 20, z); this.add(m, 0.35, (t) => { m.material.opacity = 1 - t; m.scale.x = m.scale.z = 1 + t * 0.6; }); this.ring(x, y, z, color, 3, 0.4); }
  text(x, y, z, str, color = "#fff") {
    const c = document.createElement("canvas"); c.width = 160; c.height = 64; const g = c.getContext("2d"); g.font = "bold 44px Georgia"; g.textAlign = "center"; g.lineWidth = 6; g.strokeStyle = "#000"; g.strokeText(str, 80, 46); g.fillStyle = color; g.fillText(str, 80, 46);
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthTest: false })); s.scale.set(1.6, 0.64, 1); s.position.set(x, y + 2.2, z); s.renderOrder = 10; this.add(s, 0.9, (t) => { s.position.y = y + 2.2 + t * 1.3; s.material.opacity = 1 - t * t; });
  }
  hit(x, y, z, color = 0xffe08a) { for (let i = 0; i < 6; i++) { const m = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 0.12), new THREE.MeshBasicMaterial({ color })); m.position.set(x, y + 1, z); const v = new V((Math.random() - 0.5) * 5, Math.random() * 4, (Math.random() - 0.5) * 5); this.add(m, 0.4, (t) => { m.position.addScaledVector(v, 0.016); v.y -= 0.2; m.scale.setScalar(1 - t); }); } }
  update(dt) { for (let i = this.list.length - 1; i >= 0; i--) { const f = this.list[i]; f.life -= dt; const t = 1 - f.life / f.max; f.fn && f.fn(Math.min(1, t)); if (f.life <= 0) { this.scene.remove(f.mesh); f.mesh.traverse && f.mesh.traverse((o) => { o.geometry && o.geometry.dispose(); if (o.material) { o.material.map && o.material.map.dispose(); o.material.dispose(); } }); this.list.splice(i, 1); } } }
}

/* ---------- projectiles ---------- */
export class Shots {
  constructor(scene) { this.scene = scene; this.list = []; }
  fire(o) { // {x,y,z,dx,dz,speed,dmg,friendly,pierce,color,life,size}
    const m = new THREE.Mesh(o.arrow ? new THREE.CylinderGeometry(0.03, 0.03, 0.9, 5) : new THREE.SphereGeometry(o.size || 0.25, 8, 6), new THREE.MeshBasicMaterial({ color: o.color || 0xffffff }));
    if (o.arrow) { m.rotation.z = Math.PI / 2; m.rotation.y = -Math.atan2(o.dz, o.dx); m.rotation.order = "YXZ"; m.rotation.set(0, Math.atan2(o.dx, o.dz), 0); const g = new THREE.Group(); const sh = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.9, 5), new THREE.MeshBasicMaterial({ color: 0xe9e3d0 })); sh.rotation.x = Math.PI / 2; g.add(sh); g.rotation.y = Math.atan2(o.dx, o.dz); m.visible = false; g.position.set(o.x, o.y, o.z); this.scene.add(g); this.list.push(Object.assign({ mesh: g, life: 1.6, hits: new Set() }, o)); return; }
    m.position.set(o.x, o.y, o.z); this.scene.add(m); this.list.push(Object.assign({ mesh: m, life: 2, hits: new Set() }, o));
  }
  update(dt, ctx) { // ctx: {enemies, player, world, fx, onEnemyHit, onPlayerHit}
    for (let i = this.list.length - 1; i >= 0; i--) {
      const s = this.list[i]; s.life -= dt; const m = s.mesh; m.position.x += s.dx * s.speed * dt; m.position.z += s.dz * s.speed * dt; let dead = s.life <= 0;
      const gy = height(m.position.x, m.position.z) + 1.1; m.position.y += (gy - m.position.y) * Math.min(1, dt * 4);
      if (s.friendly) { for (const e of ctx.enemies) { if (e.dead || s.hits.has(e)) continue; const dx = e.x - m.position.x, dz = e.z - m.position.z; if (dx * dx + dz * dz < (0.7 * e.scale) ** 2) { s.hits.add(e); ctx.onEnemyHit(e, s.dmg, s.dx, s.dz); if (!s.pierce) { dead = true; break; } } } }
      else { const p = ctx.player, dx = p.x - m.position.x, dz = p.z - m.position.z; if (dx * dx + dz * dz < 0.55 * 0.55) { ctx.onPlayerHit(s.dmg, s.dx, s.dz); dead = true; } }
      for (const c of ctx.world.colliders) { const dx = c.x - m.position.x, dz = c.z - m.position.z; if (dx * dx + dz * dz < c.r * c.r * 0.8) { dead = true; break; } }
      if (dead) { this.scene.remove(m); m.traverse((o) => { o.geometry && o.geometry.dispose(); o.material && o.material.dispose(); }); this.list.splice(i, 1); }
    }
  }
  clear() { for (const s of this.list) this.scene.remove(s.mesh); this.list.length = 0; }
}

/* ---------- player ---------- */
export class Player {
  constructor(scene, state) {
    this.scene = scene; this.s = state; const c = CLASSES[state.cls];
    this.mesh = makeHuman({ cloth: c.color, accent: c.accent, weapon: c.weapon, hat: c.id === "sorcier" ? "sorcier" : c.id === "guerrier" ? "plume" : null, cape: c.id === "guerrier" ? 0x3a1a10 : c.id === "sorcier" ? 0x1a2260 : 0x1f4a28, sleeve: c.id !== "archer", pants: c.id === "archer" ? 0x3a2a1a : 0x4a3322 });
    scene.add(this.mesh); [this.x, this.z] = state.pos; this.yaw = 0; this.speed = 0; this.atk = 0; this.atkAnim = 0; this.cd = { p1: 0, p2: 0 }; this.inv = 0; this.dash = 0; this.dx = 0; this.dz = 1; this.stun = 0;
    this.shadow = new THREE.Mesh(new THREE.CircleGeometry(0.55, 14), new THREE.MeshBasicMaterial({ color: 0, transparent: true, opacity: 0.28, depthWrite: false })); this.shadow.rotation.x = -Math.PI / 2; scene.add(this.shadow);
    this.aura = new THREE.PointLight(c.id === "sorcier" ? 0xffc86a : 0xffe2b0, c.id === "sorcier" ? 3 : 0.0, 8, 2); this.mesh.add(this.aura); this.aura.position.set(0, 2, 0);
  }
  get y() { return height(this.x, this.z); }
  update(dt, inp, world, ctx) {
    const s = this.s; this.atk = Math.max(0, this.atk - dt); this.atkAnim = Math.max(0, this.atkAnim - dt * 3); this.cd.p1 = Math.max(0, this.cd.p1 - dt); this.cd.p2 = Math.max(0, this.cd.p2 - dt); this.inv = Math.max(0, this.inv - dt); this.stun = Math.max(0, this.stun - dt);
    let mx = inp.mx, mz = inp.mz; const ml = Math.hypot(mx, mz); if (ml > 1) { mx /= ml; mz /= ml; }
    const v = (inp.run ? 7.6 : 5.0) * (this.atkAnim > 0.5 ? 0.45 : 1);
    if (this.dash > 0) { this.dash -= dt; moveCollide(this, this.dx * 17 * dt, this.dz * 17 * dt, 0.45, world); }
    else if (ml > 0.05) { moveCollide(this, mx * v * dt, mz * v * dt, 0.45, world); this.dx = mx / Math.max(ml, 1); this.dz = mz / Math.max(ml, 1); const ty = Math.atan2(mx, mz); let d = ty - this.yaw; d = Math.atan2(Math.sin(d), Math.cos(d)); this.yaw += d * Math.min(1, dt * 14); }
    this.speed = this.dash > 0 ? 8 : ml > 0.05 ? v * Math.min(1, ml) : 0;
    this.mesh.position.set(this.x, this.y, this.z); this.mesh.rotation.y = this.yaw; this.shadow.position.set(this.x, this.y + 0.07, this.z); animateHuman(this.mesh, dt, this.speed, this.atkAnim);
    if (this.s.cls === "sorcier") this.aura.intensity = 2 + Object.keys(s.powers).length * 1.4;
  }
  aimTo(enemies, maxR = 16) { let best = null, bd = maxR * maxR; for (const e of enemies) { if (e.dead) continue; const d = (e.x - this.x) ** 2 + (e.z - this.z) ** 2; if (d < bd) { bd = d; best = e; } } if (best) { const dx = best.x - this.x, dz = best.z - this.z, l = Math.hypot(dx, dz); this.yaw = Math.atan2(dx, dz); return [dx / l, dz / l, best]; } return [Math.sin(this.yaw), Math.cos(this.yaw), null]; }
  attack(ctx) {
    if (this.atk > 0 || this.stun > 0) return; const c = CLASSES[this.s.cls], a = c.atk, [dx, dz] = this.aimTo(ctx.enemies, a.type === "melee" ? 5 : 22);
    this.atk = a.cd; this.atkAnim = 1;
    if (a.type === "melee") { sfxs.slash(); ctx.fx.ring(this.x + dx * 1.4, this.y, this.z + dz * 1.4, 0xffe9a0, 1.8, 0.25);
      for (const e of ctx.enemies) { if (e.dead) continue; const ex = e.x - this.x, ez = e.z - this.z, d = Math.hypot(ex, ez); if (d < a.range + 0.4 * e.scale && (ex * dx + ez * dz) / Math.max(d, 0.01) > 0.35) ctx.onEnemyHit(e, dmgOf(this.s, "melee"), dx, dz); } }
    else if (a.type === "arrow") { sfxs.arrow(); ctx.shots.fire({ x: this.x, y: this.y + 1.2, z: this.z, dx, dz, speed: 30, dmg: dmgOf(this.s, "arrow"), friendly: true, arrow: true }); }
    else { sfxs.bolt(); ctx.shots.fire({ x: this.x, y: this.y + 1.6, z: this.z, dx, dz, speed: 22, dmg: dmgOf(this.s, "bolt"), friendly: true, color: 0xffd36a, size: 0.28 }); }
  }
  power(slot, ctx) {
    const key = "p" + slot, pw = Object.values(SPIRITS).map((x) => x.power).find((p) => p.key === slot && this.s.powers[p.id]); if (!pw || this.cd[key] > 0 || this.stun > 0) return false;
    const [dx, dz, tgt] = this.aimTo(ctx.enemies, 20), s = this.s; this.cd[key] = pw.cd; this.atkAnim = 1;
    if (pw.id === "pas") { sfxs.dash(); this.dash = 0.22; this.inv = 0.4; const m = Math.hypot(this.dx, this.dz) || 1; this.dx /= m; this.dz /= m; ctx.fx.ring(this.x, this.y, this.z, 0xff5050, 3, 0.4); }
    if (pw.id === "eclair") { sfxs.thunder(); let best = null, bd = 26 * 26; for (const e of ctx.enemies) { if (e.dead) continue; const d = (e.x - this.x) ** 2 + (e.z - this.z) ** 2; if (d < bd) { bd = d; best = e; } } if (!best) { this.cd[key] = 0.5; ctx.toast("Aucun ennemi à portée."); return false; } ctx.fx.bolt(best.x, best.y, best.z); ctx.onEnemyHit(best, Math.round(30 + s.stats.spi * 4 + s.lv * 2), 0, 0, true); for (const e of ctx.enemies) if (!e.dead && e !== best && (e.x - best.x) ** 2 + (e.z - best.z) ** 2 < 9) ctx.onEnemyHit(e, Math.round(14 + s.stats.spi * 1.5), 0, 0, true); }
    if (pw.id === "frappe") { sfxs.hit(); ctx.fx.ring(this.x, this.y, this.z, 0xff9a3a, 4.6, 0.5); for (const e of ctx.enemies) if (!e.dead && (e.x - this.x) ** 2 + (e.z - this.z) ** 2 < 4.8 * 4.8) { ctx.onEnemyHit(e, Math.round(14 + s.stats.str * 2.2 + s.lv), e.x - this.x, e.z - this.z); e.stun = 1.6; } }
    if (pw.id === "tir") { sfxs.arrow(); const base = Math.atan2(dx, dz); for (const d of [-0.22, 0, 0.22]) ctx.shots.fire({ x: this.x, y: this.y + 1.2, z: this.z, dx: Math.sin(base + d), dz: Math.cos(base + d), speed: 32, dmg: Math.round(dmgOf(s, "arrow") * 0.9), friendly: true, arrow: true, pierce: true }); }
    return true;
  }
  hurt(dmg, ctx) { if (this.inv > 0) return false; this.inv = 0.45; this.s.hp = Math.max(0, this.s.hp - dmg); sfxs.hurt(); ctx.fx.text(this.x, this.y, this.z, "-" + dmg, "#ff6b60"); ctx.fx.hit(this.x, this.y, this.z, 0xff5a4a); return true; }
}

/* ---------- enemies ---------- */
const TYPES = {
  soldat: { name: "Soldat étranger", hp: 46, dmg: 9, speed: 3.3, xp: 26, ranged: true, scale: 1, opts: { cloth: 0x2a3f7a, pants: 0xe9e3d0, helmet: true, weapon: "rifle", accent: 0xe0a93b, sleeve: true, skin: 0xd7a07f, cape: 0xb02a2a } },
  boss: { name: "Agbo le Traître", hp: 300, dmg: 13, speed: 3.6, xp: 180, ranged: true, scale: 1.35, boss: true, opts: { cloth: 0x1a1013, pants: 0x14100d, mask: 0xb02a2a, weapon: "dark", accent: 0xb02a2a, sleeve: true, cape: 0x4a0d0d, hat: "plume" } },
};
export class Enemies {
  constructor(scene, world, cam) { this.scene = scene; this.world = world; this.cam = cam; this.list = []; this.bars = []; }
  spawn(type, x, z) {
    const T = TYPES[type], m = makeHuman(T.opts); m.scale.multiplyScalar(T.scale); m.userData.rifle = !!T.ranged; this.scene.add(m);
    const e = { type, T, x, z, hx: x, hz: z, y: height(x, z), mesh: m, hp: T.hp, max: T.hp, dead: false, scale: T.scale, cd: 1 + Math.random() * 2, atk: 0, stun: 0, tele: 0, state: "idle", yaw: Math.random() * 6, wander: 0, charge: 0, phase: 0 };
    const bar = new THREE.Group(), bg = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 0.16), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.7, depthTest: false })), fg = new THREE.Mesh(new THREE.PlaneGeometry(1.36, 0.1), new THREE.MeshBasicMaterial({ color: T.boss ? 0xe5a03a : 0xe5453a, depthTest: false }));
    fg.position.z = 0.01; bg.renderOrder = 11; fg.renderOrder = 12; bar.add(bg, fg); bar.visible = false; this.scene.add(bar); e.bar = bar; e.fg = fg; this.list.push(e); return e;
  }
  clear() { for (const e of this.list) { this.scene.remove(e.mesh); this.scene.remove(e.bar); } this.list.length = 0; }
  alive() { return this.list.filter((e) => !e.dead); }
  update(dt, ctx) {
    const P = ctx.player;
    for (const e of this.list) {
      if (e.dead) { e.fade -= dt; e.mesh.rotation.x = Math.min(1.5, e.mesh.rotation.x + dt * 4); e.mesh.position.y = e.y - (1 - Math.max(0, e.fade)) * 1.2; if (e.fade <= 0) { this.scene.remove(e.mesh); } continue; }
      e.cd -= dt; e.atk = Math.max(0, e.atk - dt); e.stun = Math.max(0, e.stun - dt); e.tele = Math.max(0, e.tele - dt);
      const dx = P.x - e.x, dz = P.z - e.z, d = Math.hypot(dx, dz), aggro = e.T.boss ? 26 : 16, home = Math.hypot(e.hx - e.x, e.hz - e.z);
      let speed = 0, mx = 0, mz = 0;
      if (e.stun > 0) { /* stunned */ }
      else if (e.state === "idle") { if (d < aggro && ctx.alert !== false) e.state = "chase"; else { e.wander -= dt; if (e.wander <= 0) { e.wander = 2 + Math.random() * 3; const a = Math.random() * 6.28; e.wx = e.hx + Math.cos(a) * 3; e.wz = e.hz + Math.sin(a) * 3; } const wx = e.wx - e.x, wz = e.wz - e.z, wl = Math.hypot(wx, wz); if (wl > 0.4) { mx = wx / wl; mz = wz / wl; speed = 1.1; } } }
      else if (e.state === "chase") {
        if (d > aggro * 1.8 || home > 55) e.state = "idle";
        const want = e.T.boss ? 7 : 11; e.yaw = Math.atan2(dx, dz);
        if (d > want + 1.5) { mx = dx / d; mz = dz / d; speed = e.T.speed; } else if (d < want - 3) { mx = -dx / d; mz = -dz / d; speed = e.T.speed * 0.6; }
        else { mx = -dz / d * (e.phase ? 1 : -1); mz = dx / d * (e.phase ? 1 : -1); speed = e.T.speed * 0.4; if (Math.random() < dt * 0.4) e.phase ^= 1; }
        if (d < 2.2 && e.cd <= 0) { e.cd = 1.3; e.atk = 0.4; ctx.player.hurt(Math.round(e.T.dmg * 0.8), ctx) && ctx.onPlayerDamaged(); }
        if (e.cd <= 0 && d < aggro && e.tele <= 0 && e.fire === undefined) { e.tele = e.T.boss ? 0.6 : 0.5; e.fire = true; }
        if (e.fire && e.tele <= 0) { e.fire = undefined; const l = Math.hypot(dx, dz) || 1; e.atk = 0.5;
          if (e.T.boss) { const n = e.hp < e.max * 0.5 ? 7 : 5, base = Math.atan2(dx, dz); for (let i = 0; i < n; i++) { const a = base + (i - (n - 1) / 2) * 0.24; ctx.shots.fire({ x: e.x, y: e.y + 1.6, z: e.z, dx: Math.sin(a), dz: Math.cos(a), speed: 11, dmg: e.T.dmg, friendly: false, color: 0xd0221f, size: 0.32 }); } e.cd = e.hp < e.max * 0.5 ? 1.8 : 2.6; sfxs.bolt(); }
          else { ctx.shots.fire({ x: e.x, y: e.y + 1.3, z: e.z, dx: dx / l, dz: dz / l, speed: 17, dmg: e.T.dmg, friendly: false, color: 0xffd9a0, size: 0.16 }); e.cd = 2.2 + Math.random(); sfxs.hit(); } }
      }
      if (speed > 0) { moveCollide(e, mx * speed * dt, mz * speed * dt, 0.5 * e.scale, this.world); if (e.state === "idle") e.yaw = Math.atan2(mx, mz); }
      e.y = height(e.x, e.z); e.mesh.position.set(e.x, e.y, e.z); let dy = e.yaw - e.mesh.rotation.y; dy = Math.atan2(Math.sin(dy), Math.cos(dy)); e.mesh.rotation.y += dy * Math.min(1, dt * 10);
      animateHuman(e.mesh, dt, speed, e.tele > 0 ? 0.8 : e.atk);
      e.bar.visible = e.hp < e.max || e.state === "chase"; e.bar.position.set(e.x, e.y + 2.3 * e.scale, e.z); e.bar.quaternion.copy(this.cam.quaternion); e.fg.scale.x = Math.max(0.001, e.hp / e.max); e.fg.position.x = -0.68 * (1 - e.hp / e.max);
    }
  }
  damage(e, dmg, kx, kz) { e.hp -= dmg; e.state = "chase"; if (kx || kz) { const l = Math.hypot(kx, kz) || 1; moveCollide(e, kx / l * 0.5, kz / l * 0.5, 0.5 * e.scale, this.world); } if (e.hp <= 0 && !e.dead) { e.dead = true; e.fade = 1.4; e.bar.visible = false; return true; } return false; }
}
