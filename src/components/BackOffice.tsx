import React, { useCallback, useMemo, useState } from 'react';
import { Linking, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View, useWindowDimensions } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path, Rect } from 'react-native-svg';
import { supabase } from '../lib/supabase';
import { E, F } from '../lib/theme';
import { useAuth } from '../lib/auth';
import { VIEW_AS_LABEL, type ViewAs } from '../lib/preview';
import LoadingScreen from './LoadingScreen';

/**
 * Boon's back office: every account, coaching client, check-in, trial, purchase and funnel
 * number in one place. Reads coach-only database functions (010_back_office.sql); anything
 * not set up yet falls back to what's there and says what to run.
 */

type Num = Record<string, any>;
type Person = {
  id: string; email: string | null; first_name: string | null; tier: 'free' | 'self' | 'coached'; created_at: string; start_date: string | null;
  sub_status: string | null; sub_plan: string | null; sub_expires: string | null; last_seen: string | null;
  workouts_30d: number; checkins: number; last_checkin: string | null; last_weight: number | null; needs_review: boolean; goal: string;
};
type Step = { src: string; step: string; people: number };
type PW = { metric: string; detail: string; people: number };
type SubEv = { created_at: string; type: string; period_type: string | null; product_id: string | null; price: number | null; is_trial_conversion: boolean; user_id: string | null };
type Invite = { email: string; first_name: string | null; created_at: string };

const DEMO = process.env.EXPO_PUBLIC_DEMO === '1';
const PRICE = { monthly: 19.99, yearly: 99 };
const fmt = (n: number) => Math.round(n || 0).toLocaleString('en-US');
const usd = (n: number) => `$${(n || 0).toLocaleString('en-US', { maximumFractionDigits: n >= 1000 ? 0 : 2, minimumFractionDigits: n >= 1000 || Number.isInteger(n) ? 0 : 2 })}`;
const pct = (a: number, b: number) => (!b ? '—' : `${(a / b) * 100 < 1 && a > 0 ? ((a / b) * 100).toFixed(1) : Math.round((a / b) * 100)}%`);
const ago = (iso?: string | null) => {
  if (!iso) return 'Never';
  const m = (Date.now() - new Date(iso).getTime()) / 6e4;
  if (m < 60) return `${Math.max(1, Math.round(m))}m ago`;
  if (m < 1440) return `${Math.round(m / 60)}h ago`;
  const d = Math.round(m / 1440);
  return d < 30 ? `${d}d ago` : new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};
