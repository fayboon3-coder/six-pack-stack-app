/**
 * Training builder: preset splits, the days you train, your equipment, up to two
 * focus areas, swaps and your own extra moves.
 *
 * What people can change: which split, which days, equipment, focus, which variation
 * of each movement, and extra moves added at the end. What stays locked: the movement
 * patterns each day covers, sets, rep ranges and the week 1–12 progression (setsFor).
 * That keeps every custom plan as effective as the default one.
 */
import type { TrainDay } from './types';
import { exercises } from './program';

export type Equip = 'gym' | 'db' | 'bw';
export type SplitId = 'fb3' | 'ppl3' | 'ul4' | 'pplu4' | 'pplul5' | 'ppl6';
export type Focus = 'abs' | 'arms' | 'chest' | 'back' | 'shoulders' | 'legs' | 'glutes';
export type Extra = { id: string; name: string; day: number; target: string };

/** Everything the person chose. Stored on the plan (plan.train.cfg) and in their quiz answers. */
export type TrainCfg = {
  split: SplitId;
  /** 0 = Sunday … 6 = Saturday, one per session, in week order. */
  days: number[];
  equip: Equip;
  focus: Focus[];
  /** "pattern:default id" → the one they picked instead. Applies on every day that slot appears. */
  swaps: Record<string, string>;
  /** Moves that hurt: never picked again anywhere in the plan. */
  avoid: string[];
  extras: Extra[];
  newbie: boolean;
};

export type Pattern =
  | 'h_press' | 'incline' | 'v_press' | 'lateral' | 'triceps' | 'fly'
  | 'v_pull' | 'h_pull' | 'rear_delt' | 'biceps'
  | 'squat' | 'hinge' | 'lunge' | 'glute' | 'ham_curl' | 'quad_iso' | 'calves' | 'abs';

export const PATTERN_LABEL: Record<Pattern, string> = {
  h_press: 'Chest press', incline: 'Upper chest press', v_press: 'Shoulder press', lateral: 'Side delts', triceps: 'Triceps', fly: 'Chest fly',
  v_pull: 'Vertical pull', h_pull: 'Row', rear_delt: 'Rear delts', biceps: 'Biceps',
  squat: 'Squat', hinge: 'Hip hinge', lunge: 'Single leg', glute: 'Glutes', ham_curl: 'Hamstring curl', quad_iso: 'Quads', calves: 'Calves', abs: 'Abs',
};

const G = 'gym', D = 'db', B = 'bw';
type Cand = [id: string, equip: Equip[], note?: string];

/**
 * Every exercise in a pattern, best first, with the equipment it needs.
 * The builder takes the first one that fits; swaps offer the rest.
 */
