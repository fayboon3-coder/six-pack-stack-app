/**
 * Everyday foods people pick for their meal plan. Values are per one `unit`
 * (cooked weights for meat, fish, rice and pasta), rounded from USDA FoodData
 * Central and common labels. They're planning estimates, not lab numbers.
 *
 * meals: which meals the food fits (B breakfast, L lunch, S snack, D dinner).
 * step/min/max: the portion sizes the planner may use, in units.
 */
export type FoodCat = 'protein' | 'dairy' | 'carb' | 'fruit' | 'veg' | 'fat' | 'snack' | 'sauce';

export type Food = {
  id: string; name: string; cat: FoodCat;
  unit: string; units?: string; // label for 1 and for many ("egg" / "eggs"); "oz" etc. need no plural
  step: number; min: number; max: number; def: number;
  kcal: number; p: number; c: number; f: number;
  meals: string; // e.g. 'BLD'
  short?: string; // shorter name for meal titles
  aka?: string; // extra search words
  custom?: boolean;
};

const F = (id: string, name: string, cat: FoodCat, unit: string, step: number, min: number, max: number, def: number,
  kcal: number, p: number, c: number, f: number, meals: string, extra: Partial<Food> = {}): Food =>
  ({ id, name, cat, unit, step, min, max, def, kcal, p, c, f, meals, ...extra });

