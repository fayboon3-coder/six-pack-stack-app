/**
 * Advanced customization, food side: "walk me through a normal day of eating", "what do you
 * order when you eat out", "anything you don't eat". Their words become their own meals (sized
 * to their numbers later), their takeout orders (with calories, estimated when they don't know)
 * and the foods to keep out. Nothing is required; every guess is shown back and can be removed.
 */
import { FOOD_DB, type Food } from '../data/foods';
import { EAT_OUT } from './menu';
import { parseFoods, searchFoods } from './parseFood';
import { nameFromItems, type MyMeal, type MyOrder, type SlotName } from './customize';

const lower = (s: string) => s.toLowerCase().replace(/[’']/g, '');

/* ------------------------------------------------------------------ restaurants */

/** Chains people name, with a typical order's calories and protein for when they don't know theirs. */
const CHAINS: [RegExp, string, number, number][] = [
  [/chipotle/, 'Chipotle', 950, 50], [/starbucks/, 'Starbucks', 450, 20], [/subway/, 'Subway', 700, 35], [/chick ?fil ?a|cfa\b/, 'Chick-fil-A', 750, 40],
  [/panda/, 'Panda Express', 900, 35], [/mcdonalds|mcdonald|mcd\b|mickey d/, "McDonald's", 1000, 35], [/cava\b/, 'Cava', 800, 45],
  [/sweetgreen/, 'Sweetgreen', 650, 35], [/taco bell/, 'Taco Bell', 900, 30], [/wendys|wendy/, "Wendy's", 1000, 40], [/burger king|\bbk\b/, 'Burger King', 1000, 35],
  [/jersey mikes|jersey mike/, "Jersey Mike's", 900, 45], [/jimmy johns|jimmy john/, "Jimmy John's", 750, 35], [/panera/, 'Panera', 750, 35],
  [/canes|raising cane/, "Raising Cane's", 1300, 50], [/in n out|in-n-out|innout/, 'In-N-Out', 900, 35], [/five guys/, 'Five Guys', 1200, 45],
  [/shake shack/, 'Shake Shack', 1000, 40], [/dunkin/, 'Dunkin', 450, 15], [/wingstop/, 'Wingstop', 1100, 60], [/dominos|domino/, "Domino's", 900, 40],
  [/pizza hut/, 'Pizza Hut', 900, 40], [/qdoba/, 'Qdoba', 950, 45], [/el pollo loco/, 'El Pollo Loco', 700, 55], [/popeyes/, 'Popeyes', 1000, 45],
  [/\bkfc\b/, 'KFC', 950, 45], [/chilis|chili s/, "Chili's", 1200, 50], [/olive garden/, 'Olive Garden', 1200, 45], [/poke/, 'Poke', 700, 40],
  [/sushi/, 'Sushi', 700, 35], [/\bthai\b|pad thai/, 'Thai', 900, 35], [/\bpizza\b/, 'Pizza', 900, 40], [/taco|taqueria|mexican/, 'Mexican', 900, 40],
  [/burger/, 'Burger spot', 1000, 40], [/wings/, 'Wings', 1000, 60], [/\bdeli\b|sandwich/, 'Deli', 750, 40], [/chinese/, 'Chinese', 950, 35],
];

export function chainOf(text: string) {
  const t = lower(text);
  const hit = CHAINS.find(([re]) => re.test(t));
  return hit ? { where: hit[1], kcal: hit[2], protein: hit[3] } : null;
}

/** Calories and protein written in the text ("about 750 cal, 60g protein"). */
function numbersIn(text: string) {
  const t = lower(text);
  const k = t.match(/(\d{3,4})\s*(k?cal|calories|kcals?)/);
  const p = t.match(/(\d{1,3})\s*g?\s*(of\s*)?protein/) || t.match(/protein\s*(\d{1,3})/);
  return { kcal: k ? +k[1] : 0, protein: p ? +p[1] : 0 };
}

export type ReadOrder = MyOrder & { est?: boolean };

/** One order from a piece of text: where, what, and its numbers (theirs, ours or estimated). */
export function readOrder(chunk: string, id: string): ReadOrder | null {
  const c = chunk.replace(/\s+/g, ' ').trim()
    .replace(/^(i\s+)?(also\s+)?(usually\s+|always\s+|normally\s+|mostly\s+)?(get|order|grab|have|eat|do)?\s*(from|at)?\s+/i, '')
    .replace(/\s+(on|every)\s+(\w+days?|weekends?|the weekend)$/i, '').replace(/\s+(sometimes|usually|a lot|once a week|twice a week)$/i, '').trim();
  if (c.length < 3) return null;
  const chain = chainOf(c);
  const sep = c.match(/^([^:–—-]{2,30})\s*[:–—-]\s*(.+)$/);
  let where = chain?.where || (sep ? sep[1].trim() : '');
  let order = sep ? sep[2].trim() : c;
  if (!sep && chain) {
    // "a chicken bowl from Chipotle" / "Chipotle chicken bowl"
    order = c.replace(new RegExp(`\\b(from|at)?\\s*(${CHAINS.find(([, n]) => n === chain.where)![0].source})[\\w’']*`, 'i'), ' ').replace(/\s+/g, ' ').trim() || c;
  }
  const at = !where && c.match(/(.+?)\s+(?:from|at)\s+(.+)$/i);
  if (at) { order = at[1]; where = at[2]; }
  if (!where) where = 'Takeout';
  order = order.replace(/\(?\s*(about\s*)?\d{3,4}\s*(k?cal|calories)[^)]*\)?/i, '').replace(/^[,.\s]+|[,.\s]+$/g, '') || c;
  const n = numbersIn(c);
  if (n.kcal) return { id, where: title(where), order: cap(order), kcal: n.kcal, protein: n.protein || Math.round(n.kcal * 0.05) };
  // A chain we have a usual order for: those numbers. Else estimate from the foods in it
  // (restaurant portions run big), else the chain's typical order, else a typical takeout meal.
  const known = Object.values(EAT_OUT).find((e) => e.where === chain?.where);
  const mine = order && order.toLowerCase() !== (chain?.where || '').toLowerCase() ? cap(order) : '';
  if (known) return { id, where: known.where, order: mine || known.order, kcal: +known.kcal.replace(/\D/g, ''), protein: +known.protein.replace(/\D/g, ''), est: true };
  const foods = parseFoods(order).items;
  const fk = foods.reduce((s, x) => s + x.kcal, 0), fp = foods.reduce((s, x) => s + x.protein, 0);
  if (foods.length >= 2 && fk > 250) { const k = Math.round(fk * 1.25 / 10) * 10; return { id, where: title(where), order: cap(order), kcal: k, protein: Math.min(Math.round(fp), Math.round(k / 10)), est: true }; }
  if (chain) return { id, where: chain.where, order: mine || 'Usual order', kcal: chain.kcal, protein: chain.protein, est: true };
  return { id, where: title(where), order: cap(order), kcal: 850, protein: 35, est: true };
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const title = (s: string) => s.replace(/\b[a-z]/g, (m) => m.toUpperCase()).trim();

/** "Chipotle: double chicken bowl. Starbucks egg bites and a latte\nSubway footlong turkey" → orders. */
export function readOrders(text: string): ReadOrder[] {
  if (!text.trim() || /^\s*(no|none|never|nothing|n\/a|i dont|i don't)\b/i.test(text)) return [];
  const chunks = text.split(/\n|;|\.\s+(?=[A-Z])|\.$|\bor\b|\balso\b/).map((c) => c.trim()).filter((c) => /[a-z]/i.test(c));
  // A chunk naming two chains splits at the second one.
  const out: ReadOrder[] = [];
  chunks.forEach((c) => {
    const r = readOrder(c, 'o' + out.length);
    if (r) out.push(r);
  });
  return out;
}

/* ------------------------------------------------------------------ a normal day */

const SLOT_WORDS: [RegExp, SlotName][] = [
  [/\b(breakfast|morning|wake up|first thing|brunch)\b/, 'Breakfast'],
  [/\b(lunch|lunchtime|midday|noon|afternoon meal)\b/, 'Lunch'],
  [/\b(snacks?|afternoon|pre ?workout|post ?workout|after (the )?gym|before (the )?gym|between meals)\b/, 'Afternoon'],
  [/\b(dinner|supper|evening|night|tonight|after work)\b/, 'Dinner'],
];

export type DayPart = { slot: SlotName; text: string };

/** Split "breakfast is 3 eggs and toast, lunch chipotle, then chicken and rice for dinner" by meal. */
export function splitDay(text: string): DayPart[] {
  const t = text.replace(/[ \t]+/g, ' ').trim();
  if (!t) return [];
  const marks: { at: number; end: number; slot: SlotName }[] = [];
  for (const [re, slot] of SLOT_WORDS) {
    const g = new RegExp(re.source, 'gi');
    let m: RegExpExecArray | null;
    while ((m = g.exec(t))) marks.push({ at: m.index, end: m.index + m[0].length, slot });
  }
  marks.sort((a, b) => a.at - b.at);
  const clean = (s: string) => s.replace(/^[\s:,.\-–—]*(is|was|i (usually |normally )?(have|eat|get|do)|usually|normally|then|and|for|i)?\s*/i, '')
    .replace(/[\s,.;]*(then|and|for|at|i have|i eat)?\s*$/i, '').trim();
  if (!marks.length) {
    // No meal words: one meal per line or sentence, in the order of the day.
    const parts = t.split(/\n|\.\s+|;|\bthen\b/i).map(clean).filter((x) => x.length > 2);
    const order: SlotName[] = parts.length >= 4 ? ['Breakfast', 'Lunch', 'Afternoon', 'Dinner'] : parts.length === 3 ? ['Breakfast', 'Lunch', 'Dinner'] : parts.length === 2 ? ['Lunch', 'Dinner'] : ['Lunch'];
    return parts.slice(0, 4).map((p, i) => ({ slot: order[i], text: p }));
  }
  // "Breakfast: eggs" labels what follows; "chicken and rice for dinner" labels what came before.
  const out: DayPart[] = [];
  const emit = (slot: SlotName, raw: string) => {
    const body = clean(raw);
    if (body.length > 2 && /[a-z]/i.test(body)) out.push({ slot, text: body });
  };
  const SEP = /,|\.|;|\n|\bthen\b|\band then\b/gi;
  let cursor = 0;
  let pending: { slot: SlotName; start: number } | null = null;
  for (const m of marks) {
    if (m.at < cursor) continue;
    const before = t.slice(cursor, m.at);
    const forMatch = before.match(/\b(for|as)\s*$/i);
    let sepEnd = -1, sepAt = -1, x: RegExpExecArray | null;
    SEP.lastIndex = 0;
    while ((x = SEP.exec(before))) { sepAt = x.index; sepEnd = x.index + x[0].length; }
    const clause = before.slice(sepEnd >= 0 ? sepEnd : 0, forMatch ? forMatch.index : before.length);
    const after = /^(after|before|post|pre)/i.test(t.slice(m.at, m.end));
    const trail = (!!forMatch || after) && clean(clause).length > 2;
    if (trail) {
      if (pending) emit(pending.slot, t.slice(pending.start, sepAt >= 0 ? cursor + sepAt : cursor));
      pending = null;
      emit(m.slot, clause);
    } else {
      if (pending) emit(pending.slot, t.slice(pending.start, m.at - (forMatch ? forMatch[0].length : 0)));
      pending = { slot: m.slot, start: m.end };
    }
    cursor = m.end;
  }
  if (pending) emit(pending.slot, t.slice(pending.start));
  return out;
}

export type ReadMealPart = { key: string; slot: SlotName; text: string; meal?: MyMeal; order?: ReadOrder; missing: string[]; kcal: number; protein: number };

/** A normal day → their meals (foods we can size) and any takeout in it. */
export function readDay(text: string): ReadMealPart[] {
  return splitDay(text).map((p, i) => {
    const key = 'd' + i;
    const chain = chainOf(p.text);
    if (chain || /\b(takeout|take out|door ?dash|uber ?eats|fast food|eat out|eating out|restaurant|drive thru)\b/i.test(p.text)) {
      const o = readOrder(p.text, key);
      return { key, slot: p.slot, text: p.text, order: o || undefined, missing: [], kcal: o?.kcal || 0, protein: o?.protein || 0 };
    }
    const r = parseFoods(p.text);
    const items = r.items.map((x) => ({ id: x.id, qty: x.qty }));
    const kcal = r.items.reduce((s, x) => s + x.kcal, 0), protein = r.items.reduce((s, x) => s + x.protein, 0);
    const meal: MyMeal | undefined = items.length ? { id: key, slot: p.slot, name: nameFromItems(items), text: p.text, items } : undefined;
    return { key, slot: p.slot, text: p.text, meal, missing: r.missing, kcal, protein };
  });
}

/* ------------------------------------------------------------------ foods they don't eat */

const ids = (pred: (f: Food) => boolean) => FOOD_DB.filter((f) => !f.custom && pred(f)).map((f) => f.id);
const MEAT = /chicken|turkey|beef|steak|sirloin|ribeye|pork|ham\b|bacon|sausage|jerky|flank|canned_chicken/;
const FISH = /salmon|fish|shrimp|tuna/;
const DIETS: [RegExp, string, () => string[]][] = [
  [/\bvegan\b|plant based/, 'Vegan', () => ids((f) => MEAT.test(f.id) || FISH.test(f.id) || /^egg|whey|honey/.test(f.id) || (f.cat === 'dairy' && f.id !== 'almond_milk') || /cheddar|mozzarella|feta|parmesan|cream_cheese|butter$/.test(f.id))],
  [/vegetarian|\bveggie\b|no meat|dont eat meat/, 'Vegetarian', () => ids((f) => MEAT.test(f.id) || FISH.test(f.id))],
  [/pescatarian|pescetarian|only fish/, 'Pescatarian', () => ids((f) => MEAT.test(f.id))],
  [/no pork|dont eat pork|halal|kosher/, 'No pork', () => ids((f) => /pork|ham\b|bacon/.test(f.id) && f.id !== 'turkey_bacon')],
  [/no red meat|dont eat red meat/, 'No red meat', () => ids((f) => /beef|steak|sirloin|ribeye|flank|jerky|pork|ham\b|bacon/.test(f.id) && f.id !== 'turkey_bacon')],
  [/dairy|lactose/, 'No dairy', () => ids((f) => (f.cat === 'dairy' && f.id !== 'almond_milk') || /cheddar|mozzarella|feta|parmesan|cream_cheese|whey/.test(f.id))],
  [/gluten|celiac|coeliac/, 'No gluten', () => ids((f) => /bread|bagel|muffin|pasta|pita|bun|couscous|cereal|granola|pancake|seitan|ramen|^tortilla$|lowcarb_tortilla/.test(f.id))],
  [/seafood|shellfish/, 'No seafood', () => ids((f) => FISH.test(f.id))],
  [/\beggs?\b/, 'No eggs', () => ids((f) => /^egg/.test(f.id))],
];

/** "I'm vegetarian, hate mushrooms and cottage cheese, allergic to shrimp" → foods to keep out. */
export function readNoFoods(text: string): { ids: string[]; diets: string[]; unknown: string[] } {
  const t = lower(text);
  if (!t.trim() || /^\s*(no|none|nope|nothing|i eat everything|anything|all good)\s*\.?$/.test(t)) return { ids: [], diets: [], unknown: [] };
  const out = new Set<string>();
  const diets: string[] = [];
  for (const [re, name, list] of DIETS) {
    if (name === 'No eggs' && !/(no|dont|cant|allergic|hate|not)\s+(\w+\s+)?eggs?/.test(t)) continue;
    if (re.test(t)) { diets.push(name); list().forEach((i) => out.add(i)); }
  }
  const unknown: string[] = [];
  const chunks = t.split(/,|;|\n|\band\b|\bor\b|\bnor\b|\./).map((c) => c.replace(/\b(i|im|i am|hate|dont|do not|cant|can not|cannot|eat|like|stand|allergic|allergy|to|any|no|not|a fan of|really|the|food|foods|anything|with|stuff|vegetarian|vegan|pescatarian|halal|kosher|dairy|lactose|intolerant|gluten|free|celiac|pork|red meat|meat|seafood|shellfish)\b/g, ' ').replace(/\s+/g, ' ').trim());
  for (const c of chunks) {
    if (c.length < 3) continue;
    const f = searchFoods(c, 1)[0] || searchFoods(c.split(' ').sort((a, b) => b.length - a.length)[0] || '', 1)[0];
    if (f) out.add(f.id); else unknown.push(c);
  }
  return { ids: [...out], diets, unknown };
}

/* ------------------------------------------------------------------ all together */

export type FoodAnswers = { day?: string; out?: string; no?: string; extra?: string };
export type FoodEdits = { drop?: string[]; nums?: Record<string, { kcal?: number; protein?: number }> };

export type FoodRead = {
  parts: ReadMealPart[]; orders: ReadOrder[]; noFoods: string[]; diets: string[]; unknownNo: string[];
  meals: MyMeal[]; myOrders: MyOrder[];
};

export function readFood(a: FoodAnswers, e: FoodEdits = {}): FoodRead {
  const drop = new Set(e.drop || []);
  const parts = readDay(a.day || '').filter((p) => !drop.has(p.key));
  const fromDay = parts.filter((p) => p.order).map((p) => p.order!);
  const outs = readOrders(a.out || '').filter((o) => !drop.has(o.id));
  const seen = new Set<string>();
  const orders = [...outs, ...fromDay].filter((o) => {
    // The same place in their day and in their takeout answer: keep the takeout one (it's more specific).
    const k = o.where === 'Takeout' ? (o.where + o.order).toLowerCase() : o.where.toLowerCase();
    return seen.has(k) ? false : (seen.add(k), true);
  }).map((o) => {
    const n = e.nums?.[o.id];
    return n && (n.kcal || n.protein) ? { ...o, kcal: n.kcal || o.kcal, protein: n.protein ?? o.protein, est: !n.kcal && o.est } : o;
  });
  const no = readNoFoods(a.no || '');
  const noFoods = no.ids.filter((id) => !drop.has('no:' + id));
  const meals = parts.filter((p) => p.meal).map((p) => p.meal!);
  return { parts, orders, noFoods, diets: no.diets, unknownNo: no.unknown, meals, myOrders: orders.map(({ est, ...o }) => o) };
}
