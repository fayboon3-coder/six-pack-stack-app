import { supabase } from './supabase';
import { isoDate } from './logs';

const sundayOf = (d: Date) => { const s = new Date(d); s.setHours(0, 0, 0, 0); s.setDate(s.getDate() - s.getDay()); return s; };

/**
 * Week streak: weeks in a row with at least min(3, planned) workouts.
 * This week never breaks the streak while it's still in progress.
 */
export async function getStreak(userId: string, plannedPerWeek: number) {
  const since = new Date(); since.setDate(since.getDate() - 7 * 16);
  const { data } = await supabase.from('workout_logs').select('logged_on').eq('user_id', userId).gte('logged_on', isoDate(since));
  const days = [...new Set((data || []).map((r: any) => r.logged_on as string))];
  const perWeek: Record<string, number> = {};
  days.forEach((d) => { const k = isoDate(sundayOf(new Date(d + 'T12:00:00'))); perWeek[k] = (perWeek[k] || 0) + 1; });
  const need = Math.min(3, plannedPerWeek || 3);
  const cur = sundayOf(new Date());
  const thisWeek = perWeek[isoDate(cur)] || 0;
  let weeks = thisWeek >= need ? 1 : 0;
  const w = new Date(cur);
  for (;;) {
    w.setDate(w.getDate() - 7);
    if ((perWeek[isoDate(w)] || 0) >= need) weeks++; else break;
  }
  return { weeks, workouts: days.length, thisWeek, need };
}
