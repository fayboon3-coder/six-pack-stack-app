import './setup-mocks';
import { describe, expect, it, vi } from 'vitest';
vi.mock('../src/lib/foodPhotos', () => ({ foodPhoto: () => null }));
vi.mock('../src/lib/meals', () => ({ mealImage: () => null, mealHD: () => null }));
import { findMoves, readLifts, readPain, readTraining, readWeek } from '../src/lib/understand';
import { readDay, readNoFoods, readOrders, splitDay, readFood } from '../src/lib/understandFood';
import { buildWeek, defaultCfg } from '../src/lib/training';
import { buildFreePlan, type Quiz } from '../src/lib/quiz';
import { QUICK_START } from '../src/data/foods';

describe('training, in their words', () => {
  it('reads days, weekdays, split, gym and sports', () => {
    const w = readWeek('I lift 4 days a week, Mon Tue Thu Fri, push pull legs at LA Fitness, plus jiu-jitsu Wednesday nights');
    expect(w).toMatchObject({ count: 4, days: [1, 2, 4, 5], split: 'pplu4', equip: 'gym' });
    expect(w.sports).toContain('Jiu-jitsu');
    expect(readWeek('upper lower 4x at my home gym, just dumbbells')).toMatchObject({ count: 4, split: 'ul4', equip: 'db' });
    expect(readWeek('I go every day').count).toBe(6);
  });
  it('finds exercises by the names people use', () => {
    const ids = findMoves('bench, incline db press, lat pulldowns, RDLs, hack squat and hammer curls').map((m) => m.id);
    expect(ids).toEqual(['barbell_bench', 'incline_db_press', 'lat_pulldown', 'rdl', 'hack_squat', 'hammer_curl']);
  });
  it('reads lifts in every common format', () => {
    expect(readLifts('bench 185x5, squat 225 for 8, curls with 30s for 12, 10 reps at 315 on leg press, RDL 100kg x 6, pulldown 140')).toEqual([
      { id: 'barbell_bench', w: 185, r: 5 }, { id: 'back_squat', w: 225, r: 8 }, { id: 'db_curl', w: 30, r: 12 },
      { id: 'leg_press', w: 315, r: 10 }, { id: 'rdl', w: 220, r: 6 }, { id: 'lat_pulldown', w: 140, r: 0 },
    ]);
  });
  it('keeps painful moves out', () => {
    const p = readPain('my shoulder bugs me and I hate lunges');
    expect(p.avoid).toContain('walking_lunge');
    expect(p.avoid).toContain('dip');
    expect(readPain('nope').avoid).toEqual([]);
  });
  it('builds the week from all of it, and they can take anything back', () => {
    const base = defaultCfg({ days: '3 days', where_train: 'Gym' });
    const r = readTraining(base, { week: '4 days, upper lower', moves: 'incline db press, hammer curls', lifts: 'incline db press 60x10', pain: 'lunges hurt' });
    expect(r.cfg.split).toBe('ul4');
    const ids = buildWeek(r.cfg).flatMap((d) => d.x.map((x) => x[0]));
    expect(ids).toContain('hammer_curl');
    expect(ids).not.toContain('walking_lunge');
    expect(r.cfg.lifts!.incline_db_press).toEqual({ w: 60, r: 10 });
    expect(r.ask.days).toBe(4); // which days? asked, never required
    const back = readTraining(base, { moves: 'incline db press, hammer curls' }, { drop: ['move:hammer_curl'] });
    expect(back.prefer).toEqual(['incline_db_press']);
    expect(readTraining(base, {}).cfg.split).toBe(base.split); // nothing said, nothing changed
  });
});

