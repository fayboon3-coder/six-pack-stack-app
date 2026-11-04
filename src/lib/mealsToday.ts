import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Plan } from './types';
import { isoDate } from './logs';
import { num } from './daily';

export type MealDay = { pick: Record<number, number>; eaten: Record<number, boolean> };
export const mealsKey = (d = isoDate()) => 'sps:meals:' + d;

export async function readMeals(d = isoDate()): Promise<MealDay> {
  try { const s = await AsyncStorage.getItem(mealsKey(d)); return s ? { pick: {}, eaten: {}, ...JSON.parse(s) } : { pick: {}, eaten: {} }; } catch { return { pick: {}, eaten: {} }; }
}
export async function writeMeals(v: MealDay, d = isoDate()) { try { await AsyncStorage.setItem(mealsKey(d), JSON.stringify(v)); } catch {} }

/** Calories from the meals ticked off today. */
export function kcalEaten(plan: Plan, day: MealDay) {
  const meals = plan.meals || [];
  return meals.reduce((n, m, k) => (day.eaten[k] && m.options.length ? n + num(m.options[(day.pick[k] || 0) % m.options.length].kcal) : n), 0);
}
