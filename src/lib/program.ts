import type { Plan } from './types';
import EX from '../data/exercises.json';

export const exercises = EX as Record<string, { name: string; video: string; cues: string[] }>;

/** Strip the plan generator's <b> tags for plain text display. */
export const plain = (s?: string) => (s || '').replace(/<[^>]+>/g, '');

const toNum = (s?: string | number) => Number(String(s ?? '').replace(/[^\d.]/g, '')) || 0;
export { toNum };

/** Week 1–12 from the program start date (a Sunday). */
export function weekOf(start?: string, now = new Date()) {
  if (!start) return 1;
  const s = new Date(start + 'T00:00:00');
  const w = Math.floor((now.getTime() - s.getTime()) / 864e5 / 7) + 1;
  return Math.min(12, Math.max(1, w));
}

export const phaseOf = (week: number) =>
  week <= 4 ? { name: 'Strip', n: 1 } : week <= 8 ? { name: 'Stack', n: 2 } : { name: 'Six-Pack', n: 3 };

export const PHOTO_WEEKS = [1, 3, 5, 7, 9, 11, 12];

const DAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

/** Index of today's training day, or the next one coming up. */
export function todayIndex(plan: Plan, now = new Date()) {
  const d = plan.train.d;
  const today = now.getDay();
  for (let k = 0; k < 7; k++) {
    const name = DAYS[(today + k) % 7];
    const i = d.findIndex((x) => x.t.toLowerCase().startsWith(name));
    if (i >= 0) return { index: i, isToday: k === 0 };
  }
  return { index: 0, isToday: false };
}

/** Sets for an exercise: 4 on the first exercise from week 5 for experienced lifters. */
export function setsFor(target: string, i: number, plan: Plan, week: number) {
  let n = parseInt(target, 10) || 3;
  if (plan.train.e && week >= 5 && i === 0) n += 1;
  return n;
}

export const repsOf = (target: string) => String(target).replace(/^\d+\s*×\s*/, '');

/** Next Sunday (or today if Sunday), for the check-in countdown. */
export function daysToSunday(now = new Date()) {
  return (7 - now.getDay()) % 7;
}
