import { supabase } from './supabase';
import { isoDate } from './logs';

/** 1:1 coaching data for the client's side: Boon's weekly reviews and their check-ins, as one thread. */
export type Review = { id: string; week: number | null; body: string; focus?: string | null; created_at: string };
export type ClientCheckin = { id: string; week: number; checkin_date: string; weight: number | null; workouts: number | null; win: string | null; hardest?: string | null; questions?: string | null; adherence?: number | null; stronger?: string | null };
export type ThreadItem = { kind: 'checkin'; at: string; c: ClientCheckin } | { kind: 'review'; at: string; r: Review };

const DEMO = process.env.EXPO_PUBLIC_DEMO === '1';
const SEED = DEMO && process.env.EXPO_PUBLIC_DEMO_FRESH !== '1'; // design previews: FRESH shows a brand-new account
const withTimeout = <T,>(p: PromiseLike<T>, ms: number, fallback: T) => Promise.race([Promise.resolve(p).catch(() => fallback), new Promise<T>((r) => setTimeout(() => r(fallback), ms))]);

/** "Your one thing this week": Boon's focus line, or the first sentence of his review. */
export function focusOf(r?: Review | null) {
  if (!r) return '';
  if (r.focus) return r.focus;
  const m = r.body.match(/(?:one thing|focus)[^:]*:\s*([^\n]+)/i);
  if (m) return m[1].trim();
  return (r.body.split(/(?<=[.!?])\s/)[0] || '').trim();
}

export async function loadCoaching(userId: string): Promise<{ reviews: Review[]; checkins: ClientCheckin[] }> {
  if (DEMO) return SEED ? demo() : { reviews: [], checkins: [] };
  const [r, c] = await Promise.all([
    withTimeout(supabase.from('coach_reviews').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(30), 5000, { data: [] } as any),
    withTimeout(supabase.from('checkins').select('id,week,checkin_date,weight,workouts,win,hardest,questions,adherence,stronger').eq('user_id', userId).order('checkin_date', { ascending: false }).limit(30), 5000, { data: [] } as any),
  ]);
  return { reviews: ((r as any).data as Review[]) || [], checkins: ((c as any).data as ClientCheckin[]) || [] };
}

export function thread(reviews: Review[], checkins: ClientCheckin[]): ThreadItem[] {
  const items: ThreadItem[] = [
    ...checkins.map((c) => ({ kind: 'checkin' as const, at: c.checkin_date + 'T09:00:00', c })),
    ...reviews.map((r) => ({ kind: 'review' as const, at: r.created_at, r })),
  ];
  return items.sort((a, b) => b.at.localeCompare(a.at));
}

/** Where this week's check-in stands: due, sent (Boon reviewing), or reviewed. */
export function checkinState(reviews: Review[], checkins: ClientCheckin[], now = new Date()) {
  const sunday = new Date(now); sunday.setDate(now.getDate() - now.getDay());
  const sinceSun = isoDate(sunday);
  const latest = checkins[0];
  const thisWeek = latest && latest.checkin_date >= sinceSun ? latest : null;
  if (!thisWeek) return { state: 'due' as const, latest };
  const reviewed = reviews.some((r) => r.week === thisWeek.week || r.created_at.slice(0, 10) >= thisWeek.checkin_date);
  return { state: reviewed ? ('reviewed' as const) : ('sent' as const), latest: thisWeek };
}

/** Design previews only (never in real builds). */
function demo() {
  const d = (ago: number) => { const x = new Date(); x.setDate(x.getDate() - ago); return isoDate(x); };
  const reviews: Review[] = [
    { id: 'r2', week: 5, created_at: d(5) + 'T18:20:00', focus: 'Protein at breakfast, every day. 40 g before 10am.',
      body: "This was your best week yet. 4 for 4 on workouts and your trend is down 1.3 lbs. That's exactly the pace we want.\n\nThe one thing I see: your protein is low until dinner, then you're scrambling. That's why the late-night snacking shows up on weekends.\n\nOne thing this week: protein at breakfast, every day. 40 g before 10am. The Greek yogurt bowl or the egg wrap from your plan. That's it. Keep everything else the same." },
    { id: 'r1', week: 4, created_at: d(12) + 'T17:05:00', focus: 'Hit 8,000 steps on your rest days too.',
      body: "Re-set week done. I moved you to 2,300 calories, same protein. Your lifts are all up from week 1, so we're losing fat, not muscle.\n\nOne thing: hit 8,000 steps on your rest days too. Walk after dinner." },
  ];
  const checkins: ClientCheckin[] = [
    { id: 'c2', week: 5, checkin_date: d(6), weight: 204.6, workouts: 4, win: 'Hit protein 6 of 7 days', hardest: 'Saturday night', questions: null, adherence: 4 },
    { id: 'c1', week: 4, checkin_date: d(13), weight: 205.9, workouts: 3, win: 'Ordered the Chipotle bowl from my plan twice', hardest: 'Late shift Thursday', questions: null, adherence: 4 },
  ];
  return { reviews, checkins };
}
