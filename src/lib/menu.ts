/**
 * The meal library behind quiz-built plans (The Free Stack and The Full Stack).
 * Each option lists the foods it needs. A person's menu uses the options that match
 * the foods they picked in the quiz, then fills any gap with the closest match.
 * Portions in {braces} scale to their calorie target: {#3} = whole numbers only
 * (eggs, slices, cans), {1.5} = halves allowed. Restaurant orders never scale.
 */

export const FOODS = ['Eggs', 'Greek yogurt', 'Oats', 'Chicken', 'Beef', 'Fish', 'Rice', 'Potatoes', 'Pasta', 'Wraps & sandwiches', 'Protein shakes', 'Fruit'] as const;
export const SPOTS = ['Chipotle', 'Starbucks', 'Subway', 'Chick-fil-A', 'Panda Express', "McDonald's"] as const;

type Opt = { name: string; detail: string; kcal: number; protein: number; needs: string[]; spot?: string };
type Slot = { slot: string; share: number; pshare: number; opts: Opt[] };

export const LIBRARY: Slot[] = [
  {
    slot: 'Breakfast', share: 0.22, pshare: 0.23, opts: [
      { name: 'Eggs, toast & yogurt', detail: '{#3} scrambled eggs, {#2} slices whole-grain toast, {1} cup plain Greek yogurt', kcal: 540, protein: 45, needs: ['Eggs', 'Greek yogurt'] },
      { name: 'Greek yogurt bowl', detail: '{1.5} cups plain Greek yogurt, {0.5} cup oats, a handful of berries, 1 tsp honey', kcal: 450, protein: 40, needs: ['Greek yogurt'] },
      { name: 'Eggs & toast', detail: '{#3} eggs + {0.5} cup egg whites, {#2} slices whole-grain toast, a piece of fruit', kcal: 500, protein: 37, needs: ['Eggs'] },
      { name: 'Protein oats', detail: '{0.75} cup oats cooked in milk, {1} scoop whey stirred in, a banana', kcal: 520, protein: 38, needs: ['Oats', 'Protein shakes'] },
      { name: 'Oats & eggs', detail: '{0.75} cup oats with berries, {#3} eggs + {0.5} cup egg whites on the side', kcal: 560, protein: 40, needs: ['Oats', 'Eggs'] },
      { name: 'Breakfast burrito', detail: '{#3} eggs, {2} oz turkey sausage or ham and salsa in a large tortilla', kcal: 520, protein: 38, needs: ['Eggs', 'Wraps & sandwiches'] },
      { name: 'Shake & banana', detail: '{1} scoop whey in {1} cup milk, a banana, {1} tbsp peanut butter', kcal: 430, protein: 35, needs: ['Protein shakes'] },
      { name: 'Starbucks run', detail: '2 egg bites + grande latte, no syrup', kcal: 490, protein: 32, needs: [], spot: 'Starbucks' },
      { name: "McDonald's breakfast", detail: '2 Egg McMuffins + black coffee', kcal: 620, protein: 34, needs: [], spot: "McDonald's" },
    ],
  },
  {
    slot: 'Lunch', share: 0.3, pshare: 0.32, opts: [
      { name: 'Chicken rice bowl', detail: '{6} oz chicken, {1.5} cups rice, stir-fry veg, {2} tbsp light teriyaki', kcal: 670, protein: 58, needs: ['Chicken', 'Rice'] },
      { name: 'Deli sandwich', detail: 'Double turkey ({6} oz) on wheat, mustard, lettuce, tomato + an apple', kcal: 620, protein: 48, needs: ['Wraps & sandwiches'] },
      { name: 'Chicken wrap', detail: '{5} oz grilled chicken, a large tortilla, lettuce, salsa, {1} oz cheese', kcal: 600, protein: 50, needs: ['Chicken', 'Wraps & sandwiches'] },
      { name: 'Beef & rice bowl', detail: '{6} oz 93% lean ground beef, {1} cup rice, peppers and onions, salsa', kcal: 650, protein: 50, needs: ['Beef', 'Rice'] },
      { name: 'Chicken pasta', detail: '{6} oz chicken, {1.5} cups cooked pasta, marinara, side salad', kcal: 680, protein: 55, needs: ['Chicken', 'Pasta'] },
      { name: 'Tuna wrap', detail: '{#2} cans tuna with light mayo in a large tortilla, lettuce + a piece of fruit', kcal: 560, protein: 58, needs: ['Fish', 'Wraps & sandwiches'] },
      { name: 'Chicken & potatoes', detail: '{6} oz chicken, {1.5} cups roasted potatoes, a vegetable', kcal: 600, protein: 55, needs: ['Chicken', 'Potatoes'] },
      { name: 'Chipotle bowl', detail: 'Double chicken, white rice, black beans, fajita veggies, salsa (no sour cream or cheese)', kcal: 745, protein: 77, needs: [], spot: 'Chipotle' },
      { name: 'Subway sub', detail: 'Footlong rotisserie chicken on wheat, all the veggies, mustard', kcal: 700, protein: 50, needs: [], spot: 'Subway' },
      { name: 'Chick-fil-A', detail: 'Grilled chicken sandwich + 8-count grilled nuggets + fruit cup', kcal: 580, protein: 53, needs: [], spot: 'Chick-fil-A' },
      { name: 'Panda Express teriyaki', detail: 'Plate: super greens + 2 grilled teriyaki chicken', kcal: 640, protein: 70, needs: [], spot: 'Panda Express' },
      { name: "McDonald's burgers", detail: '2 McDoubles, no fries, diet drink', kcal: 800, protein: 44, needs: [], spot: "McDonald's" },
    ],
  },
  {
    slot: 'Afternoon', share: 0.13, pshare: 0.17, opts: [
      { name: 'Shake + fruit', detail: '{1} scoop whey in {1} cup milk + an apple or banana', kcal: 335, protein: 32, needs: ['Protein shakes'] },
      { name: 'Yogurt + berries', detail: '{1.5} cups plain Greek yogurt + berries', kcal: 270, protein: 32, needs: ['Greek yogurt'] },
      { name: 'Jerky + fruit', detail: '{2} oz beef jerky + an apple', kcal: 255, protein: 18, needs: ['Beef'] },
      { name: 'Eggs + fruit', detail: '{#3} hard-boiled eggs + a piece of fruit', kcal: 300, protein: 19, needs: ['Eggs'] },
      { name: 'Turkey roll-ups', detail: '{4} oz deli turkey, {1} string cheese, an apple', kcal: 300, protein: 32, needs: [] },
    ],
  },
  {
    slot: 'Dinner', share: 0.35, pshare: 0.28, opts: [
      { name: 'Steak & potatoes', detail: '{6} oz sirloin, {1} medium potato, a vegetable, 1 tsp butter', kcal: 585, protein: 52, needs: ['Beef', 'Potatoes'] },
      { name: 'Salmon & rice', detail: '{6} oz salmon, {1} cup rice, broccoli', kcal: 605, protein: 40, needs: ['Fish', 'Rice'] },
      { name: 'Chicken teriyaki at home', detail: '{6} oz chicken thigh, {1} cup rice, stir-fry veg, light teriyaki', kcal: 620, protein: 45, needs: ['Chicken', 'Rice'] },
      { name: 'Chicken & potatoes', detail: '{7} oz chicken breast, {1.5} cups roasted potatoes, a vegetable', kcal: 620, protein: 62, needs: ['Chicken', 'Potatoes'] },
      { name: 'Spaghetti & meat sauce', detail: '{2} cups cooked pasta, {5} oz 93% lean ground beef in marinara, side salad', kcal: 720, protein: 48, needs: ['Beef', 'Pasta'] },
      { name: 'Taco bowl', detail: '{5} oz lean ground beef, {1} cup rice, black beans, salsa, lettuce', kcal: 650, protein: 45, needs: ['Beef', 'Rice'] },
      { name: 'Fish tacos', detail: '{6} oz white fish or shrimp, {#3} corn tortillas, slaw, salsa', kcal: 520, protein: 45, needs: ['Fish', 'Wraps & sandwiches'] },
      { name: 'Chicken pasta', detail: '{6} oz chicken, {2} cups cooked pasta, marinara, a vegetable', kcal: 720, protein: 58, needs: ['Chicken', 'Pasta'] },
    ],
  },
];