const agoDay = (d?: string | null) => {
  if (!d) return 'never';
  const n = Math.round((new Date(new Date().toDateString()).getTime() - new Date(d + 'T00:00:00').getTime()) / 864e5);
  return n <= 0 ? 'today' : n === 1 ? 'yesterday' : n < 30 ? `${n}d ago` : new Date(d + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};
const hello = () => { const h = new Date().getHours(); return h < 12 ? 'Morning' : h < 18 ? 'Afternoon' : 'Evening'; };

const STATUS: Record<string, { label: string; bg: string; fg: string }> = {
  coached: { label: 'Coaching', bg: E.ink, fg: '#fff' },
  trial: { label: 'Trial', bg: '#fff4e0', fg: '#9a6400' },
  active: { label: 'Full Stack', bg: E.greenTint, fg: E.green },
  cancelled: { label: 'Cancelled', bg: '#fdeceb', fg: E.red },
  billing_issue: { label: 'Billing issue', bg: '#fdeceb', fg: E.red },
  expired: { label: 'Expired', bg: E.soft, fg: E.sub },
  free: { label: 'Free', bg: E.soft, fg: E.sub },
};
const statusOf = (p: Person) => (p.tier === 'coached' ? 'coached' : p.tier === 'self' ? (p.sub_status && p.sub_status !== 'expired' ? p.sub_status : 'active') : p.sub_status === 'expired' ? 'expired' : 'free');
const FILTERS = [['all', 'All'], ['coached', 'Coaching'], ['active', 'Full Stack'], ['trial', 'Trials'], ['cancelled', 'Cancelled'], ['free', 'Free']] as const;

const FUNNEL: [string, string][] = [
  ['ss_visit', 'Stack Score visits'], ['ss_start', 'Started the score'], ['ss_done', 'Leads (finished)'], ['ss_plan_tap', 'Tapped free plan'],
  ['quiz_done', 'Built a plan in the app'], ['paywall_view', 'Saw the Full Stack offer'], ['purchase_tap', 'Tapped start trial'], ['purchase_done', 'Started trial or paid'],
];
const COACH_FUNNEL: [string, string][] = [['coaching_view', 'Saw the coaching page'], ['apply_view', 'Opened the application'], ['apply_start', 'Started it'], ['apply_done', 'Applied']];

export default function BackOffice() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const wide = width >= 900;
  const { profile, setViewAs } = useAuth();
  const [days, setDays] = useState(30);
  const [n, setN] = useState<Num | null>(null);
  const [people, setPeople] = useState<Person[]>([]);
  const [steps, setSteps] = useState<Step[]>([]);
  const [pw, setPw] = useState<PW[]>([]);
  const [subs, setSubs] = useState<SubEv[]>([]);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [setup, setSetup] = useState<string[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [updated, setUpdated] = useState<Date | null>(null);
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState<(typeof FILTERS)[number][0]>('all');
  const [more, setMore] = useState(false);
  const [opening, setOpening] = useState<ViewAs | null>(null);

  const load = useCallback(async () => {
    if (DEMO) { const d = demo(days); setN(d.n); setPeople(d.people); setSteps(d.steps); setPw(d.pw); setSubs(d.subs); setInvites(d.invites); setUpdated(new Date()); return; }
    const missing: string[] = [];
    const [bo, pp, fb, pb, se, inv] = await Promise.all([
      supabase.rpc('back_office', { p_days: days }),
      supabase.rpc('back_office_people'),
      supabase.rpc('funnel_by_source', { p_days: days }),
      supabase.rpc('paywall_breakdown', { p_days: days }),
      supabase.from('subscription_events').select('created_at,type,period_type,product_id,price,is_trial_conversion,user_id').order('created_at', { ascending: false }).limit(25),
      supabase.from('plan_invites').select('email,first_name,created_at').is('claimed_at', null).order('created_at', { ascending: false }),
    ]);
    if (bo.error || pp.error) missing.push('010_back_office.sql');
    if (fb.error) missing.push('008_funnel_by_source.sql');
    let nums: Num | null = bo.data || null;
    let list: Person[] = (pp.data as Person[]) || [];
    if (pp.error) {
      // Before 010: profiles plus the coaching review queue.
      const [{ data: pr }, { data: cc }] = await Promise.all([
        supabase.from('profiles').select('id,email,first_name,tier,role,created_at,start_date').eq('role', 'client').order('created_at', { ascending: false }).limit(1000),
        supabase.from('coach_clients').select('id,last_checkin,last_weight,checkins,needs_review'),
      ]);
      const byId = Object.fromEntries(((cc as any[]) || []).map((c) => [c.id, c]));
      list = ((pr as any[]) || []).map((p) => ({ ...p, sub_status: null, sub_plan: null, sub_expires: null, last_seen: null, workouts_30d: 0, goal: '',
        checkins: byId[p.id]?.checkins || 0, last_checkin: byId[p.id]?.last_checkin || null, last_weight: byId[p.id]?.last_weight ?? null, needs_review: !!byId[p.id]?.needs_review }));
    }
    if (!nums) {
      const by: Record<string, number> = {}; list.forEach((p) => { by[p.tier] = (by[p.tier] || 0) + 1; });
      nums = { days, users_total: list.length, users_by_tier: by, coached: by.coached || 0, reviews_due: list.filter((p) => p.needs_review).length,
        new_users: list.filter((p) => Date.now() - new Date(p.created_at).getTime() < days * 864e5).length };
    }
    setN(nums); setPeople(list); setSteps((fb.data as Step[]) || []); setPw((pb.data as PW[]) || []);
    setSubs((se.data as SubEv[]) || []); setInvites((inv.data as Invite[]) || []); setSetup(missing); setUpdated(new Date());
  }, [days]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  /* ---------- derived ---------- */
  const tot = useMemo(() => {
    const t: Record<string, number> = {};
    steps.forEach((s) => { t[s.step] = (t[s.step] || 0) + Number(s.people); });
    return t;
  }, [steps]);
  const sources = useMemo(() => {
    const by: Record<string, Record<string, number>> = {};
    steps.forEach((s) => { const k = s.src || 'direct'; (by[k] ||= {})[s.step] = (by[k][s.step] || 0) + Number(s.people); });
    return Object.entries(by).map(([src, v]) => ({ src, ...v } as any)).sort((a, b) => (b.ss_visit || 0) - (a.ss_visit || 0) || (b.ss_done || 0) - (a.ss_done || 0)).slice(0, 8);
  }, [steps]);
  const shown = useMemo(() => {
    const s = q.trim().toLowerCase();
    return people.filter((p) => (filter === 'all' || statusOf(p) === filter) && (!s || `${p.first_name || ''} ${p.email || ''}`.toLowerCase().includes(s)));
  }, [people, q, filter]);
  const queue = people.filter((p) => p.tier === 'coached').sort((a, b) => Number(b.needs_review) - Number(a.needs_review) || String(b.last_checkin || '').localeCompare(String(a.last_checkin || '')));
  const counts = useMemo(() => { const c: Record<string, number> = { all: people.length }; people.forEach((p) => { const k = statusOf(p); c[k] = (c[k] || 0) + 1; }); return c; }, [people]);
  const plans = n?.sub_plans || {};
  const mrr = (plans.monthly || 0) * PRICE.monthly + ((plans.yearly || 0) * PRICE.yearly) / 12;
  const paying = (plans.monthly || 0) + (plans.yearly || 0) + (plans['?'] || 0);
  const billing = people.filter((p) => p.sub_status === 'billing_issue').length;
  const name = profile?.first_name || 'Boon';
  const now = new Date();
  const go = (path: any) => router.push(path);
  const open = (url: string) => Linking.openURL(url);

  const attention = [
    n?.reviews_due ? { t: `${n.reviews_due} check-in${n.reviews_due > 1 ? 's' : ''} to review`, s: 'Coaching clients waiting on your notes', on: () => queue[0] && go({ pathname: '/client/[id]', params: { id: queue[0].id } }), hot: true } : null,
    billing ? { t: `${billing} billing issue${billing > 1 ? 's' : ''}`, s: 'Card declined. Apple and RevenueCat retry on their own.', on: () => setFilter('cancelled') } : null,
    invites.length ? { t: `${invites.length} plan${invites.length > 1 ? 's' : ''} waiting for a sign-up`, s: 'Attaches the moment they create their account', on: undefined } : null,
  ].filter(Boolean) as { t: string; s: string; on?: () => void; hot?: boolean }[];

  const kpis: { k: string; v: string; s: string; d?: number | null }[] = [
    { k: 'App revenue', v: n?.revenue != null ? usd(Number(n.revenue)) : '—', s: n?.revenue != null ? `Last ${days} days · about ${usd(Math.round(mrr))}/mo recurring` : 'Turns on with 010', d: delta(n?.revenue, n?.revenue_prev) },
    { k: 'Full Stack', v: fmt(paying), s: `paying · ${fmt(n?.trials_live || 0)} in trial`, d: null },
    { k: 'Trials started', v: fmt(n?.trials_started ?? tot.purchase_done ?? 0), s: `${fmt(n?.conversions || 0)} converted to paid`, d: delta(n?.trials_started, n?.trials_started_prev) },
    { k: 'New accounts', v: fmt(n?.new_users || 0), s: `${fmt(n?.users_total || 0)} total in the app`, d: delta(n?.new_users, n?.new_users_prev) },
    { k: 'Stack Score leads', v: fmt(n?.ss_leads ?? tot.ss_done ?? 0), s: `${pct(n?.ss_leads ?? tot.ss_done ?? 0, n?.ss_visits ?? tot.ss_visit ?? 0)} of ${fmt(n?.ss_visits ?? tot.ss_visit ?? 0)} visits`, d: delta(n?.ss_leads, n?.ss_leads_prev) },
    { k: 'Applications', v: fmt(n?.applications ?? tot.apply_done ?? 0), s: 'finished the coaching application', d: delta(n?.applications, n?.applications_prev) },
    { k: 'Coaching clients', v: fmt(n?.coached || 0), s: n?.reviews_due ? `${n.reviews_due} waiting on you` : 'all reviewed', d: null },
    { k: 'Active this week', v: fmt(n?.active_7d || 0), s: `${fmt(n?.active_1d || 0)} today · ${fmt(n?.active_30d || 0)} this month`, d: null },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: E.paper }}>
      <ScrollView contentContainerStyle={[{ paddingTop: insets.top + 10, paddingBottom: 140 }, wide && { alignItems: 'center' }]} showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} tintColor={E.ink} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} />}>
        <View style={[st.page, wide && { width: 1120 }]}>
          {/* Masthead */}
          <View style={st.mast}>
            <Text style={st.over}>BACK OFFICE · {now.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }).toUpperCase()}</Text>
            <Pressable accessibilityRole="button" accessibilityLabel="Refresh" onPress={load} hitSlop={8}><Text style={st.updated}>{updated ? `Updated ${updated.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}` : 'Loading…'}</Text></Pressable>
          </View>
          <Text style={st.display} accessibilityRole="header">{hello()}, {name}.</Text>
          <Text style={st.lede}>
            {n ? `${fmt(n.new_users || 0)} new account${n.new_users === 1 ? '' : 's'}, ${fmt(n.trials_started ?? tot.purchase_done ?? 0)} trial${(n.trials_started ?? tot.purchase_done) === 1 ? '' : 's'} and ${fmt(n.ss_leads ?? tot.ss_done ?? 0)} lead${(n.ss_leads ?? tot.ss_done) === 1 ? '' : 's'} in the last ${days} days.` : 'Pulling your numbers.'}
          </Text>
          <View style={st.seg} accessibilityRole="tablist">
            {[7, 30, 90].map((d) => (
              <Pressable key={d} accessibilityRole="tab" accessibilityState={{ selected: days === d }} onPress={() => setDays(d)} style={[st.segB, days === d && st.segOn]}>
                <Text style={[st.segT, days === d && { color: '#fff' }]}>{d} days</Text>
              </Pressable>
            ))}
          </View>

          {!!setup.length && (
            <View style={st.setup}>
              <Text style={st.setupK}>ONE STEP LEFT</Text>
              <Text style={st.setupT}>Run {setup.join(' and ')} in Supabase (SQL Editor → paste → Run) to turn on revenue, trials and every person's status. Until then this shows what's already tracked.</Text>
            </View>
          )}

          {!!attention.length && (
            <View style={st.attn}>
              {attention.map((a, k) => (
                <Pressable key={a.t} accessibilityRole="button" disabled={!a.on} onPress={a.on} style={[st.attnRow, k < attention.length - 1 && st.line]}>
                  <View style={[st.dot, a.hot && { backgroundColor: E.red }]} />
                  <View style={{ flex: 1 }}><Text style={st.attnT}>{a.t}</Text><Text style={st.attnS}>{a.s}</Text></View>
                  {!!a.on && <Arrow />}
                </Pressable>
              ))}
            </View>
          )}

          {/* KPIs */}
          <View style={st.kpis}>
            {kpis.map((k) => (
              <View key={k.k} style={[st.kpi, { width: wide ? '24.2%' : '48.6%' }]}>
                <Text style={st.kpiK}>{k.k.toUpperCase()}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6, flexWrap: 'wrap' }}>
                  <Text style={st.kpiV} numberOfLines={1} adjustsFontSizeToFit>{k.v}</Text>
                  {k.d != null && <Text style={[st.delta, { color: k.d >= 0 ? E.green : E.red }]}>{k.d >= 0 ? '▲' : '▼'} {Math.abs(k.d)}%</Text>}
                </View>
                <Text style={st.kpiS} numberOfLines={2}>{k.s}</Text>
              </View>
            ))}
          </View>

          {/* Daily chart */}
          {!!n?.daily?.length && <Daily data={n.daily} />}

          <View style={wide ? st.cols : undefined}>
            <View style={wide ? st.col : undefined}>
              {/* Funnel */}
              <Head label="The funnel" sub={`Unique people, last ${days} days. Red is the biggest drop.`} />
              <View style={st.card}>
                <Funnel steps={FUNNEL} t={tot} />
                <View style={st.hair} />
                <Text style={[st.kpiK, { marginBottom: 10 }]}>COACHING</Text>
                <Funnel steps={COACH_FUNNEL.map(([k, l]) => [k, l])} t={{ ...tot, coaching_view: Math.max(tot.coaching_view || 0, tot.coach_view || 0) }} />
              </View>

              {/* Sources */}
              <Head label="By video" sub="Credited to the first link each person used." />
              <View style={st.card}>
                <View style={[st.tr, st.line]}>
                  <Text style={[st.th, { flex: 2, textAlign: 'left' }]}>SOURCE</Text>
                  <Text style={st.th}>VISITS</Text><Text style={st.th}>LEADS</Text><Text style={st.th}>APP</Text><Text style={st.th}>PAID</Text><Text style={st.th}>APPLIED</Text>
                </View>
                {sources.length ? sources.map((s: any, k) => (
                  <View key={s.src} style={[st.tr, k < sources.length - 1 && st.line]}>
                    <Text style={[st.td, { flex: 2, textAlign: 'left', fontFamily: F.bold }]} numberOfLines={1}>{s.src}</Text>
                    <Text style={st.td}>{fmt(s.ss_visit || 0)}</Text>
                    <Text style={st.td}>{fmt(s.ss_done || 0)}<Text style={st.tdS}>{s.ss_visit ? `\n${pct(s.ss_done || 0, s.ss_visit)}` : ''}</Text></Text>
                    <Text style={st.td}>{fmt(s.quiz_done || 0)}</Text>
                    <Text style={[st.td, { fontFamily: F.bold }]}>{fmt(s.purchase_done || 0)}</Text>
                    <Text style={[st.td, { fontFamily: F.bold }]}>{fmt(s.apply_done || 0)}</Text>
                  </View>
                )) : <Text style={st.empty}>No visits in this range yet.</Text>}
                <Pressable accessibilityRole="button" onPress={() => open('https://boonfay.com/funnel')} style={st.linkRow}><Text style={st.link}>Full table and video links</Text><Arrow size={12} /></Pressable>
              </View>

              {/* Subscriptions */}
              <Head label="Subscriptions" sub="The Full Stack, from RevenueCat." />
              <View style={st.card}>
                <View style={st.subGrid}>
                  {[
                    ['Monthly', fmt(plans.monthly || 0), '$19.99'], ['Yearly', fmt(plans.yearly || 0), '$99'],
                    ['In trial', fmt(n?.trials_live || 0), 'right now'], ['Converted', fmt(n?.conversions || 0), `last ${days}d`],
                    ['Cancelled', fmt(n?.cancellations || 0), `last ${days}d`], ['Expired', fmt(n?.expirations || 0), `last ${days}d`],
                  ].map(([k, v, s]) => (
                    <View key={k} style={st.subCell}><Text style={st.subV}>{v}</Text><Text style={st.subK}>{k}</Text><Text style={st.subS}>{s}</Text></View>
                  ))}
                </View>
                {!!subs.length && <View style={st.hair} />}
                {subs.slice(0, 8).map((e, k) => {
                  const who = people.find((p) => p.id === e.user_id);
                  const label = e.is_trial_conversion ? 'Trial → paid' : e.type === 'INITIAL_PURCHASE' ? (e.period_type === 'TRIAL' ? 'Trial started' : 'Subscribed') : e.type === 'RENEWAL' ? 'Renewed' : e.type === 'CANCELLATION' ? (Number(e.price) < 0 ? 'Refunded' : 'Cancelled') : e.type === 'EXPIRATION' ? 'Expired' : e.type === 'BILLING_ISSUE' ? 'Billing issue' : e.type.toLowerCase().replace(/_/g, ' ');
                  return (
                    <View key={k} style={[st.ev, k < Math.min(8, subs.length) - 1 && st.line]}>
                      <Text style={st.evT} numberOfLines={1}><Text style={{ fontFamily: F.bold }}>{label}</Text>  {who?.first_name || who?.email || 'Someone'}</Text>
                      <Text style={st.evS}>{e.price ? usd(Number(e.price)) + ' · ' : ''}{/month/i.test(e.product_id || '') ? 'Monthly' : /year|annual/i.test(e.product_id || '') ? 'Yearly' : ''} · {ago(e.created_at)}</Text>
                    </View>
                  );
                })}
              </View>
            </View>

            <View style={wide ? st.col : undefined}>
              {/* Coaching queue */}
              <Head label="Coaching clients" sub="Newest unreviewed check-ins first." />
              <View style={st.card}>
                {queue.length ? queue.map((p, k) => (
                  <Pressable key={p.id} accessibilityRole="button" onPress={() => go({ pathname: '/client/[id]', params: { id: p.id } })} style={[st.person, k < queue.length - 1 && st.line]}>
                    <Avatar p={p} />
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={st.pName} numberOfLines={1}>{p.first_name || p.email}</Text>
                      <Text style={st.pMeta} numberOfLines={1}>{p.last_checkin ? `Checked in ${agoDay(p.last_checkin)}${p.last_weight ? ` · ${p.last_weight} lbs` : ''} · ${p.checkins} total` : 'No check-in yet'}</Text>
                    </View>
                    {p.needs_review ? <View style={st.review}><Text style={st.reviewT}>Review</Text></View> : <Arrow />}
                  </Pressable>
                )) : <Text style={st.empty}>No coaching clients in the app yet. They show up here when their plan is delivered.</Text>}
                {!!invites.length && (
                  <>
                    <View style={st.hair} />
                    <Text style={[st.kpiK, { marginBottom: 6 }]}>PLANS WAITING FOR A SIGN-UP</Text>
                    {invites.map((i) => <Text key={i.email} style={st.pMeta}>{i.first_name || i.email} · {i.email} · sent {ago(i.created_at)}</Text>)}
                  </>
                )}
              </View>

              {/* People */}
              <Head label="Everyone" sub={`${fmt(people.length)} accounts. Tap anyone to see their plan, check-ins and photos.`} />
              <View style={st.card}>
                <View style={st.search}>
                  <Svg width={16} height={16} viewBox="0 0 24 24"><Path d="M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15zM16 16l5 5" stroke={E.sub} strokeWidth={2} fill="none" strokeLinecap="round" /></Svg>
                  <TextInput value={q} onChangeText={setQ} placeholder="Search name or email" placeholderTextColor={E.faint} style={st.searchIn as any} autoCapitalize="none" autoCorrect={false} accessibilityLabel="Search people" />
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingVertical: 12 }}>
                  {FILTERS.map(([k, l]) => (
                    <Pressable key={k} accessibilityRole="button" accessibilityState={{ selected: filter === k }} onPress={() => setFilter(k)} style={[st.chip, filter === k && st.chipOn]}>
                      <Text style={[st.chipT, filter === k && { color: '#fff' }]}>{l} {counts[k] ? counts[k] : 0}</Text>
                    </Pressable>
                  ))}
                </ScrollView>
                {shown.slice(0, more ? 500 : 25).map((p, k, arr) => {
                  const s = STATUS[statusOf(p)];
                  return (
                    <Pressable key={p.id} accessibilityRole="button" onPress={() => go({ pathname: '/client/[id]', params: { id: p.id } })} style={[st.person, k < arr.length - 1 && st.line]}>
                      <Avatar p={p} />
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <Text style={st.pName} numberOfLines={1}>{p.first_name || (p.email || '').split('@')[0]}</Text>
                        <Text style={st.pMeta} numberOfLines={1}>Joined {ago(p.created_at)} · seen {ago(p.last_seen).toLowerCase()}{p.workouts_30d ? ` · ${p.workouts_30d} workouts` : ''}</Text>
                      </View>
                      <View style={[st.badge, { backgroundColor: s.bg }]}><Text style={[st.badgeT, { color: s.fg }]}>{s.label}{p.sub_plan && (statusOf(p) === 'active' || statusOf(p) === 'trial') ? ` · ${p.sub_plan === 'yearly' ? 'yr' : 'mo'}` : ''}</Text></View>
                    </Pressable>
                  );
                })}
                {!shown.length && <Text style={st.empty}>No one matches.</Text>}
                {shown.length > 25 && !more && <Pressable accessibilityRole="button" onPress={() => setMore(true)} style={st.linkRow}><Text style={st.link}>Show all {fmt(shown.length)}</Text></Pressable>}
              </View>

              {/* Activity */}
              <Head label="In the app" sub={`What people did, last ${days} days.`} />
              <View style={st.card}>
                <View style={st.subGrid}>
                  {[
                    ['Workouts', n?.workouts], ['Weigh-ins', n?.weigh_ins], ['Check-ins', n?.checkins],
                    ['Foods logged', n?.foods], ['Stack questions', n?.ai_questions], ['Photo scans', n?.ai_scans],
                  ].map(([k, v]) => (
                    <View key={k as string} style={st.subCell}><Text style={st.subV}>{v == null ? '—' : fmt(Number(v))}</Text><Text style={st.subK}>{k as string}</Text></View>
                  ))}
                </View>
              </View>

              {/* Payment page */}
              {!!pw.length && (
                <>
                  <Head label="Payment page" sub="What people tapped on the Full Stack offer." />
                  <View style={st.card}>
                    {['plan_pick', 'purchase_tap', 'trial_offer_skip'].map((m) => {
                      const rows = pw.filter((r) => r.metric === m).slice(0, 4);
                      if (!rows.length) return null;
                      return (
                        <View key={m} style={{ marginBottom: 10 }}>
                          <Text style={[st.kpiK, { marginBottom: 4 }]}>{m === 'plan_pick' ? 'PICKED A PLAN' : m === 'purchase_tap' ? 'TAPPED START (PLAN · BUTTON)' : 'TAPPED NOT NOW'}</Text>
                          {rows.map((r) => <View key={r.detail} style={st.pwRow}><Text style={st.pMeta} numberOfLines={1}>{r.detail || '—'}</Text><Text style={st.pwV}>{fmt(Number(r.people))}</Text></View>)}
                        </View>
                      );
                    })}
                  </View>
                </>
              )}
            </View>
          </View>

          {/* Tools */}
          <Head label="See it as they do" sub="Opens the whole app with a sample plan for “Jake”. Nothing saves." />
          <View style={[st.card, { paddingVertical: 4 }]}>
            {(['free', 'self', 'coached'] as ViewAs[]).map((v, k) => (
              <Pressable key={v} accessibilityRole="button" onPress={() => setOpening(v)} style={[st.person, k < 2 && st.line]}>
                <View style={{ flex: 1 }}>
                  <Text style={st.pName}>{VIEW_AS_LABEL[v]}</Text>
                  <Text style={st.pMeta}>{v === 'free' ? 'Weeks 1–2 open, the rest locked' : v === 'self' ? '$19.99/mo or $99/yr, all 12 weeks on their own' : 'Everything, plus your notes and the coach home'}</Text>
                </View>
                <Arrow />
              </Pressable>
            ))}
          </View>
          <View style={st.toolRow}>
            {[['Welcome', '/welcome'], ['Quiz', '/quiz'], ['Offer', '/unlock'], ['Application', '/coaching-application'], ['Stack Check', '/stack-check']].map(([l, h]) => (
              <Pressable key={h} accessibilityRole="button" onPress={() => go(h)} style={st.tool}><Text style={st.toolT}>{l}</Text></Pressable>
            ))}
          </View>

          <Head label="Everything else" sub="Coaching payments and emails live in Kit. App payments live in RevenueCat." />
          <View style={st.toolRow}>
            {[['Kit', 'https://app.kit.com/subscribers'], ['RevenueCat', 'https://app.revenuecat.com'], ['App Store Connect', 'https://appstoreconnect.apple.com'], ['Supabase', 'https://supabase.com/dashboard/project/ejcditarwgsqasecuqmx'], ['Funnel by video', 'https://boonfay.com/funnel']].map(([l, u]) => (
              <Pressable key={u} accessibilityRole="link" onPress={() => open(u)} style={st.tool}><Text style={st.toolT}>{l} ↗</Text></Pressable>
            ))}
          </View>
        </View>
      </ScrollView>
      {opening && (
        <LoadingScreen overlay title={`Opening| ${VIEW_AS_LABEL[opening]}`} sub={'Viewing as "Jake", a sample client. Nothing saves.'}
          steps={['Loading Jake\'s plan', opening === 'free' ? 'Locking weeks 3–12' : opening === 'self' ? 'Unlocking all 12 weeks' : 'Turning on Boon\'s reviews']} stepMs={500}
          onFinish={() => { const v = opening; setOpening(null); setViewAs(v); router.replace('/'); }} />
      )}
    </View>
  );
}

