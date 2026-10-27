import { createCharacter, cloth, mat, SKIN } from "./characters.js";
import { glbCharacter } from "./glbmodels.js";
const indigo = () => cloth("indigo", "#16256a", "#f2eee0", "#e0a93b"), stripes = (a = "#16256a") => cloth("stripes", a, "#f2eee0", "#e0a93b");

/* Hero looks per class (male/female share the outfits; body and hair change). */
export function heroModel(cls, sex = "m") {
  const real = glbCharacter(`hero_${cls}_${sex}`); if (real) return real;
  const f = sex === "f", skin = SKIN[f ? 3 : 2];
  if (cls === "sorcier") return createCharacter({ sex, skin, hair: f ? "braids" : "short", chalk: true, necklace: "cowrie", bracelets: true, weapon: "staff", top: { kind: "drape", mat: cloth("cloth", "#efe9d8", "#ffffff", "#2b3a8c") }, bottom: { kind: "wrap", mat: cloth("kente", "#16256a", "#f2eee0", "#e0a93b") }, sash: cloth("stripes", "#b02a2a", "#f2eee0", "#e0a93b"), cape: cloth("indigo", "#16256a", "#f2eee0", "#e0a93b") });
  if (cls === "guerrier") return createCharacter({ sex, skin, hair: "short", feathers: true, necklace: "cowrie", bracelets: true, weapon: "sword", shield: true, bulk: 1.08, top: { kind: "tunic", mat: stripes("#8a2f1c") }, bottom: { kind: "shorts", mat: indigo() }, sash: cloth("wax", "#b02a2a", "#f2eee0", "#e0a93b") });
  return createCharacter({ sex, skin, hair: f ? "braids" : "afro", necklace: "beads", bracelets: true, weapon: "bow", quiver: true, bulk: 0.95, top: { kind: "vest", mat: mat(0x6b4a2b, { roughness: 0.8 }) }, bottom: { kind: "shorts", mat: mat(0x4a3322, { roughness: 0.85 }) }, sash: cloth("stripes", "#2f6b3a", "#f2eee0", "#e0a93b") });
}
export const NPC = {
  doyen: () => glbCharacter("doyen", 1.75) || createCharacter({ sex: "m", skin: SKIN[1], hair: "white", scale: 0.96, bulk: 0.95, weapon: "stick", necklace: "beads", bracelets: true, top: { kind: "drape", mat: cloth("cloth", "#f2eee0", "#ffffff", "#2b3a8c") }, bottom: { kind: "wrap", mat: cloth("cloth", "#f2eee0", "#ffffff", "#2b3a8c") }, cape: cloth("kente", "#2b3a8c", "#f2eee0", "#e0a93b") }),
  enfant: () => glbCharacter("enfant", 1.1) || createCharacter({ sex: "m", skin: SKIN[3], hair: "short", scale: 0.62, bottom: { kind: "shorts", mat: mat(0xe0a93b) } }),
  marchande: () => glbCharacter("marchande", 1.75) || createCharacter({ sex: "f", skin: SKIN[2], hair: "wrap", necklace: "beads", bracelets: true, top: { kind: "drape", mat: cloth("wax", "#b02a2a", "#f2eee0", "#e0a93b") }, bottom: { kind: "wrap", mat: cloth("wax", "#2b3a8c", "#f2eee0", "#e0a93b") }, wrapMat: cloth("wax", "#e0a93b", "#2b3a8c", "#b02a2a") }),
  forgeron: () => glbCharacter("forgeron", 1.75) || createCharacter({ sex: "m", skin: SKIN[0], hair: "short", bulk: 1.2, scale: 1.04, weapon: "hammer", apron: true, bottom: { kind: "pants", mat: mat(0x4a3322, { roughness: 0.9 }) }, bracelets: true }),
  agojie: () => glbCharacter("agojie", 1.75) || createCharacter({ sex: "f", skin: SKIN[2], hair: "short", feathers: true, necklace: "cowrie", bracelets: true, weapon: "sword", shield: true, bulk: 1.05, top: { kind: "tunic", mat: stripes("#16256a") }, bottom: { kind: "shorts", mat: indigo() }, sash: cloth("wax", "#b02a2a", "#f2eee0", "#e0a93b") }),
  soldat: () => glbCharacter("soldat", 1.75) || createCharacter({ sex: "m", skin: 0xd0a07f, hair: "short", hairColor: 0x3a2a1a, helmet: true, boots: true, weapon: "rifle", top: { kind: "coat", mat: cloth("cloth", "#1d2a5a", "#1d2a5a", "#1d2a5a", { roughness: 0.9 }) }, bottom: { kind: "pants", mat: mat(0xe8e2cf, { roughness: 0.9 }) }, sash: mat(0xf2eee0) }),
  officier: () => glbCharacter("officier", 1.75) || createCharacter({ sex: "m", skin: 0xd8aa88, hair: "short", hairColor: 0x2a1a10, kepi: true, boots: true, beard: true, weapon: "sword", top: { kind: "coat", mat: cloth("cloth", "#14204a", "#14204a", "#14204a", { roughness: 0.85 }) }, bottom: { kind: "pants", mat: mat(0xb02a2a, { roughness: 0.9 }) }, sash: mat(0xe0c060, { metalness: 0.6 }) }),
  agbo: () => glbCharacter("agbo", 2.3) || createCharacter({ sex: "m", skin: SKIN[1], hair: "afro", mask: 0xb02a2a, scale: 1.3, bulk: 1.1, weapon: "dark", necklace: "cowrie", bracelets: true, top: { kind: "drape", mat: cloth("cloth", "#1a1013", "#2a1a1d", "#b02a2a") }, bottom: { kind: "wrap", mat: cloth("cloth", "#14090c", "#2a1a1d", "#b02a2a") }, cape: cloth("cloth", "#4a0d0d", "#4a0d0d", "#b02a2a") }),
};
