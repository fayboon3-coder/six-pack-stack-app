import { describe, expect, it } from 'vitest';
import { QUICK_START, foodById, type Food } from '../src/data/foods';
import { buildFoodPlan, whatsMissing } from '../src/lib/mealplan';

// The app quiz no longer asks for foods: everyone starts on QUICK_START, so it must build a full plan.
describe('starter food list', () => {
  it('covers every meal', () => {
    const foods = QUICK_START.map((id) => foodById(id)).filter(Boolean) as Food[];
    expect(foods.length).toBe(QUICK_START.length);
    expect(whatsMissing(foods)).toEqual([]);
    const fp = buildFoodPlan(2200, 180, QUICK_START, []);
    expect(fp.meals.every((m) => m.options.length > 0)).toBe(true);
  });
});
