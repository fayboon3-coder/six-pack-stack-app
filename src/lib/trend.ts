/**
 * Trend weight, pace and goal date. Pure math, no phone or server calls (tested in tests/trend.test.ts).
 *
 * Trend = a 10%-a-day smoothed average (the Hacker's Diet method Happy Scale and MacroFactor use):
 * one salty dinner moves the scale 3 lbs but the trend only a few tenths. Gaps between weigh-ins
 * are handled by giving a new weigh-in more pull the longer it's been.
 */
export type WeighIn = { date: string; w: number };
export type TrendPoint = WeighIn & { t: number };

const DAY = 864e5;
export const dayNum = (d: string) => Math.round(new Date(d + 'T12:00:00').getTime() / DAY);

export function trendSeries(raw: WeighIn[]): TrendPoint[] {
  const pts = raw.filter((p) => p.w > 50 && p.w < 800).sort((a, b) => a.date.localeCompare(b.date));
  const out: TrendPoint[] = [];
  let t = 0, last = 0;
  for (const p of pts) {
    if (!out.length) { t = p.w; last = dayNum(p.date); out.push({ ...p, t }); continue; }
    const gap = Math.max(1, dayNum(p.date) - last);
    const alpha = 1 - Math.pow(0.9, gap);
    t = t + alpha * (p.w - t);
    last = dayNum(p.date);
    out.push({ ...p, t: Math.round(t * 10) / 10 });
  }
  return out;
}

/** Pounds per week over the last `days` days of trend (least squares). Negative = losing. Null if not enough data. */
export function ratePerWeek(series: TrendPoint[], days = 14): number | null {
  if (series.length < 2) return null;
  const end = dayNum(series[series.length - 1].date);
  const win = series.filter((p) => end - dayNum(p.date) <= days);
  if (win.length < 3) return null;
  const span = dayNum(win[win.length - 1].date) - dayNum(win[0].date);
  if (span < 5) return null;
  const xs = win.map((p) => dayNum(p.date)), ys = win.map((p) => p.t);
  const mx = xs.reduce((a, b) => a + b, 0) / xs.length, my = ys.reduce((a, b) => a + b, 0) / ys.length;
  let num = 0, den = 0;
  xs.forEach((x, i) => { num += (x - mx) * (ys[i] - my); den += (x - mx) ** 2; });
  if (!den) return null;
  return Math.round((num / den) * 7 * 100) / 100;
}

/** When they reach the goal at this pace. Null if they aren't moving toward it. */
export function goalDate(trend: number, rate: number | null, goal: number | null, from = new Date()): Date | null {
  if (rate == null || goal == null || !trend) return null;
  const toGo = goal - trend;
  if (Math.abs(toGo) < 0.3) return new Date(from);
  if (rate === 0 || Math.sign(toGo) !== Math.sign(rate)) return null;
  const weeks = toGo / rate;
  if (weeks > 104) return null;
  return new Date(from.getTime() + weeks * 7 * DAY);
}

/** Weigh-ins in the last 7 days (how much to trust the trend). */
export function weighInsThisWeek(series: WeighIn[], today: string) {
  const end = dayNum(today);
  return series.filter((p) => end - dayNum(p.date) < 7 && end - dayNum(p.date) >= 0).length;
}

/* ---------------- Adaptive calories ---------------- */

export type AdaptInput = {
  series: TrendPoint[];
  kcal: number;
  /** 'lose' (fat loss) or 'build' (lean gain) */
  goal: 'lose' | 'build';
  male: boolean;
  /** YYYY-MM-DD of the last calorie change (adaptive or re-set) */
  lastChange?: string | null;
  today: string;
};
export type AdaptResult =
  | { kind: 'need_data'; have: number; need: number; why: string }
  | { kind: 'wait'; days: number; why: string }
  | { kind: 'on_track'; rate: number; lo: number; hi: number; why: string }
  | { kind: 'adjust'; rate: number; lo: number; hi: number; from: number; to: number; why: string };

/**
 * Boon's weekly calorie check. Safe by design:
 * - needs 14 days and at least 8 weigh-ins (no change off two noisy mornings)
 * - one change a week, never more than 150 calories at a time
 * - fat loss target: lose 0.5% to 1% of body weight a week; build: gain 0.1% to 0.4%
 * - never under 1,500 (men) / 1,200 (women)
 */
