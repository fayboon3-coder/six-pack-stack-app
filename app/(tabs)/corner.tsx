import React, { useCallback, useState } from 'react';
import { Image, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { useAuth } from '../../src/lib/auth';
import { C, F } from '../../src/lib/theme';
import NoPlan, { WHATSAPP } from '../../src/components/NoPlan';
import { PHOTO_WEEKS, phaseOf, plain, todayIndex, weekOf } from '../../src/lib/program';
import { dayMeta } from '../../src/lib/workoutMeta';
import { checkinState, focusOf, loadCoaching, type ClientCheckin, type Review } from '../../src/lib/coaching';
import { allWeighIns } from '../../src/lib/body';
import { trendSeries, type TrendPoint } from '../../src/lib/trend';
import { num, proteinGoal, readDay, stepGoal, type Day } from '../../src/lib/daily';
import { kcalToday } from '../../src/lib/food';
import { track } from '../../src/lib/track';

const BOON = require('../../assets/hero/boon_avatar.jpg');
const DEMO = process.env.EXPO_PUBLIC_DEMO === '1';
const fmt = (n: number) => Math.round(n).toLocaleString('en-US');
const nice = (iso: string) => new Date(iso.slice(0, 10) + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
const hello = () => { const h = new Date().getHours(); return h < 12 ? 'Morning' : h < 18 ? 'Afternoon' : 'Evening'; };

/** 1:1 coaching home: Boon's note and this week's one thing, check-in status, today, the guarantee, the 12 weeks. */
export default function Corner() {
  const { plan, profile, session } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [checkins, setCheckins] = useState<ClientCheckin[]>([]);
  const [open, setOpen] = useState(false);
  const [series, setSeries] = useState<TrendPoint[]>([]);
  const [day, setDay] = useState<Day>({ steps: 0, protein: 0, adds: [] });
  const [kcal, setKcal] = useState(0);

  useFocusEffect(useCallback(() => {
    if (!session) return;
    loadCoaching(session.user.id).then(({ reviews, checkins }) => { setReviews(reviews); setCheckins(checkins); });
    allWeighIns(DEMO ? undefined : session.user.id).then((w) => setSeries(trendSeries(w)));
    readDay().then(setDay);
    if (plan) kcalToday(plan).then(setKcal);
  }, [session, plan]));

  if (!plan) return <NoPlan name={profile?.first_name} />;
  const name = plan.name || profile?.first_name || '';
  const week = weekOf(plan.train.s);
  const phase = phaseOf(week);
  const latest = reviews[0];
  const focus = focusOf(latest);
  const cs = checkinState(reviews, checkins);
  const toSun = (7 - new Date().getDay()) % 7;
  const { index, isToday } = todayIndex(plan);
  const meta = dayMeta(plan.train.d[index], plan.train.c);
  const pg = proteinGoal(plan), sg = stepGoal(plan), kg = num(plan.kcal) || 2000;

  // Guarantee: the goal Boon set, and how close the trend is
  const goalW = Number((plan.goal_short || '').match(/(\d{2,3})\s*lbs/i)?.[1]) || null;
  const startW = Number(plain(plan.goal_long || '').match(/from\s*(\d{2,3})/i)?.[1]) || series[0]?.w || null;
  const last = series.length ? series[series.length - 1].t : null;
  const pct = startW && goalW && last && startW !== goalW ? Math.max(0, Math.min(100, Math.round(((startW - last) / (startW - goalW)) * 100))) : 0;
  const onTime = checkins.length;
  const saved = plan.before && plan.after && plan.before > plan.after ? plan.before - plan.after : 0;
  const wa = (text?: string) => { track('whatsapp_tap', { where: 'corner' }); Linking.openURL(`https://wa.me/${WHATSAPP}${text ? `?text=${encodeURIComponent(text)}` : ''}`); };

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 130 }}>
        {/* Hero */}
        <LinearGradient colors={['#141c33', '#1d2a52', '#2a1530']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[st.hero, { paddingTop: insets.top + 16 }]}>
          <View style={st.badgeRow}>
            <View style={st.badge}><Text style={st.badgeT}>1:1 COACHING</Text></View>
            <Text style={st.heroWeek}>Week {week} of 12 · {phase.name}</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, marginTop: 18 }}>
            <View style={st.avRing}><Image source={BOON} style={st.av} /></View>
            <View style={{ flex: 1 }}>
              <Text style={st.hi}>{hello()}{name ? `, ${name}` : ''}.</Text>
              <Text style={st.hiS}>I'm in your corner. Here's your week.</Text>
            </View>
          </View>
          <View style={st.weeks} accessibilityLabel={`Week ${week} of 12`}>
            {Array.from({ length: 12 }, (_, k) => (
              <View key={k} style={[st.wk, k + 1 < week && st.wkDone, k + 1 === week && st.wkNow]} />
            ))}
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 }}>
            {['Strip', 'Stack', 'Six-Pack'].map((p, k) => <Text key={p} style={[st.ph, phase.n === k + 1 && { color: '#fff', fontFamily: F.bold }]}>{p}</Text>)}
          </View>
        </LinearGradient>

        <View style={st.body}>
          {/* Boon's note */}
          <View style={st.note}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Image source={BOON} style={st.noteAv} />
              <View style={{ flex: 1 }}>
                <Text style={st.noteK}>FROM BOON</Text>
                <Text style={st.noteW}>{latest ? `${latest.week ? `Week ${latest.week} review · ` : ''}${nice(latest.created_at)}` : 'Your weekly review'}</Text>
              </View>
            </View>
            {latest ? (
              <>
                <Text style={st.noteB} numberOfLines={open ? undefined : 5}>{latest.body}</Text>
                {latest.body.length > 220 && <Text accessibilityRole="button" onPress={() => setOpen(!open)} style={st.more}>{open ? 'Show less' : 'Read all'}</Text>}
              </>
            ) : (
              <Text style={st.noteB}>Send me your first Sunday check-in. I read every one myself and reply within 24 hours with what's working, the one thing we change, and your focus for the week.</Text>
            )}
            {!!focus && (
              <View style={st.focus}>
                <Text style={st.focusK}>YOUR ONE THING THIS WEEK</Text>
                <Text style={st.focusT}>{focus}</Text>
              </View>
            )}
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <Pressable accessibilityRole="button" onPress={() => wa(latest ? `Re: week ${latest.week || ''} review: ` : undefined)} style={[st.btn, st.btnNavy, { flex: 1 }]}>
                <Wa /><Text style={st.btnT}>Reply to Boon</Text>
              </Pressable>
              <Pressable accessibilityRole="button" onPress={() => router.push('/boon')} style={[st.btn, st.btnGhost]}><Text style={st.btnGT}>All reviews</Text></Pressable>
            </View>
          </View>

          {/* Check-in status */}
          <Pressable accessibilityRole="button" onPress={() => (cs.state === 'due' ? router.push('/checkin') : router.push('/boon'))} style={[st.card, st.ci]}>
            <View style={[st.ciIco, cs.state !== 'due' && { backgroundColor: cs.state === 'reviewed' ? C.green : C.navy }]}>
              {cs.state === 'due'
                ? <Svg width={20} height={20} viewBox="0 0 24 24"><Path d="M3 9a2 2 0 0 1 2-2h2l2-3h6l2 3h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" stroke="#fff" strokeWidth={2} fill="none" strokeLinejoin="round" /><Circle cx={12} cy={13.5} r={3.5} stroke="#fff" strokeWidth={2} fill="none" /></Svg>
                : <Svg width={18} height={18} viewBox="0 0 24 24"><Path d="M5 12.5l4.5 4.5L19 7.5" stroke="#fff" strokeWidth={3} fill="none" strokeLinecap="round" strokeLinejoin="round" /></Svg>}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={st.ciT}>{cs.state === 'due' ? (toSun === 0 ? 'Check-in day. Send me your week.' : `Sunday check-in in ${toSun} day${toSun > 1 ? 's' : ''}`) : cs.state === 'sent' ? 'Sent. I\'m going through it.' : `Week ${cs.latest?.week} reviewed`}</Text>
              <Text style={st.s}>{cs.state === 'due' ? `About 2 minutes, straight to me.${PHOTO_WEEKS.includes(week) ? ' Photo week.' : ''}` : cs.state === 'sent' ? 'You\'ll have my reply within 24 hours.' : 'My notes are above. Questions? Text me.'}</Text>
            </View>
            {cs.state === 'due' && <View style={st.ciGo}><Text style={st.ciGoT}>Start</Text></View>}
          </Pressable>

          {/* Today */}
          <Text style={st.sec}>TODAY, FROM YOUR PLAN</Text>
          <View style={st.card}>
            <Pressable accessibilityRole="button" onPress={() => router.push({ pathname: '/day', params: { d: String(index) } })} style={st.today}>
              <View style={{ flex: 1 }}>
                <Text style={st.k}>{isToday ? 'TRAINING TODAY' : 'NEXT SESSION'}</Text>
                <Text style={st.t}>{meta.type}</Text>
                <Text style={st.s}>{meta.items.length} exercises · about {meta.minutes} min</Text>
              </View>
              <View style={st.play}><Svg width={16} height={16} viewBox="0 0 24 24"><Path d="M7 4v16l13-8z" fill="#fff" /></Svg></View>
            </Pressable>
            <View style={st.div} />
            <View style={{ flexDirection: 'row', gap: 14, padding: 16 }}>
              <Mini label="Protein" v={`${fmt(day.protein)}`} of={`${fmt(pg)} g`} pct={day.protein / pg} color="#d22f26" />
              <Mini label="Calories" v={fmt(kcal)} of={fmt(kg)} pct={kcal / kg} color="#ffb347" />
              <Mini label="Steps" v={fmt(day.steps)} of={fmt(sg)} pct={day.steps / sg} color={C.green} />
            </View>
            <View style={st.div} />
            <View style={{ flexDirection: 'row' }}>
              <Quick label="Log food" onPress={() => router.push('/log-food')} />
              <Quick label="Weigh in" onPress={() => router.push('/weigh-in')} />
              <Quick label="Ask Stack" onPress={() => router.push('/stack')} last />
            </View>
          </View>

          {/* Guarantee */}
          <Text style={st.sec}>YOUR GOAL AND MY GUARANTEE</Text>
          <View style={[st.card, { padding: 18, gap: 12 }]}>
            <Text style={st.goal}>{plain(plan.goal_short) || 'Your 12-week goal'}</Text>
            <View style={st.track}><View style={[st.fill, { width: `${pct}%` }]} /></View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={st.s}>{last ? `Trend ${last.toFixed(1)} lbs` : 'Weigh in to track it'}</Text>
              <Text style={[st.s, { fontFamily: F.bold }]}>{pct}% there</Text>
            </View>
            <View style={st.guar}>
              <Svg width={22} height={22} viewBox="0 0 24 24"><Path d="M12 3l7 3v5c0 5-3 8.5-7 10-4-1.5-7-5-7-10V6z" stroke={C.green} strokeWidth={2} fill="none" strokeLinejoin="round" /><Path d="M8.5 12l2.5 2.5 4.5-5" stroke={C.green} strokeWidth={2.2} fill="none" strokeLinecap="round" strokeLinejoin="round" /></Svg>
              <Text style={[st.s, { flex: 1 }]}>Follow the plan and miss it, and I coach you up to 12 more weeks free. Check-ins sent: <Text style={{ fontFamily: F.bold }}>{onTime} of {Math.max(onTime, week - (new Date().getDay() === 0 ? 0 : 1))}</Text>.</Text>
            </View>
          </View>

          {/* Built by Boon */}
          <Text style={st.sec}>BUILT FOR YOU</Text>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Tile k="YOUR STACK" t={saved ? `$${saved}/mo saved` : `${plan.stack?.length || 0} that work`} s={plan.stack_short || 'Audited by me'} onPress={() => router.push({ pathname: '/plan-details', params: { tab: 'Stack' } })} />
            <Tile k="YOUR MEALS" t={`${fmt(kg)} cal`} s={`${plan.eat_out?.length || 0} eat-out orders`} onPress={() => router.push('/plan')} />
          </View>

          {/* 12 weeks */}
          <Text style={st.sec}>THE 12 WEEKS</Text>
          <View style={[st.card, { paddingVertical: 6 }]}>
            {MILESTONES.filter((m) => m.w >= week - 1).slice(0, 4).map((m, k, arr) => (
              <View key={m.w + m.t} style={[st.ms, k < arr.length - 1 && st.msLine]}>
                <View style={[st.msDot, m.w <= week && { backgroundColor: C.red, borderColor: C.red }]}><Text style={[st.msW, m.w <= week && { color: '#fff' }]}>{m.w}</Text></View>
                <View style={{ flex: 1 }}><Text style={st.msT}>{m.t}</Text><Text style={st.s}>{m.s}</Text></View>
              </View>
            ))}
          </View>

          {/* Direct line */}
          <Pressable accessibilityRole="button" onPress={() => wa()} style={st.line}>
            <Image source={BOON} style={st.lineAv} />
            <View style={{ flex: 1 }}>
              <Text style={st.lineT}>Text me anytime</Text>
              <Text style={st.lineS}>WhatsApp (323) 229-0609 · I reply within 24 hours</Text>
            </View>
            <Wa size={22} />
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

