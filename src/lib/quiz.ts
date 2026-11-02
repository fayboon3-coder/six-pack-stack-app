import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Plan, TrainDay } from './types';
import SAMPLE from '../data/samplePlan.json';
import { buildEatOut, buildGrocery, buildMenu } from './menu';

/** Everything the quiz collects. Strings are the exact option labels (they go to Kit as-is). */
export type Quiz = {
  goal: string; sex: string; age: string; height_ft: string; height_in: string;
  weight: string; goal_weight: string; where_train: string; days: string; experience: string;
  tried: string[]; monthly_spend: string; eat_out: string; struggle: string;
  start_timing: string; ready_to_invest: string;
  /** Foods they'd eat every week and where they eat out (meal plan is built from these). */
  likes?: string[]; spots?: string[];
  first_name: string; email: string; src?: string; done_at?: string;
};

export const GOALS = ['Lose fat', 'Lose fat and see my abs', 'Build muscle and stay lean'];
export const SPEND_MID: Record<string, number> = { 'Under $50': 30, '$50–$100': 75, '$100–$200': 150, '$200+': 250 };

const KEY = 'sps:quiz';
export const savePendingQuiz = (q: Quiz) => AsyncStorage.setItem(KEY, JSON.stringify(q));
export const readPendingQuiz = async (): Promise<Quiz | null> => {
  try { const s = await AsyncStorage.getItem(KEY); return s ? JSON.parse(s) : null; } catch { return null; }
};
export const clearPendingQuiz = () => AsyncStorage.removeItem(KEY);

const num = (s: string) => Number(String(s).replace(/[^\d.]/g, '')) || 0;
const round = (n: number, to: number) => Math.round(n / to) * to;
const fmt = (n: number) => n.toLocaleString('en-US');

