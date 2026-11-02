import { useEffect, useState } from 'react';
import { supabase, SUPABASE_URL, SUPABASE_KEY } from './supabase';

/** Ask Boon: the AI chat. Talks to the ask-boon server function. */
export type ChatMsg = { id: string; role: 'user' | 'assistant'; content: string };

const FN = `${SUPABASE_URL}/functions/v1/ask-boon`;

let live: boolean | null = null;
let checking: Promise<boolean> | null = null;

/** Is the chat switched on? (False until Boon adds the AI key on the server.) */
export function checkLive(): Promise<boolean> {
  if (live !== null) return Promise.resolve(live);
  checking ||= fetch(FN, { method: 'POST', headers: { 'Content-Type': 'application/json', apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` }, body: JSON.stringify({ ping: true }) })
    .then((r) => (r.ok ? r.json() : { live: false }))
    .then((j) => (live = !!j.live))
    .catch(() => false)
    .finally(() => { checking = null; });
  return checking;
}

export function useAskBoonLive() {
  const [on, setOn] = useState<boolean>(live ?? false);
  useEffect(() => { let alive = true; checkLive().then((v) => alive && setOn(v)); return () => { alive = false; }; }, []);
  return on;
}

export async function loadHistory(userId: string): Promise<ChatMsg[]> {
  const { data } = await supabase.from('chat_messages').select('id,role,content').eq('user_id', userId)
    .order('created_at', { ascending: false }).limit(40);
  return ((data as ChatMsg[]) || []).reverse();
}

export type AskResult =
  | { ok: true; answer: string; left: number | null; limit: number | null }
  | { ok: false; reason: 'limit' | 'not_live' | 'signed_out' | 'busy' | 'offline'; limit?: number };

export async function ask(question: string, preview?: { plan: unknown; tier: string }): Promise<AskResult> {
  const { data: { session } } = await supabase.auth.getSession();
  const demo = process.env.EXPO_PUBLIC_DEMO === '1'; // design previews only, never set in real builds
  if (!session && !demo) return { ok: false, reason: 'signed_out' };
  try {
    const r = await fetch(FN, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: SUPABASE_KEY, Authorization: `Bearer ${session ? session.access_token : SUPABASE_KEY}` },
      body: JSON.stringify({ question, ...(preview ? { previewPlan: preview.plan, previewTier: preview.tier } : {}) }),
    });
    const j = await r.json().catch(() => ({}));
    if (r.ok && j.answer) return { ok: true, answer: j.answer, left: j.left ?? null, limit: j.limit ?? null };
    if (r.status === 429) return { ok: false, reason: 'limit', limit: j.limit };
    if (j.error === 'not_live') return { ok: false, reason: 'not_live' };
    if (r.status === 401) return { ok: false, reason: 'signed_out' };
    return { ok: false, reason: 'busy' };
  } catch {
    return { ok: false, reason: 'offline' };
  }
}

/** Questions left today (null = no limit). */
export async function questionsLeft(userId: string, tier: string, isCoach: boolean): Promise<number | null> {
  if (isCoach) return null;
  const limit = ({ free: 5, self: 40, coached: 60 } as Record<string, number>)[tier] ?? 5;
  const { data } = await supabase.from('ai_usage').select('questions').eq('user_id', userId)
    .eq('day', new Date().toISOString().slice(0, 10)).maybeSingle();
  return Math.max(0, limit - (data?.questions || 0));
}

export const STARTERS = [
  'Can I drink on this plan?',
  'What do I order at Chipotle?',
  'Is AG1 worth it?',
  'I missed a workout. Now what?',
  "The scale went up. Why?",
  'What should I eat before the gym?',
];
