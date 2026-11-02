/**
 * Builds a meal plan from the exact foods someone picked.
 *
 * Four meals a day. For each meal the planner tries every sensible combination of
 * their foods (a main protein, a carb, a vegetable or fruit, sometimes a fat or a
 * sauce), sizes each portion to measurable amounts (whole eggs, ½ cups, 1 oz steps),
 * and scores how close the meal lands to that meal's calorie and protein target.
 * The best 3 combinations (different proteins where possible) become the options.
 * Pick any one option per meal and the day lands close to their numbers.
 */
import { CAT_LABEL, FOOD_DB, foodById, type Food, type FoodCat } from '../data/foods';

export type MealOption = { name: string; detail: string; kcal: string; protein: string; ids?: string[] };
export type MealSlot = { slot: string; target: string; options: MealOption[] };
type Part = { food: Food; amt: number };

export const SLOTS = [
  { slot: 'Breakfast', tag: 'B', k: 0.25, p: 0.25 },
  { slot: 'Lunch', tag: 'L', k: 0.3, p: 0.3 },
  { slot: 'Afternoon', tag: 'S', k: 0.15, p: 0.17 },
  { slot: 'Dinner', tag: 'D', k: 0.3, p: 0.28 },
] as const;

const fmt = (n: number) => n.toLocaleString('en-US');
const r10 = (n: number) => Math.round(n / 10) * 10;
const r50 = (n: number) => Math.round(n / 50) * 50;

/** Round to the food's step and keep it inside its min/max. */
export function portion(f: Food, units: number) {
  const v = Math.round(units / f.step) * f.step;
  return Math.min(f.max, Math.max(f.min, +v.toFixed(2)));
}

export const totals = (parts: Part[]) =>
  parts.reduce((t, x) => ({ kcal: t.kcal + x.food.kcal * x.amt, p: t.p + x.food.p * x.amt }), { kcal: 0, p: 0 });

const FRAC: Record<string, string> = { '0.25': '¼', '0.5': '½', '0.75': '¾' };
/** 1.5 → "1½", 0.25 → "¼", 3 → "3". */
export function amountText(n: number) {
  const whole = Math.floor(n + 1e-9);
  const frac = +(n - whole).toFixed(2);
  const fs = FRAC[String(frac)];
  if (!frac) return String(whole);
  if (fs) return `${whole || ''}${fs}`;
  return String(+n.toFixed(1));
}

/** "6 oz chicken breast", "3 eggs", "1½ cups white rice", "½ avocado". */
export function partText({ food: f, amt }: Part) {
  const a = amountText(amt);
  const name = f.name.replace(/\s*\(.*?\)\s*/g, ' ').trim().toLowerCase();
  if (f.unit === 'oz') return `${a} oz ${name}`;
  if (f.unit === 'half avocado') return amt === 0.5 ? '½ avocado' : `${a} avocado`;
  const many = amt > 1;
  const noPlural = ['tbsp', 'tsp', 'oz'].includes(f.unit);
  const unitWord = many && !noPlural ? (f.units || f.unit + (/(s|\))$/.test(f.unit) ? '' : 's')) : f.unit;
  const last = name.split(' ').pop()!;
  const nouns = [last, last.replace(/es$/, ''), last.replace(/s$/, '')];
  if (nouns.some((n) => unitWord.toLowerCase().includes(n))) return `${a} ${unitWord}`; // "2 medium potatoes", not "potatoes potatoes"
  // Countable foods ("3 eggs", "2 slices whole-wheat bread", "1 banana")
  if (['egg', 'banana', 'apple', 'orange', 'pear', 'peach', 'kiwi'].includes(f.unit)) return `${a} ${many ? f.units || f.unit + 's' : f.unit}`;
  if (f.unit.startsWith('cup')) return `${a} ${many ? unitWord.replace('cup', 'cups').replace('cupss', 'cups') : f.unit} ${name}`;
  return `${a} ${unitWord} ${name}`;
}

