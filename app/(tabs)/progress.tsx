import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path, Polyline } from 'react-native-svg';
import { useAuth } from '../../src/lib/auth';
import { supabase } from '../../src/lib/supabase';
import { C, F } from '../../src/lib/theme';
import Page from '../../src/components/Page';
import PageTitle from '../../src/components/PageTitle';
import Panel from '../../src/components/Panel';
import NoPlan from '../../src/components/NoPlan';
import TrendChart from '../../src/components/TrendChart';
import { plain, weekOf } from '../../src/lib/program';
import { exName } from '../../src/lib/workoutMeta';
import type { Checkin } from '../../src/lib/types';
import { CoachCard } from '../../src/components/Coach';
import { allWeighIns } from '../../src/lib/body';
import { e1rm, goalDate, ratePerWeek, trendSeries, weighInsThisWeek, type TrendPoint } from '../../src/lib/trend';
import { isoDate } from '../../src/lib/logs';
import { listPhotos, type ProgressPhoto } from '../../src/lib/photos';
import { adaptFor, applyAdapt } from '../../src/lib/adaptive';
import { demoHistory, mondayOf } from '../../src/lib/recap';
import { isCoached } from '../../src/lib/access';
import { track } from '../../src/lib/track';

type Log = { exercise_id: string; weight: number | null; reps: number | null; logged_on: string };
const fmt = (n: number) => Math.round(n).toLocaleString('en-US');
const DEMO = process.env.EXPO_PUBLIC_DEMO === '1';
const withTimeout = <T,>(p: PromiseLike<T>, ms: number, fallback: T) => Promise.race([Promise.resolve(p).catch(() => fallback), new Promise<T>((r) => setTimeout(() => r(fallback), ms))]);
const RANGES = [['30D', 30], ['90D', 90], ['All', 999]] as const;
const short = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

