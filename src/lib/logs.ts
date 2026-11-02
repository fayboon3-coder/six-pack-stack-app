import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';
import { isPreviewing } from './preview';

export type SetLog = {
  user_id: string;
  logged_on: string; // YYYY-MM-DD
  day_label: string;
  exercise_id: string;
  set_no: number;
  weight: number | null;
  reps: number | null;
};

const QUEUE = 'sps:logQueue';

export const isoDate = (d = new Date()) => {
  const z = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return z.toISOString().slice(0, 10);
};

async function readQueue(): Promise<SetLog[]> {
  try { return JSON.parse((await AsyncStorage.getItem(QUEUE)) || '[]'); } catch { return []; }
}

/** Save a set. Works offline: failed saves wait in a queue and sync later. */
export async function saveSet(log: SetLog) {
  if (isPreviewing()) return true; // coach preview: nothing saved
  const { error } = await supabase.from('workout_logs').insert(log);
  if (error) {
    const q = await readQueue();
    q.push(log);
    await AsyncStorage.setItem(QUEUE, JSON.stringify(q));
    return false;
  }
  return true;
}

/** Send any sets saved while offline. */
export async function flushQueue() {
  const q = await readQueue();
  if (!q.length) return 0;
  const { error } = await supabase.from('workout_logs').insert(q);
  if (!error) await AsyncStorage.removeItem(QUEUE);
  return error ? 0 : q.length;
}

/** Latest earlier session's sets for each exercise: { exerciseId: [{weight, reps}] }. */
export async function lastSession(userId: string, exerciseIds: string[], before: string) {
  const { data } = await supabase
    .from('workout_logs')
    .select('exercise_id,set_no,weight,reps,logged_on')
    .eq('user_id', userId)
    .in('exercise_id', exerciseIds)
    .lt('logged_on', before)
    .order('logged_on', { ascending: false })
    .limit(300);
  const out: Record<string, { weight: number | null; reps: number | null }[]> = {};
  const dateFor: Record<string, string> = {};
  for (const r of data || []) {
    if (!dateFor[r.exercise_id]) dateFor[r.exercise_id] = r.logged_on;
    if (r.logged_on !== dateFor[r.exercise_id]) continue;
    (out[r.exercise_id] ||= [])[r.set_no - 1] = { weight: r.weight, reps: r.reps };
  }
  return out;
}

/** Days with any logged sets this week (for streaks and done marks). */
export async function loggedDays(userId: string, since: string) {
  const { data } = await supabase.from('workout_logs').select('logged_on,day_label').eq('user_id', userId).gte('logged_on', since);
  return data || [];
}
