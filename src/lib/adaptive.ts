import { supabase } from './supabase';
import { buildFreePlan, GOALS, type Quiz } from './quiz';
import { adaptCalories, type AdaptResult, type TrendPoint } from './trend';
import { isoDate } from './logs';
import type { Plan, Profile } from './types';

/**
 * Weekly calorie check (The Full Stack): reads their trend weight and nudges calories by up to 150
 * so they keep losing 0.5–1% a week. They tap to accept; meals are re-sized to the new number.
 * Coaching clients: Boon makes the call on Sunday. Free plan: shown as what's coming.
 */
const num = (s?: string | number) => Number(String(s ?? '').replace(/[^\d.]/g, '')) || 0;

export function adaptFor(plan: Plan, profile: Profile | null, series: TrendPoint[]): AdaptResult & { who: 'self' | 'coached' | 'free' | 'none' } {
  const quiz = (profile?.quiz || {}) as Partial<Quiz>;
  const who = profile?.tier === 'coached' ? 'coached' : profile?.tier === 'self' ? 'self' : profile?.tier === 'free' ? 'free' : 'none';
  // The last time calories changed: a weekly check or a week 4/8 re-set (done at that week's Sunday check-in).
  const dates = (plan.adapt || []).map((a) => a.at);
  if (plan.resets?.length && plan.train.s) {
    const d = new Date(plan.train.s + 'T12:00:00'); d.setDate(d.getDate() + Math.max(...plan.resets) * 7 - 1); dates.push(isoDate(d));
  }
  const lastReset = dates.sort().pop() || null;
  const r = adaptCalories({
    series, kcal: num(plan.kcal) || 2000,
    goal: quiz.goal === GOALS[2] ? 'build' : 'lose',
    male: quiz.sex !== 'Female', lastChange: lastReset, today: isoDate(),
  });
  return { ...r, who };
}

/** Accept the new calories: same foods, re-sized; history kept on the plan. */
export async function applyAdapt(userId: string, profile: Profile, plan: Plan, to: number): Promise<Plan | null> {
  const quiz = profile.quiz as Quiz | undefined;
  let next: Plan;
  const entry = { at: isoDate(), from: num(plan.kcal), to };
  if (quiz) {
    const fresh = buildFreePlan(quiz, to);
    next = { ...plan, kcal: fresh.kcal, protein: plan.protein, fat: fresh.fat, carbs: fresh.carbs, meals: fresh.meals, meal_note: fresh.meal_note, adapt: [...(plan.adapt || []), entry] };
  } else {
    next = { ...plan, kcal: to.toLocaleString('en-US'), adapt: [...(plan.adapt || []), entry] };
  }
  if (process.env.EXPO_PUBLIC_DEMO === '1') return next;
  const { error } = await supabase.from('plans').update({ data: next }).eq('user_id', userId).eq('active', true);
  return error ? null : next;
}
