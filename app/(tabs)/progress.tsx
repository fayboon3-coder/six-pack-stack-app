import React, { useCallback, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle, Line, Polyline, Text as SvgText } from 'react-native-svg';
import { useAuth } from '../../src/lib/auth';
import { isCoached } from '../../src/lib/access';
import { supabase } from '../../src/lib/supabase';
import { C, F } from '../../src/lib/theme';
import NoPlan from '../../src/components/NoPlan';
import { daysToSunday, phaseOf, PHOTO_WEEKS, plain, weekOf } from '../../src/lib/program';
import type { Checkin } from '../../src/lib/types';
import Backdrop from '../../src/components/Backdrop';
import { twoTone } from '../../src/components/TwoTone';
import {
  BoltIcon, CalendarIcon, CameraIcon, CheckIcon, DumbbellIcon, FlagIcon, ForkIcon, PlayIcon, ScaleIcon, TargetIcon, TrendIcon, TrophyIcon,
} from '../../src/components/icons';

const HERO = require('../../assets/hero/progress_full.jpg');
const CW = 320, CH = 120;

const Badge = ({ children }: { children: React.ReactNode }) => <View style={st.badge}>{children}</View>;

function Stat({ icon, label, value, unit, tone }: { icon: React.ReactNode; label: string; value: string; unit?: string; tone?: string }) {
  return (
    <View style={st.stat}>
      <Badge>{icon}</Badge>
      <Text style={st.statLabel}>{label}</Text>
      <Text style={[st.statValue, tone ? { color: tone } : null]}>{value}{!!unit && <Text style={st.statUnit}> {unit}</Text>}</Text>
    </View>
  );
}

function CardHead({ icon, title, sub }: { icon: React.ReactNode; title: string; sub?: string }) {
  return (
    <View style={st.cardHead}>
      <Badge>{icon}</Badge>
      <View style={{ flex: 1 }}>
        <Text style={st.cardTitle} accessibilityRole="header">{title}</Text>
        {!!sub && <Text style={st.cardSub}>{sub}</Text>}
      </View>
    </View>
  );
}

/** Sample check-ins for App Store screenshots (only with EXPO_PUBLIC_DEMO_CHECKINS=1, never in real builds). */
const DEMO_CHECKINS = [212.4, 209.6, 207.8, 205.2].map((w, i) => ({
  id: 'd' + i, week: i + 1, checkin_date: new Date(Date.UTC(2026, 9, 18 + i * 7)).toISOString().slice(0, 10),
  weight: w, workouts: [4, 4, 3, 4][i], nutrition_days: [5, 6, 6, 7][i], energy: [6, 7, 7, 8][i], win: null,
})) as unknown as Checkin[];