/** Most recent Sunday (today if Sunday), as YYYY-MM-DD: week 1 starts now. */
export function thisSunday(now = new Date()) {
  const d = new Date(now); d.setDate(d.getDate() - d.getDay());
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** The honest numbers behind the goal-date screen. */
export function projection(q: Pick<Quiz, 'weight' | 'goal_weight' | 'goal'>) {
  const w = num(q.weight), g = num(q.goal_weight) || w;
  const build = q.goal === GOALS[2];
  // About 0.75% of body weight a week, between 0.5 and 2 lbs: fast enough to see, slow enough to keep muscle.
  const rate = build ? 0 : Math.min(2, Math.max(0.5, w * 0.0075));
  const toLose = Math.max(0, w - g);
  const weeks = build || toLose === 0 ? 12 : Math.max(1, Math.ceil(toLose / rate));
  const at12 = build ? w : Math.max(g, Math.round(w - rate * 12));
  const date = new Date(); date.setDate(date.getDate() + weeks * 7);
  const end12 = new Date(); end12.setDate(end12.getDate() + 84);
  const label = (d: Date) => d.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
  return { w, g, rate: +rate.toFixed(1), weeks, at12, goalDate: label(date), end12: label(end12), build };
}

/** Calories, protein, fat and carbs from the quiz (Boon's playbook rules). */
export function targets(q: Quiz) {
  const w = num(q.weight), g = num(q.goal_weight) || w;
  const male = q.sex !== 'Female';
  const build = q.goal === GOALS[2];
  const mult = build ? (male ? 14 : 13) : (male ? 11 : 10);
  const kcal = Math.max(male ? 1500 : 1200, round(w * mult, 50));
  const protein = round((build ? w : g) * 0.8, 5);
  const fat = round(g * 0.35, 5);
  const carbs = Math.max(50, round((kcal - protein * 4 - fat * 9) / 4, 5));
  return { kcal, protein, fat, carbs };
}

type Ex = [string, string, string?];
const gym4: Record<string, Ex[]> = {
  Push: [['barbell_bench', '3 × 6–10', 'Or dumbbell bench press'], ['incline_db_press', '3 × 8–12'], ['machine_shoulder_press', '3 × 8–12'], ['cable_lateral_raise', '3 × 12–15'], ['rope_pushdown', '3 × 10–15']],
  Pull: [['pull_up', '3 × 6–10', "Use the assisted machine if you can't get 6"], ['seated_cable_row', '3 × 8–12'], ['chest_supported_row', '3 × 8–12'], ['face_pull', '2 × 12–15'], ['incline_curl', '2 × 10–15'], ['cable_curl', '2 × 10–15']],
  Legs: [['hack_squat', '3 × 8–12', 'Or leg press'], ['rdl', '3 × 8–10'], ['walking_lunge', '2 × 10 each leg'], ['seated_leg_curl', '3 × 10–15'], ['leg_extension', '2 × 12–15'], ['standing_calf_raise', '3 × 12–15']],
  Upper: [['db_bench', '3 × 8–12'], ['lat_pulldown', '3 × 8–12'], ['db_shoulder_press', '2 × 8–12'], ['chest_supported_db_row', '2 × 10–12'], ['cable_lateral_raise', '2 × 12–15'], ['hanging_knee_raise', '3 × 10–15'], ['cable_crunch', '3 × 10–15']],
};
const home4: Record<string, Ex[]> = {
  Push: [['db_bench', '3 × 8–15', 'Or push-ups on the floor'], ['incline_db_press', '3 × 8–12'], ['db_shoulder_press', '3 × 8–12'], ['db_lateral_raise', '3 × 12–20'], ['oh_db_ext', '2 × 10–15']],
  Pull: [['pull_up', '3 × max (stop 1–2 short)', 'Or band pulldown'], ['one_arm_db_row', '3 × 8–12 each'], ['chest_supported_db_row', '3 × 10–12'], ['rear_delt_fly', '2 × 12–20'], ['db_curl', '2 × 10–15'], ['hammer_curl', '2 × 10–15']],
  Legs: [['goblet_squat', '3 × 10–15'], ['db_rdl', '3 × 8–12'], ['bulgarian_split_squat', '2 × 8–12 each leg'], ['db_hip_thrust', '3 × 10–15'], ['sl_calf_raise', '2 × 12–20 each'], ['dead_bug', '3 × 8 each side']],
  Upper: [['push_up', '3 × 8–15'], ['chin_up', '3 × max (stop 1–2 short)', 'Or band row'], ['arnold_press', '2 × 8–12'], ['one_arm_db_row', '2 × 10–12 each'], ['db_lateral_raise', '2 × 12–20'], ['lying_leg_raise', '3 × 10–15'], ['plank', '3 × 30–60 sec']],
};

export function buildTraining(q: Quiz) {
  const lib = q.where_train.startsWith('Home') ? home4 : gym4;
  const four = q.days !== '3 days';
  const order: [string, string][] = four
    ? [['Monday', 'Push'], ['Tuesday', 'Pull'], ['Thursday', 'Legs'], ['Friday', 'Upper']]
    : [['Monday', 'Push'], ['Wednesday', 'Pull'], ['Friday', 'Legs']];
  const newbie = q.experience === 'Never lifted' || q.experience === 'Under 1 year';
  const d: TrainDay[] = order.map(([day, type]) => ({
    t: `${day} · ${type}`,
    // New lifters: 2 sets a move for the first block, so they learn the move and recover.
    x: lib[type].map(([id, tgt, note]) => {
      const t = newbie ? tgt.replace(/^3 ×/, '2 ×') : tgt;
      return (note ? [id, t, note] : [id, t]) as [string, string, string?];
    }),
  }));
  return { d, e: newbie ? 0 : 1, four };
}

const meal = (o: { name: string; detail: string; kcal: string; protein: string }) => o;
const MEALS = SAMPLE.meals as Plan['meals'];

/** kcalOverride: the re-set's capped calories (weeks 4 and 8). */
export function buildFreePlan(q: Quiz, kcalOverride?: number): Plan {
  const t0 = targets(q);
  const t = kcalOverride ? { ...t0, kcal: kcalOverride, carbs: Math.max(50, round((kcalOverride - t0.protein * 4 - t0.fat * 9) / 4, 5)) } : t0;
  const picked = (q.likes || []).length > 0;
  const p = projection(q);
  const tr = buildTraining(q);
  const name = q.first_name.trim().split(' ')[0] || 'You';
  const sessions = tr.four ? 4 : 3;
  const share = [0.22, 0.3, 0.13, 0.35];
  const proteinShare = [0.23, 0.32, 0.17, 0.28];
  const goalShort = p.build
    ? `STRONGER AND LEANER BY ${p.end12.toUpperCase()}`
    : p.weeks <= 12 ? `${p.g} LBS BY ${p.goalDate.toUpperCase()}` : `${p.at12} LBS BY ${p.end12.toUpperCase()}`;
  const goalLong = p.build
    ? `<b>Add muscle</b> without adding fat: your lifts go up every week while your waist stays the same.`
    : p.weeks <= 12 ? `<b>${p.g} lbs</b> (from ${p.w}), losing about ${p.rate} lbs a week.`
      : `<b>${p.at12} lbs</b> in 12 weeks (from ${p.w}), on the way to ${p.g}.`;

  return {
    name,
    goal_short: goalShort,
    goal_long: goalLong,
    kcal: fmt(t.kcal),
    protein: String(t.protein),
    fat: String(t.fat),
    carbs: String(t.carbs),
    steps: '8,000',
    days: tr.d.map((x) => x.t.split(' ')[0].slice(0, 3)).join(', '),
    stack: [
      { product: 'Creatine monohydrate (Nutricost, unflavored)', why: 'The most proven supplement there is. Plain monohydrate is all you need.', dose: '5 g (1 scoop)', when: 'Any time, every day', cost: 'about $12', buy: 'https://www.vitacost.com/products/nutricost-performance-creatine-monohydrate-unflavored-1-lb-454-g-145338' },
      { product: 'Whey protein (Optimum Nutrition Gold Standard)', why: `Only if food alone won't get you to ${t.protein} g of protein. One scoop closes the gap.`, dose: '1 scoop', when: 'When you are short on protein', cost: 'about $58', buy: 'https://www.vitacost.com/products/optimum-nutrition-gold-standard-100-whey-protein-french-vanilla-creme-5-lb-2-26-kg-27511' },
      { product: 'Black coffee', why: 'Caffeine is the part of most pre-workouts that actually works. Coffee does it for pennies.', dose: '1 cup', when: '30 min before training', cost: '$0 extra', buy_text: 'Your kitchen' },
    ],
    meals: picked ? buildMenu(t.kcal, t.protein, q.likes, q.spots) : (MEALS || []).map((m, k) => ({
      ...m,
      target: `about ${fmt(round(t.kcal * share[k], 50))} calories · ${round(t.protein * proteinShare[k], 5)} g protein`,
      options: m.options.map(meal),
    })),
    ...(picked ? { food: 'picked' } : {}),
    meal_note: `Pick one option per meal. Any 4 picks land close to ${fmt(t.kcal)} calories and ${t.protein} g of protein.`,
    rules: [
      'Protein first at every meal.',
      q.struggle === 'Weekends' ? 'Weekends: pick one, a big meal or the drinks, not both.' : 'Eat at roughly the same times every day. Skipped meals turn into 9pm snacking.',
      'Weigh in every morning. Only the weekly average matters.',
      `Hit ${t.protein} g of protein before you worry about anything else.`,
      'Never "start over Monday." The next meal is normal.',
    ],
    week1: [
      `Train ${tr.d.map((x) => x.t.split(' ')[0]).join(', ')}`,
      `Eat about ${fmt(t.kcal)} calories and ${t.protein} g of protein a day (pick from your meals)`,
      'Walk 8,000 steps a day',
      ...(q.tried.some((x) => ['Fat burners', 'Test boosters', 'Greens powder'].includes(x)) ? ['Stop reordering fat burners, test boosters and greens powders. Finish or toss what you have.'] : []),
      'Weigh in every morning',
      'Sunday: do your check-in in the app',
    ],
    eat_out: picked ? buildEatOut(q.spots) : SAMPLE.eat_out,
    grocery: picked ? buildGrocery(q.likes) : SAMPLE.grocery.map((g) => ({ ...g, items: g.items.replace(' (no mushrooms)', '') })),
    phase1: `Hit all ${sessions} sessions and your protein every day. Steps up to 8,000. Learn the moves.`,
    phase2: 'Add weight or reps every week. Week 4: your calories get re-set to your new weight.',
    phase3: 'Keep the weights heavy while you get leaner. Week 12: final photos and results.',
    train: { n: name, s: thisSunday(), e: tr.e, d: tr.d },
  } as Plan;
}
