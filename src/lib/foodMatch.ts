import type { ImageSourcePropType } from 'react-native';
import { FOOD_DB, foodById } from '../data/foods';
import { foodPhoto } from './foodPhotos';
import { mealImage } from './meals';
import { FOOD_HD } from './hd';

/**
 * Find the foods named in any line of text ("Greek yogurt bowl with berries and honey",
 * "Chicken breast (3 lbs)", a coach-written meal) so each one can show its own photo.
 * Longest name wins, names don't overlap, results come back in the order they're written.
 */
const norm = (s: string) => ` ${s.toLowerCase().replace(/\([^)]*\)/g, ' ').replace(/[^a-z0-9%]+/g, ' ').trim()} `;
const plural = (w: string) => [w, w.endsWith('s') ? w.slice(0, -1) : `${w}s`, w.endsWith('ies') ? `${w.slice(0, -3)}y` : w];

type Term = { id: string; t: string; weak: boolean };
let TERMS: Term[] | null = null;
function terms(): Term[] {
  if (TERMS) return TERMS;
  const out: Term[] = [];
  for (const f of FOOD_DB) {
    const strong = new Set<string>();
    [f.name, f.short || ''].filter(Boolean).forEach((n) => plural(norm(n).trim()).forEach((x) => x.length > 2 && strong.add(x)));
    strong.forEach((t) => out.push({ id: f.id, t, weak: false }));
    (f.aka || '').split(/\s+/).filter((w) => w.length >= 4).forEach((w) => out.push({ id: f.id, t: w.toLowerCase(), weak: true }));
  }
  TERMS = out.sort((a, b) => Number(a.weak) - Number(b.weak) || b.t.length - a.t.length);
  return TERMS;
}

export function matchFoods(text: string, max = 6): string[] {
  if (!text) return [];
  const s = norm(text);
  const taken: [number, number][] = [];
  const hits: { id: string; at: number }[] = [];
  for (const { id, t } of terms()) {
    let from = 0;
    while (true) {
      const at = s.indexOf(` ${t} `, from);
      if (at < 0) break;
      const a = at + 1, b = at + 1 + t.length;
      if (!taken.some(([x, y]) => a < y && b > x)) {
        taken.push([a, b]);
        if (!hits.some((h) => h.id === id)) hits.push({ id, at: a });
      }
      from = at + 1;
    }
  }
  return hits.sort((x, y) => x.at - y.at).map((h) => h.id).slice(0, max);
}

/** Photo for one grocery or food line: the food it names, else a dish photo. */
export function photoFor(text: string): ImageSourcePropType | null {
  const id = matchFoods(text, 1)[0];
  return (id && foodPhoto(id)) || mealImage(text) || null;
}

/** The same, plus the food's high-res photo id when it names one. */
export function picFor(text: string): { source: ImageSourcePropType | null; hd: string | null } {
  const id = matchFoods(text, 1)[0];
  return { source: (id && foodPhoto(id)) || mealImage(text) || null, hd: (id && FOOD_HD[id]) || null };
}

/** Each food in a meal with its own photo (ids from the meal builder, or read from the text). */
export function foodsWithPhotos(name: string, detail = '', ids?: string[]): { id: string; label: string; source: ImageSourcePropType; hd?: string }[] {
  const list = ids?.length ? ids : matchFoods(`${name} ${detail}`, 8);
  const out: { id: string; label: string; source: ImageSourcePropType; hd?: string }[] = [];
  for (const id of list) {
    const f = foodById(id); const src = foodPhoto(id);
    if (!f || !src || out.some((o) => o.id === id)) continue;
    out.push({ id, label: f.short || f.name.replace(/\s*\(.*?\)\s*/g, ' ').trim(), source: src, hd: FOOD_HD[id] });
  }
  return out;
}