const SWEET_MAINS = new Set(['greek_yogurt', 'greek_yogurt_2', 'skyr', 'cottage_cheese', 'whey', 'plant_protein', 'protein_shake_rtd', 'milk_2', 'milk_skim', 'fairlife', 'protein_bar']);
const SWEET_CARBS = new Set(['oats', 'cream_of_rice', 'cereal', 'granola', 'pancake_mix', 'bagel', 'english_muffin', 'bread_ww', 'bread_white', 'sourdough', 'rice_cakes']);
const SAVORY_ONLY_CARBS = new Set(['white_rice', 'brown_rice', 'quinoa', 'couscous', 'pasta', 'ww_pasta', 'protein_pasta', 'ramen_noodles', 'potato', 'sweet_potato', 'black_beans', 'chickpeas', 'lentils', 'corn', 'peas', 'corn_tortilla', 'tortilla', 'lowcarb_tortilla', 'pita', 'burger_bun']);
const BREADS = new Set(['bread_ww', 'bread_white', 'sourdough', 'pita', 'burger_bun', 'tortilla', 'lowcarb_tortilla', 'corn_tortilla', 'bagel', 'english_muffin']);
const SANDWICH_MAINS = new Set(['turkey_deli', 'chicken_breast', 'rotisserie_chicken', 'tuna_can', 'canned_chicken', 'ham', 'eggs', 'chicken_sausage', 'ground_beef_93', 'ground_beef_85', 'ground_turkey', 'beyond_burger', 'flank_steak', 'sirloin', 'shrimp', 'white_fish', 'tofu', 'bacon', 'turkey_bacon']);
const SWEET_FATS = new Set(['peanut_butter', 'almond_butter', 'chia', 'almonds', 'mixed_nuts']);
const isSweet = (m: Food) => SWEET_MAINS.has(m.id) || (m.custom ? m.cat === 'dairy' : false);

/** Would a normal person eat these together? */
function pairs(m: Food, c: Food | undefined, side: Food | undefined, fat: Food | undefined, sauce: Food | undefined, tag: string) {
  const sweet = isSweet(m);
  if (c) {
    if (sweet && SAVORY_ONLY_CARBS.has(c.id)) return false;
    if (c.cat === 'dairy' && !['whey', 'plant_protein'].includes(m.id)) return false;
    if (!sweet && tag !== 'S' && ['oats', 'cream_of_rice', 'cereal', 'granola', 'pancake_mix'].includes(c.id) && !['eggs', 'egg_whites', 'turkey_bacon', 'bacon', 'chicken_sausage', 'ham'].includes(m.id)) return false;
    if (BREADS.has(c.id) && !sweet && !SANDWICH_MAINS.has(m.id) && !m.custom) return false;
    if (c.id === 'burger_bun' && !['ground_beef_93', 'ground_beef_85', 'ground_turkey', 'beyond_burger', 'chicken_breast'].includes(m.id)) return false;
    if (['pasta', 'ww_pasta', 'protein_pasta'].includes(c.id) && sauce && sauce.id !== 'marinara') return false;
  }
  if (sweet && side && side.cat === 'veg') return false;
  if (sweet && sauce && !['honey'].includes(sauce.id)) return false;
  if (!sweet && sauce && sauce.id === 'honey') return false;
  if (sauce?.id === 'marinara' && !(c && ['pasta', 'ww_pasta', 'protein_pasta'].includes(c.id))) return false;
  if (fat) {
    if (sweet !== SWEET_FATS.has(fat.id)) return false;
    if (m.f >= 3 && fat.id !== 'avocado') return false; // fatty mains don't need added fat
  }
  if (tag === 'B' && !sweet && side && side.cat === 'fruit' && c && !SWEET_CARBS.has(c.id)) return false;
  if (sauce && side && side.cat === 'fruit') return false;
  if (!sweet && tag === 'B' && !c && side?.cat === 'fruit' && sauce) return false;
  return true;
}

