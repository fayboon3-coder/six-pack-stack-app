import { describe, expect, it } from 'vitest';
import { vi } from 'vitest';
vi.mock('../src/lib/thumbs', () => ({ THUMBS: {} }));
import { addExtra, applySwap, buildWeek, changeSplit, defaultCfg, isSwapped, MOVES, optionsFor, resetSwap, SPLITS, swapsFor, weeklySets, type Equip, type SplitId, type TrainCfg } from '../src/lib/training';
import { exercises } from '../src/lib/program';
import { muscleOf } from '../src/lib/workoutMeta';
import { buildFreePlan } from '../src/lib/quiz';

const cfg = (split: SplitId, equip: Equip = 'gym', extra: Partial<TrainCfg> = {}): TrainCfg =>
  ({ ...defaultCfg({ days: String(SPLITS[split].days) }), split, equip, ...extra });
const ALL = Object.keys(SPLITS) as SplitId[];
const EQ: Equip[] = ['gym', 'db', 'bw'];

describe('exercise library', () => {
  it('every move in the map has a name, a form video and 3 cues', () => {
    for (const list of Object.values(MOVES)) for (const [id] of list) {
      expect(exercises[id], id).toBeTruthy();
      expect(exercises[id].video, id).toMatch(/^[\w-]{11}$/);
      expect(exercises[id].cues.length, id).toBe(3);
    }
  });
  it('every move maps to a muscle group', () => {
    for (const list of Object.values(MOVES)) for (const [id] of list) expect(muscleOf(id), id).not.toBeNull();
  });
});

describe('splits', () => {
  for (const s of ALL) for (const e of EQ) {
    it(`${s} / ${e}: right number of days, no repeats in a day, sane length`, () => {
      const w = buildWeek(cfg(s, e));
      expect(w.length).toBe(SPLITS[s].days);
      for (const d of w) {
        const ids = d.x.map((x) => x[0]);
        expect(new Set(ids).size, d.t).toBe(ids.length);
        expect(ids.length, d.t).toBeGreaterThanOrEqual(e === 'bw' ? 4 : 5);
        expect(ids.length, d.t).toBeLessThanOrEqual(9);
        const sets = d.x.reduce((n, x) => n + parseInt(x[1], 10), 0);
        expect(sets, d.t).toBeLessThanOrEqual(22);
      }
      // only moves that fit the equipment
      for (const d of w) d.x.forEach(([id], k) => {
        const p = d.p[k]!; expect(optionsFor(p, e).some((c) => c[0] === id), `${id} in ${p}`).toBe(true);
      });
    });
  }
  it('weekly volume per major muscle is in a productive range (gym)', () => {
    for (const s of ALL) {
      const v = weeklySets(cfg(s));
      const chest = (v.h_press || 0) + (v.incline || 0) + (v.fly || 0);
      const back = (v.v_pull || 0) + (v.h_pull || 0);
      const legs = (v.squat || 0) + (v.lunge || 0) + (v.quad_iso || 0);
      expect(chest, `${s} chest`).toBeGreaterThanOrEqual(6);
      expect(back, `${s} back`).toBeGreaterThanOrEqual(6);
      expect(legs, `${s} quads`).toBeGreaterThanOrEqual(5);
      expect(v.hinge || 0, `${s} hinge`).toBeGreaterThanOrEqual(3);
      expect(v.abs || 0, `${s} abs`).toBeGreaterThanOrEqual(2);
      expect(chest, `${s} chest max`).toBeLessThanOrEqual(22);
    }
  });
  it('days land on the chosen weekdays', () => {
    const w = buildWeek(cfg('ul4', 'gym', { days: [0, 2, 4, 6] }));
    expect(w.map((d) => d.t.split(' ')[0])).toEqual(['Sunday', 'Tuesday', 'Thursday', 'Saturday']);
  });
  it('new lifters start at 2 sets on the 3-set moves', () => {
    const w = buildWeek(cfg('ul4', 'gym', { newbie: true }));
    expect(w[0].x.every((x) => !x[1].startsWith('3 ×'))).toBe(true);
  });
  it('quiz defaults: 3 days for a beginner is full body, 4 days is upper/lower', () => {
    expect(defaultCfg({ days: '3 days', experience: 'Never lifted' }).split).toBe('fb3');
    expect(defaultCfg({ days: '3 days', experience: '3+ years' }).split).toBe('ppl3');
    expect(defaultCfg({ days: '4 days' }).split).toBe('ul4');
    expect(defaultCfg({ days: '6 days' }).split).toBe('ppl6');
    expect(defaultCfg({ where_train: 'Home, no equipment' }).equip).toBe('bw');
    expect(defaultCfg({ where_train: 'Home with dumbbells' }).equip).toBe('db');
  });
});

