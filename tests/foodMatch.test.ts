import { describe, expect, it, vi } from 'vitest';
vi.mock('../src/lib/foodPhotos', () => ({ foodPhoto: (id: string) => ({ uri: id }) }));
vi.mock('../src/lib/meals', () => ({ mealImage: () => null }));
import { matchFoods } from '../src/lib/foodMatch';

describe('matchFoods', () => {
  it('reads a meal name in order', () => {
    expect(matchFoods('Greek yogurt bowl with mixed berries and honey')).toEqual(['greek_yogurt', 'berries', 'honey']);
  });
  it('prefers the longest name', () => {
    expect(matchFoods('Ground beef (93% lean) tacos')[0]).toBe('ground_beef_93');
    expect(matchFoods('Sweet potato and chicken breast')).toEqual(expect.arrayContaining(['chicken_breast']));
  });
  it('reads grocery lines', () => {
    expect(matchFoods('Eggs (2 dozen)')).toEqual(['eggs']);
    expect(matchFoods('Bananas')).toEqual(['banana']);
    expect(matchFoods('Salmon fillets, 1.5 lbs')).toEqual(['salmon']);
  });
  it('finds nothing in plain words', () => {
    expect(matchFoods('Drink water with every meal')).toEqual([]);
  });
});
