import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';
import { isoDate } from './logs';
import { isPreviewing } from './preview';
import { trendSeries, type WeighIn } from './trend';
import { health } from './health';

/** Daily weigh-ins: saved on the phone first, backed up to daily_stats.weight, merged with check-ins and Apple Health. */
const KEY = 'sps:weights';
const DEMO = process.env.EXPO_PUBLIC_DEMO === '1';
const SEED = DEMO && process.env.EXPO_PUBLIC_DEMO_FRESH !== '1'; // design previews: FRESH shows a brand-new account

/** Sample weigh-ins for design previews only (never in real builds). */
function demoWeights(): Record<string, number> {
  const out: Record<string, number> = {};
  const n = 34;
  for (let k = n; k >= 0; k--) {
    if (k % 6 === 3) continue; // a missed morning now and then
    const d = new Date(); d.setDate(d.getDate() - k);
    const noise = Math.sin(k * 1.7) * 0.9 + (k % 7 === 1 ? 1.2 : 0);
    out[isoDate(d)] = Math.round((212 - (n - k) * 0.19 + noise) * 10) / 10;
  }
  return out;
}

export async function readWeights(): Promise<Record<string, number>> {
  try {
    const s = await AsyncStorage.getItem(KEY);
    const v = s ? JSON.parse(s) : {};
    if (SEED && !Object.keys(v).length) return demoWeights();
    return v;
  } catch { return SEED ? demoWeights() : {}; }
}
async function writeWeights(v: Record<string, number>) { try { await AsyncStorage.setItem(KEY, JSON.stringify(v)); } catch {} }

/** Save today's (or a given day's) weight. Also sent to the account and, if connected, Apple Health. */
export async function logWeight(w: number, d = isoDate(), opts: { toHealth?: boolean } = {}) {
  const v = await readWeights();
  v[d] = Math.round(w * 10) / 10;
  await writeWeights(v);
  if (opts.toHealth !== false) health.saveWeight(w).catch(() => {});
  if (isPreviewing() || DEMO) return;
  try {
    const { data } = await supabase.auth.getSession();
    const uid = data.session?.user.id; if (!uid) return;
    // Only the weight column changes on an existing day (steps and protein stay as they are).
    await supabase.from('daily_stats').upsert({ user_id: uid, day: d, weight: v[d], updated_at: new Date().toISOString() });
  } catch {}
}

export async function removeWeight(d: string) {
  const v = await readWeights(); delete v[d]; await writeWeights(v);
  if (isPreviewing() || DEMO) return;
  try {
    const { data } = await supabase.auth.getSession(); const uid = data.session?.user.id; if (!uid) return;
    await supabase.from('daily_stats').update({ weight: null }).eq('user_id', uid).eq('day', d);
  } catch {}
}

const withTimeout = <T,>(p: PromiseLike<T>, ms: number, fallback: T) =>
  Promise.race([Promise.resolve(p).catch(() => fallback), new Promise<T>((r) => setTimeout(() => r(fallback), ms))]);

/**
 * Everything we know about their weight, oldest first: phone weigh-ins, account backup
 * (other phones), Sunday check-ins and Apple Health. Same day: the phone's own entry wins.
 */
export async function allWeighIns(userId?: string): Promise<WeighIn[]> {
  const local = await readWeights();
  const merged: Record<string, number> = {};
  if (userId && !DEMO) {
    const since = new Date(); since.setDate(since.getDate() - 200);
    const [srv, chk] = await Promise.all([
      withTimeout(supabase.from('daily_stats').select('day,weight').eq('user_id', userId).gte('day', isoDate(since)).not('weight', 'is', null), 5000, { data: null } as any),
      withTimeout(supabase.from('checkins').select('checkin_date,weight').eq('user_id', userId).not('weight', 'is', null), 5000, { data: null } as any),
    ]);
    for (const r of (chk as any)?.data || []) merged[r.checkin_date] = Number(r.weight);
    for (const r of (srv as any)?.data || []) merged[r.day] = Number(r.weight);
  }
  const fromHealth = await health.weights(120).catch(() => [] as WeighIn[]);
  for (const p of fromHealth) if (merged[p.date] == null) merged[p.date] = p.w;
  Object.assign(merged, local);
  // Keep the phone copy complete so the chart works offline next time.
  const missing = Object.keys(merged).filter((d) => local[d] == null);
  if (missing.length && !DEMO) { for (const d of missing) local[d] = merged[d]; await writeWeights(local); }
  return Object.entries(merged).map(([date, w]) => ({ date, w })).sort((a, b) => a.date.localeCompare(b.date));
}

export async function trendNow(userId?: string) {
  const s = trendSeries(await allWeighIns(userId));
  return { series: s, last: s.length ? s[s.length - 1] : null };
}
