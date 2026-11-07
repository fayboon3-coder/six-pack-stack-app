import { describe, expect, it } from 'vitest';
import { adaptCalories, goalDate, ratePerWeek, repRange, suggestNext, trendSeries } from '../src/lib/trend';

const days = (start: string, ws: number[]) => ws.map((w, k) => {
  const d = new Date(start + 'T12:00:00'); d.setDate(d.getDate() + k);
  return { date: d.toISOString().slice(0, 10), w };
});

describe('trend weight', () => {
  it('smooths a one-day spike', () => {
    const s = trendSeries(days('2026-11-01', [200, 200, 203.5, 200]));
    expect(s[2].t).toBeLessThan(200.5);
    expect(s[3].t).toBeGreaterThan(199.9);
  });
  it('follows a steady loss and reports the weekly pace', () => {
    const ws = Array.from({ length: 21 }, (_, k) => 210 - k * (1.4 / 7));
    const s = trendSeries(days('2026-11-01', ws));
    const r = ratePerWeek(s)!;
    expect(r).toBeLessThan(-0.8);
    expect(r).toBeGreaterThan(-1.6);
  });
  it('gives a goal date only when moving toward the goal', () => {
    const from = new Date('2026-11-01T12:00:00');
    expect(goalDate(200, -1, 190, from)!.toISOString().slice(0, 10)).toBe('2027-01-10');
    expect(goalDate(200, 0.5, 190, from)).toBeNull();
  });
});

describe('adaptive calories', () => {
  const base = { kcal: 2300, goal: 'lose' as const, male: true, today: '2026-11-21' };
  it('waits for two weeks of weigh-ins', () => {
    const s = trendSeries(days('2026-11-15', [210, 209, 209]));
    expect(adaptCalories({ ...base, series: s }).kind).toBe('need_data');
  });
  it('trims calories when the trend stalls, by at most 150', () => {
    const s = trendSeries(days('2026-11-07', Array(15).fill(210)));
    const r = adaptCalories({ ...base, series: s });
    expect(r.kind).toBe('adjust');
    if (r.kind === 'adjust') { expect(r.to).toBeLessThan(2300); expect(2300 - r.to).toBeLessThanOrEqual(150); }
  });
  it('keeps calories when losing 0.5–1% a week', () => {
    const s = trendSeries(days('2026-11-07', Array.from({ length: 15 }, (_, k) => 210 - k * 0.22)));
    expect(['on_track', 'adjust']).toContain(adaptCalories({ ...base, series: s }).kind);
  });
  it('never goes under the floor', () => {
    const s = trendSeries(days('2026-11-07', Array(15).fill(160)));
    const r = adaptCalories({ ...base, kcal: 1550, series: s });
    if (r.kind === 'adjust') expect(r.to).toBeGreaterThanOrEqual(1500);
  });
  it('one change a week', () => {
    const s = trendSeries(days('2026-11-07', Array(15).fill(210)));
    expect(adaptCalories({ ...base, series: s, lastChange: '2026-11-18' }).kind).toBe('wait');
  });
});

describe('auto progression', () => {
  it('reads rep ranges', () => {
    expect(repRange('3 × 8–10')).toEqual([8, 10]);
    expect(repRange('4 × 12')).toEqual([12, 12]);
  });
  it('adds weight when every set hits the top', () => {
    const s = suggestNext('3 × 8–10', [{ weight: 135, reps: 10 }, { weight: 135, reps: 10 }, { weight: 135, reps: 10 }], 5)!;
    expect(s.tag).toBe('up'); expect(s.weight).toBe(140); expect(s.reps).toBe(8);
  });
  it('adds a rep when not there yet', () => {
    const s = suggestNext('3 × 8–10', [{ weight: 135, reps: 9 }, { weight: 135, reps: 8 }], 5)!;
    expect(s.tag).toBe('reps'); expect(s.weight).toBe(135); expect(s.reps).toBe(9);
  });
  it('holds on re-set weeks', () => {
    expect(suggestNext('3 × 8–10', [{ weight: 135, reps: 10 }], 4)!.tag).toBe('hold');
  });
});