const delta = (a?: number, b?: number) => (a == null || b == null || !b ? null : Math.round(((Number(a) - Number(b)) / Number(b)) * 100));

function Head({ label, sub }: { label: string; sub?: string }) {
  return (
    <View style={st.head}>
      <Text style={st.headL} accessibilityRole="header">{label}</Text>
      {!!sub && <Text style={st.headS}>{sub}</Text>}
    </View>
  );
}

function Funnel({ steps, t }: { steps: [string, string][]; t: Record<string, number> }) {
  const vals = steps.map(([k]) => t[k] || 0);
  const top = Math.max(1, ...vals);
  let worst = -1, worstDrop = -1;
  vals.forEach((v, i) => { if (i && vals[i - 1] > 0) { const d = 1 - v / vals[i - 1]; if (d > worstDrop) { worstDrop = d; worst = i; } } });
  return (
    <View style={{ gap: 10 }}>
      {steps.map(([k, l], i) => (
        <View key={k}>
          <View style={st.fRow}>
            <Text style={[st.fL, i === worst && { color: E.red, fontFamily: F.bold }]} numberOfLines={1}>{l}</Text>
            <Text style={st.fV}>{fmt(vals[i])}</Text>
            <Text style={[st.fP, i === worst && { color: E.red }]}>{i ? pct(vals[i], vals[i - 1]) : ''}</Text>
          </View>
          <View style={st.fBar}><View style={[st.fFill, { width: `${Math.max(1.5, (vals[i] / top) * 100)}%` }, i === worst && { backgroundColor: E.red }]} /></View>
        </View>
      ))}
    </View>
  );
}

