import { supabase } from './supabase';
import { isoDate } from './logs';
import { isStacked, proteinGoal, readDay, stepGoal } from './daily';
import { allWeighIns } from './body';
import { e1rm, trendSeries } from './trend';
import { exName } from './workoutMeta';
import { weekOf } from './program';
import type { Plan } from './types';

/** One week (Monday to Sunday) in numbers, for the shareable recap card. */
export type Recap = {
  start: string; end: string; label: string; programWeek: number;
  workouts: number; planned: number; sets: number; volume: number;
  prs: { name: string; weight: number; reps: number }[];
  best: { name: string; weight: number; reps: number } | null;
  stacked: number; proteinDays: number; avgSteps: number;
  trendStart: number | null; trendEnd: number | null; change: number | null; weighIns: number;
};

export const mondayOf = (d = new Date()) => { const m = new Date(d); m.setHours(12, 0, 0, 0); m.setDate(m.getDate() - ((m.getDay() + 6) % 7)); return m; };
const DEMO = process.env.EXPO_PUBLIC_DEMO === '1';

type Log = { exercise_id: string; weight: number | null; reps: number | null; logged_on: string };

export async function weekRecap(userId: string, plan: Plan, monday: Date): Promise<Recap> {
  const days = Array.from({ length: 7 }, (_, k) => { const d = new Date(monday); d.setDate(monday.getDate() + k); return d; });
  const start = isoDate(days[0]), end = isoDate(days[6]);
  let logs: Log[] = [];
  if (!DEMO) {
    const r: any = await Promise.race([
      supabase.from('workout_logs').select('exercise_id,weight,reps,logged_on').eq('user_id', userId).lte('logged_on', end).order('logged_on', { ascending: true }).limit(5000),
      new Promise((res) => setTimeout(() => res({ data: [] }), 5000)),
    ]).catch(() => ({ data: [] }));
    logs = r?.data || [];
  } else logs = demoLogs(start);
  const week = logs.filter((l) => l.logged_on >= start && l.logged_on <= end);
  const before = logs.filter((l) => l.logged_on < start);
  const dates = new Set(logs.map((l) => l.logged_on));

  // Personal records: heavier than anything before this week (same exercise)
  const topBefore: Record<string, number> = {};
  for (const l of before) topBefore[l.exercise_id] = Math.max(topBefore[l.exercise_id] || 0, Number(l.weight) || 0);
  const prMap: Record<string, { weight: number; reps: number }> = {};
  let best: Recap['best'] = null, bestE = 0;
  for (const l of week) {
    const w = Number(l.weight) || 0, r = Number(l.reps) || 0; if (!w) continue;
    if (topBefore[l.exercise_id] != null && w > topBefore[l.exercise_id] && (!prMap[l.exercise_id] || w > prMap[l.exercise_id].weight)) prMap[l.exercise_id] = { weight: w, reps: r };
    const e = e1rm(w, r); if (e > bestE) { bestE = e; best = { name: exName(l.exercise_id, plan), weight: w, reps: r }; }
  }

  let stacked = 0, proteinDays = 0, steps: number[] = [];
  for (const d of days) {
    const id = isoDate(d); if (id > isoDate()) continue;
    const day = await readDay(id);
    if (isStacked(day, plan, dates.has(id), d.getDay())) stacked++;
    if (day.protein >= proteinGoal(plan)) proteinDays++;
    if (day.steps > 0) steps.push(day.steps);
  }
  if (DEMO && !steps.length) { stacked = 5; proteinDays = 6; steps = [9400, 8100, 10200, 7600, 9900]; }

  const series = trendSeries(await allWeighIns(userId));
  const at = (iso: string) => { const p = series.filter((x) => x.date <= iso); return p.length ? p[p.length - 1].t : null; };
  const prevEnd = new Date(days[0]); prevEnd.setDate(prevEnd.getDate() - 1);
  const trendStart = at(isoDate(prevEnd)) ?? (series.find((x) => x.date >= start)?.t ?? null);
  const trendEnd = at(end);
  const label = `${days[0].toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${days[6].toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;

  return {
    start, end, label, programWeek: weekOf(plan.train.s, days[6]),
    workouts: new Set(week.map((l) => l.logged_on)).size, planned: plan.train.d.length,
    sets: week.length, volume: Math.round(week.reduce((n, l) => n + (Number(l.weight) || 0) * (Number(l.reps) || 0), 0)),
    prs: Object.entries(prMap).map(([id, v]) => ({ name: exName(id, plan), ...v })).slice(0, 4), best,
    stacked, proteinDays, avgSteps: steps.length ? Math.round(steps.reduce((a, b) => a + b, 0) / steps.length) : 0,
    trendStart, trendEnd, change: trendStart != null && trendEnd != null ? Math.round((trendEnd - trendStart) * 10) / 10 : null,
    weighIns: series.filter((x) => x.date >= start && x.date <= end).length,
  };
}

/** Design previews only: a believable week of logged sets (never in real builds). */
function demoLogs(start: string): Log[] {
  const out: Log[] = [];
  const add = (iso: string, id: string, w: number, r: number, n = 3) => { for (let k = 0; k < n; k++) out.push({ exercise_id: id, weight: w, reps: r, logged_on: iso }); };
  const d = (off: number) => { const x = new Date(start + 'T12:00:00'); x.setDate(x.getDate() + off); return isoDate(x); };
  add(d(-7), 'barbell_bench', 175, 8); add(d(-7), 'hack_squat', 215, 8); add(d(-5), 'barbell_row', 145, 10);
  add(d(0), 'barbell_bench', 185, 8); add(d(0), 'incline_db_press', 60, 10); add(d(1), 'hack_squat', 230, 8); add(d(1), 'leg_press', 360, 10);
  add(d(3), 'barbell_row', 155, 10); add(d(3), 'lat_pulldown', 140, 12); add(d(4), 'machine_shoulder_press', 105, 8);
  return out;
}

/** Design previews only: 5 weeks of logged sets for the strength charts (never in real builds). */
export function demoHistory(): Log[] {
  const out: Log[] = [];
  const lifts: [string, number, number, number][] = [['barbell_bench', 165, 5, 8], ['hack_squat', 195, 10, 8], ['barbell_row', 135, 5, 10], ['lat_pulldown', 120, 5, 12], ['machine_shoulder_press', 85, 5, 8]];
  for (let wk = 0; wk < 5; wk++) {
    const d = new Date(); d.setDate(d.getDate() - (4 - wk) * 7 - 2);
    for (const [id, w0, inc, r] of lifts) for (let k = 0; k < 3; k++) out.push({ exercise_id: id, weight: w0 + inc * wk, reps: r, logged_on: isoDate(d) });
  }
  return out;
}
