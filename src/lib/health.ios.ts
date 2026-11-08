import AsyncStorage from '@react-native-async-storage/async-storage';
import type { HealthApi, HealthToday, HealthWorkout } from './health';
import type { WeighIn } from './trend';

/** iPhone: Apple Health (HealthKit). Reads steps, weight, sleep, active energy and workouts; saves weigh-ins and finished workouts. */
const ON = 'sps:health:on';
const STEPS = 'HKQuantityTypeIdentifierStepCount';
const MASS = 'HKQuantityTypeIdentifierBodyMass';
const ENERGY = 'HKQuantityTypeIdentifierActiveEnergyBurned';
const SLEEP = 'HKCategoryTypeIdentifierSleepAnalysis';
const WORKOUT = 'HKWorkoutTypeIdentifier';

// Loaded lazily: Apple Health's native module isn't in Expo Go (or any build without it), and
// importing it there throws at startup and takes the whole app down. Without it, Health is just off.
let K: any = {};
try { K = require('@kingstinct/react-native-healthkit'); } catch { K = {}; }
const iso = (d: Date) => { const z = new Date(d.getTime() - d.getTimezoneOffset() * 60000); return z.toISOString().slice(0, 10); };
const dayBounds = (d: Date) => { const s = new Date(d); s.setHours(0, 0, 0, 0); const e = new Date(s); e.setDate(e.getDate() + 1); return { s, e }; };

function available() {
  try { return !!K.isHealthDataAvailable?.(); } catch { return false; }
}
async function isOn() { try { return available() && (await AsyncStorage.getItem(ON)) === '1'; } catch { return false; } }

async function connect() {
  if (!available()) return false;
  try {
    await K.requestAuthorization({ toRead: [STEPS, MASS, ENERGY, SLEEP, WORKOUT], toShare: [MASS, WORKOUT] });
    await AsyncStorage.setItem(ON, '1');
    return true;
  } catch { return false; }
}
async function disconnect() { try { await AsyncStorage.removeItem(ON); } catch {} }

async function sum(id: string, unit: string, s: Date, e: Date) {
  try {
    const r = await K.queryStatisticsForQuantity(id, ['cumulativeSum'], { unit, filter: { date: { startDate: s, endDate: e } } });
    const q = r?.sumQuantity?.quantity;
    return q == null ? null : Math.round(q);
  } catch { return null; }
}

async function steps(d: Date) {
  if (!(await isOn())) return null;
  const { s, e } = dayBounds(d);
  return sum(STEPS, 'count', s, e > new Date() ? new Date() : e);
}

/** Minutes asleep last night (6pm yesterday to noon today), all sleep stages, overlaps merged. */
async function sleepLastNight() {
  try {
    const end = new Date(); end.setHours(12, 0, 0, 0);
    const start = new Date(end); start.setHours(-6);
    const rows: any[] = await K.queryCategorySamples(SLEEP, { limit: 0, filter: { date: { startDate: start, endDate: end } } });
    const asleep = rows.filter((r) => [1, 3, 4, 5].includes(Number(r.value)))
      .map((r) => [new Date(r.startDate).getTime(), new Date(r.endDate).getTime()] as [number, number]).sort((a, b) => a[0] - b[0]);
    let total = 0, cur: [number, number] | null = null;
    for (const iv of asleep) {
      if (!cur || iv[0] > cur[1]) { if (cur) total += cur[1] - cur[0]; cur = [...iv] as [number, number]; } else cur[1] = Math.max(cur[1], iv[1]);
    }
    if (cur) total += cur[1] - cur[0];
    return total ? Math.round(total / 60000) : null;
  } catch { return null; }
}

async function today(): Promise<HealthToday> {
  if (!(await isOn())) return { steps: null, sleepMin: null, activeKcal: null };
  const { s } = dayBounds(new Date());
  const [st, sl, kc] = await Promise.all([sum(STEPS, 'count', s, new Date()), sleepLastNight(), sum(ENERGY, 'kcal', s, new Date())]);
  return { steps: st, sleepMin: sl, activeKcal: kc };
}

async function weights(days: number): Promise<WeighIn[]> {
  if (!(await isOn())) return [];
  try {
    const start = new Date(); start.setDate(start.getDate() - days);
    const rows: any[] = await K.queryQuantitySamples(MASS, { limit: 0, unit: 'lb', ascending: true, filter: { date: { startDate: start, endDate: new Date() } } });
    const byDay: Record<string, number> = {};
    for (const r of rows) byDay[iso(new Date(r.startDate))] = Math.round(Number(r.quantity) * 10) / 10;
    return Object.entries(byDay).map(([date, w]) => ({ date, w }));
  } catch { return []; }
}

async function workouts(days: number): Promise<HealthWorkout[]> {
  if (!(await isOn())) return [];
  try {
    const start = new Date(); start.setDate(start.getDate() - days);
    const rows: any[] = await K.queryWorkoutSamples({ limit: 0, ascending: false, filter: { date: { startDate: start, endDate: new Date() } } });
    return rows.map((w) => ({ date: iso(new Date(w.startDate)), minutes: Math.round((new Date(w.endDate).getTime() - new Date(w.startDate).getTime()) / 60000), kind: String(w.workoutActivityType) }));
  } catch { return []; }
}

async function saveWeight(lbs: number) {
  if (!(await isOn()) || !lbs) return;
  try { const now = new Date(); await K.saveQuantitySample(MASS, 'lb', lbs, now, now); } catch {}
}

async function saveWorkout(start: Date, end: Date) {
  if (!(await isOn())) return;
  try { await K.saveWorkoutSample(50 /* traditional strength training */, [], start, end); } catch {}
}

export const health: HealthApi = { available, isOn, connect, disconnect, today, steps, weights, workouts, saveWeight, saveWorkout };