export const MOVES: Record<Pattern, Cand[]> = {
  h_press: [['barbell_bench', [G], 'Or dumbbell bench press'], ['db_bench', [G, D]], ['machine_chest_press', [G]], ['neutral_db_bench', [G, D]], ['push_up', [G, D, B]]],
  incline: [['incline_db_press', [G, D]], ['landmine_press', [G]], ['machine_chest_press', [G], 'Set the seat low so you press slightly upward'], ['decline_push_up', [D, B]]],
  v_press: [['machine_shoulder_press', [G]], ['db_shoulder_press', [G, D]], ['arnold_press', [G, D]], ['landmine_press', [G]], ['pike_push_up', [D, B]]],
  lateral: [['cable_lateral_raise', [G]], ['db_lateral_raise', [G, D]]],
  triceps: [['rope_pushdown', [G]], ['oh_cable_ext', [G]], ['skull_crusher', [G, D]], ['oh_db_ext', [G, D]], ['dip', [G]], ['bench_dip', [D, B]], ['close_grip_push_up', [G, D, B]]],
  fly: [['cable_fly', [G]], ['db_fly', [G, D]], ['push_up', [B], 'Hands wide, slow on the way down']],
  v_pull: [['pull_up', [G, D, B], "Use the assisted machine or a band if you can't get 6"], ['lat_pulldown', [G]], ['assisted_pull_up', [G]], ['chin_up', [G, D, B]], ['band_pulldown', [D, B], 'Band anchored high on a door']],
  h_pull: [['seated_cable_row', [G]], ['chest_supported_row', [G]], ['barbell_row', [G], 'Or T-bar row'], ['one_arm_db_row', [G, D]], ['chest_supported_db_row', [G, D]], ['inverted_row', [D, B], 'Under a sturdy table or a low bar'], ['band_row', [D, B], 'Band anchored on a door']],
  rear_delt: [['face_pull', [G]], ['rear_delt_fly', [G, D]], ['band_row', [B], 'Elbows high and wide, squeeze your rear shoulders']],
  biceps: [['incline_curl', [G, D]], ['cable_curl', [G]], ['preacher_curl', [G]], ['db_curl', [G, D]], ['hammer_curl', [G, D]], ['chin_up', [B], 'Slow 3-second lowering on every rep']],
  squat: [['hack_squat', [G], 'Or leg press'], ['leg_press', [G]], ['back_squat', [G]], ['goblet_squat', [G, D]], ['box_squat', [G, D]], ['bodyweight_squat', [B], 'Slow 3 seconds down. Too easy? Pause at the bottom']],
  hinge: [['rdl', [G]], ['trap_bar_deadlift', [G]], ['db_rdl', [G, D]], ['sl_db_deadlift', [G, D]], ['sl_rdl', [D, B]], ['back_extension', [G]]],
  lunge: [['walking_lunge', [G, D, B]], ['bulgarian_split_squat', [G, D, B]], ['db_reverse_lunge', [G, D, B]], ['db_step_up', [G, D, B]], ['ffe_split_squat', [G, D]]],
  glute: [['hip_thrust', [G]], ['db_hip_thrust', [G, D]], ['glute_bridge', [D, B]], ['sl_hip_thrust', [G, D, B]], ['cable_kickback', [G]], ['hip_abduction', [G]]],
  ham_curl: [['seated_leg_curl', [G]], ['lying_leg_curl', [G]], ['slider_leg_curl', [G, D, B]], ['sl_rdl', [D, B]]],
  quad_iso: [['leg_extension', [G]], ['ffe_split_squat', [D]], ['bodyweight_squat', [B], 'Slow 3 seconds down. Too easy? Pause at the bottom']],
  calves: [['standing_calf_raise', [G]], ['seated_calf_raise', [G]], ['leg_press_calf', [G]], ['sl_calf_raise', [G, D, B]]],
  abs: [['hanging_knee_raise', [G]], ['cable_crunch', [G]], ['ab_wheel', [G, D]], ['reverse_crunch', [G, D, B]], ['lying_leg_raise', [G, D, B]], ['bicycle_crunch', [G, D, B]], ['cable_woodchop', [G]], ['plank', [G, D, B]], ['dead_bug', [G, D, B]]],
};

/** One slot: the movement, its locked sets × reps, and which variation (0 = first that fits). */
type Slot = [Pattern, string, number?];
type Session = { name: string; kind: 'push' | 'pull' | 'legs' | 'upper' | 'lower' | 'full'; slots: Slot[] };

const PUSH: Session = { name: 'Push', kind: 'push', slots: [['h_press', '3 × 6–10'], ['incline', '3 × 8–12'], ['v_press', '3 × 8–12'], ['lateral', '3 × 12–15'], ['triceps', '3 × 10–15']] };
const PULL: Session = { name: 'Pull', kind: 'pull', slots: [['v_pull', '3 × 6–10'], ['h_pull', '3 × 8–12'], ['h_pull', '3 × 8–12', 1], ['rear_delt', '2 × 12–15'], ['biceps', '2 × 10–15'], ['biceps', '2 × 10–15', 1]] };
const LEGS: Session = { name: 'Legs', kind: 'legs', slots: [['squat', '3 × 8–12'], ['hinge', '3 × 8–10'], ['lunge', '2 × 10 each leg'], ['ham_curl', '3 × 10–15'], ['quad_iso', '2 × 12–15'], ['calves', '3 × 12–15']] };
const UPPER: Session = { name: 'Upper', kind: 'upper', slots: [['h_press', '3 × 8–12', 1], ['v_pull', '3 × 8–12', 1], ['v_press', '2 × 8–12', 1], ['h_pull', '2 × 10–12', 4], ['lateral', '2 × 12–15'], ['abs', '3 × 10–15'], ['abs', '3 × 10–15', 1]] };

