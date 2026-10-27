import * as THREE from "three";
export const manager = new THREE.LoadingManager(); const TL = new THREE.TextureLoader(manager), cache = new Map();
export function tex(name, kind = "diff", srgb = kind === "diff") {
  const k = name + kind; if (cache.has(k)) return cache.get(k);
  const t = TL.load(`assets/tex/${name}_${kind}.jpg`); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; if (srgb) t.colorSpace = THREE.SRGBColorSpace; cache.set(k, t); return t;
}
/* PBR material; userData.scale = metres per texture tile (used by boxUV/planeUV for world-scaled UVs). */
export function pbr(name, scale = 2, o = {}) { const m = new THREE.MeshStandardMaterial(Object.assign({ map: tex(name, "diff"), normalMap: tex(name, "nor"), roughnessMap: tex(name, "rough"), roughness: 1, metalness: 0 }, o)); m.userData.scale = scale; return m; }
export function scaleUV(geo, su, sv) { const uv = geo.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * su, uv.getY(i) * sv); return geo; }
export function boxUV(w, h, d, scale) { const g = new THREE.BoxGeometry(w, h, d), uv = g.attributes.uv, dims = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]]; for (let f = 0; f < 6; f++) for (let k = 0; k < 4; k++) { const i = f * 4 + k; uv.setXY(i, uv.getX(i) * dims[f][0] / scale, uv.getY(i) * dims[f][1] / scale); } return g; }
export const rng = (seed) => () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
export const smooth = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
export function canvasTex(w, h, draw, srgb = true) { const c = document.createElement("canvas"); c.width = w; c.height = h; draw(c.getContext("2d"), w, h); const t = new THREE.CanvasTexture(c); t.anisotropy = 4; if (srgb) t.colorSpace = THREE.SRGBColorSpace; return t; }
export const windU = { value: 0 };
export function addWind(material, amp = 1, instanced = true) {
  material.onBeforeCompile = (sh) => {
    sh.uniforms.uTime = windU;
    sh.vertexShader = sh.vertexShader.replace("#include <common>", "#include <common>\nuniform float uTime;")
      .replace("#include <begin_vertex>", `#include <begin_vertex>\nfloat _h=max(position.y,0.0);\n${instanced ? "float _ph=instanceMatrix[3].x*0.21+instanceMatrix[3].z*0.17;" : "float _ph=0.0;"}\ntransformed.x+=sin(uTime*1.7+_ph+position.y*0.5)*${amp.toFixed(3)}*_h*_h*0.02;\ntransformed.z+=cos(uTime*1.3+_ph+position.x*0.4)*${amp.toFixed(3)}*_h*_h*0.014;`);
  };
  return material;
}
