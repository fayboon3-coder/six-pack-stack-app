import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';
import { isoDate } from './logs';
import { isPreviewing } from './preview';
import { addProtein, num } from './daily';
import { kcalEaten, readMeals } from './mealsToday';
import type { Plan } from './types';

/** Food log: anything eaten that isn't a ticked plan meal (photo, barcode, label or quick add). */
export type FoodSource = 'photo' | 'barcode' | 'label' | 'quick';
export type FoodEntry = { id: string; name: string; kcal: number; protein: number; carbs?: number | null; fat?: number | null; source: FoodSource; at: number };

const key = (d: string) => 'sps:food:' + d;
const DEMO = process.env.EXPO_PUBLIC_DEMO === '1';

export async function readFood(d = isoDate()): Promise<FoodEntry[]> {
  try { const s = await AsyncStorage.getItem(key(d)); return s ? JSON.parse(s) : []; } catch { return []; }
}
async function writeFood(d: string, v: FoodEntry[]) { try { await AsyncStorage.setItem(key(d), JSON.stringify(v)); } catch {} }

/** Log a food. Its protein counts toward today's protein (and Days Stacked). */
export async function addFood(e: Omit<FoodEntry, 'id' | 'at'>, d = isoDate()) {
  const entry: FoodEntry = { ...e, kcal: Math.round(e.kcal || 0), protein: Math.round(e.protein || 0), id: Math.random().toString(36).slice(2, 10), at: Date.now() };
  const list = [...(await readFood(d)), entry];
  await writeFood(d, list);
  if (entry.protein) await addProtein(entry.protein, d);
  backup(entry, d);
  return entry;
}

export async function removeFood(id: string, d = isoDate()) {
  const list = await readFood(d);
  const e = list.find((x) => x.id === id);
  if (!e) return list;
  const next = list.filter((x) => x.id !== id);
  await writeFood(d, next);
  if (e.protein) await addProtein(-e.protein, d);
  if (!isPreviewing() && !DEMO) {
    try {
      const { data } = await supabase.auth.getSession(); const uid = data.session?.user.id;
      if (uid) await supabase.from('food_logs').delete().eq('user_id', uid).eq('client_id', id);
    } catch {}
  }
  return next;
}

async function backup(e: FoodEntry, d: string) {
  if (isPreviewing() || DEMO) return;
  try {
    const { data } = await supabase.auth.getSession(); const uid = data.session?.user.id; if (!uid) return;
    await supabase.from('food_logs').insert({ user_id: uid, day: d, name: e.name.slice(0, 120), kcal: e.kcal, protein: e.protein, carbs: e.carbs ?? null, fat: e.fat ?? null, source: e.source, client_id: e.id });
  } catch {}
}

/** Calories so far today: ticked plan meals + logged foods. */
export async function kcalToday(plan: Plan, d = isoDate()) {
  const [meals, food] = await Promise.all([readMeals(d), readFood(d)]);
  return kcalEaten(plan, meals) + food.reduce((n, f) => n + (f.kcal || 0), 0);
}

/** A few common quick adds, so logging a snack is two taps. */
export const QUICK = [
  { name: 'Protein shake', kcal: 160, protein: 30 },
  { name: 'Greek yogurt cup', kcal: 120, protein: 15 },
  { name: '3 eggs', kcal: 215, protein: 18 },
  { name: 'Protein bar', kcal: 200, protein: 20 },
  { name: 'Light beer', kcal: 110, protein: 1 },
  { name: 'Banana', kcal: 105, protein: 1 },
];

export const asNum = (v: unknown) => num(v);