export default function Progress() {
  const { plan, profile, session } = useAuth();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const [rows, setRows] = useState<Checkin[]>([]);

  useFocusEffect(useCallback(() => {
    if (process.env.EXPO_PUBLIC_DEMO_CHECKINS === '1') { setRows(DEMO_CHECKINS); return; } // store screenshots only
    if (!session) return;
    supabase.from('checkins').select('id,week,checkin_date,weight,workouts,nutrition_days,energy,win')
      .eq('user_id', session.user.id).order('checkin_date', { ascending: true })
      .then(({ data }) => setRows((data as Checkin[]) || []));
  }, [session]));

  if (!plan) return <NoPlan name={profile?.first_name} />;

  const week = weekOf(plan.train.s);
  const phase = phaseOf(week);
  const toSunday = daysToSunday();
  const nDays = plan.train.d.length || 4;

  // Goal and start come from the plan ("192 lbs ... (from 212)"); check-ins take over once they exist.
  const goalTxt = plain(plan.goal_long || plan.goal_short || '');
  const goalW = Number((plan.goal_short || '').match(/(\d{2,3})\s*lbs/i)?.[1]) || null;
  const planStart = Number(goalTxt.match(/from\s*(\d{2,3})/i)?.[1]) || null;
  const weights = rows.filter((r) => r.weight != null).map((r) => Number(r.weight));
  const start = weights[0] ?? planStart;
  const latest = weights.length ? weights[weights.length - 1] : null;
  const change = latest != null && start != null ? latest - start : null;
  const toGo = latest != null && goalW != null ? latest - goalW : start != null && goalW != null ? start - goalW : null;
  const fmt = (n: number) => `${n > 0 ? '+' : n < 0 ? '−' : ''}${Math.abs(n).toFixed(1)}`;

  // Consistency averages
  const avg = (xs: (number | null)[]) => { const v = xs.filter((x): x is number => x != null); return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null; };
  const wAvg = avg(rows.map((r) => r.workouts));
  const nAvg = avg(rows.map((r) => r.nutrition_days));
  const eAvg = avg(rows.map((r) => r.energy));

  // Chart
  const series = weights.length ? weights : [];
  const lo = Math.min(...series, goalW ?? Infinity) - 1, hi = Math.max(...series, start ?? -Infinity) + 1;
  const yOf = (w: number) => 10 + ((hi - w) * (CH - 30)) / Math.max(1, hi - lo);
  const pts = series.map((w, k) => [series.length === 1 ? CW / 2 : 12 + (k * (CW - 24)) / (series.length - 1), yOf(w)]);

  const hw = Math.min(width, 640);
  const hh = Math.round(hw * 0.92);
  const checkinOpen = toSunday === 0;
  const name = plan.name || profile?.first_name || '';

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <Backdrop />
    <ScrollView style={{ flex: 1, backgroundColor: 'transparent' }} contentContainerStyle={{ paddingBottom: 120 }}>
      {/* Hero */}
      <View style={{ width: hw, height: hh, alignSelf: 'center' }}>
        <Image source={HERO} style={{ width: hw, height: hh }} resizeMode="cover" accessibilityIgnoresInvertColors />
        <LinearGradient colors={['rgba(13,27,51,0.45)', 'rgba(13,27,51,0)', 'rgba(13,27,51,0.6)', C.bg]} locations={[0, 0.25, 0.6, 1]}
          style={{ position: 'absolute', left: 0, top: 0, width: hw, height: hh }} />
        <View style={st.heroText}>
          <View style={st.pills}>
            <View style={st.pill}><Text style={st.pillText}>Week {week} of 12 · {phase.name}</Text></View>
            {PHOTO_WEEKS.includes(week) && <View style={[st.pill, { backgroundColor: C.green }]}><CameraIcon size={12} color={C.bg} /><Text style={[st.pillText, { color: C.bg }]}>Photo week</Text></View>}
          </View>
          <Text style={st.title} accessibilityRole="header">{twoTone('Your| results')}</Text>
          <Text style={st.lede}>{name ? `${name}, every` : 'Every'} Sunday adds a point to your line. Watch the trend, not one morning on the scale.</Text>
        </View>
      </View>

      <View style={{ paddingHorizontal: 20, gap: 16, marginTop: 6 }}>
        {/* Numbers at a glance */}
        <View style={st.statGrid}>
          <Stat icon={<FlagIcon color={C.red} />} label="Started" value={start != null ? String(start) : '—'} unit={start != null ? 'lbs' : undefined} />
          <Stat icon={<ScaleIcon color={C.red} />} label="Now" value={latest != null ? String(latest) : '—'} unit={latest != null ? 'lbs' : undefined} />
          <Stat icon={<TrendIcon color={C.red} />} label="Change" value={change != null ? fmt(change) : '—'} unit={change != null ? 'lbs' : undefined}
            tone={change != null && change < 0 ? C.green : undefined} />
          <Stat icon={<TargetIcon color={C.red} size={18} />} label="To goal" value={toGo != null ? Math.max(0, toGo).toFixed(1) : '—'} unit={toGo != null ? 'lbs' : undefined} />
        </View>

        {/* Goal */}
        <View style={st.goal}>
          <TrophyIcon color={C.green} />
          <Text style={st.goalText}><Text style={{ fontFamily: F.black }}>Your goal: </Text>{goalTxt || plain(plan.goal_short)}</Text>
        </View>

        {/* Check-in CTA */}
        <Pressable accessibilityRole="button" onPress={() => router.push('/checkin')} style={({ pressed }) => [st.cta, pressed && { opacity: 0.9 }]}>
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={st.ctaKicker}>{checkinOpen ? 'Check-in is open' : `Next check-in in ${toSunday} day${toSunday > 1 ? 's' : ''}`}</Text>
            <Text style={st.ctaTitle}>{checkinOpen ? 'Do your check-in now' : 'Open your check-in'}</Text>
            <Text style={st.ctaSub}>{isCoached(profile) ? '2 minutes · Boon replies within 24 hours' : '2 minutes · it updates your trend'}</Text>
          </View>
          <View style={st.ctaBtn}><PlayIcon size={16} /></View>
        </Pressable>

        {/* Trend */}
        <View style={st.card}>
          <CardHead icon={<TrendIcon color={C.red} />} title="Weight trend" sub="Your 7-day average from each Sunday check-in." />
          {series.length ? (
            <Svg width="100%" height={CH} viewBox={`0 0 ${CW} ${CH}`} accessibilityLabel={`Weight trend from ${start} to ${latest} pounds`}>
              {goalW != null && <>
                <Line x1={0} y1={yOf(goalW)} x2={CW} y2={yOf(goalW)} stroke={C.green} strokeWidth={1.5} strokeDasharray="5 5" />
                <SvgText x={CW - 4} y={yOf(goalW) - 5} fill={C.green} fontSize={10} fontWeight="700" textAnchor="end">Goal {goalW}</SvgText>
              </>}
              {pts.length > 1 && <Polyline points={pts.map((p) => p.join(',')).join(' ')} fill="none" stroke={C.red} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />}
              {pts.map((p, k) => <Circle key={k} cx={p[0]} cy={p[1]} r={k === pts.length - 1 ? 6 : 3.5} fill={k === pts.length - 1 ? C.red : C.ink} />)}
            </Svg>
          ) : (
            <View style={st.empty}>
              <Svg width="100%" height={70} viewBox="0 0 320 70">
                <Polyline points="10,18 70,24 130,22 190,36 250,44 310,56" fill="none" stroke={C.line} strokeWidth={3} strokeDasharray="2 8" strokeLinecap="round" />
              </Svg>
              <Text style={st.emptyText}>Your line starts with your first check-in. Weigh in every morning this week and send the average on Sunday.</Text>
            </View>
          )}
        </View>

        {/* 12-week journey */}
        <View style={st.card}>
          <CardHead icon={<CalendarIcon color={C.red} />} title="Your 12 weeks" sub="Strip, Stack, Six-Pack. Camera marks a photo week." />
          <View style={st.weeks}>
            {Array.from({ length: 12 }, (_, i) => i + 1).map((w) => {
              const doneW = rows.some((r) => r.week === w);
              const now = w === week;
              return (
                <View key={w} style={st.weekCol}>
                  <View style={[st.weekDot, doneW && { backgroundColor: C.green, borderColor: C.green }, now && !doneW && { borderColor: C.red, backgroundColor: C.red }]}>
                    {doneW ? <CheckIcon size={11} /> : <Text style={st.weekNum}>{w}</Text>}
                  </View>
                  {PHOTO_WEEKS.includes(w) ? <CameraIcon size={11} color={now ? C.red : C.ink} /> : <View style={{ height: 11 }} />}
                </View>
              );
            })}
          </View>
          <View style={st.phases}>
            {['Strip', 'Stack', 'Six-Pack'].map((p, i) => (
              <View key={p} style={[st.phase, phase.n === i + 1 && { backgroundColor: C.red, borderColor: C.red }]}><Text style={st.phaseText}>{p}</Text></View>
            ))}
          </View>
        </View>

        {/* Consistency */}
        <View style={st.card}>
          <CardHead icon={<BoltIcon color={C.red} />} title="Consistency" sub="Averages from your check-ins. This is what moves the scale." />
          {[
            { icon: <DumbbellIcon color={C.red} size={16} />, label: 'Workouts a week', v: wAvg, max: nDays },
            { icon: <ForkIcon color={C.red} size={16} />, label: 'Days on your food', v: nAvg, max: 7 },
            { icon: <BoltIcon color={C.red} size={16} />, label: 'Energy', v: eAvg, max: 10 },
          ].map((m) => (
            <View key={m.label} style={{ gap: 6 }}>
              <View style={st.meterHead}>
                {m.icon}<Text style={[st.meterLabel, { flex: 1 }]}>{m.label}</Text>
                <Text style={st.meterValue}>{m.v != null ? `${m.v.toFixed(1)} / ${m.max}` : '—'}</Text>
              </View>
              <View style={st.track}><View style={[st.fill, { width: `${m.v != null ? Math.min(100, (m.v / m.max) * 100) : 0}%` }]} /></View>
            </View>
          ))}
        </View>

        {/* History */}
        <Text style={st.section}>Check-in history</Text>
        {rows.length === 0 && <Text style={st.emptyText}>Your Sunday check-ins will stack up here, each with your numbers and your win.</Text>}
        {[...rows].reverse().map((r) => (
          <View key={r.id} style={st.hist}>
            <View style={st.histHead}>
              <View style={st.histWeek}><Text style={st.histWeekText}>W{r.week}</Text></View>
              <Text style={[st.cardTitle, { flex: 1 }]}>Week {r.week}</Text>
              <Text style={st.cardSub}>{r.checkin_date}</Text>
            </View>
            <View style={st.histRow}>
              <View style={st.histItem}><ScaleIcon color={C.red} size={15} /><Text style={st.histText}>{r.weight ?? '—'} lbs</Text></View>
              <View style={st.histItem}><DumbbellIcon color={C.red} size={15} /><Text style={st.histText}>{r.workouts ?? '–'}/{nDays}</Text></View>
              <View style={st.histItem}><ForkIcon color={C.red} size={15} /><Text style={st.histText}>{r.nutrition_days ?? '–'}/7</Text></View>
              <View style={st.histItem}><BoltIcon color={C.red} size={15} /><Text style={st.histText}>{r.energy ?? '–'}/10</Text></View>
            </View>
            {!!r.win && <View style={st.win}><TrophyIcon color={C.green} size={15} /><Text style={st.winText}>{r.win}</Text></View>}
          </View>
        ))}
      </View>
    </ScrollView>
    </View>
  );
}