/** Progress: trend weight and goal date, weekly calorie check, photos, strength, recap. */
export default function Progress() {
  const { plan, profile, session, updatePlan } = useAuth();
  const router = useRouter();
  const [rows, setRows] = useState<Checkin[]>([]);
  const [logs, setLogs] = useState<Log[]>([]);
  const [series, setSeries] = useState<TrendPoint[]>([]);
  const [photos, setPhotos] = useState<ProgressPhoto[]>([]);
  const [range, setRange] = useState<number>(90);
  const [busy, setBusy] = useState(false);
  const [kept, setKept] = useState(false);

  useFocusEffect(useCallback(() => {
    const uid = session?.user.id;
    allWeighIns(DEMO ? undefined : uid).then((w) => setSeries(trendSeries(w))).catch(() => {});
    if (DEMO) { setLogs(demoHistory()); listPhotos('demo', plan?.train.s).then(setPhotos); return; }
    if (!uid) return;
    withTimeout(supabase.from('checkins').select('id,week,checkin_date,weight,workouts,nutrition_days,energy,win').eq('user_id', uid).order('checkin_date', { ascending: true }), 5000, { data: [] } as any)
      .then(({ data }: any) => setRows((data as Checkin[]) || []));
    withTimeout(supabase.from('workout_logs').select('exercise_id,weight,reps,logged_on').eq('user_id', uid).order('logged_on', { ascending: true }).limit(5000), 5000, { data: [] } as any)
      .then(({ data }: any) => setLogs((data as Log[]) || []));
    listPhotos(uid, plan?.train.s).then(setPhotos).catch(() => {});
  }, [session, plan?.train.s]));

  if (!plan) return <NoPlan name={profile?.first_name} />;
  const week = weekOf(plan.train.s);
  const coached = isCoached(profile);

  // ---- Trend weight + goal date
  const goalW = Number((plan.goal_short || '').match(/(\d{2,3})\s*lbs/i)?.[1]) || Number((profile?.quiz as any)?.goal_weight) || null;
  const startW = Number(plain(plan.goal_long || '').match(/from\s*(\d{2,3})/i)?.[1]) || Number((profile?.quiz as any)?.weight) || series[0]?.w || null;
  const last = series.length ? series[series.length - 1] : null;
  const rate = ratePerWeek(series, 21);
  const eta = last ? goalDate(last.t, rate, goalW) : null;
  const since = last && startW ? Math.round((last.t - startW) * 10) / 10 : null;
  const pct = startW && goalW && last && startW !== goalW ? Math.max(0, Math.min(100, Math.round(((startW - last.t) / (startW - goalW)) * 100))) : 0;
  const todayW = series.find((p) => p.date === isoDate());
  const thisWeek = weighInsThisWeek(series, isoDate());
  const end12 = plan.train.s ? new Date(new Date(plan.train.s + 'T12:00:00').getTime() + 83 * 864e5) : null;
  const paceLine = rate == null
    ? thisWeek < 3 ? `Weigh in ${3 - thisWeek} more morning${3 - thisWeek === 1 ? '' : 's'} this week to see your pace.` : 'A few more weigh-ins and your pace shows up here.'
    : rate < -0.05 ? `Down ${Math.abs(rate).toFixed(1)} lbs a week` : rate > 0.05 ? `Up ${rate.toFixed(1)} lbs a week` : 'Holding steady this month';

  // ---- Weekly calorie check
  const adapt = adaptFor(plan, profile, series);
  const accept = async (to: number) => {
    if (!session || !profile) return;
    setBusy(true);
    const next = await applyAdapt(session.user.id, profile, plan, to);
    setBusy(false);
    if (next) { updatePlan(next); track('adaptive_accept', { to }); }
  };

  // ---- Strength: estimated max per lift, first week vs latest
  const byEx: Record<string, { d: string; e: number }[]> = {};
  for (const l of logs) {
    const w = Number(l.weight) || 0; if (!w) continue;
    const e = e1rm(w, Number(l.reps) || 1);
    const arr = (byEx[l.exercise_id] ||= []);
    const lastPt = arr[arr.length - 1];
    if (lastPt && lastPt.d === l.logged_on) lastPt.e = Math.max(lastPt.e, e); else arr.push({ d: l.logged_on, e });
  }
  const lifts = Object.entries(byEx).filter(([, v]) => v.length > 0).map(([id, v]) => ({ id, pts: v, first: v[0].e, last: v[v.length - 1].e, gain: v[v.length - 1].e - v[0].e }))
    .sort((a, b) => b.gain - a.gain || b.last - a.last).slice(0, 4);
  const start = plan.train.s ? new Date(plan.train.s + 'T00:00:00').getTime() : 0;
  const vol: Record<number, number> = {};
  for (const l of logs) {
    const wk = start ? Math.min(12, Math.max(1, Math.floor((new Date(l.logged_on + 'T12:00:00').getTime() - start) / 864e5 / 7) + 1)) : 1;
    vol[wk] = (vol[wk] || 0) + (Number(l.weight) || 0) * (Number(l.reps) || 0);
  }
  const bars = Array.from({ length: Math.min(week, 6) }, (_, k) => week - Math.min(week, 6) + 1 + k);
  const maxV = Math.max(1, ...bars.map((w) => vol[w] || 0));

  // ---- Photos: first vs latest (front if they have it)
  const fronts = photos.filter((p) => p.angle === 'front');
  const pool = fronts.length >= 2 ? fronts : photos;
  const firstP = pool[0], lastP = pool.length > 1 ? pool[pool.length - 1] : null;
  const recapMonday = new Date().getDay() >= 1 && new Date().getDay() <= 2 ? (() => { const m = mondayOf(); m.setDate(m.getDate() - 7); return m; })() : mondayOf();

  return (
    <Page header={<PageTitle title="Progress" right={
      <Pressable accessibilityRole="button" onPress={() => router.push('/weigh-in')} style={st.weighBtn} hitSlop={6}>
        <Svg width={16} height={16} viewBox="0 0 24 24"><Path d="M12 5v14M5 12h14" stroke="#fff" strokeWidth={2.8} strokeLinecap="round" /></Svg>
        <Text style={st.weighBtnT}>Weigh in</Text>
      </Pressable>} />}>

      {/* Trend hero */}
      <LinearGradient colors={['#141c33', '#1d2a52', '#2a1530']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={st.hero}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text style={st.heroK}>TREND WEIGHT</Text>
          {since != null && since !== 0 && <Text style={[st.heroChip, since > 0 && !((profile?.quiz as any)?.goal || '').startsWith('Build') && { backgroundColor: 'rgba(226,67,59,0.25)' }]}>{since > 0 ? '+' : '−'}{Math.abs(since).toFixed(1)} since start</Text>}
        </View>
        <Text style={st.heroV}>{last ? last.t.toFixed(1) : '––'}<Text style={st.heroU}> lbs</Text></Text>
        <Text style={st.heroPace}>{paceLine}</Text>
        {goalW != null && (
          <View style={{ marginTop: 14, gap: 8 }}>
            <View style={st.heroTrack}><View style={[st.heroFill, { width: `${pct}%` }]} /></View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={st.heroSm}>{startW ? `Start ${startW}` : ''}</Text>
              <Text style={st.heroSm}>Goal {goalW} lbs</Text>
            </View>
          </View>
        )}
        <View style={st.heroRow}>
          <View style={{ flex: 1 }}>
            <Text style={st.heroSmK}>{eta ? 'ON PACE FOR YOUR GOAL' : 'YOUR GOAL DATE'}</Text>
            <Text style={st.heroEta}>{eta ? eta.toLocaleDateString('en-US', { month: 'long', day: 'numeric' }) : goalW && last && Math.abs(last.t - goalW) < 0.3 ? 'You made it' : 'Shows after 2 weeks'}</Text>
            {!!eta && !!end12 && <Text style={st.heroSm}>{eta <= end12 ? `${Math.round((end12.getTime() - eta.getTime()) / 864e5 / 7)} weeks before week 12 ends` : `Week 12 ends ${short(end12)}`}</Text>}
          </View>
          <Pressable accessibilityRole="button" onPress={() => router.push('/weigh-in')} style={[st.heroCta, !!todayW && st.heroCtaDone]}>
            <Text style={[st.heroCtaT, !!todayW && { color: '#fff' }]}>{todayW ? `Today ${todayW.w.toFixed(1)} ✓` : 'Weigh in'}</Text>
          </Pressable>
        </View>
      </LinearGradient>

      {/* Chart */}
      <Panel title="Weight trend" right={
        <View style={st.seg}>
          {RANGES.map(([l, d]) => (
            <Pressable key={l} accessibilityRole="tab" accessibilityState={{ selected: range === d }} onPress={() => setRange(d)} style={[st.segB, range === d && st.segOn]}>
              <Text style={[st.segT, range === d && { color: '#fff' }]}>{l}</Text>
            </Pressable>
          ))}
        </View>}>
        {series.length ? <TrendChart series={series} days={range} goal={goalW} rate={rate} /> : (
          <Pressable onPress={() => router.push('/weigh-in')} style={st.empty}>
            <Text style={st.emptyT}>Weigh in most mornings</Text>
            <Text style={st.small}>Your scale jumps around. The trend doesn't. After a week you'll see where you're really heading.</Text>
          </Pressable>
        )}
        {series.length > 0 && (
          <View style={st.legend}>
            <Text style={st.leg}><Text style={{ color: '#b9bfcd' }}>●</Text> Scale</Text>
            <Text style={st.leg}><Text style={{ color: '#e2433b' }}>━</Text> Trend</Text>
            {rate != null && <Text style={st.leg}><Text style={{ color: '#e2433b' }}>┅</Text> Where you're heading</Text>}
          </View>
        )}
      </Panel>

      {/* Weekly calorie check */}
      <Panel title="Weekly calorie check" right={`${fmt(Number(String(plan.kcal).replace(/\D/g, '')) || 0)} cal`}>
        {adapt.who === 'coached' ? (
          <Text style={st.body}>I set your calories myself. I look at this trend with your check-in every Sunday and tell you if anything changes.</Text>
        ) : adapt.kind === 'adjust' && !kept && adapt.who === 'self' ? (
          <View style={{ gap: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Text style={st.kOld}>{fmt(adapt.from)}</Text>
              <Svg width={18} height={18} viewBox="0 0 24 24"><Path d="M5 12h14M13 6l6 6-6 6" stroke={C.ink} strokeWidth={2.4} fill="none" strokeLinecap="round" strokeLinejoin="round" /></Svg>
              <Text style={st.kNew}>{fmt(adapt.to)}</Text>
              <Text style={st.small}>calories a day</Text>
            </View>
            <Text style={st.body}>{adapt.why} Protein stays at {plan.protein} g and your meals re-size to match.</Text>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <Pressable accessibilityRole="button" disabled={busy} onPress={() => accept(adapt.to)} style={[st.btnRed, { flex: 1 }]}>
                {busy ? <ActivityIndicator color="#fff" /> : <Text style={st.btnRedT}>Use {fmt(adapt.to)}</Text>}
              </Pressable>
              <Pressable accessibilityRole="button" onPress={() => { setKept(true); track('adaptive_keep'); }} style={st.btnGhost}><Text style={st.btnGhostT}>Keep {fmt(adapt.from)}</Text></Pressable>
            </View>
          </View>
        ) : adapt.kind === 'on_track' ? (
          <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
            <View style={st.okDot}><Svg width={14} height={14} viewBox="0 0 24 24"><Path d="M5 12.5l4.5 4.5L19 7.5" stroke="#fff" strokeWidth={3.2} fill="none" strokeLinecap="round" strokeLinejoin="round" /></Svg></View>
            <Text style={[st.body, { flex: 1 }]}>{adapt.why} {adapt.who === 'free' ? 'With The Full Stack, this check adjusts your calories every week.' : ''}</Text>
          </View>
        ) : (
          <Text style={st.body}>{adapt.kind === 'adjust' && adapt.who === 'free' ? `Your trend says ${fmt(adapt.to)} calories would fit you better. The Full Stack adjusts this for you every week.` : adapt.why}</Text>
        )}
        {adapt.who === 'free' && adapt.kind !== 'need_data' && (
          <Pressable accessibilityRole="button" onPress={() => router.push('/unlock')} style={[st.btnGhost, { marginTop: 12 }]}><Text style={st.btnGhostT}>See The Full Stack</Text></Pressable>
        )}
      </Panel>

      {/* Photos */}
      <Panel title="Progress photos" onMore={() => router.push('/photos')}>
        {firstP ? (
          <Pressable accessibilityRole="button" accessibilityLabel="Compare your photos" onPress={() => router.push('/photos')} style={{ gap: 12 }}>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              {[firstP, lastP].map((p, k) => (
                <View key={k} style={st.ph}>
                  {p ? <Image source={p.src} style={FILL} resizeMode="cover" /> : <Text style={st.small}>Next photo week</Text>}
                  {!!p && <Text style={st.phTag}>{k === 0 ? 'START' : 'NOW'} · WK {p.week}</Text>}
                </View>
              ))}
            </View>
            <View style={st.btnNavy}><Text style={st.btnNavyT}>Compare side by side</Text></View>
          </Pressable>
        ) : (
          <Pressable accessibilityRole="button" onPress={() => router.push('/photos')} style={st.empty}>
            <Text style={st.emptyT}>Take your first photo</Text>
            <Text style={st.small}>Front, side and back. Same spot, same light. In 4 weeks you'll be glad you did.</Text>
          </Pressable>
        )}
      </Panel>

      {/* Weekly recap */}
      <Pressable accessibilityRole="button" onPress={() => router.push({ pathname: '/recap', params: { m: isoDate(recapMonday) } })} style={st.recap}>
        <LinearGradient colors={['#e2433b', '#b32a33']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={st.recapIco}>
          <Svg width={22} height={22} viewBox="0 0 24 24"><Path d="M4 19h16M6 15l4-4 3 3 5-6" stroke="#fff" strokeWidth={2.4} fill="none" strokeLinecap="round" strokeLinejoin="round" /></Svg>
        </LinearGradient>
        <View style={{ flex: 1 }}>
          <Text style={st.recapT}>{recapMonday.getTime() < mondayOf().getTime() ? "Last week's recap" : 'Your week so far'}</Text>
          <Text style={st.small}>Workouts, PRs, days stacked, trend. Share it.</Text>
        </View>
        <Svg width={16} height={16} viewBox="0 0 24 24"><Path d="M9 5l7 7-7 7" stroke={C.ink} strokeWidth={2.4} fill="none" strokeLinecap="round" strokeLinejoin="round" /></Svg>
      </Pressable>

      {/* Strength */}
      <Panel title="Strength" right="Estimated max" bodyStyle={{ paddingVertical: 4 }}>
        {!lifts.length && <Text style={[st.small, { paddingVertical: 10 }]}>Log your first workout. Every set you save shows up here.</Text>}
        {lifts.map((l, k) => {
          const pctUp = l.first ? Math.round((l.gain / l.first) * 100) : 0;
          return (
            <View key={l.id} style={[st.lift, k < lifts.length - 1 && st.line]}>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={st.liftT} numberOfLines={1}>{exName(l.id, plan)}</Text>
                <Text style={st.small}>{l.gain > 0 ? `${fmt(l.first)} → ${fmt(l.last)} lbs` : `${fmt(l.last)} lbs`}</Text>
              </View>
              <Spark pts={l.pts.map((p) => p.e)} />
              {pctUp > 0 ? <Text style={st.pr}>+{pctUp}%</Text> : <View style={{ width: 46 }} />}
            </View>
          );
        })}
        {logs.length > 0 && (
          <View style={[st.line0, { paddingTop: 14, paddingBottom: 10 }]}>
            <Text style={st.lbl}>Weight lifted per week</Text>
            <View style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-end', height: 80, marginTop: 10 }}>
              {bars.map((w) => (
                <View key={w} style={{ flex: 1, alignItems: 'center', gap: 4 }}>
                  <Text style={st.barV}>{vol[w] ? `${Math.round(vol[w] / 1000)}k` : ''}</Text>
                  <View style={[st.bar, { height: Math.max(6, ((vol[w] || 0) / maxV) * 50), backgroundColor: w === week ? '#e2433b' : '#d5d9e3' }]} />
                  <Text style={st.barL}>W{w}</Text>
                </View>
              ))}
            </View>
          </View>
        )}
      </Panel>

      <CoachCard where="progress" title={pct > 0 && pct < 100 ? `${100 - pct}% to go. Want me to get you there?` : 'Want me to get you to your goal?'}
        body="12 weeks with me. Follow the plan and miss your goal, and I'll coach you up to 12 more weeks for free." />

      {!!rows.length && (
        <Panel title="Check-ins" right={`${rows.length} done`} bodyStyle={{ paddingVertical: 4 }}>
          {[...rows].reverse().map((r, k) => (
            <View key={r.id} style={[st.lift, k < rows.length - 1 && st.line]}>
              <Text style={[st.liftT, { width: 84, flex: 0 }]}>Week {r.week}</Text>
              <Text style={[st.small, { flex: 1 }]}>{r.weight != null ? `${Number(r.weight).toFixed(1)} lbs` : '–'}</Text>
              {r.workouts != null && <Text style={st.small}>{r.workouts} workouts</Text>}
            </View>
          ))}
        </Panel>
      )}
      {coached && <Text style={[st.small, { textAlign: 'center', color: C.muted }]}>Boon sees your trend, lifts and photos with every check-in.</Text>}
    </Page>
  );
}

function Spark({ pts }: { pts: number[] }) {
  const W = 64, H = 26;
  if (pts.length < 2) return <View style={{ width: W }} />;
  const lo = Math.min(...pts), hi = Math.max(...pts);
  const p = pts.map((v, k) => `${(k * W) / (pts.length - 1)},${H - 3 - ((v - lo) / Math.max(1, hi - lo)) * (H - 6)}`).join(' ');
  return <Svg width={W} height={H}><Polyline points={p} fill="none" stroke={C.green} strokeWidth={2.2} strokeLinejoin="round" strokeLinecap="round" /></Svg>;
}

const FILL = { position: 'absolute' as const, top: 0, left: 0, width: '100%' as const, height: '100%' as const };

const st = StyleSheet.create({
  weighBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 42, paddingHorizontal: 16, borderRadius: 21, backgroundColor: C.red },
  weighBtnT: { fontFamily: F.bold, fontSize: 15, color: '#fff' },
  hero: { borderRadius: 24, padding: 20 },
  heroK: { fontFamily: F.bold, fontSize: 12, letterSpacing: 1.2, color: 'rgba(255,255,255,0.7)' },
  heroChip: { fontFamily: F.bold, fontSize: 12, color: '#fff', backgroundColor: 'rgba(31,157,95,0.35)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, overflow: 'hidden' },
  heroV: { fontFamily: F.black, fontSize: 52, letterSpacing: -1.5, color: '#fff', marginTop: 4 },
  heroU: { fontFamily: F.bold, fontSize: 18, letterSpacing: 0, color: 'rgba(255,255,255,0.75)' },
  heroPace: { fontFamily: F.semi, fontSize: 15, color: '#ffffff' },
  heroTrack: { height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.15)', overflow: 'hidden' },
  heroFill: { height: 8, borderRadius: 4, backgroundColor: '#e2433b' },
  heroSm: { fontFamily: F.medium, fontSize: 12, color: 'rgba(255,255,255,0.75)', marginTop: 2 },
  heroRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.12)' },
  heroSmK: { fontFamily: F.bold, fontSize: 11, letterSpacing: 1, color: 'rgba(255,255,255,0.7)' },
  heroEta: { fontFamily: F.xbold, fontSize: 20, color: '#fff', marginTop: 2 },
  heroCta: { height: 46, paddingHorizontal: 18, borderRadius: 23, backgroundColor: '#ffffff', alignItems: 'center', justifyContent: 'center' },
  heroCtaDone: { backgroundColor: 'rgba(31,157,95,0.9)' },
  heroCtaT: { fontFamily: F.bold, fontSize: 15, color: C.ink },
  seg: { flexDirection: 'row', backgroundColor: '#e8eaf0', borderRadius: 10, padding: 3 },
  segB: { paddingHorizontal: 10, height: 28, borderRadius: 8, justifyContent: 'center' },
  segOn: { backgroundColor: C.navy },
  segT: { fontFamily: F.bold, fontSize: 12, color: C.ink },
  legend: { flexDirection: 'row', gap: 14, flexWrap: 'wrap', marginTop: 6 },
  leg: { fontFamily: F.medium, fontSize: 12, color: C.ink },
  empty: { gap: 6, paddingVertical: 6 },
  emptyT: { fontFamily: F.xbold, fontSize: 17, color: C.ink },
  small: { fontFamily: F.medium, fontSize: 14, lineHeight: 20, color: C.ink },
  body: { fontFamily: F.medium, fontSize: 15, lineHeight: 22, color: C.ink },
  kOld: { fontFamily: F.bold, fontSize: 20, color: C.muted, textDecorationLine: 'line-through' },
  kNew: { fontFamily: F.black, fontSize: 28, color: C.ink },
  okDot: { width: 28, height: 28, borderRadius: 14, backgroundColor: C.green, alignItems: 'center', justifyContent: 'center' },
  btnRed: { height: 48, borderRadius: 24, backgroundColor: C.red, alignItems: 'center', justifyContent: 'center' },
  btnRedT: { fontFamily: F.bold, fontSize: 16, color: '#fff' },
  btnGhost: { height: 48, paddingHorizontal: 18, borderRadius: 24, borderWidth: 1.5, borderColor: '#d5d9e3', alignItems: 'center', justifyContent: 'center', backgroundColor: C.bg },
  btnGhostT: { fontFamily: F.bold, fontSize: 15, color: C.ink },
  btnNavy: { height: 46, borderRadius: 23, backgroundColor: C.navy, alignItems: 'center', justifyContent: 'center' },
  btnNavyT: { fontFamily: F.bold, fontSize: 15, color: '#fff' },
  ph: { flex: 1, aspectRatio: 3 / 4, borderRadius: 16, overflow: 'hidden', backgroundColor: '#e8eaf0', alignItems: 'center', justifyContent: 'center' },
  phTag: { position: 'absolute', left: 8, bottom: 8, fontFamily: F.bold, fontSize: 11, letterSpacing: 0.6, color: '#fff', backgroundColor: 'rgba(20,28,51,0.8)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, overflow: 'hidden' },
  recap: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16, borderRadius: 22, backgroundColor: C.card, borderWidth: 1, borderColor: C.line },
  recapIco: { width: 46, height: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  recapT: { fontFamily: F.xbold, fontSize: 17, color: C.ink },
  lift: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  liftT: { fontFamily: F.bold, fontSize: 15, color: C.ink },
  line: { borderBottomWidth: 1, borderBottomColor: '#e9ebf1' },
  line0: { borderTopWidth: 1, borderTopColor: '#e9ebf1' },
  pr: { width: 46, textAlign: 'center', fontFamily: F.bold, fontSize: 12, color: C.green, backgroundColor: '#e7f6ee', paddingVertical: 3, borderRadius: 6, overflow: 'hidden' },
  lbl: { fontFamily: F.bold, fontSize: 14, color: C.ink },
  bar: { width: '100%', borderRadius: 6 },
  barV: { fontFamily: F.semi, fontSize: 10, color: C.muted },
  barL: { fontFamily: F.medium, fontSize: 11, color: C.ink },
});
