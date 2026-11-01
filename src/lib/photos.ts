/**
 * App imagery: real product photos only (no stock photos).
 * Hero banners are product lineups built from the same official product photos as Beyond the Label.
 * Food and grocery tiles use each brand's official product photo.
 * Product photos are used for identification and commentary; see the disclaimer in the app.
 */
const HERO = {
  signIn: require('../../assets/hero/signin.jpg'),
  dumbbells: require('../../assets/hero/dumbbells.jpg'),
  gear: require('../../assets/hero/gear.jpg'),
  stack: require('../../assets/hero/stack.jpg'),
  plan: require('../../assets/hero/plan.jpg'),
  progress: require('../../assets/hero/progress.jpg'),
  tested: require('../../assets/hero/tested.jpg'),
};

export type Pic = number | string;

export const PHOTO = {
  signIn: HERO.signIn as Pic,
  gym: HERO.gear as Pic,
  plan: HERO.plan as Pic,
  stack: HERO.stack as Pic,
  meals: HERO.plan as Pic,
  eatOut: HERO.plan as Pic,
  grocery: HERO.plan as Pic,
  progress: HERO.progress as Pic,
  checkin: HERO.progress as Pic,
  coach: HERO.tested as Pic,
};

/** Hero image for a training day label like "Monday · Upper". */
export function dayPhoto(label: string): Pic {
  const t = label.toLowerCase();
  if (t.includes('lower') || t.includes('leg') || t.includes('abs')) return HERO.gear;
  return HERO.dumbbells;
}

const amz = (id: string) => `https://m.media-amazon.com/images/I/${id}._AC_SL600_.jpg`;

/** Official brand product photos for foods. */
export const FOOD: Record<string, { name: string; pic: Pic }> = {
  eggs: { name: "Eggland's Best eggs", pic: amz('61865ctzW6L') },
  yogurt: { name: 'Chobani Greek yogurt', pic: amz('71VBo3CzSoL') },
  bread: { name: "Dave's Killer Bread", pic: amz('81BkGDb9vnL') },
  oats: { name: 'Quaker oats', pic: amz('81r81ajDMKL') },
  chicken: { name: 'Tyson chicken breast', pic: amz('61dQIeBePQL') },
  rice: { name: "Ben's Original rice", pic: amz('81vDaScb5HL') },
  beans: { name: "Bush's black beans", pic: amz('81vMwAunu-L') },
  milk: { name: 'fairlife milk', pic: amz('713oe7MVfQL') },
  whey: { name: 'ON Gold Standard whey', pic: require('../../assets/img/whey.png') },
  jerky: { name: "Jack Link's jerky", pic: amz('81PMYTxuoJL') },
  banana: { name: 'Bananas', pic: amz('51+lZqgd9sL') },
  steak: { name: 'Sirloin steak', pic: amz('81SSPPfF1pL') },
  salmon: { name: 'Wild salmon', pic: amz('71GWtpyoBjL') },
  potato: { name: 'Russet potatoes', pic: amz('71sqqaaDQJL') },
  broccoli: { name: 'Birds Eye broccoli', pic: amz('816z58BKYIL') },
  coffee: { name: 'Starbucks coffee', pic: amz('71w8jjfu4lL') },
  quest: { name: 'Quest bar', pic: require('../../assets/img/quest.png') },
};

/** Foods to show for a meal slot. */
export function mealFoods(slot: string) {
  const t = slot.toLowerCase();
  const keys = t.includes('breakfast') ? ['eggs', 'yogurt', 'bread', 'oats']
    : t.includes('lunch') ? ['chicken', 'rice', 'beans']
    : t.includes('dinner') ? ['steak', 'salmon', 'potato', 'broccoli']
    : ['whey', 'milk', 'jerky', 'banana'];
  return keys.map((k) => FOOD[k]);
}

const MATCH: [RegExp, string][] = [
  [/egg/i, 'eggs'], [/yogurt/i, 'yogurt'], [/bread|toast/i, 'bread'], [/oat/i, 'oats'], [/chicken/i, 'chicken'],
  [/rice/i, 'rice'], [/bean/i, 'beans'], [/milk/i, 'milk'], [/jerky/i, 'jerky'], [/banana|fruit/i, 'banana'],
  [/steak|beef/i, 'steak'], [/salmon|fish/i, 'salmon'], [/potato/i, 'potato'], [/broccoli|veg/i, 'broccoli'],
  [/coffee|starbucks/i, 'coffee'], [/whey|protein powder|shake/i, 'whey'], [/protein bar|quest/i, 'quest'],
];

/** Product photos that match a line of text (a grocery aisle, an eat-out order). */
export function foodsIn(text: string, max = 4) {
  const keys: string[] = [];
  for (const [re, k] of MATCH) if (re.test(text) && !keys.includes(k)) keys.push(k);
  return keys.slice(0, max).map((k) => FOOD[k]);
}