type Role = 'main' | 'carb' | 'side' | 'fat' | 'sauce';
const fits = (f: Food, tag: string) => f.meals.includes(tag);

/** Which foods can play which part in a given meal. */
function rolesFor(foods: Food[], tag: string) {
  const at = foods.filter((f) => fits(f, tag));
  const anyMain = foods.filter((f) => f.cat === 'protein' || (f.cat === 'dairy' && f.p >= 15));
  let main = at.filter((f) => f.cat === 'protein' || (f.cat === 'dairy' && f.p / Math.max(1, f.kcal) > 0.1));
  if (tag === 'S') main = main.concat(at.filter((f) => f.id === 'protein_bar'));
  if (!main.length) main = anyMain; // e.g. no breakfast proteins picked: use what they have
  let carb = at.filter((f) => f.cat === 'carb' || (tag === 'S' && f.cat === 'snack' && f.id !== 'protein_bar') || ((tag === 'S' || tag === 'B') && f.cat === 'dairy' && f.p < 15));
  const side = at.filter((f) => (tag === 'B' || tag === 'S' ? f.cat === 'fruit' || (tag === 'B' && f.cat === 'veg') : f.cat === 'veg'));
  const fat = at.filter((f) => f.cat === 'fat');
  const sauce = at.filter((f) => f.cat === 'sauce');
  if (tag === 'S' && !carb.length) carb = []; // snacks can be protein + fruit only
  return { main, carb, side, fat, sauce };
}

type Combo = { parts: Part[]; kcal: number; p: number; score: number; main: Food; carb?: Food };

/** Size one combination of foods to the meal's targets. */
function solve(main: Food, carb: Food | undefined, side: Food | undefined, fat: Food | undefined, sauce: Food | undefined, K: number, P: number, tag = 'L'): Combo {
  const cap = (f: Food) => (tag === 'S' ? { ...f, max: Math.min(f.max, Math.max(f.min, Math.round(f.def * 1.34 / f.step) * f.step)) } : f);
  main = cap(main); if (carb) carb = cap(carb);
  const fixed: Part[] = [];
  if (side) fixed.push({ food: side, amt: side.def });
  if (fat) fixed.push({ food: fat, amt: fat.def });
  if (sauce) fixed.push({ food: sauce, amt: sauce.def });
  let carbAmt = carb ? carb.def : 0;
  let mainAmt = main.def;
  // Two passes: protein first (main covers what the carb and sides don't), then calories from the carb.
  for (let i = 0; i < 3; i++) {
    const others = totals([...fixed, ...(carb ? [{ food: carb, amt: carbAmt }] : [])]);
    const pAim = tag === 'L' || tag === 'D' ? P * 1.15 : P; // a bit more protein, a bit less rice
    mainAmt = portion(main, (pAim - others.p) / Math.max(0.1, main.p));
    const withMain = totals([...fixed, { food: main, amt: mainAmt }]);
    if (carb) carbAmt = portion(carb, (K - withMain.kcal) / Math.max(1, carb.kcal));
  }
  if (!carb && side) {
    const rest = totals([{ food: main, amt: mainAmt }, ...fixed.filter((x) => x.food !== side)]);
    const i = fixed.findIndex((x) => x.food === side);
    fixed[i] = { food: side, amt: portion(side, (K - rest.kcal) / Math.max(1, side.kcal)) };
  }
  const parts: Part[] = [{ food: main, amt: mainAmt }, ...(carb ? [{ food: carb, amt: carbAmt }] : []), ...fixed];
  const t = totals(parts);
  const kErr = Math.abs(t.kcal - K) / K;
  const pShort = Math.max(0, (tag === 'S' ? P * 0.85 : P) - t.p) / P; // snacks can run a little light on protein
  const pOver = Math.max(0, t.p - P * 1.6) / P;
  // Prefer complete-looking meals: a side, and a carb at breakfast, lunch and dinner.
  const shape = (side ? 0 : 0.06) + (carb || tag === 'S' ? 0 : 0.08);
  const mine = [main, carb, side].some((f) => f?.custom) ? -0.05 : 0;
  return { parts, kcal: t.kcal, p: t.p, score: kErr + 1.6 * pShort + 0.3 * pOver + shape + mine, main, carb };
}