export const FOOD_DB: Food[] = [
  // Protein: meat and fish (per oz, cooked)
  F('chicken_breast', 'Chicken breast', 'protein', 'oz', 1, 3, 10, 6, 46, 8.8, 0, 1, 'LD', { short: 'Chicken', aka: 'grilled chicken poultry' }),
  F('chicken_thigh', 'Chicken thighs', 'protein', 'oz', 1, 3, 9, 5, 55, 7.6, 0, 2.6, 'LD', { short: 'Chicken thighs' }),
  F('rotisserie_chicken', 'Rotisserie chicken', 'protein', 'oz', 1, 3, 9, 5, 52, 7.5, 0, 2.3, 'LD', { short: 'Rotisserie chicken' }),
  F('ground_turkey', 'Ground turkey (93% lean)', 'protein', 'oz', 1, 3, 9, 5, 50, 7.3, 0, 2.4, 'LD', { short: 'Ground turkey' }),
  F('turkey_deli', 'Deli turkey', 'protein', 'oz', 1, 2, 8, 4, 30, 5, 1, 0.5, 'BLS', { short: 'Turkey', aka: 'lunch meat cold cuts' }),
  F('ground_beef_93', 'Ground beef (93% lean)', 'protein', 'oz', 1, 3, 9, 5, 55, 7.7, 0, 2.6, 'LD', { short: 'Lean ground beef', aka: 'hamburger mince' }),
  F('ground_beef_85', 'Ground beef (85% lean)', 'protein', 'oz', 1, 3, 8, 5, 70, 7.2, 0, 4.5, 'LD', { short: 'Ground beef', aka: 'hamburger mince' }),
  F('sirloin', 'Sirloin steak', 'protein', 'oz', 1, 4, 10, 6, 55, 8.4, 0, 2.2, 'LD', { short: 'Steak', aka: 'beef' }),
  F('ribeye', 'Ribeye steak', 'protein', 'oz', 1, 4, 9, 6, 80, 7, 0, 5.8, 'D', { short: 'Ribeye', aka: 'beef steak' }),
  F('flank_steak', 'Flank steak', 'protein', 'oz', 1, 4, 9, 6, 55, 8, 0, 2.3, 'LD', { short: 'Flank steak', aka: 'beef fajita' }),
  F('pork_tenderloin', 'Pork tenderloin', 'protein', 'oz', 1, 4, 10, 6, 40, 7.5, 0, 1, 'LD', { short: 'Pork' }),
  F('pork_chop', 'Pork chops', 'protein', 'oz', 1, 4, 9, 6, 55, 7.7, 0, 2.5, 'D', { short: 'Pork chop' }),
  F('ham', 'Ham', 'protein', 'oz', 1, 2, 6, 3, 35, 5.5, 1, 1, 'BL'),
  F('bacon', 'Bacon', 'protein', 'slice', 1, 2, 4, 2, 43, 3, 0, 3.3, 'B', { units: 'slices' }),
  F('turkey_bacon', 'Turkey bacon', 'protein', 'slice', 1, 2, 5, 3, 30, 2.5, 0.3, 2, 'B', { units: 'slices' }),
  F('chicken_sausage', 'Chicken sausage', 'protein', 'link', 1, 1, 3, 2, 110, 10, 2, 7, 'BLD', { units: 'links' }),
  F('salmon', 'Salmon', 'protein', 'oz', 1, 4, 8, 6, 58, 6.3, 0, 3.5, 'LD'),
  F('white_fish', 'White fish (cod, tilapia)', 'protein', 'oz', 1, 4, 10, 6, 30, 6.3, 0, 0.5, 'LD', { short: 'White fish', aka: 'cod tilapia mahi halibut' }),
  F('shrimp', 'Shrimp', 'protein', 'oz', 1, 4, 10, 6, 28, 6.8, 0.3, 0.3, 'LD', { aka: 'prawns seafood' }),
  F('tuna_can', 'Canned tuna', 'protein', 'can', 1, 1, 2, 1, 120, 27, 0, 1, 'LS', { units: 'cans', short: 'Tuna' }),
  F('canned_chicken', 'Canned chicken', 'protein', 'can', 1, 1, 2, 1, 110, 22, 0, 2, 'LS', { units: 'cans' }),
  F('eggs', 'Eggs', 'protein', 'egg', 1, 2, 5, 3, 72, 6.3, 0.4, 4.8, 'BLS', { units: 'eggs' }),
  F('egg_whites', 'Egg whites', 'protein', 'cup', 0.25, 0.25, 1.5, 0.5, 125, 26, 1.8, 0.4, 'B', { aka: 'liquid egg whites' }),
  F('tofu', 'Tofu (firm)', 'protein', 'oz', 1, 4, 10, 6, 23, 2.7, 0.6, 1.3, 'LD', { aka: 'vegan vegetarian' }),
  F('tempeh', 'Tempeh', 'protein', 'oz', 1, 3, 6, 4, 55, 5.3, 2.6, 3, 'LD', { aka: 'vegan vegetarian' }),
  F('seitan', 'Seitan', 'protein', 'oz', 1, 3, 6, 4, 35, 7, 1.2, 0.5, 'LD', { aka: 'vegan vegetarian' }),
  F('beyond_burger', 'Plant-based burger', 'protein', 'patty', 1, 1, 2, 1, 230, 20, 7, 14, 'LD', { units: 'patties', aka: 'beyond impossible vegan' }),
  F('whey', 'Whey protein', 'protein', 'scoop', 1, 1, 2, 1, 120, 24, 3, 1.5, 'BS', { units: 'scoops', short: 'Protein shake', aka: 'protein powder shake' }),
  F('plant_protein', 'Plant protein powder', 'protein', 'scoop', 1, 1, 2, 1, 120, 22, 4, 2, 'BS', { units: 'scoops', short: 'Plant protein shake', aka: 'vegan protein powder pea' }),
  F('protein_shake_rtd', 'Ready-to-drink protein shake', 'protein', 'bottle', 1, 1, 2, 1, 160, 30, 5, 3, 'BS', { units: 'bottles', short: 'Protein shake', aka: 'premier fairlife core power' }),
  F('beef_jerky', 'Beef jerky', 'protein', 'oz', 1, 1, 3, 2, 80, 13, 4, 1, 'S', { short: 'Jerky' }),
  F('edamame', 'Edamame', 'protein', 'cup', 0.5, 0.5, 1.5, 1, 188, 18, 14, 8, 'LSD', { aka: 'soybeans vegan' }),

  // Dairy
  F('greek_yogurt', 'Greek yogurt (nonfat, plain)', 'dairy', 'cup', 0.5, 0.5, 2, 1, 130, 23, 9, 0, 'BS', { short: 'Greek yogurt', aka: 'fage chobani oikos' }),
  F('greek_yogurt_2', 'Greek yogurt (2%)', 'dairy', 'cup', 0.5, 0.5, 2, 1, 170, 22, 9, 4.5, 'BS', { short: 'Greek yogurt' }),
  F('skyr', 'Icelandic yogurt (skyr)', 'dairy', 'cup', 0.5, 0.5, 2, 1, 130, 24, 9, 0.5, 'BS', { short: 'Skyr', aka: 'siggis' }),
  F('cottage_cheese', 'Cottage cheese (low-fat)', 'dairy', 'cup', 0.5, 0.5, 2, 1, 180, 24, 10, 5, 'BS', { short: 'Cottage cheese' }),
  F('milk_2', 'Milk (2%)', 'dairy', 'cup', 0.5, 0.5, 2, 1, 122, 8, 12, 5, 'BS', { short: 'Milk' }),
  F('milk_skim', 'Milk (skim)', 'dairy', 'cup', 0.5, 0.5, 2, 1, 83, 8.3, 12, 0.2, 'BS', { short: 'Skim milk' }),
  F('fairlife', 'Fairlife milk', 'dairy', 'cup', 0.5, 0.5, 2, 1, 120, 13, 6, 4.5, 'BS', { aka: 'ultrafiltered protein milk' }),
  F('almond_milk', 'Almond milk (unsweetened)', 'dairy', 'cup', 0.5, 0.5, 2, 1, 30, 1, 1, 2.5, 'BS', { short: 'Almond milk', aka: 'oat milk dairy free' }),
  F('string_cheese', 'String cheese', 'dairy', 'stick', 1, 1, 3, 1, 80, 7, 1, 5, 'S', { units: 'sticks' }),
  F('cheddar', 'Cheddar cheese', 'fat', 'oz', 0.5, 0.5, 1.5, 1, 113, 7, 0.4, 9.3, 'BLD', { short: 'Cheese' }),
  F('mozzarella', 'Mozzarella (part-skim)', 'fat', 'oz', 0.5, 0.5, 2, 1, 72, 7, 1, 4.5, 'LDS', { short: 'Mozzarella' }),
  F('feta', 'Feta cheese', 'fat', 'oz', 0.5, 0.5, 1.5, 1, 75, 4, 1.2, 6, 'LD', { short: 'Feta' }),
  F('parmesan', 'Parmesan', 'fat', 'tbsp', 1, 1, 3, 2, 22, 1.4, 0.2, 1.4, 'LD'),

  // Carbs (cooked rice, pasta, grains)
  F('white_rice', 'White rice', 'carb', 'cup', 0.5, 0.5, 2.5, 1, 205, 4.3, 45, 0.4, 'LD', { short: 'Rice', aka: 'jasmine basmati' }),
  F('brown_rice', 'Brown rice', 'carb', 'cup', 0.5, 0.5, 2.5, 1, 216, 5, 45, 1.8, 'LD'),
  F('quinoa', 'Quinoa', 'carb', 'cup', 0.5, 0.5, 2, 1, 222, 8, 39, 3.6, 'LD'),
  F('couscous', 'Couscous', 'carb', 'cup', 0.5, 0.5, 2, 1, 176, 6, 36, 0.3, 'LD'),
  F('pasta', 'Pasta', 'carb', 'cup', 0.5, 0.5, 2.5, 1.5, 220, 8, 43, 1.3, 'LD', { aka: 'spaghetti penne noodles' }),
  F('ww_pasta', 'Whole-wheat pasta', 'carb', 'cup', 0.5, 0.5, 2.5, 1.5, 174, 7.5, 37, 0.8, 'LD'),
  F('protein_pasta', 'Protein pasta', 'carb', 'cup', 0.5, 0.5, 2.5, 1.5, 190, 11, 34, 1.5, 'LD', { aka: 'banza chickpea barilla protein plus' }),
  F('ramen_noodles', 'Rice noodles', 'carb', 'cup', 0.5, 0.5, 2, 1, 190, 3, 42, 0.4, 'LD', { aka: 'pad thai pho noodles' }),
  F('potato', 'Potatoes', 'carb', 'medium potato', 0.5, 0.5, 2.5, 1, 160, 4.3, 37, 0.2, 'BLD', { units: 'medium potatoes', aka: 'russet baked roasted' }),
  F('sweet_potato', 'Sweet potatoes', 'carb', 'medium sweet potato', 0.5, 0.5, 2.5, 1, 115, 2, 27, 0.1, 'LD', { units: 'medium sweet potatoes', aka: 'yams' }),
  F('oats', 'Oats', 'carb', 'cup (dry)', 0.25, 0.25, 1.25, 0.5, 300, 10, 54, 5, 'B', { units: 'cups (dry)', short: 'Oatmeal', aka: 'oatmeal porridge' }),
  F('cream_of_rice', 'Cream of rice', 'carb', 'cup (dry)', 0.25, 0.25, 1, 0.25, 680, 12, 152, 0, 'B', { units: 'cups (dry)', aka: 'cream of wheat' }),
  F('bread_ww', 'Whole-wheat bread', 'carb', 'slice', 1, 1, 4, 2, 80, 4, 14, 1, 'BL', { units: 'slices', short: 'Toast', aka: 'toast sandwich' }),
  F('bread_white', 'White bread', 'carb', 'slice', 1, 1, 4, 2, 75, 2.5, 14, 1, 'BL', { units: 'slices', short: 'Toast' }),
  F('sourdough', 'Sourdough bread', 'carb', 'slice', 1, 1, 3, 2, 120, 4.5, 23, 0.8, 'BL', { units: 'slices', short: 'Sourdough' }),
  F('bagel', 'Bagels', 'carb', 'bagel', 0.5, 0.5, 1.5, 1, 270, 10, 53, 1.7, 'B', { units: 'bagels', short: 'Bagel' }),
  F('english_muffin', 'English muffins', 'carb', 'muffin', 1, 1, 2, 1, 130, 5, 26, 1, 'B', { units: 'muffins', short: 'English muffin' }),
  F('tortilla', 'Flour tortillas (large)', 'carb', 'tortilla', 1, 1, 2, 1, 210, 6, 35, 5, 'BLD', { units: 'tortillas', short: 'Tortilla', aka: 'wrap burrito' }),
  F('lowcarb_tortilla', 'Low-carb tortillas', 'carb', 'tortilla', 1, 1, 3, 2, 70, 5, 8, 2.5, 'BLD', { units: 'tortillas', short: 'Tortilla', aka: 'wrap mission carb balance' }),
  F('corn_tortilla', 'Corn tortillas', 'carb', 'tortilla', 1, 2, 6, 3, 52, 1.4, 11, 0.7, 'LD', { units: 'tortillas', short: 'Tacos', aka: 'tacos' }),
  F('pita', 'Pita bread', 'carb', 'pita', 1, 1, 2, 1, 165, 5.5, 33, 0.7, 'L', { units: 'pitas' }),
  F('burger_bun', 'Hamburger buns', 'carb', 'bun', 1, 1, 1, 1, 140, 4.5, 26, 2, 'LD', { units: 'buns', short: 'Bun' }),
  F('cereal', 'Cereal', 'carb', 'cup', 0.5, 0.5, 2, 1, 110, 3, 22, 1.5, 'B', { aka: 'cheerios corn flakes' }),
  F('granola', 'Granola', 'carb', 'cup', 0.25, 0.25, 0.5, 0.25, 450, 10, 64, 18, 'BS'),
  F('pancake_mix', 'Protein pancakes (Kodiak-style mix)', 'carb', 'half-cup of mix', 1, 1, 2, 1, 190, 14, 30, 2, 'B', { units: 'half-cups of mix', short: 'Protein pancakes', aka: 'kodiak waffles' }),
  F('rice_cakes', 'Rice cakes', 'snack', 'rice cake', 1, 1, 4, 2, 35, 0.7, 7.3, 0.3, 'BS', { units: 'rice cakes' }),
  F('black_beans', 'Black beans', 'carb', 'cup', 0.5, 0.5, 1.5, 0.5, 227, 15, 41, 1, 'LD', { aka: 'pinto beans' }),
  F('chickpeas', 'Chickpeas', 'carb', 'cup', 0.5, 0.5, 1.5, 0.5, 270, 14.5, 45, 4.2, 'LD', { aka: 'garbanzo' }),
  F('lentils', 'Lentils', 'carb', 'cup', 0.5, 0.5, 1.5, 1, 230, 18, 40, 0.8, 'LD'),
  F('corn', 'Corn', 'carb', 'cup', 0.5, 0.5, 1, 0.5, 130, 4.5, 29, 1.8, 'LD'),
  F('peas', 'Green peas', 'carb', 'cup', 0.5, 0.5, 1, 0.5, 117, 7.9, 21, 0.6, 'LD'),

  // Fruit
  F('banana', 'Bananas', 'fruit', 'banana', 1, 1, 2, 1, 105, 1.3, 27, 0.4, 'BS', { units: 'bananas', short: 'Banana' }),
  F('apple', 'Apples', 'fruit', 'apple', 1, 1, 1, 1, 95, 0.5, 25, 0.3, 'BS', { units: 'apples', short: 'Apple' }),
  F('orange', 'Oranges', 'fruit', 'orange', 1, 1, 2, 1, 62, 1.2, 15, 0.2, 'BS', { units: 'oranges', short: 'Orange', aka: 'clementine mandarin cuties' }),
  F('berries', 'Mixed berries', 'fruit', 'cup', 0.5, 0.5, 1.5, 1, 70, 1, 17, 0.5, 'BS', { short: 'Berries', aka: 'frozen berries' }),
  F('strawberries', 'Strawberries', 'fruit', 'cup', 0.5, 0.5, 2, 1, 50, 1, 12, 0.5, 'BS'),
  F('blueberries', 'Blueberries', 'fruit', 'cup', 0.5, 0.5, 1.5, 1, 84, 1.1, 21, 0.5, 'BS'),
  F('grapes', 'Grapes', 'fruit', 'cup', 0.5, 0.5, 1.5, 1, 104, 1.1, 27, 0.2, 'S'),
  F('pineapple', 'Pineapple', 'fruit', 'cup', 0.5, 0.5, 1.5, 1, 82, 0.9, 22, 0.2, 'BS'),
  F('mango', 'Mango', 'fruit', 'cup', 0.5, 0.5, 1.5, 1, 99, 1.4, 25, 0.6, 'BS'),
  F('watermelon', 'Watermelon', 'fruit', 'cup', 1, 1, 3, 2, 46, 0.9, 11.5, 0.2, 'S'),
  F('pear', 'Pears', 'fruit', 'pear', 1, 1, 1, 1, 100, 0.6, 27, 0.2, 'S', { units: 'pears', short: 'Pear' }),
  F('peach', 'Peaches', 'fruit', 'peach', 1, 1, 2, 1, 59, 1.4, 14, 0.4, 'BS', { units: 'peaches', short: 'Peach' }),
  F('kiwi', 'Kiwi', 'fruit', 'kiwi', 1, 1, 3, 2, 42, 0.8, 10, 0.4, 'BS', { units: 'kiwis' }),
  F('cherries', 'Cherries', 'fruit', 'cup', 0.5, 0.5, 1.5, 1, 97, 1.6, 25, 0.3, 'S'),

  // Vegetables (cooked unless noted)
  F('broccoli', 'Broccoli', 'veg', 'cup', 0.5, 0.5, 2, 1, 55, 3.7, 11, 0.6, 'LD'),
  F('green_beans', 'Green beans', 'veg', 'cup', 0.5, 0.5, 2, 1, 44, 2.4, 10, 0.4, 'LD'),
  F('asparagus', 'Asparagus', 'veg', 'cup', 0.5, 0.5, 2, 1, 40, 4.3, 7.4, 0.4, 'LD'),
  F('spinach', 'Spinach', 'veg', 'cup (raw)', 1, 1, 3, 2, 7, 0.9, 1.1, 0.1, 'BLD', { units: 'cups (raw)' }),
  F('salad_greens', 'Salad greens', 'veg', 'cup', 1, 1, 4, 2, 8, 0.6, 1.5, 0.1, 'LD', { short: 'Side salad', aka: 'lettuce romaine salad' }),
  F('bell_peppers', 'Bell peppers', 'veg', 'cup', 0.5, 0.5, 2, 1, 30, 1, 7, 0.3, 'BLD', { short: 'Peppers', aka: 'fajita veggies onions' }),
  F('zucchini', 'Zucchini', 'veg', 'cup', 0.5, 0.5, 2, 1, 27, 2, 5, 0.5, 'LD', { aka: 'squash' }),
  F('carrots', 'Carrots', 'veg', 'cup', 0.5, 0.5, 2, 1, 52, 1.2, 12, 0.3, 'LSD', { aka: 'baby carrots' }),
  F('cauliflower', 'Cauliflower', 'veg', 'cup', 0.5, 0.5, 2, 1, 28, 2.3, 5, 0.6, 'LD', { aka: 'cauliflower rice' }),
  F('brussels', 'Brussels sprouts', 'veg', 'cup', 0.5, 0.5, 2, 1, 56, 4, 11, 0.8, 'D'),
  F('cucumber', 'Cucumber', 'veg', 'cup', 0.5, 0.5, 2, 1, 16, 0.7, 3.8, 0.1, 'LS'),
  F('tomatoes', 'Tomatoes', 'veg', 'cup', 0.5, 0.5, 2, 1, 32, 1.6, 7, 0.4, 'BLD', { aka: 'cherry tomatoes' }),
  F('mushrooms', 'Mushrooms', 'veg', 'cup', 0.5, 0.5, 2, 1, 15, 2.2, 2.3, 0.2, 'BLD'),
  F('onions', 'Onions', 'veg', 'cup', 0.5, 0.5, 1, 0.5, 64, 1.8, 15, 0.2, 'BLD'),
  F('stir_fry_veg', 'Frozen stir-fry vegetables', 'veg', 'cup', 0.5, 0.5, 2, 1, 60, 3, 10, 0, 'LD', { short: 'Stir-fry veg', aka: 'mixed vegetables frozen' }),
  F('kale', 'Kale', 'veg', 'cup', 0.5, 0.5, 2, 1, 36, 2.5, 7, 0.5, 'LD'),
  F('coleslaw_mix', 'Cabbage / slaw mix', 'veg', 'cup', 0.5, 0.5, 2, 1, 22, 1, 5, 0.1, 'LD', { short: 'Slaw', aka: 'cabbage' }),

  // Fats, nuts and spreads
  F('olive_oil', 'Olive oil', 'fat', 'tbsp', 0.5, 0.5, 1.5, 1, 120, 0, 0, 14, 'LD', { aka: 'cooking oil avocado oil' }),
  F('butter', 'Butter', 'fat', 'tbsp', 0.5, 0.5, 1, 0.5, 102, 0.1, 0, 11.5, 'BD'),
  F('avocado', 'Avocado', 'fat', 'half avocado', 0.5, 0.5, 1, 0.5, 240, 3, 12, 22, 'BLD', { units: 'avocados', short: 'Avocado', aka: 'guacamole' }),
  F('peanut_butter', 'Peanut butter', 'fat', 'tbsp', 1, 1, 2, 1, 95, 3.5, 3, 8, 'BS', { aka: 'pb' }),
  F('almond_butter', 'Almond butter', 'fat', 'tbsp', 1, 1, 2, 1, 98, 3.4, 3, 9, 'BS'),
  F('almonds', 'Almonds', 'fat', 'oz', 0.5, 0.5, 1, 1, 164, 6, 6, 14, 'S', { aka: 'nuts' }),
  F('mixed_nuts', 'Mixed nuts', 'fat', 'oz', 0.5, 0.5, 1, 1, 170, 5, 6, 15, 'S', { aka: 'cashews walnuts peanuts' }),
  F('chia', 'Chia seeds', 'fat', 'tbsp', 1, 1, 2, 1, 60, 2, 5, 4, 'B'),
  F('hummus', 'Hummus', 'fat', 'tbsp', 1, 2, 4, 2, 35, 1, 2, 2.5, 'LS'),
  F('cream_cheese', 'Cream cheese (light)', 'fat', 'tbsp', 1, 1, 2, 1, 35, 1, 1, 3, 'B', { short: 'Cream cheese' }),
  F('light_mayo', 'Light mayo', 'fat', 'tbsp', 1, 1, 2, 1, 35, 0, 1, 3.5, 'L', { aka: 'mayonnaise' }),

  // Snacks
  F('protein_bar', 'Protein bars', 'snack', 'bar', 1, 1, 1, 1, 200, 21, 22, 8, 'S', { units: 'bars', short: 'Protein bar', aka: 'quest barebells one' }),
  F('granola_bar', 'Granola bars', 'snack', 'bar', 1, 1, 1, 1, 190, 3, 29, 7, 'S', { units: 'bars', short: 'Granola bar' }),
  F('popcorn', 'Popcorn', 'snack', 'cup (popped)', 1, 2, 5, 3, 31, 1, 6, 0.4, 'S', { units: 'cups (popped)', aka: 'skinnypop' }),
  F('pretzels', 'Pretzels', 'snack', 'oz', 1, 1, 2, 1, 108, 2.9, 23, 0.8, 'S'),
  F('dark_chocolate', 'Dark chocolate', 'snack', 'oz', 0.5, 0.5, 1, 0.5, 170, 2.2, 13, 12, 'S'),
  F('light_ice_cream', 'Light ice cream', 'snack', 'cup', 0.5, 0.5, 1, 0.5, 180, 10, 28, 5, 'S', { aka: 'halo top' }),

  // Sauces and toppings (small fixed amounts)
  F('salsa', 'Salsa', 'sauce', 'tbsp', 1, 2, 4, 3, 5, 0.3, 1, 0, 'BLD', { aka: 'pico' }),
  F('teriyaki', 'Teriyaki sauce (light)', 'sauce', 'tbsp', 1, 1, 3, 2, 15, 0.7, 3, 0, 'LD', { short: 'Teriyaki' }),
  F('bbq_sauce', 'BBQ sauce', 'sauce', 'tbsp', 1, 1, 2, 2, 30, 0, 7, 0.1, 'LD'),
  F('marinara', 'Marinara sauce', 'sauce', 'half-cup', 1, 1, 1, 1, 70, 2, 10, 2, 'LD', { units: 'half-cups', short: 'Marinara', aka: 'pasta sauce tomato' }),
  F('soy_sauce', 'Soy sauce', 'sauce', 'tbsp', 1, 1, 2, 1, 10, 1, 1, 0, 'LD'),
  F('hot_sauce', 'Hot sauce', 'sauce', 'tsp', 1, 1, 3, 2, 0, 0, 0, 0, 'BLD', { aka: 'sriracha franks' }),
  F('mustard', 'Mustard', 'sauce', 'tbsp', 1, 1, 2, 1, 10, 0.6, 1, 0.6, 'L'),
  F('ketchup', 'Ketchup', 'sauce', 'tbsp', 1, 1, 2, 1, 20, 0.2, 5, 0, 'LD'),
  F('light_ranch', 'Light ranch', 'sauce', 'tbsp', 1, 1, 2, 2, 40, 0, 1.5, 3.5, 'LD', { aka: 'dressing' }),
  F('honey', 'Honey', 'sauce', 'tsp', 1, 1, 2, 1, 21, 0, 6, 0, 'B', { aka: 'maple syrup' }),
];

