import type { ImageSourcePropType } from 'react-native';

/** Food photos for meals and eat-out orders. Brand photos for brand orders, real food photos for the rest. */
export const MEAL_IMG = {
  starbucks: require('../../assets/meals/starbucks.jpg'),
  latte: require('../../assets/meals/latte.jpg'),
  chipotle: require('../../assets/meals/chipotle.jpg'),
  eggs: require('../../assets/meals/eggs.jpg'),
  yogurt_bowl: require('../../assets/meals/yogurt_bowl.jpg'),
  yogurt: require('../../assets/meals/yogurt.jpg'),
  oats: require('../../assets/meals/oats.jpg'),
  teriyaki: require('../../assets/meals/teriyaki.jpg'),
  sandwich: require('../../assets/meals/sandwich.jpg'),
  shake: require('../../assets/meals/shake.jpg'),
  jerky: require('../../assets/meals/jerky.jpg'),
  steak: require('../../assets/meals/steak.jpg'),
  salmon: require('../../assets/meals/salmon.jpg'),
  chicken_rice: require('../../assets/meals/chicken_rice.jpg'),
  salad: require('../../assets/meals/salad.jpg'),
  pizza: require('../../assets/meals/pizza.jpg'),
  burger: require('../../assets/meals/burger.jpg'),
  beer: require('../../assets/meals/beer.jpg'),
} as const;

const RULES: [RegExp, keyof typeof MEAL_IMG][] = [
  [/starbucks|egg bites/i, 'starbucks'],
  [/chipotle|burrito/i, 'chipotle'],
  [/pizza/i, 'pizza'],
  [/burger/i, 'burger'],
  [/beer|drinks|bar\b/i, 'beer'],
  [/latte|cold brew|coffee/i, 'latte'],
  [/shake|smoothie/i, 'shake'],
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
export function mealImage(name: string, detail = ''): ImageSourcePropType | null {
  for (const text of [name, detail]) {
    const hit = RULES.find(([re]) => re.test(text));
    if (hit) return MEAL_IMG[hit[1]];
  }
  return null;
}
