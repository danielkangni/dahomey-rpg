import * as THREE from "three";
const $ = (id) => document.getElementById(id);
const ease = (t) => t * t * (3 - 2 * t);
/* Camera-driven cutscenes: steps = [{from:[x,y,z], to:[x,y,z], look:[x,y,z] | lookTo, dur, who, text}] with letterbox bars. */
export class Cinematic {
  constructor(camera) { this.cam = camera; this.active = false; this.steps = []; this.i = 0; this.t = 0; this.resolve = null; $("cineSkip").onclick = () => this.skip(); }
  play(steps) { return new Promise((resolve) => { this.steps = steps; this.i = 0; this.t = 0; this.resolve = resolve; this.active = true; $("hud").style.opacity = 0; $("cineBars").classList.remove("hide"); requestAnimationFrame(() => $("cineBars").classList.add("on")); this.text(steps[0]); }); }
  text(s) { $("cineTxt").innerHTML = s && s.text ? (s.who ? `<b>${s.who}</b> — ` : "") + s.text : ""; }
  skip() { if (this.active) this.end(); }
  end() { this.active = false; $("hud").style.opacity = ""; $("cineBars").classList.remove("on"); setTimeout(() => $("cineBars").classList.add("hide"), 600); $("cineTxt").innerHTML = ""; const r = this.resolve; this.resolve = null; r && r(); }
  update(dt) {
    if (!this.active) return false; const s = this.steps[this.i]; this.t += dt; const k = Math.min(1, this.t / s.dur), e = ease(k);
    const f = s.from, to = s.to || s.from; this.cam.position.set(f[0] + (to[0] - f[0]) * e, f[1] + (to[1] - f[1]) * e, f[2] + (to[2] - f[2]) * e);
    const lf = s.look, lt = s.lookTo || s.look; this.cam.lookAt(lf[0] + (lt[0] - lf[0]) * e, lf[1] + (lt[1] - lf[1]) * e, lf[2] + (lt[2] - lf[2]) * e);
    if (this.t >= s.dur) { this.i++; this.t = 0; if (this.i >= this.steps.length) { this.end(); return false; } this.text(this.steps[this.i]); if (this.steps[this.i].onStart) this.steps[this.i].onStart(); }
    return true;
  }
}
