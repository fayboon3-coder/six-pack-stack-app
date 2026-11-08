import { FOOD_DB, foodById, type Food } from '../data/foods';
import { matchFoods } from './foodMatch';

/**
 * Type what you ate, get the numbers: "6 oz chicken and a cup of rice, 2 eggs" becomes
 * chicken breast 6 oz, white rice 1 cup, eggs 2, each with calories and protein from the food list.
 * No portion given? The food's usual portion. Runs on the phone, instantly, no server.
 */

export type ParsedItem = { id: string; food: Food; qty: number; kcal: number; protein: number; carbs: number; fat: number };

const WORDS: Record<string, number> = {
  a: 1, an: 1, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12,
  half: 0.5, couple: 2, few: 3, dozen: 12, quarter: 0.25,
};
const UNITS: Record<string, string> = {
  oz: 'oz', ozs: 'oz', ounce: 'oz', ounces: 'oz',
  g: 'g', gr: 'g', gram: 'g', grams: 'g',
  lb: 'lb', lbs: 'lb', pound: 'lb', pounds: 'lb', kg: 'kg',
  cup: 'cup', cups: 'cup', c: 'cup',
  tbsp: 'tbsp', tbs: 'tbsp', tablespoon: 'tbsp', tablespoons: 'tbsp',
  tsp: 'tsp', teaspoon: 'tsp', teaspoons: 'tsp',
  ml: 'ml',
  scoop: 'count', scoops: 'count', slice: 'count', slices: 'count', piece: 'count', pieces: 'count', pc: 'count', pcs: 'count',
  serving: 'serving', servings: 'serving', portion: 'serving', portions: 'serving', bowl: 'serving', bowls: 'serving', plate: 'serving',
};
const FRACS: Record<string, string> = { '½': ' 1/2', '¼': ' 1/4', '¾': ' 3/4', '⅓': ' 1/3', '⅔': ' 2/3' };

type Base = 'oz' | 'cup' | 'tbsp' | 'tsp' | 'count';
function baseOf(f: Food): { base: Base; perUnit: number } {
  const u = f.unit.toLowerCase();
  if (u.startsWith('oz')) return { base: 'oz', perUnit: 1 };
  if (u.includes('cup')) return { base: 'cup', perUnit: u.startsWith('half') ? 0.5 : 1 };
  if (u === 'tbsp') return { base: 'tbsp', perUnit: 1 };
  if (u === 'tsp') return { base: 'tsp', perUnit: 1 };
  return { base: 'count', perUnit: 1 };
}

const toNum = (t: string): number | null => {
  const m = t.match(/^(\d+)\s+(\d+)\/(\d+)$/);
  if (m) return +m[1] + +m[2] / +m[3];
  const f = t.match(/^(\d+)\/(\d+)$/);
  if (f) return +f[1] / +f[2];
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
};

/** The amount and unit someone wrote in one piece of text, if any. */
function readAmount(chunk: string): { q: number | null; unit: string | null } {
  let s = chunk.toLowerCase();
  for (const [k, v] of Object.entries(FRACS)) s = s.split(k).join(v);
  s = s.replace(/(\d)([a-z])/g, '$1 $2').replace(/\s+/g, ' ').trim();
  const m = s.match(/(\d+\s+\d+\/\d+|\d+\/\d+|\d*\.\d+|\d+)\s*([a-z]+)?/);
  if (m) {
    const q = toNum(m[1].trim());
    const unit = m[2] && UNITS[m[2]] ? UNITS[m[2]] : null;
    return { q, unit };
  }
  const words = s.split(' ');
  for (let i = 0; i < words.length; i++) {
    const w = words[i];
    if (WORDS[w] != null) {
      let q = WORDS[w];
      // "half a cup", "a couple", "a dozen"
      if (w === 'half' && (words[i + 1] === 'a' || words[i + 1] === 'an')) i++;
      else if ((w === 'a' || w === 'an') && WORDS[words[i + 1]] != null && words[i + 1] !== 'a') { q = WORDS[words[i + 1]]; i++; }
      const next = (words[i + 1] || '').replace(/[^a-z]/g, '');
      return { q, unit: UNITS[next] || null };
    }
  }
  return { q: null, unit: null };
}

const round = (q: number, step = 0.25) => Math.max(step, Math.round(q / step) * step);

