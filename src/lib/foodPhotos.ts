/**
 * Real photos of every food in the meal builder (Unsplash, free for commercial use;
 * sources in assets/food/_sources.json). A meal shows the photos of exactly what's in it.
 */
import type { ImageSourcePropType } from 'react-native';
import { foodById } from '../data/foods';

const PHOTO: Record<string, ImageSourcePropType> = {
  almond_milk: require('../../assets/food/almond_milk.jpg'),
  almonds: require('../../assets/food/almonds.jpg'),
  apple: require('../../assets/food/apple.jpg'),
  asparagus: require('../../assets/food/asparagus.jpg'),
  avocado: require('../../assets/food/avocado.jpg'),
  bacon: require('../../assets/food/bacon.jpg'),
  bagel: require('../../assets/food/bagel.jpg'),
  banana: require('../../assets/food/banana.jpg'),
  beef_jerky: require('../../assets/food/beef_jerky.jpg'),
  bell_peppers: require('../../assets/food/bell_peppers.jpg'),
  berries: require('../../assets/food/berries.jpg'),
  beyond_burger: require('../../assets/food/beyond_burger.jpg'),
  black_beans: require('../../assets/food/black_beans.jpg'),
  blueberries: require('../../assets/food/blueberries.jpg'),
  bread: require('../../assets/food/bread.jpg'),
  broccoli: require('../../assets/food/broccoli.jpg'),
  brown_rice: require('../../assets/food/brown_rice.jpg'),
  brussels: require('../../assets/food/brussels.jpg'),
  burger_bun: require('../../assets/food/burger_bun.jpg'),
  burrito: require('../../assets/food/burrito.jpg'),
  canned_chicken: require('../../assets/food/canned_chicken.jpg'),
  carrots: require('../../assets/food/carrots.jpg'),
  cauliflower: require('../../assets/food/cauliflower.jpg'),
  cereal: require('../../assets/food/cereal.jpg'),
  cheese: require('../../assets/food/cheese.jpg'),
  cherries: require('../../assets/food/cherries.jpg'),
  chia: require('../../assets/food/chia.jpg'),
  chicken_breast: require('../../assets/food/chicken_breast.jpg'),
  chicken_sausage: require('../../assets/food/chicken_sausage.jpg'),
  chicken_thigh: require('../../assets/food/chicken_thigh.jpg'),
  chickpeas: require('../../assets/food/chickpeas.jpg'),
  coleslaw: require('../../assets/food/coleslaw.jpg'),
  corn: require('../../assets/food/corn.jpg'),
  corn_tortilla: require('../../assets/food/corn_tortilla.jpg'),
  cottage_cheese: require('../../assets/food/cottage_cheese.jpg'),
  couscous: require('../../assets/food/couscous.jpg'),
  cream_of_rice: require('../../assets/food/cream_of_rice.jpg'),
  cucumber: require('../../assets/food/cucumber.jpg'),
  dark_chocolate: require('../../assets/food/dark_chocolate.jpg'),
  edamame: require('../../assets/food/edamame.jpg'),
  egg_whites: require('../../assets/food/egg_whites.jpg'),
  eggs: require('../../assets/food/eggs.jpg'),
  english_muffin: require('../../assets/food/english_muffin.jpg'),
  feta: require('../../assets/food/feta.jpg'),
  flank_steak: require('../../assets/food/flank_steak.jpg'),
  granola: require('../../assets/food/granola.jpg'),
  granola_bar: require('../../assets/food/granola_bar.jpg'),
  grapes: require('../../assets/food/grapes.jpg'),
  greek_yogurt: require('../../assets/food/greek_yogurt.jpg'),
  green_beans: require('../../assets/food/green_beans.jpg'),
  ground_beef_93: require('../../assets/food/ground_beef_93.jpg'),
  ground_turkey: require('../../assets/food/ground_turkey.jpg'),
  ham: require('../../assets/food/ham.jpg'),
  hummus: require('../../assets/food/hummus.jpg'),
  ice_cream: require('../../assets/food/ice_cream.jpg'),
  kale: require('../../assets/food/kale.jpg'),
  kiwi: require('../../assets/food/kiwi.jpg'),
  lentils: require('../../assets/food/lentils.jpg'),
  mango: require('../../assets/food/mango.jpg'),
  milk: require('../../assets/food/milk.jpg'),
  mixed_nuts: require('../../assets/food/mixed_nuts.jpg'),
  mushrooms: require('../../assets/food/mushrooms.jpg'),
  oats: require('../../assets/food/oats.jpg'),
  onions: require('../../assets/food/onions.jpg'),
  orange: require('../../assets/food/orange.jpg'),
  pancake: require('../../assets/food/pancake.jpg'),
  pasta: require('../../assets/food/pasta.jpg'),
  pasta_meat: require('../../assets/food/pasta_meat.jpg'),
  peach: require('../../assets/food/peach.jpg'),
  peanut_butter: require('../../assets/food/peanut_butter.jpg'),
  pear: require('../../assets/food/pear.jpg'),
  peas: require('../../assets/food/peas.jpg'),
  pineapple: require('../../assets/food/pineapple.jpg'),
  pita: require('../../assets/food/pita.jpg'),
  plant_protein: require('../../assets/food/plant_protein.jpg'),
  popcorn: require('../../assets/food/popcorn.jpg'),
  pork_chop: require('../../assets/food/pork_chop.jpg'),
  pork_tenderloin: require('../../assets/food/pork_tenderloin.jpg'),
  potato: require('../../assets/food/potato.jpg'),
  pretzels: require('../../assets/food/pretzels.jpg'),
  protein_bar: require('../../assets/food/protein_bar.jpg'),
  protein_shake_rtd: require('../../assets/food/protein_shake_rtd.jpg'),
  quinoa: require('../../assets/food/quinoa.jpg'),
  ramen_noodles: require('../../assets/food/ramen_noodles.jpg'),
  ribeye: require('../../assets/food/ribeye.jpg'),
  rice_cakes: require('../../assets/food/rice_cakes.jpg'),
  rotisserie_chicken: require('../../assets/food/rotisserie_chicken.jpg'),
  salad_greens: require('../../assets/food/salad_greens.jpg'),
  salmon: require('../../assets/food/salmon.jpg'),
  salsa: require('../../assets/food/salsa.jpg'),
  sandwich: require('../../assets/food/sandwich.jpg'),
  shrimp: require('../../assets/food/shrimp.jpg'),
  sirloin: require('../../assets/food/sirloin.jpg'),
  skyr: require('../../assets/food/skyr.jpg'),
  sourdough: require('../../assets/food/sourdough.jpg'),
  spinach: require('../../assets/food/spinach.jpg'),
  stir_fry: require('../../assets/food/stir_fry.jpg'),
  stir_fry_veg: require('../../assets/food/stir_fry_veg.jpg'),
  strawberries: require('../../assets/food/strawberries.jpg'),
  string_cheese: require('../../assets/food/string_cheese.jpg'),
  sweet_potato: require('../../assets/food/sweet_potato.jpg'),
  tacos: require('../../assets/food/tacos.jpg'),
  tempeh: require('../../assets/food/tempeh.jpg'),
  tofu: require('../../assets/food/tofu.jpg'),
  tomatoes: require('../../assets/food/tomatoes.jpg'),
  tortilla: require('../../assets/food/tortilla.jpg'),
  tuna_can: require('../../assets/food/tuna_can.jpg'),
  turkey_bacon: require('../../assets/food/turkey_bacon.jpg'),
  turkey_deli: require('../../assets/food/turkey_deli.jpg'),
  watermelon: require('../../assets/food/watermelon.jpg'),
  whey: require('../../assets/food/whey.jpg'),
  white_fish: require('../../assets/food/white_fish.jpg'),
  white_rice: require('../../assets/food/white_rice.jpg'),
  wrap: require('../../assets/food/wrap.jpg'),
  zucchini: require('../../assets/food/zucchini.jpg'),
};