function Daily({ data }: { data: { d: string; signups: number; active: number; leads: number; trials: number }[] }) {
  const [w, setW] = useState(0);
  const max = Math.max(1, ...data.map((x) => Math.max(x.leads, x.signups)));
  const bw = w ? Math.max(2, (w - (data.length - 1) * 2) / data.length) : 0;
  const H = 96;
  const sum = (k: 'leads' | 'signups' | 'trials') => data.reduce((s, x) => s + (x[k] || 0), 0);
  return (
    <View style={[st.card, { marginTop: 12 }]}>
      <View style={{ flexDirection: 'row', gap: 16, marginBottom: 12, flexWrap: 'wrap' }}>
        <Legend c={E.ink} t={`Leads ${fmt(sum('leads'))}`} />
        <Legend c={E.red} t={`New accounts ${fmt(sum('signups'))}`} />
        <Legend c={E.green} t={`Trials ${fmt(sum('trials'))}`} />
      </View>
      <View onLayout={(e) => setW(e.nativeEvent.layout.width)} style={{ height: H }}>
        {!!w && (
          <Svg width={w} height={H} accessibilityLabel="Leads and new accounts per day">
            {data.map((x, i) => {
              const hx = i * (bw + 2);
              const hl = (x.leads / max) * (H - 4), hs = (x.signups / max) * (H - 4);
              return (
                <React.Fragment key={x.d}>
                  <Rect x={hx} y={H - hl} width={bw} height={Math.max(hl, 1)} rx={Math.min(2, bw / 2)} fill={x.leads ? E.ink : E.soft} />
                  {x.signups > 0 && <Rect x={hx + bw * 0.25} y={H - hs} width={bw * 0.5} height={hs} rx={1} fill={E.red} />}
                  {x.trials > 0 && <Rect x={hx} y={0} width={bw} height={4} rx={2} fill={E.green} />}
                </React.Fragment>
              );
            })}
          </Svg>
        )}
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 }}>
        <Text style={st.axis}>{new Date(data[0].d + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</Text>
        <Text style={st.axis}>Today</Text>
      </View>
    </View>
  );
}