describe('food, in their words', () => {
  const day = 'Breakfast is usually 3 eggs and 2 slices of toast. Lunch I get Chipotle, chicken bowl. Protein shake after the gym, then chicken and rice for dinner';
  it('splits a day into meals, labels before or after', () => {
    expect(splitDay(day).map((p) => p.slot)).toEqual(['Breakfast', 'Lunch', 'Afternoon', 'Dinner']);
    expect(splitDay('oatmeal with a banana\nturkey sandwich\nsteak and potatoes').map((p) => p.slot)).toEqual(['Breakfast', 'Lunch', 'Dinner']);
  });
  it('turns home meals into meals and restaurants into orders', () => {
    const parts = readDay(day);
    expect(parts[0].meal?.items?.map((x) => x.id)).toEqual(['eggs', 'bread_ww']);
    expect(parts[1].order?.where).toBe('Chipotle');
    expect(parts[3].meal?.slot).toBe('Dinner');
  });
  it('reads takeout orders, using their numbers when given and estimating when not', () => {
    const o = readOrders('Chipotle double chicken bowl\nCava greens and grains bowl 750 cal 55g protein\npepperoni pizza from the place down the street');
    expect(o[0]).toMatchObject({ where: 'Chipotle', est: true });
    expect(o[1]).toMatchObject({ where: 'Cava', kcal: 750, protein: 55 });
    expect(o[1].est).toBeFalsy();
    expect(o[2].est).toBe(true);
  });
  it('reads ways of eating and foods they skip', () => {
    const v = readNoFoods("I'm vegetarian, hate mushrooms and cottage cheese");
    expect(v.diets).toEqual(['Vegetarian']);
    expect(v.ids).toEqual(expect.arrayContaining(['chicken_breast', 'salmon', 'mushrooms', 'cottage_cheese']));
    expect(readNoFoods('no pork').ids).toContain('bacon');
    expect(readNoFoods('I eat everything').ids).toEqual([]);
  });
  it('goes all the way into the plan', () => {
    const q: Quiz = {
      goal: 'Lose fat and see my abs', sex: 'Male', age: '29', height_ft: '5', height_in: '11', weight: '212', goal_weight: '185',
      where_train: 'Gym', days: '4 days', experience: '1–3 years', tried: [], monthly_spend: '', eat_out: '', struggle: '', start_timing: '', ready_to_invest: '',
      first_name: 'Jake', email: 'j@x.com', foods: QUICK_START,
    };
    const f = readFood({ day, out: 'Starbucks egg bites and a latte', no: 'no salmon' });
    const plan = buildFreePlan({ ...q, my_meals: f.meals, my_orders: f.myOrders, no_foods: f.noFoods });
    expect(plan.meals![0].options[0].mine).toBe(true);
    expect(plan.eat_out!.filter((e) => e.mine).map((e) => e.where)).toEqual(expect.arrayContaining(['Starbucks', 'Chipotle']));
    expect(JSON.stringify(plan.meals)).not.toMatch(/salmon/i);
  });
});

describe('tailored to their goals and situation', () => {
  const base = defaultCfg({ days: '4 days', where_train: 'Gym' });
  it('keeps lifting off their sport days, adds focus and fits their time', () => {
    const r = readTraining(base, { week: '4 days a week, about 45 minutes, want bigger arms. BJJ on Wednesdays' });
    expect(r.cfg.days).not.toContain(3);
    expect(r.cfg.days.length).toBe(4);
    expect(r.focus).toEqual(['arms']);
    expect(r.cfg.cap).toBe(5);
    expect(buildWeek(r.cfg).every((d) => d.x.length <= 5)).toBe(true);
    expect(r.personal.join(' ')).toMatch(/jiu-jitsu/i);
  });
  it('lets them change anything directly, and their change wins', () => {
    const r = readTraining(base, { week: 'upper lower 4 days' }, { count: 3, split: 'fb3', equip: 'db', addMoves: ['goblet_squat'], lifts: { leg_press: { w: 300, r: 10 } }, focus: ['glutes'] });
    expect(r.cfg).toMatchObject({ split: 'fb3', equip: 'db', focus: ['glutes'] });
    expect(r.cfg.days.length).toBe(3);
    expect(r.prefer).toContain('goblet_squat');
    expect(r.cfg.lifts!.leg_press).toEqual({ w: 300, r: 10 });
  });
  it('writes rules for their situation', () => {
    const f = readFood({ extra: "I work nights, don't love cooking, and weekends are where I fall off" });
    expect(f.rules.length).toBe(3);
    expect(readFood({ extra: "I work nights, don't love cooking" }, { drop: ['rule:0'] }).rules.length).toBe(1);
  });
  it('takes meals, orders and foods added by hand, and moves a meal to another slot', () => {
    const f = readFood({ day: 'eggs and toast' }, { addMeals: [{ key: 'm1', slot: 'Dinner', text: 'salmon and rice' }], addOrders: [{ key: 'a1', where: 'Cava', order: 'chicken bowl' }], addNo: ['mushrooms'], slot: { d0: 'Breakfast' } });
    expect(f.meals.map((m) => m.slot)).toEqual(['Breakfast', 'Dinner']);
    expect(f.orders.some((o) => o.where === 'Cava')).toBe(true);
    expect(f.noFoods).toContain('mushrooms');
  });
});

describe('short on time with a focus', () => {
  it('keeps the focus work when workouts are trimmed', () => {
    const r = readTraining(defaultCfg({ days: '4 days', where_train: 'Gym' }), { week: '4 days, 45 minutes, I want bigger arms' });
    const ids = buildWeek(r.cfg).flatMap((d) => d.x.map((x) => x[0]));
    expect(ids.filter((id) => /curl|pushdown|ext|skull|dip/.test(id)).length).toBeGreaterThanOrEqual(4);
  });
});