describe('focus', () => {
  it('adds extra work to at most two days, before the abs', () => {
    const base = weeklySets(cfg('ul4'));
    const v = weeklySets(cfg('ul4', 'gym', { focus: ['arms'] }));
    expect((v.biceps || 0) - (base.biceps || 0)).toBe(4);
    expect((v.triceps || 0) - (base.triceps || 0)).toBe(4);
    const w = buildWeek(cfg('ul4', 'gym', { focus: ['arms'] }));
    const d0 = w[0]; const absAt = d0.p.indexOf('abs');
    if (absAt >= 0) expect(d0.p.slice(absAt).every((p) => p === 'abs')).toBe(true);
  });
  it('only the first two focus areas count', () => {
    const a = weeklySets(cfg('ul4', 'gym', { focus: ['arms', 'glutes', 'chest'] }));
    const b = weeklySets(cfg('ul4', 'gym', { focus: ['arms', 'glutes'] }));
    expect(a).toEqual(b);
  });
});

describe('swaps', () => {
  it('offers only same-pattern moves that fit the equipment', () => {
    const c = cfg('pplu4');
    const s = swapsFor(c, 0, 0);
    expect(s.pattern).toBe('h_press');
    expect(s.options.length).toBeGreaterThanOrEqual(2);
    for (const id of s.options) expect(MOVES.h_press.some((m) => m[0] === id)).toBe(true);
    expect(s.options).not.toContain(s.current);
  });
  it('a swap sticks, keeps the sets and reps, and can be undone', () => {
    const c = cfg('pplu4');
    const before = buildWeek(c)[0].x[0];
    const to = swapsFor(c, 0, 0).options[1];
    const c2 = applySwap(c, 0, 0, to);
    const after = buildWeek(c2)[0].x[0];
    expect(after[0]).toBe(to);
    expect(after[1]).toBe(before[1]);
    expect(isSwapped(c2, 0, 0)).toBe(true);
    const c3 = resetSwap(c2, 0, 0);
    expect(buildWeek(c3)[0].x[0][0]).toBe(before[0]);
  });
  it('"it hurts" removes the move from the whole plan', () => {
    const c = cfg('ppl6');
    const cur = buildWeek(c)[0].x[0][0];
    const to = swapsFor(c, 0, 0).options[0];
    const c2 = applySwap(c, 0, 0, to, true);
    const all = buildWeek(c2).flatMap((d) => d.x.map((x) => x[0]));
    expect(all).not.toContain(cur);
    expect(buildWeek(c2)[0].x[0][0]).toBe(to);
  });
  it('swapping twice ends on the last pick', () => {
    const c = cfg('ul4');
    const [a, b] = swapsFor(c, 1, 0).options;
    const c2 = applySwap(applySwap(c, 1, 0, a), 1, 0, b);
    expect(buildWeek(c2)[1].x[0][0]).toBe(b);
  });
});

describe('your own moves', () => {
  it('adds to the end of the day, never replaces a main lift, max 2 a day', () => {
    let c = cfg('ul4');
    const core = buildWeek(c)[0].x.map((x) => x[0]);
    c = addExtra(c, 0, 'Sled push');
    c = addExtra(c, 0, 'Farmer carry');
    c = addExtra(c, 0, 'Third one');
    const d = buildWeek(c)[0];
    expect(d.x.slice(0, core.length).map((x) => x[0])).toEqual(core);
    expect(d.x.slice(core.length).map((x) => x[0])).toEqual(['my_sled_push', 'my_farmer_carry']);
  });
  it('recognises library moves by name', () => {
    const c = addExtra(cfg('ul4'), 1, 'hip thrust');
    expect(c.extras[0].id).toBe('hip_thrust');
  });
  it('changing split keeps equipment and drops extras on days that no longer exist', () => {
    let c = addExtra(cfg('ppl6', 'db'), 5, 'Sled push');
    c = changeSplit(c, 'ul4');
    expect(c.equip).toBe('db');
    expect(c.days.length).toBe(4);
    expect(c.extras.length).toBe(0);
  });
});

describe('free plan', () => {
  it('stores the training choices and custom names on the plan', () => {
    const p = buildFreePlan({ goal: 'Lose fat', sex: 'Male', age: '30', height_ft: '5', height_in: '10', weight: '200', goal_weight: '180',
      where_train: 'Home, no equipment', days: '5 days', experience: '1–3 years', tried: [], monthly_spend: 'Under $50', eat_out: 'Rarely',
      struggle: 'No time', start_timing: 'Today', ready_to_invest: 'Not right now', first_name: 'Sam', email: 'x@y.z' } as any);
    expect(p.train.d.length).toBe(5);
    expect(p.train.cfg?.equip).toBe('bw');
    expect(p.train.cfg?.split).toBe('pplul5');
  });
});