/** How many of the food's own units someone meant. */
export function portionOf(f: Food, q: number | null, unit: string | null): number {
  const { base, perUnit } = baseOf(f);
  if (q == null || q <= 0) return f.def;
  let n: number;
  switch (base) {
    case 'oz':
      n = unit === 'oz' ? q : unit === 'g' ? q / 28.35 : unit === 'lb' ? q * 16 : unit === 'kg' ? q * 35.27 : q * f.def;
      return Math.min(48, round(n, 0.5));
    case 'cup':
      n = unit === 'cup' ? q / perUnit : unit === 'tbsp' ? q / 16 / perUnit : unit === 'tsp' ? q / 48 / perUnit : unit === 'ml' ? q / 240 / perUnit
        : unit === 'g' || unit === 'oz' ? f.def : q * f.def;
      return Math.min(12, round(n));
    case 'tbsp':
      n = unit === 'tsp' ? q / 3 : unit === 'cup' ? q * 16 : unit === 'serving' ? q * f.def : q;
      return Math.min(32, round(n, 0.5));
    case 'tsp':
      n = unit === 'tbsp' ? q * 3 : unit === 'serving' ? q * f.def : q;
      return Math.min(24, round(n, 0.5));
    default:
      n = unit === 'serving' ? q * f.def : q;
      return Math.min(40, round(n, f.step < 1 ? f.step : 0.5));
  }
}

export function itemFor(f: Food, qty: number): ParsedItem {
  return { id: f.id, food: f, qty, kcal: Math.round(f.kcal * qty), protein: Math.round(f.p * qty), carbs: Math.round(f.c * qty), fat: Math.round(f.f * qty) };
}

/** "6 oz chicken and 1 cup rice, 2 eggs" → items with numbers, plus any bits it couldn't place. */
export function parseFoods(text: string): { items: ParsedItem[]; missing: string[] } {
  const items: ParsedItem[] = [];
  const missing: string[] = [];
  const chunks = (text || '').split(/,|;|\+|&|\n|\band\b|\bwith\b|\bplus\b/i).map((c) => c.trim()).filter((c) => /[a-z]/i.test(c));
  for (const chunk of chunks) {
    let ids = matchFoods(chunk, 3);
    if (!ids.length) {
      // Nothing by full name: try each word as the start of a food name ("whey", "salm").
      const words = chunk.toLowerCase().replace(/[^a-z\s]/g, ' ').split(/\s+/)
        .filter((w) => w.length >= 3 && !UNITS[w] && WORDS[w] == null && !/^(had|ate|for|the|some|with|and|cup|cups|bowl|of)$/.test(w))
        .sort((x, y) => y.length - x.length);
      for (const w of words) { const f = searchFoods(w, 1)[0]; if (f) { ids = [f.id]; break; } }
    }
    if (!ids.length) {
      const bare = chunk.replace(/[^a-z\s]/gi, ' ').replace(/\s+/g, ' ').trim();
      if (bare && !/^(a|an|of|some|the|i|had|ate|for|my|me)( (a|an|of|some|the|i|had|ate|for|my|me))*$/i.test(bare)) missing.push(chunk);
      continue;
    }
    const { q, unit } = readAmount(chunk);
    ids.forEach((id, k) => {
      const f = foodById(id);
      if (!f) return;
      const qty = portionOf(f, k === 0 ? q : null, k === 0 ? unit : null);
      const same = items.find((x) => x.id === id);
      if (same) Object.assign(same, itemFor(f, same.qty + qty));
      else items.push(itemFor(f, qty));
    });
  }
  return { items, missing };
}

const fmtQ = (q: number) => {
  const whole = Math.floor(q), frac = Math.round((q - whole) * 100) / 100;
  const glyph = frac === 0.5 ? '½' : frac === 0.25 ? '¼' : frac === 0.75 ? '¾' : frac ? String(frac).slice(1) : '';
  return whole ? `${whole}${glyph}` : glyph ? glyph : '0';
};

/** "6 oz", "1½ cups", "3 eggs". */
export function portionLabel(f: Food, q: number) {
  if (f.unit === 'oz') return `${fmtQ(q)} oz`;
  const plural = f.units || (f.unit.includes('(') ? f.unit.replace(/^(\S+)/, '$1s') : /(s|sh|ch)$/.test(f.unit) ? `${f.unit}es` : f.unit.endsWith('o') ? `${f.unit}es` : `${f.unit}s`);
  return `${fmtQ(q)} ${q === 1 || q < 1 ? f.unit : plural}`;
}

export const foodName = (f: Food) => (f.short || f.name).replace(/\s*\(.*?\)\s*/g, ' ').trim();

/** Foods whose name starts with, or contains, what they typed. Best matches first. */
export function searchFoods(q: string, n = 6): Food[] {
  const s = q.toLowerCase().trim();
  if (s.length < 2) return [];
  const score = (f: Food) => {
    const names = [f.name, f.short || ''].map((x) => x.toLowerCase());
    if (names.some((x) => x.startsWith(s))) return 0;
    if (names.some((x) => x.split(/[\s(]+/).some((w) => w.startsWith(s)))) return 1;
    if ((f.aka || '').toLowerCase().split(/\s+/).some((w) => w.startsWith(s))) return 2;
    return 9;
  };
  return FOOD_DB.filter((f) => !f.custom).map((f) => ({ f, k: score(f) })).filter((x) => x.k < 9).sort((a, b) => a.k - b.k || a.f.name.length - b.f.name.length).slice(0, n).map((x) => x.f);
}