function mealName(c: Combo, tag: string) {
  const short = (f: Food) => f.short || f.name.replace(/\s*\(.*?\)\s*/g, ' ').trim();
  const [main, ...rest] = c.parts;
  const carb = c.carb;
  if (carb && BREADS.has(carb.id) && !isSweet(main.food) && !['bagel', 'english_muffin'].includes(carb.id)) {
    const kind = carb.id === 'corn_tortilla' ? 'tacos' : carb.id.includes('tortilla') ? (tag === 'B' ? 'burrito' : 'wrap') : carb.id === 'burger_bun' ? 'burger' : carb.id === 'pita' ? 'pita' : 'sandwich';
    const side = rest.find((x) => x.food.cat === 'veg' || x.food.cat === 'fruit');
    const base = `${main.food.id === 'eggs' ? 'Egg' : short(main.food)} ${kind}`;
    return side ? `${base} & ${short(side.food).toLowerCase()}` : base;
  }
  const names = [short(main.food), ...rest.filter((x) => x.food.cat !== 'sauce' && x.food.cat !== 'fat').map((x) => short(x.food).toLowerCase())];
  if (tag === 'S' && names.length === 1) return names[0];
  if (names.length === 1) return names[0];
  return names.length === 2 ? `${names[0]} & ${names[1]}` : `${names.slice(0, -1).join(', ')} & ${names[names.length - 1]}`;
}

/** Best 3 different options for one meal. `avoid` = mains already leading other meals. */
function optionsFor(foods: Food[], tag: string, K: number, P: number, avoid: Set<string>): Combo[] {
  const r = rolesFor(foods, tag);
  if (!r.main.length) return [];
  const carbs: (Food | undefined)[] = r.carb.length ? [...r.carb, undefined] : [undefined];
  const sides: (Food | undefined)[] = r.side.length ? r.side : [undefined];
  const fats: (Food | undefined)[] = [undefined, ...r.fat];
  const sauces: (Food | undefined)[] = tag === 'S' ? [undefined] : [undefined, ...r.sauce.filter((s) => s.kcal <= 40)];
  const all: Combo[] = [];
  for (const m of r.main) for (const c of carbs) for (const s of sides) for (const f of fats) for (const sa of sauces) {
    if (c && c.id === m.id) continue;
    if (!pairs(m, c, s, f, sa, tag)) continue;
    all.push(solve(m, c, s, f, sa, K, P, tag));
  }
  all.sort((a, b) => a.score - b.score);
  const out: Combo[] = [];
  const usedMain = new Set<string>();
  const usedCarb = new Set<string>();
  // Pass 1: different mains (and fresh ones before ones leading other meals), different carbs.
  for (const fresh of [true, false]) {
    for (const c of all) {
      if (out.length >= 3) break;
      if (usedMain.has(c.main.id)) continue;
      if (fresh && avoid.has(c.main.id) && r.main.length > 2) continue;
      if (c.carb && usedCarb.has(c.carb.id) && r.carb.length > 2) continue;
      if (c.score > (out.length ? 0.2 : 0.6)) continue;
      out.push(c); usedMain.add(c.main.id); if (c.carb) usedCarb.add(c.carb.id);
    }
  }
  // Pass 2: few mains picked, so vary the carb or side instead.
  for (const c of all) {
    if (out.length >= 3) break;
    const key = c.parts.map((p) => p.food.id).join('+');
    if (out.some((o) => o.parts.map((p) => p.food.id).join('+') === key)) continue;
    if (out.some((o) => o.main.id === c.main.id && o.carb?.id === c.carb?.id)) continue;
    if (c.score > 0.2) continue;
    out.push(c);
  }
  return out;
}

