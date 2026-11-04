import React, { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import Svg, { Circle, Line, Polyline } from 'react-native-svg';
import { useAuth } from '../../src/lib/auth';
import { supabase } from '../../src/lib/supabase';
import { C, F } from '../../src/lib/theme';
import Page from '../../src/components/Page';
import PageTitle from '../../src/components/PageTitle';
import Panel from '../../src/components/Panel';
import NoPlan from '../../src/components/NoPlan';
import { plain, weekOf } from '../../src/lib/program';
import { exName } from '../../src/lib/workoutMeta';
import type { Checkin } from '../../src/lib/types';

type Log = { exercise_id: string; weight: number | null; reps: number | null; logged_on: string };
const W = 300, H = 70;
const fmt = (n: number) => Math.round(n).toLocaleString('en-US');
const withTimeout = <T,>(p: PromiseLike<T>, ms: number, fallback: T) => Promise.race([Promise.resolve(p).catch(() => fallback), new Promise<T>((r) => setTimeout(() => r(fallback), ms))]);

/** Sample check-ins for App Store screenshots (only with EXPO_PUBLIC_DEMO_CHECKINS=1, never in real builds). */
const DEMO_CHECKINS = [194.0, 192.6, 191.8, 190.4].map((w, i) => ({ id: 'd' + i, week: i + 1, checkin_date: '', weight: w, workouts: 4, nutrition_days: 6, energy: 7, win: null })) as unknown as Checkin[];

/** Progress: Exercises · Weight lifted · Charts · Goals. */
export default function Progress() {
  const { plan, profile, session } = useAuth();
  const router = useRouter();
  const [rows, setRows] = useState<Checkin[]>([]);
  const [logs, setLogs] = useState<Log[]>([]);
  const [allEx, setAllEx] = useState(false);

  useFocusEffect(useCallback(() => {
    if (process.env.EXPO_PUBLIC_DEMO_CHECKINS === '1') setRows(DEMO_CHECKINS);
    if (!session) return;
    const uid = session.user.id;
    if (process.env.EXPO_PUBLIC_DEMO_CHECKINS !== '1')
      withTimeout(supabase.from('checkins').select('id,week,checkin_date,weight,workouts,nutrition_days,energy,win').eq('user_id', uid).order('checkin_date', { ascending: true }), 5000, { data: [] } as any)
        .then(({ data }: any) => setRows((data as Checkin[]) || []));
    withTimeout(supabase.from('workout_logs').select('exercise_id,weight,reps,logged_on').eq('user_id', uid).order('logged_on', { ascending: true }).limit(5000), 5000, { data: [] } as any)
      .then(({ data }: any) => setLogs((data as Log[]) || []));
  }, [session]));

  if (!plan) return <NoPlan name={profile?.first_name} />;
  const week = weekOf(plan.train.s);

  // Exercises: first top set vs latest top set
  const byEx: Record<string, { first: number; firstDay: string; last: number; lastDay: string }> = {};
  for (const l of logs) {
    const w = Number(l.weight) || 0; if (!w) continue;
    const e = byEx[l.exercise_id];
    if (!e) byEx[l.exercise_id] = { first: w, firstDay: l.logged_on, last: w, lastDay: l.logged_on };
    else {
      if (l.logged_on === e.firstDay) e.first = Math.max(e.first, w);
      if (l.logged_on > e.lastDay) { e.last = w; e.lastDay = l.logged_on; } else if (l.logged_on === e.lastDay) e.last = Math.max(e.last, w);
    }
  }
  const exRows = Object.entries(byEx).map(([id, v]) => ({ id, ...v, gain: v.last - v.first })).sort((a, b) => b.gain - a.gain || b.last - a.last);
  const shown = allEx ? exRows : exRows.slice(0, 2);

  // Weight lifted per program week
  const start = plan.train.s ? new Date(plan.train.s + 'T00:00:00').getTime() : 0;
  const vol: Record<number, number> = {};
  for (const l of logs) {
    const wk = start ? Math.min(12, Math.max(1, Math.floor((new Date(l.logged_on + 'T12:00:00').getTime() - start) / 864e5 / 7) + 1)) : 1;
    vol[wk] = (vol[wk] || 0) + (Number(l.weight) || 0) * (Number(l.reps) || 0);
  }
  const bars = [week - 2, week - 1, week].filter((w) => w >= 1);
  const maxV = Math.max(1, ...bars.map((w) => vol[w] || 0));
  const thisWeek = vol[week] || 0;
  const vsW1 = week > 1 && vol[1] ? Math.round(((thisWeek - vol[1]) / vol[1]) * 100) : null;

  // Body weight
  const goalTxt = plain(plan.goal_long || plan.goal_short || '');
  const goalW = Number((plan.goal_short || '').match(/(\d{2,3})\s*lbs/i)?.[1]) || null;
  const planStart = Number(goalTxt.match(/from\s*(\d{2,3})/i)?.[1]) || null;
  const weights = rows.filter((r) => r.weight != null).map((r) => Number(r.weight));
  const startW = planStart ?? weights[0] ?? null;
  const latest = weights.length ? weights[weights.length - 1] : null;
  const delta = latest != null && startW != null ? latest - startW : null;
  const series = startW != null && planStart != null ? [startW, ...weights] : weights;
  const lo = Math.min(...series, goalW ?? Infinity) - 0.5, hi = Math.max(...series) + 0.5;
  const y = (w: number) => 6 + ((hi - w) * (H - 12)) / Math.max(0.5, hi - lo);
  const x = (k: number) => (k * W) / 12;
  const pts = series.map((w, k) => `${x(k)},${y(w)}`).join(' ');
  const pct = startW != null && goalW != null && latest != null && startW !== goalW ? Math.max(0, Math.min(100, Math.round(((startW - latest) / (startW - goalW)) * 100))) : 0;

  return (
    <Page header={<PageTitle title="Progress" />}>
      <Panel title="Exercises" onMore={exRows.length > 2 ? () => setAllEx(!allEx) : undefined} bodyStyle={{ paddingVertical: 4 }}>
        {!exRows.length && <Text style={[st.small, { paddingVertical: 10 }]}>Log your first workout. Every set you save shows up here.</Text>}
        {shown.map((r, k) => (
          <View key={r.id} style={[st.exRow, k < shown.length - 1 && st.line]}>
            <Text style={st.exT} numberOfLines={1}>{exName(r.id, plan)}</Text>
            <Text style={st.exV}>{r.gain > 0 ? `${fmt(r.first)} → ${fmt(r.last)}` : fmt(r.last)} lbs</Text>
            {r.gain > 0 && <Text style={st.pr}>PR</Text>}
          </View>
        ))}
      </Panel>

      <Panel title="Weight lifted">
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 14 }}>
          <View style={{ minWidth: 110 }}>
            <Text style={st.huge}>{fmt(thisWeek)}</Text>
            <Text style={st.small}>lbs this week</Text>
            {vsW1 != null && <Text style={[st.small, { color: vsW1 >= 0 ? C.green : C.red, fontFamily: F.bold, marginTop: 2 }]}>{vsW1 >= 0 ? '+' : ''}{vsW1}% vs week 1</Text>}
          </View>
          <View style={{ flex: 1, flexDirection: 'row', gap: 8, alignItems: 'flex-end', height: 74 }}>
            {bars.map((w) => (
              <View key={w} style={{ flex: 1, alignItems: 'center', gap: 4 }}>
                <View style={[st.bar, { height: Math.max(8, ((vol[w] || 0) / maxV) * 58), backgroundColor: w === week ? '#e2433b' : '#e3e6ee' }]} />
                <Text style={st.barL}>W{w}</Text>
              </View>
            ))}
          </View>
        </View>
      </Panel>

      <Panel title="Charts" right={<Pressable onPress={() => router.push('/checkin')} accessibilityRole="button" hitSlop={6}><Text style={st.pin}>+ Check in</Text></Pressable>}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text style={st.lbl}>Body weight</Text>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
            <Text style={st.bw}>{latest != null ? latest.toFixed(1) : startW != null ? startW.toFixed(1) : '–'}</Text>
            <Text style={st.small}>lbs</Text>
            {delta != null && delta !== 0 && <Text style={[st.chip, delta > 0 && { backgroundColor: C.redTint, color: C.red }]}>{delta > 0 ? '+' : '−'}{Math.abs(delta).toFixed(1)}</Text>}
          </View>
        </View>
        <Svg width="100%" height={H} viewBox={`-4 0 ${W + 8} ${H}`} style={{ marginTop: 10 }}>
          {startW != null && goalW != null && <Line x1={0} y1={y(startW)} x2={W} y2={y(goalW)} stroke={C.ink} strokeWidth={1.4} strokeDasharray="4 4" />}
          {series.length > 1 && <Polyline points={pts} fill="none" stroke="#e2433b" strokeWidth={3} strokeLinejoin="round" strokeLinecap="round" />}
          {series.length > 0 && <Circle cx={x(series.length - 1)} cy={y(series[series.length - 1])} r={4} fill="#e2433b" />}
        </Svg>
        {weights.length < 1 && <Text style={[st.small, { marginTop: 6 }]}>Your first Sunday check-in starts the line. Dashed line is the pace to your goal.</Text>}
      </Panel>

      <Panel title="Goals">
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Text style={st.lbl}>{goalW ? `${goalW} lbs by week 12` : plain(plan.goal_short) || 'Your 12-week goal'}</Text>
          <Text style={st.lblR}>{pct}%</Text>
        </View>
        <View style={st.track}><View style={[st.fill, { width: `${pct}%` }]} /></View>
        {!!plan.goal_long && <Text style={[st.small, { marginTop: 10 }]}>{plain(plan.goal_long)}</Text>}
      </Panel>

      {!!rows.length && (
        <Panel title="Check-ins" right={`${rows.length} done`} bodyStyle={{ paddingVertical: 4 }}>
          {[...rows].reverse().map((r, k) => (
            <View key={r.id} style={[st.exRow, k < rows.length - 1 && st.line]}>
              <Text style={[st.exT, { width: 70, flex: 0, fontFamily: F.bold }]}>Week {r.week}</Text>
              <Text style={[st.exT]}>{r.weight != null ? `${Number(r.weight).toFixed(1)} lbs` : '–'}</Text>
              {r.workouts != null && <Text style={st.small}>{r.workouts} workouts</Text>}
            </View>
          ))}
        </Panel>
      )}
    </Page>
  );
}