/** Foods that share a photo with a close match. */
const SAME_AS: Record<string, string> = {
  ground_beef_85: 'ground_beef_93',
  greek_yogurt_2: 'greek_yogurt',
  milk_2: 'milk',
  milk_skim: 'milk',
  fairlife: 'milk',
  mozzarella: 'cheese',
  parmesan: 'cheese',
  cheddar: 'cheese',
  almond_butter: 'peanut_butter',
  bread_ww: 'bread',
  bread_white: 'bread',
  ww_pasta: 'pasta',
  protein_pasta: 'pasta',
  lowcarb_tortilla: 'tortilla',
  pancake_mix: 'pancake',
  light_ice_cream: 'ice_cream',
  coleslaw_mix: 'coleslaw',
};

/** Cooking fats and sauces aren't worth a tile (salsa is). */
const SKIP_CATS = new Set(['fat', 'sauce']);
const KEEP = new Set(['avocado', 'peanut_butter', 'almond_butter', 'hummus', 'salsa', 'almonds', 'mixed_nuts', 'feta']);

import { FOOD_HD, MEAL_HD, hdUrl } from './hd';

/** Foods whose new high-res photo isn't the bundled one, so the bundled copy never flashes first. */
const NEW_PHOTO = new Set([
  'almond_butter', 'almonds', 'apple', 'asparagus', 'avocado', 'banana', 'beef_jerky', 'bell_peppers', 'berries', 'beyond_burger',
  'black_beans', 'blueberries', 'bread', 'bread_white', 'bread_ww', 'broccoli', 'brussels', 'burger_bun', 'burrito', 'canned_chicken',
  'carrots', 'cauliflower', 'cereal', 'cheddar', 'cherries', 'chia', 'chicken_breast', 'chicken_sausage', 'chicken_thigh', 'chickpeas',
  'coleslaw', 'coleslaw_mix', 'corn', 'corn_tortilla', 'couscous', 'cream_of_rice', 'cucumber', 'dark_chocolate', 'egg_whites', 'eggs',
  'english_muffin', 'fairlife', 'feta', 'flank_steak', 'granola', 'grapes', 'greek_yogurt', 'greek_yogurt_2', 'ground_beef_85',
  'ground_beef_93', 'ground_turkey', 'ham', 'hummus', 'ice_cream', 'kale', 'kiwi', 'lentils', 'light_ice_cream', 'lowcarb_tortilla',
  'mango', 'milk', 'milk_2', 'milk_skim', 'mixed_nuts', 'mozzarella', 'mushrooms', 'onions', 'orange', 'pancake', 'pancake_mix',
  'parmesan', 'pasta', 'pasta_meat', 'peach', 'pear', 'peas', 'pineapple', 'pita', 'plant_protein', 'popcorn', 'pork_chop',
  'pork_tenderloin', 'potato', 'pretzels', 'protein_bar', 'protein_pasta', 'protein_shake_rtd', 'quinoa', 'ramen_noodles',
  'rotisserie_chicken', 'salad_greens', 'skyr', 'sourdough', 'spinach', 'stir_fry', 'stir_fry_veg', 'strawberries', 'sweet_potato', 'tofu',
  'tomatoes', 'tuna_can', 'turkey_bacon', 'turkey_deli', 'watermelon', 'white_fish', 'white_rice', 'wrap', 'ww_pasta', 'zucchini'
]);

