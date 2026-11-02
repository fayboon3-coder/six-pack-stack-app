import { supabase } from './supabase';
import type { Plan, Profile } from './types';
import { buildTrain, defaultCfg, type TrainCfg } from './training';
import { isCoached } from './access';

/** People who can change their own training (coaching clients get theirs from Boon). */
export const canEditTraining = (p?: Profile | null) => !!p && !isCoached(p) && p.role !== 'coach';

/** Saved choices, or a starting point from their quiz answers. */
export const cfgOf = (plan?: Plan | null, profile?: Profile | null): TrainCfg =>
  plan?.train.cfg || (profile?.quiz as any)?.train_cfg || defaultCfg((profile?.quiz || {}) as any);

/** The plan with this training week in it (sets, reps and progression unchanged). */
export function withTraining(plan: Plan, cfg: TrainCfg): Plan {
  const t = buildTrain(cfg);
  const dayList = t.d.map((x) => x.t.split(' ')[0]);
  return {
    ...plan,
    days: dayList.map((d) => d.slice(0, 3)).join(', '),
    week1: (plan.week1 || []).map((w) => (w.startsWith('Train ') ? `Train ${dayList.join(', ')}` : w)),
    phase1: plan.phase1?.replace(/Hit all \d+ sessions/, `Hit all ${t.d.length} sessions`),
    train: { ...plan.train, d: t.d, e: t.e, cfg, c: t.c },
  } as Plan;
}

export async function saveTraining(userId: string, plan: Plan, profile: Profile | null, cfg: TrainCfg) {
  const next = withTraining(plan, cfg);
  const quiz = (profile?.quiz || {}) as any;
  const [{ error }] = await Promise.all([
    supabase.from('plans').update({ data: next }).eq('user_id', userId).eq('active', true),
    supabase.from('profiles').update({ quiz: { ...quiz, train_cfg: cfg, split: cfg.split, train_days: cfg.days, days: `${cfg.days.length} days` } }).eq('id', userId),
  ]);
  return { ok: !error, plan: next };
}
