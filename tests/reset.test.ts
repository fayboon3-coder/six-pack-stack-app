import './setup-mocks';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const saved: any[] = [];
vi.mock('../src/lib/supabase', () => ({
  supabase: { from: () => ({ update: (row: any) => { saved.push(row); return { eq: () => ({ eq: async () => ({ error: null }) }) }; } }) },
}));

import { autoReset } from '../src/lib/reset';
import { buildFreePlan } from '../src/lib/quiz';

const quiz: any = { goal: 'Lose fat and see my abs', sex: 'Male', age: '29', height_ft: '5', height_in: '11', weight: '212', goal_weight: '185',
  where_train: 'Gym', days: '4 days', experience: '1–3 years', tried: [], monthly_spend: 'Under $50', eat_out: 'Rarely', struggle: 'Weekends',
  start_timing: 'Today', ready_to_invest: 'Yes', first_name: 'Jake', email: 'j@example.com', likes: ['Chicken', 'Rice', 'Eggs'], spots: [] };
const plan = buildFreePlan(quiz);
const num = (s: string) => Number(s.replace(/[^\d.]/g, ''));

describe('Full Stack re-sets at weeks 4 and 8', () => {
  beforeEach(() => { saved.length = 0; });
  it('lowers calories as weight drops, by 200 at most', async () => {
    const r = await autoReset('u1', { tier: 'self', quiz } as any, plan, 4, 190);
    expect(r).not.toBeNull();
    expect(num(r!.kcal)).toBeLessThan(num(plan.kcal));
    expect(num(plan.kcal) - num(r!.kcal)).toBeLessThanOrEqual(200);
    expect(saved[0].data.resets).toEqual([4]);
    expect(saved[0].data.food).toBe('picked');
  });
  it('never raises calories for fat loss', async () => {
    const r = await autoReset('u1', { tier: 'self', quiz } as any, plan, 4, 230);
    expect(r === null || num(r.kcal) <= num(plan.kcal)).toBe(true);
  });
  it('skips free users, coaching clients, other weeks and repeats', async () => {
    expect(await autoReset('u1', { tier: 'free', quiz } as any, plan, 4, 200)).toBeNull();
    expect(await autoReset('u1', { tier: 'coached', quiz } as any, plan, 4, 200)).toBeNull();
    expect(await autoReset('u1', { tier: 'self', quiz } as any, plan, 5, 200)).toBeNull();
    expect(await autoReset('u1', { tier: 'self', quiz } as any, { ...plan, resets: [4] }, 4, 200)).toBeNull();
  });
});