const UPPER_A: Session = { name: 'Upper A', kind: 'upper', slots: [['h_press', '3 × 6–10'], ['v_pull', '3 × 6–10'], ['h_pull', '3 × 8–12'], ['v_press', '2 × 8–12'], ['lateral', '2 × 12–15'], ['triceps', '2 × 10–15'], ['biceps', '2 × 10–15']] };
const LOWER_A: Session = { name: 'Lower A', kind: 'lower', slots: [['squat', '3 × 8–12'], ['hinge', '3 × 8–10'], ['lunge', '2 × 10 each leg'], ['ham_curl', '2 × 10–15'], ['calves', '3 × 12–15'], ['abs', '3 × 10–15']] };
const UPPER_B: Session = { name: 'Upper B', kind: 'upper', slots: [['incline', '3 × 8–12'], ['v_pull', '3 × 8–12', 1], ['h_pull', '3 × 10–12', 1], ['fly', '2 × 12–15'], ['rear_delt', '2 × 12–15'], ['lateral', '2 × 12–20'], ['biceps', '2 × 10–15', 1], ['triceps', '2 × 10–15', 1]] };
const LOWER_B: Session = { name: 'Lower B', kind: 'lower', slots: [['hinge', '3 × 8–10', 1], ['squat', '3 × 10–12', 1], ['glute', '3 × 10–15'], ['quad_iso', '2 × 12–15'], ['calves', '3 × 12–15', 1], ['abs', '3 × 10–15', 1]] };

const FB_A: Session = { name: 'Full body A', kind: 'full', slots: [['squat', '3 × 8–12'], ['h_press', '3 × 6–10'], ['v_pull', '3 × 8–12'], ['ham_curl', '2 × 10–15'], ['lateral', '2 × 12–15'], ['abs', '2 × 10–15']] };
const FB_B: Session = { name: 'Full body B', kind: 'full', slots: [['hinge', '3 × 8–10'], ['v_press', '3 × 8–12'], ['h_pull', '3 × 8–12'], ['lunge', '2 × 10 each leg'], ['biceps', '2 × 10–15'], ['triceps', '2 × 10–15']] };
const FB_C: Session = { name: 'Full body C', kind: 'full', slots: [['squat', '3 × 10–12', 1], ['incline', '3 × 8–12'], ['h_pull', '3 × 8–12', 1], ['glute', '3 × 10–15'], ['rear_delt', '2 × 12–15'], ['calves', '2 × 12–15'], ['abs', '2 × 10–15', 1]] };

const shift = (s: Session, name: string, by = 1): Session => ({ ...s, name, slots: s.slots.map(([p, t, k]) => [p, t, (k || 0) + by]) });
const withAbs = (s: Session, k = 0): Session => ({ ...s, slots: [...s.slots, ['abs', '3 × 10–15', k]] });

export const SPLITS: Record<SplitId, { label: string; short: string; days: 3 | 4 | 5 | 6; blurb: string; sessions: Session[] }> = {
  fb3: { label: 'Full body', short: 'Full body × 3', days: 3, blurb: 'Every muscle three times a week. Best if you\'re newer or short on time.', sessions: [FB_A, FB_B, FB_C] },
  ppl3: { label: 'Push / Pull / Legs', short: 'PPL', days: 3, blurb: 'One day each for pushing, pulling and legs. Longer, more focused sessions.', sessions: [PUSH, withAbs(PULL), withAbs(LEGS, 1)] },
  ul4: { label: 'Upper / Lower', short: 'Upper / Lower × 2', days: 4, blurb: 'Every muscle twice a week. The most balanced 4-day split.', sessions: [UPPER_A, LOWER_A, UPPER_B, LOWER_B] },
  pplu4: { label: 'Push / Pull / Legs + Upper', short: 'PPL + Upper', days: 4, blurb: 'Classic PPL plus an extra upper-body day for chest, back and arms.', sessions: [PUSH, PULL, LEGS, UPPER] },
  pplul5: { label: 'Push / Pull / Legs / Upper / Lower', short: 'PPLUL', days: 5, blurb: 'Five days: PPL, then upper and lower. Lots of volume, every muscle twice.', sessions: [PUSH, PULL, withAbs(LEGS), shift(UPPER_B, 'Upper', 0), shift(LOWER_B, 'Lower', 0)] },
  ppl6: { label: 'Push / Pull / Legs × 2', short: 'PPL × 2', days: 6, blurb: 'Six days, every muscle twice. For people who love the gym and recover well.', sessions: [PUSH, withAbs(PULL), LEGS, shift(PUSH, 'Push B'), withAbs(shift(PULL, 'Pull B'), 1), shift(LEGS, 'Legs B')] },
};

