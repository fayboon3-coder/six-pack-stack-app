import type { ImageSourcePropType } from 'react-native';

import { MEAL_HD, hdUrl } from './hd';

/**
 * Photos for meals and eat-out orders: iconic, ad-style dishes from the photo CDN (see hd.ts).
 * Restaurant orders get the dish they're known for, never the chain's own photos or logos.
 */
type MealKey = keyof typeof MEAL_HD;
const RULES: [RegExp, MealKey][] = [
  [/egg bites/i, 'egg_bites'],
  [/starbucks/i, 'starbucks'],
  [/chipotle|burrito/i, 'chipotle'],
  [/subway/i, 'subway'],
  [/chick-?fil-?a/i, 'chickfila'],
  [/mcdonald|mcdouble/i, 'mcdonalds'],
  [/panda express/i, 'panda'],
  [/pizza/i, 'pizza'],
  [/burger/i, 'burger'],
  [/beer|drinks|\bat the bar\b|\bbar tab\b/i, 'beer'],
  [/latte|cold brew|coffee/i, 'latte'],
  [/smoothie/i, 'smoothie'],
  [/shake/i, 'shake'],
  [/jerky/i, 'jerky'],
  [/sandwich|sub\b|wrap|deli/i, 'sandwich'],
  [/salmon|fish|tuna|shrimp/i, 'salmon'],
  [/steak|sirloin|beef/i, 'steak'],
  [/teriyaki|stir.?fry|poke/i, 'teriyaki'],
  [/\beggs?\b|omelet|scrambled/i, 'eggs'],
  [/oat/i, 'oats'],
  [/yogurt.*(bowl|granola)|parfait/i, 'yogurt_bowl'],
  [/yogurt|cottage/i, 'yogurt'],
  [/salad/i, 'salad'],
  [/chicken|rice|bowl/i, 'chicken_rice'],
  [/toast/i, 'eggs'],
];

/** Photo for a meal: matches on the name first, then the details. */
export function mealHD(name: string, detail = ''): string | null {
  for (const text of [name, detail]) {
    const hit = RULES.find(([re]) => re.test(text));
    if (hit) return MEAL_HD[hit[1]];
  }
  return null;
}

/** The same photo as an image source (sized for a full-width card). */
export function mealImage(name: string, detail = '', w = 1000): ImageSourcePropType | null {
  const id = mealHD(name, detail);
  return id ? { uri: hdUrl(id, w) } : null;
}