export type FoodPlanResult = { meals: MealSlot[]; dayKcal: number; dayProtein: number; missing: string[] };

/** The whole plan. foodIds can include custom food ids when `custom` holds them. */
export function buildFoodPlan(kcal: number, protein: number, foodIds: string[], custom: Food[] = []): FoodPlanResult {
  const byCustom = new Map(custom.map((f) => [f.id, f]));
  const foods = foodIds.map((id) => byCustom.get(id) || foodById(id)).filter(Boolean) as Food[];
  const leadMains = new Set<string>();
  let dayK = 0, dayP = 0;
  const meals: MealSlot[] = SLOTS.map((s) => {
    const K = kcal * s.k, P = protein * s.p;
    const combos = optionsFor(foods, s.tag, K, P, leadMains);
    if (combos[0]) { leadMains.add(combos[0].main.id); dayK += combos[0].kcal; dayP += combos[0].p; }
    return {
      slot: s.slot,
      target: `about ${fmt(r50(K))} calories · ${Math.round(P / 5) * 5} g protein`,
      options: combos.map((c) => ({
        name: mealName(c, s.tag),
        detail: c.parts.map(partText).join(', '),
        ids: c.parts.map((x) => x.food.id),
        kcal: `about ${fmt(r10(c.kcal))}`,
        protein: `${Math.round(c.p)} g`,
      })),
    };
  });
  return { meals, dayKcal: Math.round(dayK), dayProtein: Math.round(dayP), missing: whatsMissing(foods) };
}

/** What the picker should still ask for. */
export function whatsMissing(foods: Food[]) {
  const n = (pred: (f: Food) => boolean) => foods.filter(pred).length;
  const out: string[] = [];
  const proteins = n((f) => f.cat === 'protein' || (f.cat === 'dairy' && f.p >= 15));
  if (proteins < 3) out.push(`${3 - proteins} more protein${3 - proteins > 1 ? 's' : ''}`);
  if (n((f) => f.cat === 'carb') < 2) out.push(`${2 - n((f) => f.cat === 'carb')} more carb${2 - n((f) => f.cat === 'carb') > 1 ? 's' : ''}`);
  if (n((f) => f.cat === 'veg') < 1) out.push('a vegetable');
  if (n((f) => f.cat === 'fruit') < 1) out.push('a fruit');
  if (!foods.some((f) => fits(f, 'B') && (f.cat === 'protein' || f.cat === 'dairy'))) out.push('a breakfast protein (eggs, yogurt or a shake)');
  return out;
}

/** Grocery list from the foods the plan actually uses. */
export function buildFoodGrocery(meals: MealSlot[], foodIds: string[], custom: Food[] = []) {
  const byCustom = new Map(custom.map((f) => [f.id, f]));
  const foods = foodIds.map((id) => byCustom.get(id) || foodById(id)).filter(Boolean) as Food[];
  const text = meals.flatMap((m) => m.options.map((o) => o.detail.toLowerCase())).join(' | ');
  const used = foods.filter((f) => text.includes(f.name.replace(/\s*\(.*?\)\s*/g, ' ').trim().toLowerCase()) || f.custom);
  const aisles: [string, FoodCat[]][] = [['Protein', ['protein']], ['Dairy', ['dairy']], ['Carbs', ['carb']], ['Produce', ['fruit', 'veg']], ['Extras', ['fat', 'snack', 'sauce']]];
  return aisles
    .map(([aisle, cats]) => ({ aisle, items: used.filter((f) => cats.includes(f.cat)).map((f) => f.name).join(', ') }))
    .filter((a) => a.items);
}

export { CAT_LABEL, FOOD_DB };