const EAT_OUT: Record<string, { where: string; order: string; kcal: string; protein: string }> = {
  Chipotle: { where: 'Chipotle', order: 'Bowl: double chicken, white rice, black beans, fajita veggies, salsa. Skip sour cream and cheese.', kcal: 'about 745', protein: '77 g' },
  Starbucks: { where: 'Starbucks', order: '2 egg bites + a grande latte, no syrup. Or a protein box.', kcal: 'about 490', protein: '32 g' },
  Subway: { where: 'Subway', order: 'Footlong rotisserie chicken on wheat, all the veggies, mustard. Skip the cookies and chips.', kcal: 'about 700', protein: '50 g' },
  'Chick-fil-A': { where: 'Chick-fil-A', order: 'Grilled chicken sandwich + 8-count grilled nuggets + fruit cup. Diet lemonade.', kcal: 'about 580', protein: '53 g' },
  'Panda Express': { where: 'Panda Express', order: 'Plate: super greens + 2 grilled teriyaki chicken. Skip the fried rice and chow mein.', kcal: 'about 640', protein: '70 g' },
  "McDonald's": { where: "McDonald's", order: '2 McDoubles, no fries, diet drink.', kcal: 'about 800', protein: '44 g' },
};

const HALF = (v: number) => {
  const r = Math.max(0.5, Math.round(v * 2) / 2);
  const whole = Math.floor(r);
  return r % 1 ? `${whole || ''}½` : String(r);
};