export function adaptCalories(a: AdaptInput): AdaptResult {
  const end = dayNum(a.today);
  const recent = a.series.filter((p) => end - dayNum(p.date) <= 14);
  const first = a.series[0];
  const days = first ? end - dayNum(first.date) : 0;
  if (days < 13 || recent.length < 8) {
    return { kind: 'need_data', have: recent.length, need: 8, why: 'Weigh in most mornings for 2 weeks and your calories start adjusting to how your body actually responds.' };
  }
  if (a.lastChange) {
    const since = end - dayNum(a.lastChange);
    if (since < 7) return { kind: 'wait', days: 7 - since, why: 'Your calories just changed. Give it a week before the next check.' };
  }
  const rate = ratePerWeek(a.series, 14);
  if (rate == null) return { kind: 'need_data', have: recent.length, need: 8, why: 'A few more weigh-ins and your weekly calorie check is ready.' };
  const w = a.series[a.series.length - 1].t;
  const lo = a.goal === 'lose' ? -w * 0.01 : w * 0.001;
  const hi = a.goal === 'lose' ? -w * 0.005 : w * 0.004;
  const floor = a.male ? 1500 : 1200;
  const r1 = (n: number) => Math.round(n * 10) / 10;
  const round50 = (n: number) => Math.round(n / 50) * 50;
  if (rate >= lo && rate <= hi) return { kind: 'on_track', rate, lo: r1(lo), hi: r1(hi), why: 'Right in the zone. Same calories this week.' };
  // How far off, in calories (about 3,500 per pound, spread over 7 days), half-way and capped at 150.
  const target = (lo + hi) / 2;
  const gap = ((target - rate) * 3500) / 7;
  const step = Math.max(-150, Math.min(150, round50(gap / 2)));
  const to = Math.max(floor, a.kcal + step);
  if (step === 0 || to === a.kcal) return { kind: 'on_track', rate, lo: r1(lo), hi: r1(hi), why: a.kcal <= floor ? "You're at the lowest calories I'll ever set. Add steps instead of cutting food." : 'Close enough. Same calories this week.' };
  const why = a.goal === 'lose'
    ? (rate > hi ? (rate < -0.05 ? `Your trend is down ${Math.abs(rate).toFixed(1)} lbs a week. A little slow, so we trim ${Math.abs(to - a.kcal)} calories.` : `Your trend has stalled the last 2 weeks. We trim ${Math.abs(to - a.kcal)} calories to get it moving.`) : `You're losing ${Math.abs(rate).toFixed(1)} lbs a week. That's faster than you need, so we add ${to - a.kcal} calories to protect your muscle.`)
    : (rate < lo ? `Your trend is flat. We add ${to - a.kcal} calories so you keep building.` : `You're gaining a bit fast. We trim ${Math.abs(to - a.kcal)} calories to keep it lean.`);
  return { kind: 'adjust', rate, lo: r1(lo), hi: r1(hi), from: a.kcal, to, why };
}

/* ---------------- Auto progression ---------------- */

export type SetRec = { weight: number | null; reps: number | null };
export type Suggestion = { weight: number | null; reps: number; tag: 'up' | 'reps' | 'hold' | 'start'; note: string };

/** "3 × 8–10" → [8, 10]; "12" → [12, 12]; "AMRAP" → null */
export function repRange(target: string): [number, number] | null {
  const s = String(target).replace(/^\d+\s*[×x]\s*/i, '');
  const m = s.match(/(\d+)\s*[–-]\s*(\d+)/);
  if (m) return [Number(m[1]), Number(m[2])];
  const one = s.match(/(\d+)/);
  return one ? [Number(one[1]), Number(one[1])] : null;
}

/**
 * Double progression (the method in every plan): stay at a weight until every set hits the top
 * of the range, then add weight and go back to the bottom. Re-set weeks (4 and 8) hold the weight.
 */
export function suggestNext(target: string, last: (SetRec | undefined)[], week: number, lower = false): Suggestion | null {
  const range = repRange(target);
  const done = last.filter((s): s is SetRec => !!s && s.reps != null);
  if (!range) return null;
  const [lo, hi] = range;
  if (!done.length) return { weight: null, reps: hi, tag: 'start', note: `Pick a weight you could lift for ${hi + 2}.` };
  const w = Math.max(...done.map((s) => Number(s.weight) || 0));
  const atW = done.filter((s) => (Number(s.weight) || 0) === w);
  const minReps = Math.min(...atW.map((s) => Number(s.reps) || 0));
  if (week === 4 || week === 8) return { weight: w || null, reps: Math.min(hi, Math.max(lo, minReps)), tag: 'hold', note: 'Re-set week: same weight, perfect reps.' };
  if (!w) return { weight: null, reps: Math.min(hi, minReps + 1), tag: 'reps', note: `Beat last time: ${Math.min(hi, minReps + 1)} reps.` };
  if (minReps >= hi && atW.length === done.length) {
    const inc = lower ? 10 : w < 30 ? 2.5 : 5;
    return { weight: w + inc, reps: lo, tag: 'up', note: `You hit ${hi} on every set. Add ${inc} lbs.` };
  }
  if (minReps < lo) return { weight: w, reps: lo, tag: 'hold', note: `Same weight. Get all sets to ${lo}.` };
  return { weight: w, reps: Math.min(hi, minReps + 1), tag: 'reps', note: `Same weight, aim for ${Math.min(hi, minReps + 1)} reps.` };
}

/** Estimated 1-rep max (Epley), for the strength chart. */
export const e1rm = (w: number, r: number) => (r <= 1 ? w : Math.round(w * (1 + r / 30)));
