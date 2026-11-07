import { Platform } from 'react-native';
import { GOALS, type Quiz } from './quiz';

/**
 * Stack Score → app handoff (web only). The Stack Score page and the web app share
 * one website, so the score page saves its answers in the browser (key sps_stackscore)
 * and the app picks them up here: the email is filled in and matching quiz answers are
 * pre-selected. Nothing personal ever goes in a link.
 */
type Saved = {
  name?: string; email?: string; goal?: string; goalKey?: string; spend?: string; train?: string;
  style?: string; prog?: string; out?: string; weekend?: string; stack?: string[]; score?: number; at?: number;
};

export function readHandoff(): Saved | null {
  if (Platform.OS !== 'web') return null;
  try {
    const s = JSON.parse(window.localStorage.getItem('sps_stackscore') || 'null') as Saved | null;
    if (!s || !s.at || Date.now() - s.at > 30 * 864e5) return null; // older than 30 days: ignore
    return s;
  } catch { return null; }
}

// The app's "Both at once" option is GOALS[0].
const GOAL: Record<string, string> = { 'Lose fat and see my abs': GOALS[1], 'Build muscle': GOALS[2], Both: GOALS[0] };
const GOAL_KEY: Record<string, string> = { fat: GOALS[1], cut: GOALS[1], muscle: GOALS[2], recomp: GOALS[0] };
const SPEND: Record<string, string> = { 'Under $50': 'Under $50', '$50–100': '$50–$100', '$100–200': '$100–$200', '$200+': '$200+' };
const DAYS: Record<string, string> = { '4+': '4 days', '2–3': '3 days', '0–1': '3 days' };
// Product ids: the Stack Score uses the app's Stack Check ids (older visits used short ids, kept so they still map).
const TRIED: [string, string[]][] = [
  ['Fat burners', ['fat_burners', 'l_carnitine', 'cla', 'apple_cider_vinegar_gummies', 'skinny_and_detox_teas', 'fatburner', 'carnitine', 'garcinia', 'gte', 'appetite', 'acv', 'detox']],
  ['Pre-workout', ['pre_workout', 'citrulline', 'beta_alanine', 'caffeine_pills', 'pre', 'caffeine', 'nootropic']],
  ['Test boosters', ['testosterone_boosters', 'tongkat_ali', 'hormone_balancing_supplements', 'testbooster', 'tongkat', 'turk', 'fadogia', 'shilajit']],
  ['Greens powder', ['greens_powders', 'greens']],
  ['Protein powder', ['whey_protein', 'plant_protein', 'mass_gainers_and_meal_replacements', 'whey', 'plant', 'casein', 'gainer']],
  ['Creatine', ['creatine']],
];

/** Quiz answers we can fill in from the Stack Score. */
export function quizFromHandoff(h: Saved | null): Partial<Quiz> {
  if (!h) return {};
  const out: Partial<Quiz> = {};
  if (h.goalKey && GOAL_KEY[h.goalKey]) out.goal = GOAL_KEY[h.goalKey];
  else if (h.goal && GOAL[h.goal]) out.goal = GOAL[h.goal];
  // How long they've lifted, read from how they train now (still shown so they can change it).
  if (h.style === "I don't train yet" || h.style === 'Mostly cardio or classes') out.experience = 'Never lifted';
  else if (h.style === 'Weights, I wing it') out.experience = 'Under 1 year';
  else if (h.style === 'Weights, a set plan') out.experience = h.prog === 'Yes, I track it' ? '1–3 years' : 'Under 1 year';
  if (h.out) out.eat_out = h.out === 'Rarely' ? 'Rarely' : h.out === 'Most meals' ? '4+ times a week' : '1–3 times a week';
  if (h.weekend === 'I undo the whole week' || h.weekend === 'A bit loose') out.struggle = 'Weekends';
  if (h.spend && SPEND[h.spend]) out.monthly_spend = SPEND[h.spend];
  if (h.train && DAYS[h.train]) out.days = DAYS[h.train];
  if (Array.isArray(h.stack)) {
    const tried = TRIED.filter(([, ids]) => ids.some((id) => h.stack!.includes(id))).map(([label]) => label);
    out.tried = tried.length ? tried : h.stack.length === 0 ? ['None of these'] : [];
  }
  if (h.email) out.email = h.email;
  if (h.name) out.first_name = h.name;
  return out;
}

/** True when the Stack Score already told us their goal, so the quiz can skip that question. */
export const hasGoal = (h: Saved | null) => !!(h && ((h.goalKey && GOAL_KEY[h.goalKey]) || (h.goal && GOAL[h.goal])));
