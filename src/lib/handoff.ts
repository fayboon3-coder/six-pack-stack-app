import { Platform } from 'react-native';
import { GOALS, type Quiz } from './quiz';

/**
 * Stack Score → app handoff (web only). The Stack Score page and the web app share
 * one website, so the score page saves its answers in the browser (key sps_stackscore)
 * and the app picks them up here: the email is filled in and matching quiz answers are
 * pre-selected. Nothing personal ever goes in a link.
 */
type Saved = { email?: string; goal?: string; spend?: string; train?: string; stack?: string[]; at?: number };

export function readHandoff(): Saved | null {
  if (Platform.OS !== 'web') return null;
  try {
    const s = JSON.parse(window.localStorage.getItem('sps_stackscore') || 'null') as Saved | null;
    if (!s || !s.at || Date.now() - s.at > 30 * 864e5) return null; // older than 30 days: ignore
    return s;
  } catch { return null; }
}

const GOAL: Record<string, string> = { 'Lose fat and see my abs': GOALS[1], 'Build muscle': GOALS[2], Both: GOALS[1] };
const SPEND: Record<string, string> = { 'Under $50': 'Under $50', '$50–100': '$50–$100', '$100–200': '$100–$200', '$200+': '$200+' };
const DAYS: Record<string, string> = { '4+': '4 days', '2–3': '3 days' };
const TRIED: [string, string[]][] = [
  ['Fat burners', ['fatburner', 'carnitine', 'cla', 'garcinia', 'gte', 'appetite', 'acv', 'detox']],
  ['Pre-workout', ['pre', 'citrulline', 'caffeine', 'nootropic']],
  ['Test boosters', ['testbooster', 'tongkat', 'turk', 'fadogia', 'shilajit']],
  ['Greens powder', ['greens']],
  ['Protein powder', ['whey', 'plant', 'casein', 'gainer']],
  ['Creatine', ['creatine']],
];

/** Quiz answers we can fill in from the Stack Score. */
export function quizFromHandoff(h: Saved | null): Partial<Quiz> {
  if (!h) return {};
  const out: Partial<Quiz> = {};
  if (h.goal && GOAL[h.goal]) out.goal = GOAL[h.goal];
  if (h.spend && SPEND[h.spend]) out.monthly_spend = SPEND[h.spend];
  if (h.train && DAYS[h.train]) out.days = DAYS[h.train];
  if (Array.isArray(h.stack)) {
    const tried = TRIED.filter(([, ids]) => ids.some((id) => h.stack!.includes(id))).map(([label]) => label);
    out.tried = tried.length ? tried : h.stack.length === 0 ? ['None of these'] : [];
  }
  if (h.email) out.email = h.email;
  return out;
}