const Legend = ({ c, t }: { c: string; t: string }) => (
  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}><View style={{ width: 8, height: 8, borderRadius: 2, backgroundColor: c }} /><Text style={st.legend}>{t}</Text></View>
);

function Avatar({ p }: { p: Person }) {
  const c = p.tier === 'coached';
  return <View style={[st.av, c && { backgroundColor: E.ink }]}><Text style={[st.avT, c && { color: '#fff' }]}>{(p.first_name || p.email || '?')[0].toUpperCase()}</Text></View>;
}

function Arrow({ size = 14 }: { size?: number }) {
  return <Svg width={size} height={size} viewBox="0 0 24 24"><Path d="M9 5.5l6.5 6.5L9 18.5" stroke={E.ink} strokeWidth={2.4} fill="none" strokeLinecap="round" strokeLinejoin="round" /></Svg>;
}

/** Design previews only (EXPO_PUBLIC_DEMO builds, never the real app): sample numbers so the layout can be checked. */
function demo(days: number) {
  const d = (ago: number) => new Date(Date.now() - ago * 864e5).toISOString();
  const names = ['Marcus', 'Tyler', 'Andre', 'Chris', 'Devin', 'Jordan', 'Luis', 'Sam', 'Nate', 'Omar', 'Brandon', 'Kevin'];
  const tiers: Person['tier'][] = ['coached', 'coached', 'self', 'self', 'self', 'free', 'free', 'self', 'free', 'free', 'coached', 'free'];
  const subsS = [null, null, 'active', 'trial', 'active', null, null, 'cancelled', null, 'expired', null, null];
  const people: Person[] = names.map((nm, i) => ({
    id: 'p' + i, email: nm.toLowerCase() + '@example.com', first_name: nm, tier: tiers[i], created_at: d(i * 3 + 1), start_date: null,
    sub_status: subsS[i], sub_plan: i % 2 ? 'monthly' : 'yearly', sub_expires: null, last_seen: d(i * 0.4), workouts_30d: [11, 9, 7, 3, 12, 1, 0, 4, 2, 0, 8, 0][i],
    checkins: tiers[i] === 'coached' ? [5, 3, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0][i] : 0, last_checkin: tiers[i] === 'coached' ? d(i + 1).slice(0, 10) : null,
    last_weight: tiers[i] === 'coached' ? [204.6, 188.2, 0, 0, 0, 0, 0, 0, 0, 0, 231.0, 0][i] : null, needs_review: i === 0 || i === 10, goal: 'Lose fat',
  }));
  const daily = Array.from({ length: Math.min(days, 90) }, (_, i) => ({ d: d(Math.min(days, 90) - 1 - i).slice(0, 10), signups: (i * 7) % 5 === 0 ? 2 : (i % 3 === 0 ? 1 : 0), active: 10 + (i % 6), leads: 3 + ((i * 5) % 9), trials: i % 6 === 0 ? 1 : 0 }));
  const n = { days, users_total: 214, users_by_tier: { free: 176, self: 31, coached: 7 }, new_users: 38, new_users_prev: 29, active_1d: 22, active_7d: 61, active_30d: 118,
    sub_plans: { monthly: 12, yearly: 15 }, trials_live: 4, trials_started: 14, trials_started_prev: 11, conversions: 9, cancellations: 3, expirations: 2, revenue: 1287.6, revenue_prev: 940,
    ss_visits: 1840, ss_leads: 412, ss_leads_prev: 351, applications: 9, applications_prev: 6, coached: 7, reviews_due: 2, checkins: 26, workouts: 412, weigh_ins: 655, foods: 903, ai_questions: 311, ai_scans: 148, daily };
  const S = (src: string, k: Record<string, number>) => Object.entries(k).map(([step, people]) => ({ src, step, people }));
  const steps: Step[] = [
    ...S('bang', { ss_visit: 920, ss_start: 610, ss_done: 214, ss_plan_tap: 61, quiz_done: 44, paywall_view: 39, purchase_tap: 14, purchase_done: 8, coaching_view: 52, apply_view: 21, apply_start: 12, apply_done: 5 }),
    ...S('prime', { ss_visit: 540, ss_start: 344, ss_done: 121, ss_plan_tap: 30, quiz_done: 21, paywall_view: 18, purchase_tap: 6, purchase_done: 4, coaching_view: 25, apply_view: 9, apply_start: 5, apply_done: 3 }),
    ...S('electrolytes', { ss_visit: 380, ss_start: 230, ss_done: 77, ss_plan_tap: 18, quiz_done: 12, paywall_view: 10, purchase_tap: 3, purchase_done: 2, coaching_view: 11, apply_view: 4, apply_start: 2, apply_done: 1 }),
  ];
  const pw: PW[] = [{ metric: 'plan_pick', detail: 'yearly', people: 41 }, { metric: 'plan_pick', detail: 'monthly', people: 22 }, { metric: 'purchase_tap', detail: 'yearly · main', people: 15 }, { metric: 'purchase_tap', detail: 'monthly · main', people: 8 }, { metric: 'trial_offer_skip', detail: 'scrolled 40%', people: 12 }];
  const subs: SubEv[] = [
    { created_at: d(0.2), type: 'INITIAL_PURCHASE', period_type: 'TRIAL', product_id: 'sps_yearly', price: 0, is_trial_conversion: false, user_id: 'p3' },
    { created_at: d(1.1), type: 'RENEWAL', period_type: 'NORMAL', product_id: 'sps_yearly', price: 99, is_trial_conversion: true, user_id: 'p2' },
    { created_at: d(2.4), type: 'RENEWAL', period_type: 'NORMAL', product_id: 'sps_monthly', price: 19.99, is_trial_conversion: false, user_id: 'p4' },
    { created_at: d(3.0), type: 'CANCELLATION', period_type: 'NORMAL', product_id: 'sps_monthly', price: 0, is_trial_conversion: false, user_id: 'p7' },
  ];
  return { n, people, steps, pw, subs, invites: [{ email: 'devon@example.com', first_name: 'Devon', created_at: d(1) }] as Invite[] };
}

