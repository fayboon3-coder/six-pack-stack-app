import './setup-mocks';
import { describe, expect, it } from 'vitest';
import { buildFreePlan, targets, type Quiz } from '../src/lib/quiz';
import { buildEatOut, buildGrocery, buildMenu, LIBRARY, scaleDetail } from '../src/lib/menu';
import { phaseOf, weekOf } from '../src/lib/program';

const base: Quiz = {
  goal: 'Lose fat and see my abs', sex: 'Male', age: '29', height_ft: '5', height_in: '11', weight: '212', goal_weight: '185',
  where_train: 'Gym', days: '4 days', experience: '1–3 years', tried: ['Fat burners'], monthly_spend: '$100–$200',
  eat_out: '1–3 times a week', struggle: 'Weekends', start_timing: 'This week', ready_to_invest: 'Yes', first_name: 'Jake', email: 'j@example.com',
};
const num = (s: string) => Number(s.replace(/[^\d.]/g, ''));

describe('targets', () => {
  it('sets fat-loss calories from body weight and protein from goal weight', () => {
    const t = targets(base);
    expect(t.kcal).toBe(2350); // 212 × 11, rounded to 50
    expect(t.protein).toBe(150); // 185 × 0.8, rounded to 5
  });
  it('never goes under the floor', () => {
    expect(targets({ ...base, sex: 'Female', weight: '100', goal_weight: '95' }).kcal).toBe(1200);
    expect(targets({ ...base, weight: '120', goal_weight: '115' }).kcal).toBe(1500);
  });
  it('gives more food for the build goal', () => {
    expect(targets({ ...base, goal: 'Build muscle and stay lean' }).kcal).toBeGreaterThan(targets(base).kcal);
  });
});

describe('portion scaling', () => {
  it('rounds whole items to whole numbers', () => expect(scaleDetail('{#3} eggs', 1.2)).toBe('4 eggs'));
  it('allows halves for cups', () => {
    expect(scaleDetail('{1.5} cups rice', 1)).toBe('1½ cups rice');
    expect(scaleDetail('{0.5} cup oats', 1)).toBe('½ cup oats');
    expect(scaleDetail('{1} cup yogurt', 1.3)).toBe('1½ cup yogurt');
  });
  it('rounds ounces to whole numbers', () => expect(scaleDetail('{6} oz chicken', 1.3)).toBe('8 oz chicken'));
  it('never shows zero', () => expect(scaleDetail('{#2} slices', 0.1)).toBe('1 slices'));
});

describe('meal menu from food picks', () => {
  const likes = ['Chicken', 'Rice', 'Eggs', 'Greek yogurt'];
  it('gives every meal exactly 3 options', () => {
    for (const m of buildMenu(2350, 150, likes, [])) expect(m.options).toHaveLength(3);
  });
  it('puts foods they picked first', () => {
    const lunch = buildMenu(2350, 150, likes, []).find((m) => m.slot === 'Lunch')!;
    expect(lunch.options[0].name).toBe('Chicken rice bowl');
  });
  it('only adds restaurant orders for places they go', () => {
    const none = buildMenu(2350, 150, likes, []);
    const spotNames = LIBRARY.flatMap((s) => s.opts.filter((o) => o.spot).map((o) => o.name));
    for (const m of none) for (const o of m.options) expect(spotNames).not.toContain(o.name);
    const lunch = buildMenu(2350, 150, likes, ['Chipotle']).find((m) => m.slot === 'Lunch')!;
    expect(lunch.options.map((o) => o.name)).toContain('Chipotle bowl');
  });
  it('sizes home meals near the meal target', () => {
    for (const kcal of [1500, 2350, 3200]) {
      for (const m of buildMenu(kcal, 150, likes, [])) {
        const target = num(m.target.split('calories')[0]);
        for (const o of m.options) expect(Math.abs(num(o.kcal) - target) / target).toBeLessThan(0.55);
      }
    }
  });
  it('builds eat-out orders and a grocery list from picks', () => {
    expect(buildEatOut(['Subway']).map((e) => e.where)).toEqual(['Subway']);
    expect(buildEatOut([]).length).toBe(3);
    const g = buildGrocery(['Fish', 'Rice']).map((x) => x.items).join(' ');
    expect(g).toContain('Salmon');
    expect(g).not.toContain('Chicken');
  });
});

describe('quiz-built plan', () => {
  it('uses their food picks when they made them', () => {
    const p = buildFreePlan({ ...base, likes: ['Chicken', 'Rice', 'Eggs'], spots: ['Chipotle'] });
    expect(p.food).toBe('picked');
    expect(p.eat_out?.[0].where).toBe('Chipotle');
    expect(p.train.d).toHaveLength(4);
  });
  it('falls back to the standard menu for older quizzes', () => {
    const p = buildFreePlan(base);
    expect(p.food).toBeUndefined();
    expect(p.meals).toHaveLength(4);
  });
  it('respects a calorie override (the re-set)', () => {
    expect(buildFreePlan({ ...base, likes: ['Chicken'] }, 2150).kcal).toBe('2,150');
  });
});

describe('program weeks', () => {
  it('counts weeks from the start Sunday and caps at 12', () => {
    expect(weekOf('2026-11-01', new Date('2026-11-03T12:00:00'))).toBe(1);
    expect(weekOf('2026-11-01', new Date('2026-11-23T12:00:00'))).toBe(4);
    expect(weekOf('2026-11-01', new Date('2027-06-01T12:00:00'))).toBe(12);
  });
  it('names the phases', () => {
    expect(phaseOf(3).name).toBe('Strip');
    expect(phaseOf(6).name).toBe('Stack');
    expect(phaseOf(11).name).toBe('Six-Pack');
  });
});
