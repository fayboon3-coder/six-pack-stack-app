// The Full Stack subscription: keeps each account's tier in step with RevenueCat.
//
// Two callers:
//   1. The app, right after a purchase or restore (signed-in user's token): { sync: true }
//   2. RevenueCat's webhook (Authorization header = REVENUECAT_WEBHOOK_AUTH): renewals,
//      cancellations, expiries, billing problems.
// Either way the function asks RevenueCat for the person's current state and sets
// profiles.tier to 'self' (active) or back to 'free' (expired). Coaching clients and the
// coach are never touched. Webhook events also tag the person in Kit, which starts the
// matching email sequence (trial, trial ended, subscriber, win-back).
//
// Secrets (Supabase → Edge Functions → Secrets), set by Boon:
//   REVENUECAT_SECRET_KEY     RevenueCat → Project settings → API keys → secret key (v1)
//   REVENUECAT_WEBHOOK_AUTH   any long random string; paste the same value into
//                             RevenueCat → Integrations → Webhooks → Authorization header
//   KIT_API_KEY               optional; defaults to the public key the app already uses
// SUPABASE_URL, SUPABASE_ANON_KEY and SUPABASE_SERVICE_ROLE_KEY are provided by Supabase.
// "Verify JWT" must be OFF for this function (RevenueCat doesn't send a Supabase token);
// the function checks the caller itself.

import { createClient } from 'npm:@supabase/supabase-js@2.45.4';

const ENTITLEMENT = 'full_stack';
const KIT_TAGS: Record<string, string> = {
  'trial-started': '25304554',
  'trial-2w': '25561474',   // monthly plan: 2-week trial, so its trial emails go out on its own timing
  'trial-lapsed': '25304555',
  'sub-active': '25304556',
  'sub-cancelled': '25304557',
};
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });

type RcState = { active: boolean; trial: boolean; expires: string | null };

async function rcState(appUserId: string): Promise<RcState | null> {
  const key = Deno.env.get('REVENUECAT_SECRET_KEY');
  if (!key) return null;
  const r = await fetch(`https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(appUserId)}`, {
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
  });
  if (!r.ok) return null;
  const j = await r.json();
  const ent = j?.subscriber?.entitlements?.[ENTITLEMENT];
  if (!ent) return { active: false, trial: false, expires: null };
  const exp = ent.expires_date ? new Date(ent.expires_date) : null;
  const grace = ent.grace_period_expires_date ? new Date(ent.grace_period_expires_date) : null;
  const now = new Date();
  const active = !exp || exp > now || (!!grace && grace > now);
  const sub = j?.subscriber?.subscriptions?.[ent.product_identifier];
  return { active, trial: sub?.period_type === 'trial', expires: ent.expires_date ?? null };
}

/** Sets tier for free/self accounts only. Returns the tier it ended on. */
async function applyTier(admin: any, userId: string, active: boolean) {
  const { data: p } = await admin.from('profiles').select('id, tier, role, email, first_name').eq('id', userId).maybeSingle();
  if (!p) return { profile: null, tier: null };
  if (p.role !== 'client' || p.tier === 'coached') return { profile: p, tier: p.tier };
  const next = active ? 'self' : 'free';
  if (p.tier !== next) await admin.from('profiles').update({ tier: next }).eq('id', userId);
  return { profile: p, tier: next };
}

async function kitTag(email: string, firstName: string, tag: string) {
  const id = KIT_TAGS[tag];
  if (!id || !email) return;
  const api_key = Deno.env.get('KIT_API_KEY') || 'rWMhWOuYNu8lJKKWoWIfsg';
  await fetch(`https://api.convertkit.com/v3/tags/${id}/subscribe`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ api_key, email, first_name: firstName || '' }),
  }).catch(() => {});
}

/** Which Kit sequence an event should start. */
function tagFor(type: string, periodType: string): string | null {
  const trial = periodType === 'TRIAL';
  switch (type) {
    case 'INITIAL_PURCHASE': return trial ? 'trial-started' : 'sub-active';
    case 'RENEWAL':                       // includes a trial converting to paid
    case 'UNCANCELLATION':
    case 'PRODUCT_CHANGE': return 'sub-active';
    case 'CANCELLATION': return trial ? null : 'sub-cancelled'; // a cancelled trial is tagged when it expires
    case 'EXPIRATION': return trial ? 'trial-lapsed' : 'sub-cancelled';
    default: return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return json({ error: 'method' }, 405);

  const url = Deno.env.get('SUPABASE_URL')!;
  const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const auth = req.headers.get('Authorization') || '';
  const body = await req.json().catch(() => ({}));

  // 1. RevenueCat webhook
  const hook = Deno.env.get('REVENUECAT_WEBHOOK_AUTH');
  if (body?.event && hook && (auth === hook || auth === `Bearer ${hook}`)) {
    const ev = body.event;
    if (ev.type === 'TEST') return json({ ok: true, test: true });
    const ids: string[] = [ev.app_user_id, ev.original_app_user_id, ...(ev.aliases || [])].filter(Boolean);
    const userId = ids.find((x) => /^[0-9a-f-]{36}$/i.test(x));
    if (!userId) return json({ ok: true, skipped: 'anonymous user' });
    const state = await rcState(userId);
    const active = state ? state.active : ['INITIAL_PURCHASE', 'RENEWAL', 'UNCANCELLATION', 'PRODUCT_CHANGE'].includes(ev.type);
    const { profile, tier } = await applyTier(admin, userId, active);
    const tag = tagFor(ev.type, ev.period_type);
    if (profile && tag && profile.role === 'client' && profile.tier !== 'coached') {
      // Tag the 2-week trial first, so the trial emails already know which timing to use.
      if (tag === 'trial-started' && /monthly/i.test(String(ev.product_id || ''))) await kitTag(profile.email, profile.first_name, 'trial-2w');
      await kitTag(profile.email, profile.first_name, tag);
    }
    return json({ ok: true, tier, tag });
  }
  if (body?.event) return json({ error: 'unauthorized' }, 401);

  // 2. The app, after a purchase or restore
  if (!auth.startsWith('Bearer ')) return json({ error: 'signed_out' }, 401);
  const userClient = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: auth } } });
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return json({ error: 'signed_out' }, 401);
  const state = await rcState(user.id);
  if (!state) return json({ error: 'not_live' }, 503);
  const { tier } = await applyTier(admin, user.id, state.active);
  return json({ active: state.active, trial: state.trial, expires: state.expires, tier });
});
