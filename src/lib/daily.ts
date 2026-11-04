import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { Pedometer } from 'expo-sensors';
import type { Plan } from './types';
import { isoDate } from './logs';

/** One day's numbers. Steps can come from the phone; protein is logged with quick adds. */
export type Day = { steps: number; stepsManual?: boolean; protein: number; adds: number[] };
const key = (d: string) => 'sps:day:' + d;
const EMPTY: Day = { steps: 0, protein: 0, adds: [] };

export const num = (s: unknown) => Number(String(s ?? '').replace(/[^\d.]/g, '')) || 0;
export const stepGoal = (plan: Plan) => num(plan.steps) || 8000;
export const proteinGoal = (plan: Plan) => num(plan.protein) || 150;

export async function readDay(d = isoDate()): Promise<Day> {
  try { const s = await AsyncStorage.getItem(key(d)); return s ? { ...EMPTY, ...JSON.parse(s) } : { ...EMPTY }; } catch { return { ...EMPTY }; }
}
export async function writeDay(d: string, v: Day) { try { await AsyncStorage.setItem(key(d), JSON.stringify(v)); } catch {} }

export async function addProtein(g: number, d = isoDate()) {
  const v = await readDay(d);
  const next = { ...v, protein: Math.max(0, v.protein + g), adds: [...v.adds, g].slice(-30) };
  await writeDay(d, next); return next;
}
export async function undoProtein(d = isoDate()) {
  const v = await readDay(d); const last = v.adds[v.adds.length - 1];
  if (last == null) return v;
  const next = { ...v, protein: Math.max(0, v.protein - last), adds: v.adds.slice(0, -1) };
  await writeDay(d, next); return next;
}
export async function setSteps(n: number, d = isoDate()) {
  const v = await readDay(d); const next = { ...v, steps: Math.max(0, Math.round(n)), stepsManual: true };
  await writeDay(d, next); return next;
}

/** iPhone counts steps on its own (Core Motion). Android and web: typed in. */
export async function phoneStepsAvailable() {
  if (Platform.OS !== 'ios') return false;
  try { return await Pedometer.isAvailableAsync(); } catch { return false; }
}
export async function syncPhoneSteps(d: Date = new Date()) {
  if (!(await phoneStepsAvailable())) return null;
  try {
    const p = await Pedometer.getPermissionsAsync();
    if (!p.granted) { const r = await Pedometer.requestPermissionsAsync(); if (!r.granted) return null; }
    const start = new Date(d); start.setHours(0, 0, 0, 0);
    const end = new Date(d); end.setHours(23, 59, 59, 999);
    const now = new Date();
    const { steps } = await Pedometer.getStepCountAsync(start, end > now ? now : end);
    const id = isoDate(start);
    const v = await readDay(id);
    if (!v.stepsManual || steps > v.steps) await writeDay(id, { ...v, steps, stepsManual: false });
    return steps;
  } catch { return null; }
}

/** Training weekdays (0 = Sunday) from day labels like "Mon · Upper A". */
export function trainingDows(plan: Plan) {
  const names = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
  return plan.train.d.map((d) => names.indexOf(d.t.trim().slice(0, 3).toLowerCase())).filter((i) => i >= 0);
}

/**
 * A day is stacked when steps and protein hit their targets and the workout is done
 * (rest days only need steps and protein).
 */
export function isStacked(day: Day, plan: Plan, workedOut: boolean, dow: number) {
  const rest = !trainingDows(plan).includes(dow);
  return day.steps >= stepGoal(plan) && day.protein >= proteinGoal(plan) && (rest || workedOut);
}

/** The week Monday to Sunday containing today, with each day's numbers and stacked flag. */
export async function weekStatus(plan: Plan, workoutDates: Set<string>) {
  if (Platform.OS === 'ios') await syncPhoneSteps().catch(() => null);
  const start = new Date(); start.setHours(12, 0, 0, 0); start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
  const out: { date: string; dow: number; day: Day; worked: boolean; stacked: boolean; future: boolean }[] = [];
  const today = isoDate();
  for (let k = 0; k < 7; k++) {
    const d = new Date(start); d.setDate(start.getDate() + k);
    const id = isoDate(d);
    const day = await readDay(id);
    const worked = workoutDates.has(id);
    out.push({ date: id, dow: d.getDay(), day, worked, stacked: isStacked(day, plan, worked, d.getDay()), future: id > today });
  }
  return out;
}

/** Every stacked day on this phone (for the all-time count). */
export async function allTimeStacked(plan: Plan, workoutDates: Set<string>) {
  try {
    const keys = (await AsyncStorage.getAllKeys()).filter((k) => k.startsWith('sps:day:'));
    const pairs = await AsyncStorage.multiGet(keys);
    return pairs.filter(([k, v]) => {
      if (!v) return false; const id = k.slice(8); const d = new Date(id + 'T12:00:00');
      return isStacked({ ...EMPTY, ...JSON.parse(v) }, plan, workoutDates.has(id), d.getDay());
    }).length;
  } catch { return 0; }
}
