import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { ShaderPass } from "three/addons/postprocessing/ShaderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { SSAOPass } from "three/addons/postprocessing/SSAOPass.js";
import { FXAAShader } from "three/addons/shaders/FXAAShader.js";

const Grade = {
  uniforms: { tDiffuse: { value: null }, time: { value: 0 }, vig: { value: 0.55 }, sat: { value: 1.12 }, fade: { value: 0 }, flash: { value: new THREE.Color(0, 0, 0) } },
  vertexShader: "varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}",
  fragmentShader: `uniform sampler2D tDiffuse;uniform float time,vig,sat,fade;uniform vec3 flash;varying vec2 vUv;
  void main(){vec4 c=texture2D(tDiffuse,vUv);vec2 d=vUv-.5;float v=1.-dot(d,d)*1.25;c.rgb*=mix(1.,clamp(v,0.,1.),vig);
  float l=dot(c.rgb,vec3(.299,.587,.114));c.rgb=mix(c.rgb,c.rgb*vec3(1.07,1.0,.9),smoothstep(.25,1.,l));c.rgb=mix(c.rgb,c.rgb*vec3(.9,.97,1.08),1.-smoothstep(0.,.25,l));
  c.rgb=mix(vec3(l),c.rgb,sat);c.rgb=(c.rgb-.16)*1.05+.16;float g=fract(sin(dot(vUv*vec2(1920.,1080.)+time,vec2(12.9898,78.233)))*43758.5453);c.rgb+=(g-.5)*.012;
  c.rgb=mix(c.rgb,flash,fade);gl_FragColor=c;}`,
};
export function createPost(renderer, scene, camera, quality) {
  const size = renderer.getSize(new THREE.Vector2()), pr = renderer.getPixelRatio(); const P = { quality, composer: null, grade: null };
  if (quality <= 0) return P;
  const c = new EffectComposer(renderer); c.setPixelRatio(pr); c.setSize(size.x, size.y); c.addPass(new RenderPass(scene, camera));
  if (quality >= 2) { const s = new SSAOPass(scene, camera, size.x, size.y, 24); s.kernelRadius = 0.9; s.minDistance = 0.0006; s.maxDistance = 0.05; P.ssao = s; c.addPass(s); }
  const bloom = new UnrealBloomPass(new THREE.Vector2(size.x, size.y), 0.28, 0.65, 0.92); P.bloom = bloom; c.addPass(bloom);
  const grade = new ShaderPass(Grade); P.grade = grade; c.addPass(grade); c.addPass(new OutputPass());
  const fxaa = new ShaderPass(FXAAShader); fxaa.material.uniforms.resolution.value.set(1 / (size.x * pr), 1 / (size.y * pr)); P.fxaa = fxaa; c.addPass(fxaa); P.composer = c;
  P.resize = (w, h) => { c.setSize(w, h); fxaa.material.uniforms.resolution.value.set(1 / (w * pr), 1 / (h * pr)); };
  return P;
}
