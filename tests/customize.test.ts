import './setup-mocks';
import { describe, expect, it } from 'vitest';
import { buildFreePlan, targets, type Quiz } from '../src/lib/quiz';
import { fitMeal, orderNote, slotTarget, withMyMeals, type MyMeal } from '../src/lib/customize';
import { buildWeek, defaultCfg, movesInWeek, type TrainCfg } from '../src/lib/training';
import { suggestFromLift } from '../src/lib/trend';
import { QUICK_START, foodById, type Food } from '../src/data/foods';

const base: Quiz = {
  goal: 'Lose fat and see my abs', sex: 'Male', age: '29', height_ft: '5', height_in: '11', weight: '212', goal_weight: '185',
  where_train: 'Gym', days: '4 days', experience: '1–3 years', tried: [], monthly_spend: '$100–$200',
  eat_out: '1–3 times a week', struggle: 'Weekends', start_timing: 'This week', ready_to_invest: 'Yes', first_name: 'Jake', email: 'j@example.com',
  foods: QUICK_START,
};
const num = (s: string) => Number(String(s).replace(/[^\d.]/g, ''));
const pantry = QUICK_START.map(foodById).filter(Boolean) as Food[];

const eggs: MyMeal = { id: 'a', slot: 'Breakfast', name: 'My eggs and toast', text: '3 eggs, 2 slices toast', items: [{ id: 'eggs', qty: 3 }, { id: 'bread_ww', qty: 2 }] };

describe('their own meals', () => {
  it('re-sizes a meal they eat to the slot, keeping their foods', () => {
    const t = targets(base);
    const f = fitMeal(eggs, t.kcal, t.protein, pantry);
    const { K, P } = slotTarget('Breakfast', t.kcal, t.protein);
    expect(f.fit).not.toBe('off');
    expect(f.mine).toBe(true);
    expect(Math.abs(num(f.kcal) - K) / K).toBeLessThanOrEqual(0.25);
    expect(num(f.protein)).toBeGreaterThanOrEqual(P * 0.65);
    expect(f.ids).toContain('eggs');
    expect(f.ids).toContain('bread_ww');
  });

  it('tops up protein when their meal is short, and says so', () => {
    const oats: MyMeal = { id: 'b', slot: 'Breakfast', name: 'Oats', text: 'oats and a banana', items: [{ id: 'oats', qty: 1 }, { id: 'banana', qty: 1 }] };
    const t = targets(base);
    const f = fitMeal(oats, t.kcal, t.protein, pantry);
    expect(f.tweak).toMatch(/protein/);
    expect(f.ids!.length).toBe(3);
  });

  it('keeps meals that can never fit out of the plan', () => {
    const huge: MyMeal = { id: 'c', slot: 'Afternoon', name: 'Pizza', text: 'whole pizza', kcal: 2200, protein: 90 };
    const t = targets(base);
    expect(fitMeal(huge, t.kcal, t.protein).fit).toBe('off');
    const plan = buildFreePlan({ ...base, my_meals: [huge] });
    expect(plan.meals!.find((m) => m.slot === 'Afternoon')!.options.some((o) => o.mine)).toBe(false);
  });

  it('puts their meal first in the plan, and the day still lands on their numbers', () => {
    const plan = buildFreePlan({ ...base, my_meals: [eggs] });
    const b = plan.meals!.find((m) => m.slot === 'Breakfast')!;
    expect(b.options[0].mine).toBe(true);
    expect(b.options[0].name).toBe('My eggs and toast');
    const day = plan.meals!.reduce((n, m) => n + num(m.options[0].kcal), 0);
    expect(Math.abs(day - num(plan.kcal)) / num(plan.kcal)).toBeLessThan(0.12);
    expect(plan.grocery!.some((g) => /bread/i.test(g.items))).toBe(true);
  });

  it('survives a calorie re-set (same meal, re-sized)', () => {
    const a = buildFreePlan({ ...base, my_meals: [eggs] });
    const b = buildFreePlan({ ...base, my_meals: [eggs] }, num(a.kcal) - 200);
    expect(b.meals![0].options[0].mine).toBe(true);
    expect(num(b.meals![0].options[0].kcal)).toBeLessThanOrEqual(num(a.meals![0].options[0].kcal));
  });

  it('changes nothing for people who skip customization', () => {
    const t = targets(base);
    const plain = buildFreePlan(base);
    expect(withMyMeals(plain.meals as any, [], t.kcal, t.protein)).toEqual(plain.meals);
  });

  it('drops foods they will not eat', () => {
    const plan = buildFreePlan({ ...base, no_foods: ['salmon', 'eggs'] });
    const text = plan.meals!.flatMap((m) => m.options.map((o) => o.detail)).join(' ').toLowerCase();
    expect(text).not.toMatch(/salmon|\beggs?\b/);
  });
});

describe('their takeout orders', () => {
  it('goes first with an honest note on how it fits', () => {
    const order = { id: 'o', where: 'Cava', order: 'Chicken bowl, extra chicken', kcal: 750, protein: 60 };
    const plan = buildFreePlan({ ...base, my_orders: [order] });
    expect(plan.eat_out![0].where).toBe('Cava');
    expect(plan.eat_out![0].note).toBeTruthy();
    expect(orderNote({ kcal: 1800, protein: 40 }, 2350, 150)).toMatch(/% of your day/);
    expect(orderNote({ kcal: 600, protein: 15 }, 2350, 150)).toMatch(/protein shake/);
  });
});

describe('moves they like and their weights', () => {
  it('uses a favorite move wherever its movement shows up', () => {
    const cfg: TrainCfg = { ...defaultCfg({ days: '4 days', where_train: 'Gym', experience: '1–3 years' }), prefer: ['db_bench', 'hammer_curl'] };
    const week = buildWeek(cfg);
    const ids = week.flatMap((d) => d.x.map((x) => x[0]));
    expect(ids).toContain('db_bench');
    expect(ids).not.toContain('barbell_bench');
    expect(ids).toContain('hammer_curl');
    // Same number of exercises and sets as before: only the variation changes.
    const plain = buildWeek({ ...cfg, prefer: [] });
    expect(week.map((d) => d.x.length)).toEqual(plain.map((d) => d.x.length));
  });

  it('ignores favorites that need equipment they do not have', () => {
    const cfg: TrainCfg = { ...defaultCfg({ days: '3 days', where_train: 'No equipment', experience: '1–3 years' }), prefer: ['barbell_bench'] };
    expect(buildWeek(cfg).flatMap((d) => d.x.map((x) => x[0]))).not.toContain('barbell_bench');
  });

  it('lists every move in the week once', () => {
    const cfg = defaultCfg({ days: '4 days', where_train: 'Gym' });
    const list = movesInWeek(cfg);
    expect(new Set(list.map((x) => x.id)).size).toBe(list.length);
  });

  it('starts week 1 from what they lift now', () => {
    expect(suggestFromLift('3 × 6–10', { w: 135, r: 8 })).toMatchObject({ weight: 135, reps: 9, tag: 'start' });
    // A heavy set of 3 becomes a lighter working weight for 8–12, never heavier than what they did.
    const s = suggestFromLift('3 × 8–12', { w: 225, r: 3 })!;
    expect(s.weight!).toBeLessThan(225);
    expect(s.weight! % 5).toBe(0);
    expect(suggestFromLift('3 × 8–12', { w: 0, r: 8 })).toBeNull();
  });
});
