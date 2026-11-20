/**
 * Advanced customization: the plan built around what someone already does.
 *
 * Food: the meals they actually eat (typed the way they'd say them), the takeout orders
 * they actually order, and the foods they won't eat. Their meals are re-sized to each
 * meal's calorie and protein target (their foods, their amounts nudged in normal steps),
 * topped up with protein if they'd fall short, and only go in the plan when they land
 * close enough that any day built from the options still hits their numbers.
 *
 * Training lives in training.ts (prefer + lifts on the training choices).
 */
import { FOOD_DB, foodById, type Food } from '../data/foods';
import { partText, portion, SLOTS, totals, type MealOption, type MealSlot } from './mealplan';

export type SlotName = (typeof SLOTS)[number]['slot'];
export const SLOT_LABEL: Record<SlotName, string> = { Breakfast: 'Breakfast', Lunch: 'Lunch', Afternoon: 'Snack', Dinner: 'Dinner' };

/** A meal they eat. `items` when we could read the foods (re-sizable); `kcal`/`protein` when they gave numbers instead. */
export type MyMeal = {
  id: string; slot: SlotName; name: string; text: string;
  items?: { id: string; qty: number }[];
  kcal?: number; protein?: number;
};
/** A takeout or eating-out order, with its numbers from the restaurant's menu or app. */
export type MyOrder = { id: string; where: string; order: string; kcal: number; protein: number };

export type Fit = 'good' | 'close' | 'off';
export type FittedMeal = MealOption & { fit: Fit; tweak?: string };

const fmt = (n: number) => n.toLocaleString('en-US');
const r10 = (n: number) => Math.round(n / 10) * 10;
const tagOf = (slot: SlotName) => SLOTS.find((s) => s.slot === slot)!.tag;
export const newId = () => Math.random().toString(36).slice(2, 9);

/** Calorie and protein target for one meal at these day numbers. */
export function slotTarget(slot: SlotName, kcal: number, protein: number) {
  const s = SLOTS.find((x) => x.slot === slot)!;
  return { K: kcal * s.k, P: protein * s.p };
}

/** A name for a meal from its foods, when they don't give one ("Eggs, toast & Greek yogurt"). */
export function nameFromItems(items: { id: string }[]) {
  const names = items.map((x) => foodById(x.id)).filter(Boolean).map((f) => (f!.short || f!.name).replace(/\s*\(.*?\)\s*/g, ' ').trim());
  if (!names.length) return 'My meal';
  const low = names.map((n, i) => (i ? n.toLowerCase() : n));
  return low.length === 1 ? low[0] : `${low.slice(0, -1).join(', ')} & ${low[low.length - 1]}`;
}

/** Their amount, nudged to the food's normal step, never under half or over double what they wrote. */
function nudge(f: Food, want: number, theirs: number) {
  const lo = Math.max(f.step, theirs * 0.5), hi = Math.max(lo, theirs * 2);
  const v = Math.round(want / f.step) * f.step;
  return +Math.min(hi, Math.max(lo, v)).toFixed(2);
}

const fitOf = (kcal: number, p: number, K: number, P: number): Fit => {
  const kErr = Math.abs(kcal - K) / K;
  if (kErr <= 0.15 && p >= P * 0.8) return 'good';
  if (kErr <= 0.25 && p >= P * 0.65) return 'close';
  return 'off';
};

/** The best extra protein for this meal: one of their own foods if it fits, else a shake or chicken. */
function topper(tag: string, pantry: Food[], inMeal: Set<string>) {
  const ok = (f: Food) => (f.cat === 'protein' || (f.cat === 'dairy' && f.p >= 15)) && f.meals.includes(tag) && !inMeal.has(f.id) && f.p / Math.max(1, f.kcal) >= 0.15;
  const mine = pantry.filter(ok).sort((a, b) => b.p / b.kcal - a.p / a.kcal)[0];
  const fallback = foodById(tag === 'B' || tag === 'S' ? 'whey' : 'chicken_breast');
  return mine || (fallback && !inMeal.has(fallback.id) ? fallback : undefined);
}

/**
 * One of their meals, sized for this slot: protein from the main protein, calories from the carb,
 * a protein top-up if it's still short. Meals given as numbers only can't be re-sized; they're checked as-is.
 */