const MILESTONES = [
  { w: 1, t: 'Starting photos + numbers', s: 'Front, side, back. Same spot, same light.' },
  { w: 3, t: 'Photo check-in', s: 'First side-by-side. Most people see it here.' },
  { w: 4, t: 'Re-set with me', s: 'I adjust your calories from your real trend.' },
  { w: 5, t: 'Stack phase starts', s: 'We add weight or reps every week.' },
  { w: 7, t: 'Photo check-in', s: 'Halfway. We compare to week 1.' },
  { w: 8, t: 'Re-set with me', s: 'Second adjustment before the final push.' },
  { w: 9, t: 'Six-Pack phase', s: 'Keep the weights heavy while you get lean.' },
  { w: 11, t: 'Photo check-in', s: 'Last look before the finish.' },
  { w: 12, t: 'Wrap-up + your maintenance plan', s: 'Final photos, your results, and how to keep them.' },
];

const Mini = ({ label, v, of, pct, color }: { label: string; v: string; of: string; pct: number; color: string }) => (
  <View style={{ flex: 1 }}>
    <Text style={st.miniL}>{label}</Text>
    <Text style={st.miniV}>{v}<Text style={st.miniOf}> / {of}</Text></Text>
    <View style={st.miniT}><View style={{ height: 5, borderRadius: 3, width: `${Math.min(100, Math.max(0, pct * 100))}%`, backgroundColor: color }} /></View>
  </View>
);
const Quick = ({ label, onPress, last }: { label: string; onPress: () => void; last?: boolean }) => (
  <Pressable accessibilityRole="button" onPress={onPress} style={[st.q, !last && { borderRightWidth: 1, borderRightColor: C.line }]}><Text style={st.qT}>{label}</Text></Pressable>
);
const Tile = ({ k, t, s, onPress }: { k: string; t: string; s: string; onPress: () => void }) => (
  <Pressable accessibilityRole="button" onPress={onPress} style={[st.card, { flex: 1, padding: 16, gap: 2 }]}>
    <Text style={st.k}>{k}</Text><Text style={st.tileT}>{t}</Text><Text style={st.s} numberOfLines={2}>{s}</Text>
  </Pressable>
);
const Wa = ({ size = 18 }: { size?: number }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24"><Path d="M4 20l1.3-3.9A8 8 0 1 1 8 19z" stroke="#fff" strokeWidth={1.9} fill="none" strokeLinejoin="round" /><Rect x={9} y={8.5} width={6} height={1.8} rx={0.9} fill="#fff" /><Rect x={9} y={12} width={4} height={1.8} rx={0.9} fill="#fff" /></Svg>
);

