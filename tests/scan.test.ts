import { describe, expect, it, vi } from 'vitest';
vi.mock('expo-image-manipulator', () => ({ ImageManipulator: {}, SaveFormat: {} }));
vi.mock('../src/lib/supabase', () => ({ supabase: {}, SUPABASE_URL: '', SUPABASE_KEY: '' }));
vi.mock('../src/lib/images', () => ({ IMG: {} }));
import { supplementMatch } from '../src/lib/scan';

describe('supplement match', () => {
  it('uses the product, not the brand', () => {
    expect(supplementMatch(null, 'Micronized Creatine Powder', 'Micronized Creatine Powder Optimum Nutrition')?.name).toBe('Creatine');
  });
  it('finds common products', () => {
    expect(supplementMatch('Gold Standard 100% Whey')?.name).toBe('Whey Protein');
    expect(supplementMatch('AG1 Athletic Greens')?.name).toBe('Greens Powders');
    expect(supplementMatch('Hydroxycut Hardcore Elite')?.name).toBe('Fat Burners');
    expect(supplementMatch('Plain rice cakes')).toBeNull();
  });
});