export function fitMeal(m: MyMeal, kcal: number, protein: number, pantry: Food[] = []): FittedMeal {
  const { K, P } = slotTarget(m.slot, kcal, protein);
  const tag = tagOf(m.slot);
  const base = { name: m.name || 'My meal', mine: true as const };
  if (!m.items?.length) {
    const k = Math.round(m.kcal || 0), p = Math.round(m.protein || 0);
    return { ...base, detail: m.text, kcal: `about ${fmt(r10(k))}`, protein: `${p} g`, fit: k ? fitOf(k, p, K, P) : 'off' };
  }
  const parts = m.items.map((x) => ({ food: foodById(x.id) as Food, amt: x.qty, theirs: x.qty })).filter((x) => x.food);
  const byProtein = parts.filter((x) => x.food.cat === 'protein' || (x.food.cat === 'dairy' && x.food.p >= 10)).sort((a, b) => b.food.p * b.amt - a.food.p * a.amt)[0];
  const byCarb = parts.filter((x) => x.food.cat === 'carb' && x !== byProtein).sort((a, b) => b.food.kcal * b.amt - a.food.kcal * a.amt)[0];
  // Protein first: never less of their main protein than they eat, more if the meal is short.
  // Then calories from the carb. Still over? Trim the protein back toward what the meal needs.
  const size = () => {
    for (let i = 0; i < 3; i++) {
      let need = 0;
      if (byProtein) {
        const others = totals(parts.filter((x) => x !== byProtein));
        need = (P - others.p) / Math.max(0.1, byProtein.food.p);
        byProtein.amt = nudge(byProtein.food, Math.max(need, byProtein.theirs), byProtein.theirs);
      }
      if (byCarb) {
        const others = totals(parts.filter((x) => x !== byCarb));
        byCarb.amt = nudge(byCarb.food, (K - others.kcal) / Math.max(1, byCarb.food.kcal), byCarb.theirs);
      }
      const over = totals(parts).kcal - K * 1.08;
      if (byProtein && over > 0 && byProtein.amt > need) {
        byProtein.amt = nudge(byProtein.food, Math.max(need, byProtein.amt - over / Math.max(1, byProtein.food.kcal)), byProtein.theirs);
      }
    }
  };
  size();
  let tweak: string | undefined;
  let t = totals(parts);
  if (t.p < P * 0.8) {
    const top = topper(tag, pantry, new Set(parts.map((x) => x.food.id)));
    if (top) {
      const amt = portion(top, (P - t.p) / Math.max(0.1, top.p));
      const added = { food: top, amt, theirs: amt };
      parts.push(added);
      size(); // make room for it in the calories
      t = totals(parts);
      tweak = `I added ${partText(added)} so this meal hits your protein.`;
    }
  }
  t = totals(parts);
  const fit = fitOf(t.kcal, t.p, K, P);
  const changed = parts.some((x) => x.amt !== x.theirs);
  if (!tweak && changed) tweak = 'Same foods. I adjusted the amounts to fit your numbers.';
  return {
    ...base,
    detail: parts.map(partText).join(', '),
    ids: parts.map((x) => x.food.id),
    kcal: `about ${fmt(r10(t.kcal))}`,
    protein: `${Math.round(t.p)} g`,
    fit, tweak,
  };
}

/** Why a meal didn't make the plan, in plain words. */
export function offReason(f: FittedMeal, m: MyMeal, kcal: number, protein: number) {
  const { K, P } = slotTarget(m.slot, kcal, protein);
  const k = Number(f.kcal.replace(/[^\d]/g, '')), p = Number(f.protein.replace(/[^\d]/g, ''));
  if (k > K * 1.25) return m.items?.length
    ? `About ${fmt(r10(k - K))} calories more than your ${SLOT_LABEL[m.slot].toLowerCase()} target (${fmt(r10(K))}), even sized down. Try a smaller portion of the carb or fat, or log it on days you need it.`
    : `About ${fmt(r10(k - K))} calories more than your ${SLOT_LABEL[m.slot].toLowerCase()} target (${fmt(r10(K))}). Have part of it, or keep it for a day you plan around it and log it.`;
  if (k < K * 0.75) return `Only about ${fmt(r10(k))} of your ${fmt(r10(K))} ${SLOT_LABEL[m.slot].toLowerCase()} calories. Add a carb or a bigger portion and it fits.`;
  if (p < P * 0.65) return `About ${p} g of protein, and this meal needs ${Math.round(P)} g. Add a protein (eggs, Greek yogurt, chicken, a shake) and it fits.`;
  return '';
}

/** Their meals first in each slot (up to 3), then the plan's own options to fill out 3. */
export function withMyMeals(meals: MealSlot[], mine: MyMeal[] = [], kcal: number, protein: number, pantry: Food[] = []): MealSlot[] {
  if (!mine.length) return meals;
  return meals.map((s) => {
    const theirs = mine.filter((m) => m.slot === s.slot).map((m) => fitMeal(m, kcal, protein, pantry)).filter((f) => f.fit !== 'off').slice(0, 3);
    if (!theirs.length) return s;
    const clean = theirs.map(({ fit, tweak, ...o }) => ({ ...o, ...(tweak ? { note: tweak } : {}) }));
    const rest = s.options.filter((o) => !clean.some((c) => c.name.toLowerCase() === o.name.toLowerCase()));
    return { ...s, options: [...clean, ...rest].slice(0, Math.max(3, clean.length)) };
  });
}

/** How a takeout order fits their day. */
export function orderNote(o: Pick<MyOrder, 'kcal' | 'protein'>, kcal: number, protein: number) {
  const share = o.kcal / Math.max(1, kcal);
  let t = share <= 0.36 ? 'Fits as your lunch or dinner.'
    : share <= 0.5 ? 'A big one: make it your main meal and keep breakfast and your snack light that day.'
      : `That's ${Math.round(share * 100)}% of your day. Share it, skip a side, or keep it to once a week.`;
  if (o.protein < protein * 0.22) t += ' Low on protein, so have a protein shake or Greek yogurt later.';
  return t;
}

/** Their orders first (with how each fits), then the built-in ones for other places. */
export function withMyOrders(eatOut: NonNullable<import('./types').Plan['eat_out']> = [], mine: MyOrder[] = [], kcal: number, protein: number) {
  if (!mine.length) return eatOut;
  const theirs = mine.map((o) => ({ where: o.where.trim(), order: o.order.trim(), kcal: `about ${fmt(r10(o.kcal))}`, protein: `${Math.round(o.protein)} g`, note: orderNote(o, kcal, protein), mine: true }));
  const places = new Set(theirs.map((o) => o.where.toLowerCase()));
  return [...theirs, ...eatOut.filter((e) => !places.has(e.where.toLowerCase()))];
}

/** Their food list minus the foods they won't eat. */
export const withoutNoFoods = (ids: string[], no: string[] = []) => ids.filter((id) => !no.includes(id));

export { FOOD_DB };
