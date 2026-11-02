import { describe, expect, it } from 'vitest';
import { buildFoodPlan, buildFoodGrocery, amountText, whatsMissing } from '../src/lib/mealplan';
import { FOOD_DB, foodById, makeCustomFood } from '../src/data/foods';

const num = (s: string) => Number(s.replace(/[^\d.]/g, ''));
const SHARES = [0.25, 0.3, 0.15, 0.3];

const people: [string, string[], number, number][] = [
  ['typical', ['chicken_breast', 'ground_beef_93', 'eggs', 'greek_yogurt', 'salmon', 'white_rice', 'potato', 'oats', 'bread_ww', 'banana', 'blueberries', 'broccoli', 'stir_fry_veg', 'salsa', 'whey', 'milk_2'], 2900, 200],
  ['minimal', ['chicken_breast', 'eggs', 'whey', 'white_rice', 'oats', 'banana', 'broccoli'], 2350, 180],
  ['vegetarian', ['tofu', 'lentils', 'eggs', 'greek_yogurt', 'quinoa', 'oats', 'sweet_potato', 'spinach', 'apple', 'peanut_butter', 'edamame'], 2200, 160],
  ['steak-and-potatoes', ['sirloin', 'chicken_thigh', 'eggs', 'bacon', 'potato', 'bread_white', 'green_beans', 'apple', 'cheddar', 'beef_jerky'], 2600, 180],
  ['small cut', ['chicken_breast', 'white_fish', 'egg_whites', 'greek_yogurt', 'white_rice', 'oats', 'berries', 'asparagus', 'salad_greens'], 1700, 150],
];

describe('meal planner', () => {
  for (const [name, ids, kcal, protein] of people) {
    it(`${name}: every option lands near its meal target and uses only their foods`, () => {
      const plan = buildFoodPlan(kcal, protein, ids);
      expect(plan.meals).toHaveLength(4);

      plan.meals.forEach((m, i) => {
        expect(m.options.length).toBeGreaterThanOrEqual(1);
        for (const o of m.options) {
          const k = num(o.kcal), p = num(o.protein);
          expect(Math.abs(k - kcal * SHARES[i]) / (kcal * SHARES[i])).toBeLessThan(0.25);
          expect(p).toBeGreaterThan(protein * [0.25, 0.3, 0.17, 0.28][i] * 0.7);
          // every ingredient is one of their foods
          for (const id of o.ids || []) expect(ids).toContain(id);
          expect((o.ids || []).length).toBeGreaterThan(0);
        }
      });
      // the best options add up to the day
      expect(Math.abs(plan.dayKcal - kcal) / kcal).toBeLessThan(0.1);
      expect(plan.dayProtein).toBeGreaterThan(protein * 0.9);
    });
  }

  it('gives different mains across options when it can', () => {
    const plan = buildFoodPlan(2900, 200, people[0][1]);
    const lunch = plan.meals[1].options.map((o) => o.name.split(/[ ,&]/)[0]);
    expect(new Set(lunch).size).toBeGreaterThanOrEqual(2);
  });

  it('handles custom foods', () => {
    const c = makeCustomFood('Moms chili', '1 bowl', 450, 35, 'protein');
    const plan = buildFoodPlan(2400, 180, [...people[1][1], c.id], [c]);
    expect(plan.meals.flatMap((m) => m.options).some((o) => o.detail.includes('chili'))).toBe(true);
  });

  it('says what is missing', () => {
    expect(whatsMissing([foodById('chicken_breast')!])).toEqual(expect.arrayContaining(['2 more proteins', 'a vegetable', 'a fruit']));
  });

  it('formats amounts', () => {
    expect(amountText(1.5)).toBe('1½'); expect(amountText(0.25)).toBe('¼'); expect(amountText(3)).toBe('3');
  });

  it('grocery list only lists foods the plan uses', () => {
    const plan = buildFoodPlan(2900, 200, people[0][1]);
    const g = buildFoodGrocery(plan.meals, people[0][1]);
    expect(g.find((a) => a.aisle === 'Protein')?.items).toContain('Chicken breast');
  });

  it('food database is sane', () => {
    for (const f of FOOD_DB) {
      const est = f.p * 4 + f.c * 4 + f.f * 9;
      if (f.kcal > 20) expect(Math.abs(est - f.kcal) / f.kcal).toBeLessThan(0.3);
      expect(f.min).toBeLessThanOrEqual(f.def); expect(f.def).toBeLessThanOrEqual(f.max);
    }
  });
});