export const CAT_LABEL: Record<FoodCat, string> = {
  protein: 'Protein', dairy: 'Dairy', carb: 'Carbs', fruit: 'Fruit', veg: 'Veggies', fat: 'Fats & nuts', snack: 'Snacks', sauce: 'Sauces',
};
export const CAT_ORDER: FoodCat[] = ['protein', 'carb', 'veg', 'fruit', 'dairy', 'fat', 'snack', 'sauce'];

const BY_ID = new Map(FOOD_DB.map((f) => [f.id, f]));
export const foodById = (id: string) => BY_ID.get(id);

/** The old 12 quiz choices, mapped to real foods (for people who took the quiz before). */
export const LEGACY_LIKES: Record<string, string[]> = {
  Eggs: ['eggs'], 'Greek yogurt': ['greek_yogurt'], Oats: ['oats'], Chicken: ['chicken_breast'],
  Beef: ['ground_beef_93', 'sirloin'], Fish: ['salmon', 'tuna_can'], Rice: ['white_rice'], Potatoes: ['potato'],
  Pasta: ['pasta', 'marinara'], 'Wraps & sandwiches': ['bread_ww', 'tortilla', 'turkey_deli'],
  'Protein shakes': ['whey', 'milk_2'], Fruit: ['banana', 'berries', 'apple'],
};

