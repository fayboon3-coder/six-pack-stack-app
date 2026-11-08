import { describe, expect, it, vi } from 'vitest';
vi.mock('../src/lib/foodPhotos', () => ({ foodPhoto: (id: string) => ({ uri: id }) }));
vi.mock('../src/lib/meals', () => ({ mealImage: () => null }));
import { parseFoods, portionLabel, searchFoods } from '../src/lib/parseFood';
import { foodById } from '../src/data/foods';

const pick = (t: string) => parseFoods(t).items.map((i) => [i.id, i.qty]);

describe('parseFoods', () => {
  it('reads amounts and units', () => {
    expect(pick('6 oz chicken breast and 1 cup white rice')).toEqual([['chicken_breast', 6], ['white_rice', 1]]);
    expect(pick('3 eggs, 2 slices bacon')).toEqual([['eggs', 3], ['bacon', 2]]);
    expect(pick('8oz salmon')).toEqual([['salmon', 8]]);
  });
  it('converts grams and pounds to ounces', () => {
    expect(pick('170g chicken breast')).toEqual([['chicken_breast', 6]]);
    expect(pick('half a pound of ground beef')[0][0]).toMatch(/ground_beef/);
  });
  it('uses the usual portion when none is given', () => {
    const f = foodById('greek_yogurt')!;
    expect(pick('greek yogurt')).toEqual([['greek_yogurt', f.def]]);
  });
  it('reads words and fractions', () => {
    expect(pick('two eggs')).toEqual([['eggs', 2]]);
    expect(pick('1½ cups rice')).toEqual([['white_rice', 1.5]]);
    expect(pick('a banana')).toEqual([['banana', 1]]);
  });
  it('counts calories and protein', () => {
    const r = parseFoods('2 scoops whey');
    expect(r.items[0].protein).toBe(48);
    expect(r.items[0].kcal).toBe(240);
  });
  it('lists what it could not place', () => {
    expect(parseFoods('3 eggs and a glorpberry').missing).toEqual(['a glorpberry']);
    expect(parseFoods('I had').missing).toEqual([]);
  });
});

describe('labels and search', () => {
  it('labels portions', () => {
    expect(portionLabel(foodById('chicken_breast')!, 6)).toBe('6 oz');
    expect(portionLabel(foodById('eggs')!, 3)).toBe('3 eggs');
    expect(portionLabel(foodById('white_rice')!, 1.5)).toBe('1½ cups');
  });
  it('finds foods by the start of a word', () => {
    expect(searchFoods('sal').map((f) => f.id)).toContain('salmon');
    expect(searchFoods('x')).toEqual([]);
  });
});
