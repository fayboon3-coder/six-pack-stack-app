import { parseFoods } from './parseFood';

/** "3 eggs, 2 slices toast and a cup of greek yogurt" → foods and amounts (and what we couldn't read). */
export function readMeal(text: string) {
  const r = parseFoods(text);
  const items = r.items.map((x) => ({ id: x.id, qty: x.qty }));
  const t = r.items.reduce((a, x) => ({ kcal: a.kcal + x.kcal, p: a.p + x.protein }), { kcal: 0, p: 0 });
  return { items, kcal: Math.round(t.kcal), protein: Math.round(t.p), missing: r.missing, parsed: r.items };
}