/** One line for the week: "Upper · Lower · Upper · Lower", "Full body × 3". */
export function weekLine(id: SplitId) {
  const names = SPLITS[id].sessions.map((x) => x.name.replace(/ [A-C]$/, ''));
  return new Set(names).size === 1 ? `${names[0]} × ${names.length}` : names.join(' · ');
}

export const SPLITS_FOR: Record<number, SplitId[]> = { 3: ['fb3', 'ppl3'], 4: ['ul4', 'pplu4'], 5: ['pplul5'], 6: ['ppl6'] };
export const DEFAULT_DAYS: Record<number, number[]> = { 3: [1, 3, 5], 4: [1, 2, 4, 5], 5: [1, 2, 3, 5, 6], 6: [1, 2, 3, 4, 5, 6] };
export const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export const FOCUS_LABEL: Record<Focus, string> = { abs: 'Abs', arms: 'Arms', chest: 'Chest', back: 'Back', shoulders: 'Shoulders', legs: 'Legs', glutes: 'Glutes' };
/** Extra work for a focus area, added to up to two matching days. */
const FOCUS: Record<Focus, { slots: Slot[]; on: Session['kind'][] }> = {
  abs: { slots: [['abs', '2 × 10–15', 2]], on: ['pull', 'legs', 'lower', 'upper', 'full', 'push'] },
  arms: { slots: [['biceps', '2 × 10–15', 3], ['triceps', '2 × 10–15', 3]], on: ['upper', 'pull', 'push', 'full'] },
  chest: { slots: [['fly', '2 × 12–15']], on: ['push', 'upper', 'full'] },
  back: { slots: [['h_pull', '2 × 10–12', 3]], on: ['pull', 'upper', 'full'] },
  shoulders: { slots: [['lateral', '2 × 12–20', 1]], on: ['push', 'upper', 'pull', 'full'] },
  legs: { slots: [['lunge', '2 × 10 each leg', 1]], on: ['legs', 'lower', 'full'] },
  glutes: { slots: [['glute', '3 × 10–15', 1]], on: ['legs', 'lower', 'full'] },
};
export const MAX_FOCUS = 2;

/** Equipment from the quiz answer. */
export const equipOf = (where?: string): Equip =>
  !where ? 'gym' : /no equipment|bodyweight/i.test(where) ? 'bw' : /home|dumbbell/i.test(where) ? 'db' : 'gym';
export const EQUIP_LABEL: Record<Equip, string> = { gym: 'Full gym', db: 'Dumbbells at home', bw: 'Bodyweight only' };
export const EQUIP_SUB: Record<Equip, string> = { gym: 'Machines, cables, barbells and dumbbells', db: 'A pair of adjustable dumbbells and a bench', bw: 'No weights. A pull-up bar or band helps for back' };

/** A sensible starting point from the quiz. */
export function defaultCfg(q: { where_train?: string; days?: string; experience?: string; split?: string; train_days?: number[] }): TrainCfg {
  const newbie = q.experience === 'Never lifted' || q.experience === 'Under 1 year';
  const n = Math.min(6, Math.max(3, parseInt(q.days || '4', 10) || 4));
  const split = (q.split && SPLITS[q.split as SplitId]?.days === n ? q.split : (n === 3 && newbie ? 'fb3' : SPLITS_FOR[n][n === 3 ? 1 : 0])) as SplitId;
  const days = q.train_days?.length === n ? [...q.train_days].sort() : DEFAULT_DAYS[n];
  return { split, days, equip: equipOf(q.where_train), focus: [], swaps: {}, avoid: [], extras: [], newbie };
}

const fits = (c: Cand, e: Equip) => c[1].includes(e);

/** Candidates for a pattern with this equipment, minus anything they said hurts. */
export const optionsFor = (p: Pattern, equip: Equip, avoid: string[] = []) =>
  MOVES[p].filter((c) => fits(c, equip) && !avoid.includes(c[0]));

/** Which pattern an exercise belongs to (its first listing). */
export const patternOf = (id: string): Pattern | null =>
  (Object.keys(MOVES) as Pattern[]).find((p) => MOVES[p].some((c) => c[0] === id)) ?? null;

