import { CLASSES, ITEMS } from "./data.js";
export const xpNeed = (lv) => 60 + lv * 45;
export const INV_MAX = 12;
export function newState(cls, name, sex = "m") {
  const c = CLASSES[cls], s = { sex, cls, name: (name || "Héros").slice(0, 16), lv: 1, xp: 0, stats: { str: c.base.str, agi: c.base.agi, spi: c.base.spi }, maxhp: c.base.hp, hp: c.base.hp,
    inv: [{ id: "herbe", n: 2 }], powers: {}, trials: {}, stage: 0, patrol: 0, bossDead: false, herbs: [], talked: {}, pos: [4, -4], seenShip: false, kills: 0, playtime: 0, flags: {}, codex: {}, side: {} };
  return s;
}
export function gainItem(s, id, n = 1) {
  const slot = s.inv.find((i) => i.id === id); if (slot) { slot.n += n; return true; }
  if (s.inv.length >= INV_MAX) return false; s.inv.push({ id, n }); return true;
}
export function useItem(s, idx) {
  const it = s.inv[idx]; if (!it) return null; const d = ITEMS[it.id]; if (!d || !d.heal) return null;
  if (s.hp >= s.maxhp) return "full"; s.hp = Math.min(s.maxhp, s.hp + d.heal); it.n--; if (it.n <= 0) s.inv.splice(idx, 1); return d;
}
export function addXp(s, n) {
  s.xp += n; let up = 0;
  while (s.xp >= xpNeed(s.lv)) { s.xp -= xpNeed(s.lv); s.lv++; const g = CLASSES[s.cls].grow; s.maxhp += Math.round(g.hp); s.stats.str += g.str; s.stats.agi += g.agi; s.stats.spi += g.spi; s.hp = s.maxhp; up++; }
  return up;
}
export const dmgOf = (s, kind) => {
  const L = s.lv * 1.2;
  if (kind === "melee") return Math.round(8 + s.stats.str * 1.6 + L);
  if (kind === "arrow") return Math.round(7 + s.stats.agi * 1.4 + L);
  return Math.round(7 + s.stats.spi * 1.5 + L);
};