/** "{#3} eggs, {1.5} cups rice" × 1.2 → "4 eggs, 2 cups rice". */
export function scaleDetail(detail: string, f: number) {
  return detail.replace(/\{(#?)([\d.]+)\}/g, (_, whole, n) => {
    const x = Number(n), v = x * f;
    if (whole || x > 2) return String(Math.max(1, Math.round(v)));
    return HALF(v);
  });
}

const fmt = (n: number) => n.toLocaleString('en-US');
const r50 = (n: number) => Math.round(n / 50) * 50;

/** Pick 3 options per meal from the foods and spots they chose, sized to their numbers. */
export function buildMenu(kcal: number, protein: number, likes: string[] = [], spots: string[] = []) {
  const picks = new Set(likes);
  return LIBRARY.map((s) => {
    const target = r50(kcal * s.share);
    const missing = (o: Opt) => o.needs.filter((x) => !picks.has(x)).length;
    const home = s.opts.filter((o) => !o.spot);
    const exact = home.filter((o) => missing(o) === 0).sort((a, b) => b.needs.length - a.needs.length);
    const out = s.opts.filter((o) => o.spot && spots.includes(o.spot));
    const chosen: Opt[] = [...exact.slice(0, out.length ? 2 : 3), ...out.slice(0, 1)];
    for (const o of [...home].sort((a, b) => missing(a) - missing(b) || b.needs.length - a.needs.length)) {
      if (chosen.length >= 3) break;
      if (!chosen.includes(o)) chosen.push(o);
    }
    return {
      slot: s.slot,
      target: `about ${fmt(target)} calories · ${Math.round((protein * s.pshare) / 5) * 5} g protein`,
      options: chosen.map((o) => {
        const f = o.spot ? 1 : Math.min(1.5, Math.max(0.7, target / o.kcal));
        return { name: o.name, detail: scaleDetail(o.detail, f), kcal: `about ${fmt(Math.round((o.kcal * f) / 10) * 10)}`, protein: `${Math.round(o.protein * f)} g` };
      }),
    };
  });
}

/** Eat-out orders for the places they actually go (or common ones if none). */
export function buildEatOut(spots: string[] = []) {
  const mine = spots.map((s) => EAT_OUT[s]).filter(Boolean);
  return mine.length ? mine : [EAT_OUT.Chipotle, EAT_OUT['Chick-fil-A'], EAT_OUT.Subway];
}

/** A grocery list from the foods they picked. */
export function buildGrocery(likes: string[] = []) {
  const has = (x: string) => likes.includes(x);
  const protein = [has('Eggs') && 'Eggs', has('Greek yogurt') && 'Plain Greek yogurt', has('Chicken') && 'Chicken breast or thighs',
    has('Beef') && 'Lean ground beef, sirloin', has('Fish') && 'Salmon, tuna, white fish', has('Protein shakes') && 'Whey protein, milk', 'Deli turkey'].filter(Boolean);
  const carbs = [has('Rice') && 'Rice', has('Potatoes') && 'Potatoes', has('Oats') && 'Oats', has('Pasta') && 'Pasta, marinara',
    has('Wraps & sandwiches') && 'Whole-grain bread, large tortillas'].filter(Boolean);
  return [
    { aisle: 'Protein', items: protein.join(', ') },
    ...(carbs.length ? [{ aisle: 'Carbs', items: carbs.join(', ') }] : []),
    { aisle: 'Produce', items: [has('Fruit') && 'Berries, apples, bananas', 'Frozen stir-fry veg, broccoli, salad kits'].filter(Boolean).join(', ') },
    { aisle: 'Extras', items: 'Salsa, mustard, light teriyaki, honey, peanut butter' },
  ];
}