const st = StyleSheet.create({
  hero: { paddingHorizontal: 20, paddingBottom: 56, borderBottomLeftRadius: 28, borderBottomRightRadius: 28 },
  badgeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  badge: { borderWidth: 1, borderColor: 'rgba(255,255,255,0.35)', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  badgeT: { fontFamily: F.bold, fontSize: 11, letterSpacing: 1.2, color: '#fff' },
  heroWeek: { fontFamily: F.semi, fontSize: 13, color: 'rgba(255,255,255,0.8)' },
  avRing: { width: 64, height: 64, borderRadius: 32, borderWidth: 2.5, borderColor: '#e2433b', padding: 2 },
  av: { width: '100%', height: '100%', borderRadius: 30 },
  hi: { fontFamily: F.black, fontSize: 28, letterSpacing: -0.6, color: '#fff' },
  hiS: { fontFamily: F.medium, fontSize: 15, color: 'rgba(255,255,255,0.85)', marginTop: 2 },
  weeks: { flexDirection: 'row', gap: 4, marginTop: 22 },
  wk: { flex: 1, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.16)' },
  wkDone: { backgroundColor: 'rgba(255,255,255,0.75)' },
  wkNow: { backgroundColor: '#e2433b' },
  ph: { fontFamily: F.medium, fontSize: 12, color: 'rgba(255,255,255,0.6)' },
  body: { paddingHorizontal: 16, marginTop: -36, gap: 12 },
  note: { backgroundColor: C.bg, borderRadius: 24, padding: 18, gap: 14, shadowColor: '#141c33', shadowOpacity: 0.14, shadowRadius: 22, shadowOffset: { width: 0, height: 10 }, elevation: 8 },
  noteAv: { width: 40, height: 40, borderRadius: 20 },
  noteK: { fontFamily: F.bold, fontSize: 11, letterSpacing: 1, color: C.red },
  noteW: { fontFamily: F.bold, fontSize: 15, color: C.ink },
  noteB: { fontFamily: F.medium, fontSize: 15, lineHeight: 23, color: C.ink },
  more: { fontFamily: F.bold, fontSize: 14, color: C.red, marginTop: -6 },
  focus: { backgroundColor: C.redTint, borderRadius: 16, padding: 14, borderLeftWidth: 4, borderLeftColor: C.red },
  focusK: { fontFamily: F.bold, fontSize: 11, letterSpacing: 1, color: C.red },
  focusT: { fontFamily: F.xbold, fontSize: 17, lineHeight: 23, color: C.ink, marginTop: 4 },
  btn: { height: 48, borderRadius: 24, flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 },
  btnNavy: { backgroundColor: C.navy },
  btnT: { fontFamily: F.bold, fontSize: 15, color: '#fff' },
  btnGhost: { borderWidth: 1.5, borderColor: '#d5d9e3' },
  btnGT: { fontFamily: F.bold, fontSize: 15, color: C.ink },
  card: { backgroundColor: C.card, borderRadius: 22, borderWidth: 1, borderColor: C.line, overflow: 'hidden' },
  ci: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16 },
  ciIco: { width: 44, height: 44, borderRadius: 22, backgroundColor: C.red, alignItems: 'center', justifyContent: 'center' },
  ciT: { fontFamily: F.xbold, fontSize: 16, color: C.ink },
  ciGo: { height: 38, paddingHorizontal: 16, borderRadius: 19, backgroundColor: C.red, justifyContent: 'center' },
  ciGoT: { fontFamily: F.bold, fontSize: 14, color: '#fff' },
  sec: { fontFamily: F.bold, fontSize: 12, letterSpacing: 1, color: C.ink, marginTop: 10, marginLeft: 4 },
  today: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16 },
  k: { fontFamily: F.bold, fontSize: 11, letterSpacing: 1, color: C.red },
  t: { fontFamily: F.xbold, fontSize: 20, color: C.ink, marginTop: 2 },
  s: { fontFamily: F.medium, fontSize: 13, lineHeight: 18, color: C.ink },
  play: { width: 46, height: 46, borderRadius: 23, backgroundColor: C.red, alignItems: 'center', justifyContent: 'center' },
  div: { height: 1, backgroundColor: C.line },
  miniL: { fontFamily: F.semi, fontSize: 12, color: C.ink },
  miniV: { fontFamily: F.xbold, fontSize: 16, color: C.ink, marginTop: 2 },
  miniOf: { fontFamily: F.medium, fontSize: 12, color: C.muted },
  miniT: { height: 5, borderRadius: 3, backgroundColor: '#e3e6ee', marginTop: 6, overflow: 'hidden' },
  q: { flex: 1, height: 48, alignItems: 'center', justifyContent: 'center' },
  qT: { fontFamily: F.bold, fontSize: 14, color: C.ink },
  goal: { fontFamily: F.xbold, fontSize: 17, lineHeight: 23, color: C.ink },
  track: { height: 8, borderRadius: 4, backgroundColor: '#e3e6ee', overflow: 'hidden' },
  fill: { height: 8, borderRadius: 4, backgroundColor: '#e2433b' },
  guar: { flexDirection: 'row', gap: 10, alignItems: 'flex-start', backgroundColor: '#e7f6ee', borderRadius: 14, padding: 12 },
  tileT: { fontFamily: F.xbold, fontSize: 18, color: C.ink, marginTop: 4 },
  ms: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 12 },
  msLine: { borderBottomWidth: 1, borderBottomColor: '#e9ebf1' },
  msDot: { width: 34, height: 34, borderRadius: 17, borderWidth: 1.5, borderColor: '#c3c8d4', alignItems: 'center', justifyContent: 'center', backgroundColor: C.bg },
  msW: { fontFamily: F.black, fontSize: 13, color: C.ink },
  msT: { fontFamily: F.bold, fontSize: 15, color: C.ink },
  line: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderRadius: 22, backgroundColor: '#1f9d5f' },
  lineAv: { width: 46, height: 46, borderRadius: 23, borderWidth: 2, borderColor: '#fff' },
  lineT: { fontFamily: F.xbold, fontSize: 17, color: '#fff' },
  lineS: { fontFamily: F.medium, fontSize: 13, color: 'rgba(255,255,255,0.9)' },
});