/** A custom food someone adds themselves (calories and protein per serving). */
export function makeCustomFood(name: string, serving: string, kcal: number, protein: number, cat: FoodCat): Food {
  const id = 'custom_' + name.toLowerCase().replace(/[^a-z0-9]+/g, '_').slice(0, 30);
  const carbsGuess = Math.max(0, Math.round((kcal - protein * 4) * (cat === 'fat' ? 0.2 : 0.6) / 4));
  const fatGuess = Math.max(0, Math.round((kcal - protein * 4 - carbsGuess * 4) / 9));
  const meals = cat === 'protein' || cat === 'carb' || cat === 'veg' ? 'BLD' : cat === 'dairy' || cat === 'fruit' || cat === 'snack' ? 'BS' : 'BLD';
  return { id, name, cat, unit: serving || 'serving', units: serving ? undefined : 'servings', step: 1, min: 1, max: cat === 'protein' || cat === 'carb' ? 3 : 2, def: 1,
    kcal, p: protein, c: carbsGuess, f: fatGuess, meals, custom: true };
}

/** One tap to a full, balanced starting list. They can remove anything after. */
export const QUICK_START = ['chicken_breast', 'ground_beef_93', 'eggs', 'greek_yogurt', 'whey', 'salmon',
  'white_rice', 'potato', 'oats', 'bread_ww', 'tortilla', 'broccoli', 'salad_greens', 'bell_peppers', 'banana', 'berries', 'apple',
  'milk_2', 'peanut_butter', 'salsa'];