const st = StyleSheet.create({
  page: { paddingHorizontal: 20, width: '100%' },
  mast: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  over: { fontFamily: F.bold, fontSize: 11, letterSpacing: 1.6, color: E.sub },
  updated: { fontFamily: F.semi, fontSize: 12, color: E.sub },
  display: { fontFamily: F.black, fontSize: 40, lineHeight: 43, letterSpacing: -1.6, color: E.ink, marginTop: 18 },
  lede: { fontFamily: F.medium, fontSize: 16, lineHeight: 23, color: E.sub, marginTop: 8, maxWidth: 640 },
  seg: { flexDirection: 'row', alignSelf: 'flex-start', padding: 3, borderRadius: 14, backgroundColor: E.surface, borderWidth: 1, borderColor: E.hair, marginTop: 18 },
  segB: { height: 34, paddingHorizontal: 14, borderRadius: 11, justifyContent: 'center' },
  segOn: { backgroundColor: E.ink },
  segT: { fontFamily: F.bold, fontSize: 13, color: E.ink },

  setup: { marginTop: 16, padding: 16, borderRadius: 18, backgroundColor: '#fff4e0' },
  setupK: { fontFamily: F.bold, fontSize: 10.5, letterSpacing: 1.4, color: '#9a6400' },
  setupT: { fontFamily: F.medium, fontSize: 14, lineHeight: 20, color: E.ink, marginTop: 4 },

  attn: { marginTop: 16, borderRadius: 20, backgroundColor: E.surface, borderWidth: 1, borderColor: E.hair, paddingHorizontal: 16 },
  attnRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#e0a800' },
  attnT: { fontFamily: F.bold, fontSize: 15, color: E.ink },
  attnS: { fontFamily: F.medium, fontSize: 13, color: E.sub, marginTop: 1 },

  kpis: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 10, marginTop: 16 },
  kpi: { padding: 14, borderRadius: 18, backgroundColor: E.surface, borderWidth: 1, borderColor: E.hair, minHeight: 116 },
  kpiK: { fontFamily: F.bold, fontSize: 10, letterSpacing: 1.3, color: E.sub },
  kpiV: { fontFamily: F.black, fontSize: 28, letterSpacing: -1, color: E.ink, marginTop: 8, fontVariant: ['tabular-nums'] },
  kpiS: { fontFamily: F.medium, fontSize: 12, lineHeight: 16, color: E.sub, marginTop: 4 },
  delta: { fontFamily: F.bold, fontSize: 12 },

  cols: { flexDirection: 'row', gap: 20, alignItems: 'flex-start' },
  col: { flex: 1, minWidth: 0 },
  head: { marginTop: 32, marginBottom: 12 },
  headL: { fontFamily: F.xbold, fontSize: 22, letterSpacing: -0.6, color: E.ink },
  headS: { fontFamily: F.medium, fontSize: 13, lineHeight: 18, color: E.sub, marginTop: 3 },
  card: { borderRadius: 20, backgroundColor: E.surface, borderWidth: 1, borderColor: E.hair, padding: 16 },
  hair: { height: 1, backgroundColor: E.hair, marginVertical: 14 },
  line: { borderBottomWidth: 1, borderBottomColor: E.hair },
  empty: { fontFamily: F.medium, fontSize: 14, lineHeight: 20, color: E.sub, paddingVertical: 6 },

  fRow: { flexDirection: 'row', alignItems: 'baseline', gap: 8, marginBottom: 5 },
  fL: { flex: 1, fontFamily: F.medium, fontSize: 13.5, color: E.ink },
  fV: { fontFamily: F.bold, fontSize: 14, color: E.ink, fontVariant: ['tabular-nums'] },
  fP: { width: 44, textAlign: 'right', fontFamily: F.semi, fontSize: 12, color: E.sub },
  fBar: { height: 6, borderRadius: 3, backgroundColor: E.soft, overflow: 'hidden' },
  fFill: { height: 6, borderRadius: 3, backgroundColor: E.ink },

  tr: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, gap: 6 },
  th: { flex: 1, fontFamily: F.bold, fontSize: 9.5, letterSpacing: 1, color: E.sub, textAlign: 'right' },
  td: { flex: 1, fontFamily: F.medium, fontSize: 13.5, color: E.ink, textAlign: 'right', fontVariant: ['tabular-nums'] },
  tdS: { fontFamily: F.semi, fontSize: 11, color: E.sub },
  linkRow: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingTop: 12 },
  link: { fontFamily: F.bold, fontSize: 14, color: E.ink },

  subGrid: { flexDirection: 'row', flexWrap: 'wrap', rowGap: 14 },
  subCell: { width: '33.33%' },
  subV: { fontFamily: F.black, fontSize: 22, letterSpacing: -0.6, color: E.ink, fontVariant: ['tabular-nums'] },
  subK: { fontFamily: F.semi, fontSize: 12.5, color: E.ink, marginTop: 1 },
  subS: { fontFamily: F.medium, fontSize: 11.5, color: E.sub },
  ev: { paddingVertical: 10 },
  evT: { fontFamily: F.medium, fontSize: 14, color: E.ink },
  evS: { fontFamily: F.medium, fontSize: 12, color: E.sub, marginTop: 2 },

  person: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  av: { width: 38, height: 38, borderRadius: 19, backgroundColor: E.soft, alignItems: 'center', justifyContent: 'center' },
  avT: { fontFamily: F.bold, fontSize: 15, color: E.ink },
  pName: { fontFamily: F.bold, fontSize: 15, color: E.ink },
  pMeta: { fontFamily: F.medium, fontSize: 12.5, color: E.sub, marginTop: 1 },
  review: { height: 28, paddingHorizontal: 12, borderRadius: 14, backgroundColor: E.red, justifyContent: 'center' },
  reviewT: { fontFamily: F.bold, fontSize: 12, color: '#fff' },
  badge: { height: 24, paddingHorizontal: 9, borderRadius: 12, justifyContent: 'center' },
  badgeT: { fontFamily: F.bold, fontSize: 11 },
  search: { flexDirection: 'row', alignItems: 'center', gap: 8, height: 44, borderRadius: 22, backgroundColor: E.paper, paddingHorizontal: 14 },
  searchIn: { flex: 1, fontFamily: F.medium, fontSize: 15, color: E.ink, outlineWidth: 0 },
  chip: { height: 32, paddingHorizontal: 12, borderRadius: 16, backgroundColor: E.paper, justifyContent: 'center' },
  chipOn: { backgroundColor: E.ink },
  chipT: { fontFamily: F.semi, fontSize: 13, color: E.ink },
  pwRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 3 },
  pwV: { fontFamily: F.bold, fontSize: 13, color: E.ink },

  toolRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  tool: { height: 40, paddingHorizontal: 16, borderRadius: 20, backgroundColor: E.surface, borderWidth: 1, borderColor: E.hair, justifyContent: 'center' },
  toolT: { fontFamily: F.semi, fontSize: 14, color: E.ink },
  legend: { fontFamily: F.semi, fontSize: 12, color: E.ink },
  axis: { fontFamily: F.medium, fontSize: 11, color: E.sub },
});