const FAMILY: Record<Pattern, string> = {
  h_press: 'chest', incline: 'chest', fly: 'chest', v_press: 'delts', lateral: 'delts', rear_delt: 'delts', triceps: 'tri',
  v_pull: 'back', h_pull: 'back', biceps: 'bi', squat: 'quads', lunge: 'quads', quad_iso: 'quads', hinge: 'hams', ham_curl: 'hams',
  glute: 'glutes', calves: 'calves', abs: 'abs',
};

export type BuiltDay = TrainDay & { p: (Pattern | null)[] };

/** Build the week. Same config in → same plan out. */
export function buildWeek(cfg: TrainCfg): BuiltDay[] {
  const split = SPLITS[cfg.split];
  const sessions = split.sessions.map((s) => ({ ...s, slots: [...s.slots] }));

  // Focus: extra slots on up to two matching days (the ones with the fewest sets get them first).
  for (const f of cfg.focus.slice(0, MAX_FOCUS)) {
    const spec = FOCUS[f];
    const targets = sessions
      .map((s, i) => ({ s, i, rank: spec.on.indexOf(s.kind) }))
      .filter((x) => x.rank >= 0)
      .sort((a, b) => a.rank - b.rank || a.s.slots.length - b.s.slots.length || a.i - b.i)
      .slice(0, 2);
    for (const { s } of targets) {
      // Before the abs at the end, so the big lifts stay first.
      const at = s.slots.findIndex(([p]) => p === 'abs');
      const pos = at < 0 ? s.slots.length : at;
      s.slots.splice(pos, 0, ...spec.slots);
    }
  }

  const days = [...cfg.days].sort((a, b) => a - b).slice(0, split.days);
  return sessions.map((s, i) => {
    const used = new Set<string>();
    const x: [string, string, string?][] = [];
    const p: (Pattern | null)[] = [];
    for (const [pat, tgt, k = 0] of s.slots) {
      const opts = optionsFor(pat, cfg.equip, cfg.avoid);
      if (!opts.length) continue;
      const pool = opts.filter((c) => !used.has(c[0]));
      if (!pool.length) {
        // Nothing new left for this movement (mostly bodyweight): put the sets on the
        // closest move already in the day instead, so the volume stays the same.
        const j = p.map((q) => q && FAMILY[q]).lastIndexOf(FAMILY[pat]);
        if (j >= 0) {
          const n = parseInt(x[j][1], 10) || 3;
          const add = Math.min(parseInt(tgt, 10) || 2, 4 - n);
          if (add > 0) x[j] = [x[j][0], x[j][1].replace(/^\d+/, String(n + add)), x[j][2]].filter((v) => v !== undefined) as [string, string, string?];
        }
        continue;
      }
      let pick = pool[k % pool.length];
      // Their swap wins when it's allowed here.
      const sw = cfg.swaps[`${pat}:${pick[0]}`];
      const swc = sw ? opts.find((c) => c[0] === sw) : undefined;
      if (swc && !used.has(swc[0])) pick = swc;
      used.add(pick[0]);
      const t = cfg.newbie ? tgt.replace(/^3 ×/, '2 ×') : tgt;
      x.push(pick[2] ? [pick[0], t, pick[2]] : [pick[0], t]);
      p.push(pat);
    }
    for (const e of cfg.extras.filter((e) => e.day === i)) { x.push([e.id, e.target, 'Your own move']); p.push(null); }
    return { t: `${DAY_NAMES[days[i] ?? i + 1]} · ${s.name}`, x, p };
  });
}

/** For the plan row: day list without the pattern bookkeeping, plus custom names. */
export function buildTrain(cfg: TrainCfg) {
  const week = buildWeek(cfg);
  const c: Record<string, string> = {};
  cfg.extras.forEach((e) => { c[e.id] = e.name; });
  return { d: week.map(({ t, x }) => ({ t, x })) as TrainDay[], e: cfg.newbie ? 0 : 1, cfg, c };
}

/** Same-pattern swaps for one exercise in this config (current one excluded). */
export function swapsFor(cfg: TrainCfg, dayIdx: number, exIdx: number) {
  const week = buildWeek(cfg);
  const pat = week[dayIdx]?.p[exIdx];
  if (!pat) return { pattern: null as Pattern | null, current: week[dayIdx]?.x[exIdx]?.[0], options: [] as string[] };
  const current = week[dayIdx].x[exIdx][0];
  const sameDay = new Set(week[dayIdx].x.map((x) => x[0]));
  const options = optionsFor(pat, cfg.equip, cfg.avoid).map((c) => c[0]).filter((id) => id !== current && !sameDay.has(id));
  return { pattern: pat, current, options };
}