const st = StyleSheet.create({
  heroText: { position: 'absolute', left: 20, right: 20, bottom: 4, gap: 8 },
  pills: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: C.red, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 },
  pillText: { fontFamily: F.black, fontSize: 11, letterSpacing: 1.2, textTransform: 'uppercase', color: C.onAccent },
  title: { fontFamily: F.black, fontSize: 34, lineHeight: 38, color: C.ink, letterSpacing: -0.6, textTransform: 'uppercase' },
  lede: { fontFamily: F.semi, fontSize: 15, lineHeight: 21, color: C.ink },
  badge: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(226,67,59,0.14)', borderWidth: 1, borderColor: 'rgba(226,67,59,0.45)', alignItems: 'center', justifyContent: 'center' },
  statGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  stat: { width: '48%', flexGrow: 1, backgroundColor: C.card, borderWidth: 1, borderColor: C.line, borderRadius: 18, padding: 14, gap: 6 },
  statLabel: { fontFamily: F.xbold, fontSize: 11, letterSpacing: 1.2, textTransform: 'uppercase', color: C.ink, marginTop: 4 },
  statValue: { fontFamily: F.black, fontSize: 26, color: C.ink },
  statUnit: { fontFamily: F.bold, fontSize: 13, color: C.ink },
  goal: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderColor: C.green, backgroundColor: 'rgba(63,191,127,0.1)', borderRadius: 16, padding: 14 },
  goalText: { flex: 1, fontFamily: F.semi, fontSize: 14, lineHeight: 20, color: C.ink },
  card: { backgroundColor: C.card, borderWidth: 1, borderColor: C.line, borderRadius: 22, padding: 16, gap: 16 },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  cardTitle: { fontFamily: F.black, fontSize: 18, color: C.ink },
  cardSub: { fontFamily: F.semi, fontSize: 12, lineHeight: 17, color: C.ink },
  empty: { gap: 8 },
  emptyText: { fontFamily: F.semi, fontSize: 13, lineHeight: 19, color: C.ink },
  weeks: { flexDirection: 'row', justifyContent: 'space-between' },
  weekCol: { alignItems: 'center', gap: 6 },
  weekDot: { width: 24, height: 24, borderRadius: 12, borderWidth: 1.5, borderColor: C.line, alignItems: 'center', justifyContent: 'center' },
  weekNum: { fontFamily: F.black, fontSize: 10, color: C.ink },
  phases: { flexDirection: 'row', gap: 8 },
  phase: { flex: 1, borderWidth: 1, borderColor: C.line, borderRadius: 10, paddingVertical: 8, alignItems: 'center' },
  phaseText: { fontFamily: F.black, fontSize: 12, letterSpacing: 1, textTransform: 'uppercase', color: C.ink },
  meterHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  meterLabel: { fontFamily: F.xbold, fontSize: 14, color: C.ink },
  meterValue: { fontFamily: F.black, fontSize: 14, color: C.ink },
  track: { height: 8, borderRadius: 4, backgroundColor: C.bg, overflow: 'hidden' },
  fill: { height: 8, borderRadius: 4, backgroundColor: C.green },
  cta: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: C.red, borderRadius: 20, padding: 18 },
  ctaKicker: { fontFamily: F.xbold, fontSize: 11, letterSpacing: 1.3, textTransform: 'uppercase', color: C.onAccent },
  ctaTitle: { fontFamily: F.black, fontSize: 20, color: C.onAccent },
  ctaSub: { fontFamily: F.semi, fontSize: 12, color: C.onAccent },
  ctaBtn: { width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(13,27,51,0.35)', alignItems: 'center', justifyContent: 'center', paddingLeft: 3 },
  section: { fontFamily: F.black, fontSize: 21, color: C.ink, marginTop: 6 },
  hist: { backgroundColor: C.card, borderWidth: 1, borderColor: C.line, borderRadius: 18, padding: 14, gap: 12 },
  histHead: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  histWeek: { width: 36, height: 36, borderRadius: 18, backgroundColor: C.red, alignItems: 'center', justifyContent: 'center' },
  histWeekText: { fontFamily: F.black, fontSize: 12, color: C.ink },
  histRow: { flexDirection: 'row', justifyContent: 'space-between' },
  histItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  histText: { fontFamily: F.xbold, fontSize: 13, color: C.ink },
  win: { flexDirection: 'row', gap: 8, alignItems: 'flex-start', borderTopWidth: 1, borderTopColor: C.line, paddingTop: 10 },
  winText: { flex: 1, fontFamily: F.semi, fontSize: 13, lineHeight: 19, color: C.ink },
});
