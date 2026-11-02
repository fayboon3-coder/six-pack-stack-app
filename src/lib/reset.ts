import { supabase } from './supabase';
import { buildFreePlan, GOALS, type Quiz } from './quiz';
import type { Plan, Profile } from './types';

export const RESET_WEEKS = [4, 8];
const num = (s?: string | number) => Number(String(s ?? '').replace(/[^\d.]/g, '')) || 0;

/**
 * The Full Stack's automatic re-set (weeks 4 and 8): new calories and protein from
 * this week's average weight, same rules as the quiz. Coaching clients get theirs from Boon.
 * Safe by design: for fat loss it never raises calories, never drops more than 200
 * in one re-set, and never goes under the floor (1,500 men / 1,200 women).
 * Returns the new numbers, or null if nothing changed.
 */
export async function autoReset(userId: string, profile: Profile, plan: Plan, week: number, weight: number) {
  if (profile.tier !== 'self' || !RESET_WEEKS.includes(week) || (plan.resets || []).includes(week)) return null;
  const quiz = profile.quiz as Quiz | undefined;
  if (!quiz || !weight) return null;
  const fresh0 = buildFreePlan({ ...quiz, weight: String(weight) });
  const oldK = num(plan.kcal), newK0 = num(fresh0.kcal);
  const build = quiz.goal === GOALS[2];
  const newK = Math.round((build ? newK0 : Math.max(Math.min(oldK, newK0), oldK - 200)) / 50) * 50;
  // Same foods they picked, re-sized to the new numbers.
  const fresh = buildFreePlan({ ...quiz, weight: String(weight) }, newK);
  const next: Plan = {
    ...plan,
    kcal: fresh.kcal, protein: fresh.protein, fat: fresh.fat, carbs: fresh.carbs,
    meals: fresh.meals, meal_note: fresh.meal_note,
    resets: [...(plan.resets || []), week],
  };
  const { error } = await supabase.from('plans').update({ data: next }).eq('user_id', userId).eq('active', true);
  if (error) return null;
  return { kcal: next.kcal, protein: next.protein, before: plan.kcal };
}