/** The default exercise for a slot (before any swap), so a swap is stored against it. */
function baseId(cfg: TrainCfg, dayIdx: number, exIdx: number) {
  const plain = buildWeek({ ...cfg, swaps: {} });
  return plain[dayIdx]?.x[exIdx]?.[0];
}

/** Apply a swap. `hurts` also blocks the old move everywhere in the plan. */
export function applySwap(cfg: TrainCfg, dayIdx: number, exIdx: number, to: string, hurts = false): TrainCfg {
  const week = buildWeek(cfg);
  const current = week[dayIdx]?.x[exIdx]?.[0];
  const pat = week[dayIdx]?.p[exIdx];
  if (!current || !pat || current === to) return cfg;
  const avoid = hurts ? [...new Set([...cfg.avoid, current])] : cfg.avoid;
  const next = { ...cfg, avoid };
  const base = baseId(next, dayIdx, exIdx) || current;
  const swaps = { ...cfg.swaps };
  if (base === to) delete swaps[`${pat}:${base}`]; else swaps[`${pat}:${base}`] = to;
  return { ...next, swaps };
}

/** Back to the default for one slot (moves marked as hurting stay blocked). */
export function resetSwap(cfg: TrainCfg, dayIdx: number, exIdx: number): TrainCfg {
  const pat = buildWeek(cfg)[dayIdx]?.p[exIdx];
  const base = baseId(cfg, dayIdx, exIdx);
  if (!base || !pat) return cfg;
  const swaps = { ...cfg.swaps }; delete swaps[`${pat}:${base}`];
  return { ...cfg, swaps };
}

/** True when this slot shows something other than its default. */
export const isSwapped = (cfg: TrainCfg, dayIdx: number, exIdx: number) => {
  const cur = buildWeek(cfg)[dayIdx]?.x[exIdx]?.[0];
  return !!cur && cur !== baseId(cfg, dayIdx, exIdx);
};

export const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '').slice(0, 30);

/** Add your own move at the end of a day. It never replaces the main lifts. */
export function addExtra(cfg: TrainCfg, day: number, name: string, target = '3 × 10–15'): TrainCfg {
  const clean = name.trim().replace(/\s+/g, ' ').slice(0, 40);
  if (!clean) return cfg;
  const known = Object.entries(exercises).find(([, v]) => v.name.toLowerCase() === clean.toLowerCase());
  const id = known ? known[0] : `my_${slug(clean) || 'move'}`;
  if (cfg.extras.some((e) => e.day === day && e.id === id)) return cfg;
  if (cfg.extras.filter((e) => e.day === day).length >= 2) return cfg;
  return { ...cfg, extras: [...cfg.extras, { id, name: known ? known[1].name : clean, day, target }] };
}
export const removeExtra = (cfg: TrainCfg, day: number, id: string): TrainCfg =>
  ({ ...cfg, extras: cfg.extras.filter((e) => !(e.day === day && e.id === id)) });

export const MAX_EXTRAS_PER_DAY = 2;
export const EXTRA_TARGETS = ['2 × 10–15', '3 × 8–12', '3 × 10–15', '3 × 12–20'];

/** Change split: keeps equipment, focus and avoid; resets swaps/extras that no longer line up. */
export function changeSplit(cfg: TrainCfg, split: SplitId): TrainCfg {
  if (split === cfg.split) return cfg;
  const n = SPLITS[split].days;
  const days = cfg.days.length === n ? cfg.days : DEFAULT_DAYS[n];
  return { ...cfg, split, days, extras: cfg.extras.filter((e) => e.day < n) };
}

/** Weekly hard sets per muscle (for tests and the editor summary). */
export function weeklySets(cfg: TrainCfg) {
  const out: Record<string, number> = {};
  buildWeek(cfg).forEach((d) => d.x.forEach(([, t], k) => {
    const p = d.p[k]; if (!p) return;
    out[p] = (out[p] || 0) + (parseInt(t, 10) || 3);
  }));
  return out;
}
