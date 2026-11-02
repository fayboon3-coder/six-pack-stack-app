import type { Plan } from './types';
import { exercises } from './program';

export type Muscle = 'Chest' | 'Back' | 'Shoulders' | 'Biceps' | 'Triceps' | 'Quads' | 'Hamstrings' | 'Glutes' | 'Calves' | 'Abs';

/** Colour per muscle group so the chips read at a glance. */
export const MUSCLE_COLOR: Record<Muscle, string> = {
  Chest: '#ff5a50', Back: '#4f8cff', Shoulders: '#f5a524', Biceps: '#b57bff', Triceps: '#ff7ab6',
  Quads: '#3fbf7f', Hamstrings: '#2fc4c4', Glutes: '#ff9d5c', Calves: '#9fd356', Abs: '#ffd84d',
};

const RULES: [RegExp, Muscle][] = [
  [/calf/, 'Calves'],
  [/leg_curl|rdl|deadlift/, 'Hamstrings'],
  [/hip_thrust|step_up|glute|abduction|kickback/, 'Glutes'],
  [/squat|leg_press|lunge|leg_extension|split/, 'Quads'],
  [/crunch|plank|knee_raise|leg_raise|dead_bug|ab_wheel|woodchop/, 'Abs'],
  [/landmine|shoulder_press|arnold|lateral|rear_delt|face_pull|pike/, 'Shoulders'],
  [/bench_dip|skull/, 'Triceps'],
  [/bench|incline_db_press|close_grip_push_up/, 'Chest'],
  [/push_up|fly|chest_press|dip/, 'Chest'],
  [/row|pulldown|pull_up|chin_up|back_extension/, 'Back'],
  [/curl/, 'Biceps'],
  [/pushdown|_ext$|tricep/, 'Triceps'],
];

export const muscleOf = (id: string): Muscle | null => RULES.find(([re]) => re.test(id))?.[1] ?? null;

export type DayMeta = {
  day: string; type: string; sets: number; minutes: number; muscles: Muscle[];
  items: { id: string; name: string; target: string; note?: string; video?: string; muscle: Muscle | null }[];
};

/** Everything a workout card needs: day, type, total sets, time, muscles in order of work. */
export function dayMeta(d: Plan['train']['d'][number], names?: Record<string, string>): DayMeta {
  const [day, type] = d.t.split('·').map((x) => x.trim());
  const items = d.x.map(([id, target, note]) => ({
    id, target, note, name: exercises[id]?.name || names?.[id] || id.replace(/^my_/, '').replace(/_/g, ' '), video: exercises[id]?.video, muscle: muscleOf(id),
  }));
  const sets = d.x.reduce((n, [, t]) => n + (parseInt(String(t), 10) || 3), 0);
  const minutes = Math.max(30, Math.round((sets * 2.5 + 5) / 5) * 5);
  const count: Partial<Record<Muscle, number>> = {};
  d.x.forEach(([id, t]) => { const m = muscleOf(id); if (m) count[m] = (count[m] || 0) + (parseInt(String(t), 10) || 3); });
  const muscles = (Object.keys(count) as Muscle[]).sort((a, b) => (count[b]! - count[a]!));
  return { day, type: type || day, sets, minutes, muscles, items };
}

import { THUMBS } from './thumbs';
/** Form-video still: bundled copy when we have one, otherwise YouTube's. */
export const thumb = (video?: string, q: 'mq' | 'hq' = 'mq') =>
  !video ? undefined : THUMBS[video] ?? { uri: `https://i.ytimg.com/vi/${video}/${q}default.jpg` };

/** Display name for any exercise, including moves the person added themselves. */
export const exName = (id: string, plan?: Pick<Plan, 'train'> | null) =>
  exercises[id]?.name || plan?.train.c?.[id] || id.replace(/^my_/, '').replace(/_/g, ' ');