/** The bundled photo (instant, offline), or the food's own high-res photo when nothing matching is bundled. */
export const foodPhoto = (id: string): ImageSourcePropType | undefined =>
  (NEW_PHOTO.has(id) ? undefined : PHOTO[id] || PHOTO[SAME_AS[id]]) || (FOOD_HD[id] ? { uri: hdUrl(FOOD_HD[id], 600) } : undefined);

export type Tile = { source: ImageSourcePropType; label: string; hd?: string };

const DISH: [RegExp, (ids: string[]) => ImageSourcePropType, string][] = [
  [/\bburrito\b/i, () => foodPhoto('burrito')!, 'Burrito'],
  [/\btacos\b/i, () => foodPhoto('tacos')!, 'Tacos'],
  [/\bwrap\b/i, () => foodPhoto('wrap')!, 'Wrap'],
  [/\bburger\b/i, (ids) => (ids.includes('beyond_burger') ? foodPhoto('beyond_burger')! : { uri: hdUrl(MEAL_HD.burger, 900) }), 'Burger'],
  [/\bpita\b/i, () => foodPhoto('pita')!, 'Pita'],
  [/\bsandwich\b/i, () => foodPhoto('sandwich')!, 'Sandwich'],
];

const short = (id: string) => {
  const f = foodById(id);
  return f ? (f.short || f.name.replace(/\s*\(.*?\)\s*/g, ' ').trim()) : id;
};

/** Up to 3 photos showing exactly what's in the meal: the dish (or main), the carb, the side. */
export function mealTiles(name: string, ids?: string[]): Tile[] {
  if (!ids?.length) return [];
  const foods = ids.filter((id) => {
    const f = foodById(id);
    if (!f || !foodPhoto(id)) return false;
    return !SKIP_CATS.has(f.cat) || KEEP.has(id);
  });
  const dish = DISH.find(([re]) => re.test(name));
  if (dish) {
    const side = foods.find((id) => ['veg', 'fruit'].includes(foodById(id)!.cat));
    const label = name.split(' & ')[0];
    const out: Tile[] = [{ source: dish[1](ids), label }];
    if (side) out.push({ source: foodPhoto(side)!, label: short(side), hd: FOOD_HD[side] });
    return out;
  }
  return foods.slice(0, 3).map((id) => ({ source: foodPhoto(id)!, label: short(id), hd: FOOD_HD[id] }));
}