const st = StyleSheet.create({
  small: { fontFamily: F.medium, fontSize: 14, color: C.ink },
  line: { borderBottomWidth: 1, borderBottomColor: '#e9ebf1' },
  exRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 11 },
  exT: { flex: 1, fontFamily: F.medium, fontSize: 15, color: C.ink },
  exV: { fontFamily: F.medium, fontSize: 15, color: C.ink },
  pr: { fontFamily: F.bold, fontSize: 11, color: C.green, backgroundColor: '#e7f6ee', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, overflow: 'hidden' },
  huge: { fontFamily: F.black, fontSize: 28, color: C.ink },
  bar: { width: '100%', borderRadius: 8 },
  barL: { fontFamily: F.medium, fontSize: 11, color: C.ink },
  pin: { fontFamily: F.bold, fontSize: 13, color: C.ink },
  lbl: { fontFamily: F.bold, fontSize: 15, color: C.ink, flexShrink: 1 },
  lblR: { fontFamily: F.medium, fontSize: 15, color: C.ink },
  bw: { fontFamily: F.black, fontSize: 22, color: C.ink },
  chip: { fontFamily: F.bold, fontSize: 13, color: C.green, backgroundColor: '#e7f6ee', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, overflow: 'hidden' },
  track: { height: 8, borderRadius: 4, backgroundColor: '#e8eaf0', marginTop: 10, overflow: 'hidden' },
  fill: { height: 8, borderRadius: 4, backgroundColor: '#e2433b' },
});
