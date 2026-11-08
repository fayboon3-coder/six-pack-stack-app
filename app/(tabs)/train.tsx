import React, { useCallback, useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { useAuth } from '../../src/lib/auth';
import { E, F } from '../../src/lib/theme';
import NoPlan from '../../src/components/NoPlan';
import ProgramsHeader from '../../src/components/ProgramsHeader';
import { phaseOf, todayIndex, weekOf } from '../../src/lib/program';
import { dayMeta } from '../../src/lib/workoutMeta';
import { isoDate, loggedDays } from '../../src/lib/logs';
import { isLocked } from '../../src/lib/access';
import { LockedWeek } from '../../src/components/Offers';
import { canEditTraining } from '../../src/lib/trainingSave';
import { trainingDows } from '../../src/lib/daily';
import { CoachCard } from '../../src/components/Coach';
import { heroPhoto } from '../../src/lib/heroPhotos';
import { Drift, MotionScroll, Ping, Press, Reveal } from '../../src/components/motion';
import { workoutHD } from '../../src/lib/hd';
import Pic from '../../src/components/Pic';

const LOGO = require('../../assets/logo-b.png');
const LETTER = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const FULL = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const EQUIP: Record<string, string> = { gym: 'Gym', db: 'Home', bw: 'No equipment' };

/** Boon's line for the day: one clear progression cue for where they are in the 12 weeks. */
export function boonNote(week: number) {
  if (week === 1) return 'Week 1. Pick weights you could lift for 2 more reps. Learn the moves first.';
  if (week === 4 || week === 8) return `Week ${week}. Re-set week: same moves, own every rep. Next week we push again.`;
  if (week >= 11) return `Week ${week}. Home stretch. Match or beat last week on every set.`;
  return `Week ${week}. Hit the top of the rep range last week? Add 5 lbs today.`;
}

/** Monday of this week (local), as a Date at noon. */
export function mondayOf(now = new Date()) {
  const m = new Date(now); m.setHours(12, 0, 0, 0); m.setDate(m.getDate() - ((m.getDay() + 6) % 7)); return m;
}

const DEMO = process.env.EXPO_PUBLIC_DEMO === '1';
const dowOf = (t: string) => Math.max(0, SHORT.findIndex((s) => s.toLowerCase() === t.trim().slice(0, 3).toLowerCase()));

/** Programs · Training: the 12 weeks, today's session as a photo, and every day of the week. */
export default function Train() {
  const { plan, profile, session } = useAuth();
  const router = useRouter();
  const [done, setDone] = useState<Set<string>>(new Set());

  useFocusEffect(useCallback(() => {
    if (DEMO && plan) {
      const today = (new Date().getDay() + 6) % 7;
      setDone(new Set(plan.train.d.filter((d) => (dowOf(d.t) + 6) % 7 < today).map((d) => d.t)));
      return;
    }
    if (!session) return;
    loggedDays(session.user.id, isoDate(mondayOf())).then((r) => setDone(new Set(r.map((x) => x.day_label)))).catch(() => {});
  }, [session, plan]));

  if (!plan) return <NoPlan name={profile?.first_name} />;
  const week = weekOf(plan.train.s);
  const phase = phaseOf(week);
  const { index, isToday } = todayIndex(plan);
  const days = plan.train.d;
  const metas = days.map((d) => dayMeta(d, plan.train.c));
  const locked = isLocked(profile, week);
  const open = (k: number) => (locked ? router.push('/unlock') : router.push({ pathname: '/day', params: { d: String(k) } }));
  const dows = trainingDows(plan);
  const todayDow = new Date().getDay();
  const equip = plan.train.cfg?.equip;
  const m = metas[index];
  const inPhase = ((week - 1) % 4) + 1;
  const order = [1, 2, 3, 4, 5, 6, 0];
  const doneToday = isToday && done.has(days[index].t);

  return (
    <View style={{ flex: 1, backgroundColor: E.paper }}>
      <ProgramsHeader active="train" />
      <MotionScroll contentContainerStyle={{ paddingBottom: 140 }} showsVerticalScrollIndicator={false}>
        {/* The 12 weeks */}
        <Reveal style={[st.gutter, { marginTop: 20 }]}>
          <View style={st.weeksHead}>
            <Text style={st.k}>{plan.train.n ? plan.train.n.toUpperCase() : '12-WEEK TRANSFORMATION'}</Text>
            <Text style={st.weekN}>Week {week}<Text style={st.weekOf}> of 12</Text></Text>
          </View>
          <View style={st.phases}>
            {['Strip', 'Stack', 'Six-Pack'].map((name, k) => {
              const n = k + 1;
              return (
                <View key={name} style={{ flex: 1 }}>
                  <View style={st.segs}>
                    {[1, 2, 3, 4].map((w) => {
                      const on = n < phase.n || (n === phase.n && w <= inPhase);
                      const now = n === phase.n && w === inPhase;
                      return <View key={w} style={[st.seg, on && { backgroundColor: E.ink }, now && { backgroundColor: E.red }]} />;
                    })}
                  </View>
                  <Text style={[st.phase, n === phase.n && { color: E.ink, fontFamily: F.bold }]}>{name}</Text>
                </View>
              );
            })}
          </View>
        </Reveal>

        {/* Today */}
        <View style={[st.gutter, st.head]}>
          <Text style={st.h} accessibilityRole="header">{isToday ? 'Today' : `Up next · ${FULL[dowOf(days[index].t)]}`}</Text>
          <Text style={st.hR}>Day {index + 1} of {days.length}</Text>
        </View>
        <Reveal style={st.gutter}>
          {locked ? <LockedWeek week={week} onUnlock={() => router.push('/unlock')} /> : (
            <Press accessibilityRole="button" accessibilityLabel={`${m.type}, ${m.items.length} exercises`} onPress={() => open(index)} scale={0.985} style={st.hero}>
              <View style={st.heroPic}>
                <Drift source={heroPhoto(m.muscles[0], plan.train.cfg?.equip)} hd={workoutHD(m.muscles[0], plan.train.cfg?.equip)} style={StyleSheet.absoluteFill} />
                <LinearGradient colors={['rgba(16,23,42,0)', 'rgba(16,23,42,0.3)', 'rgba(16,23,42,0.94)']} locations={[0, 0.45, 1]} style={StyleSheet.absoluteFill} />
                <View style={st.heroTop}>
                  <View style={[st.chip, doneToday && { backgroundColor: E.green }]}>
                    {isToday && !doneToday && <Ping color="#ff6b61" size={6} />}
                    <Text style={st.chipT}>{doneToday ? 'DONE TODAY' : isToday ? 'TODAY' : 'NEXT'}</Text>
                  </View>
                </View>
                <View style={{ padding: 18 }}>
                  <Text style={st.heroT}>{m.type}</Text>
                  <Text style={st.heroM}>{m.items.length} exercises  ·  About {m.minutes} min{equip ? `  ·  ${EQUIP[equip]}` : ''}</Text>
                  <View style={st.muscles}>
                    {m.muscles.slice(0, 4).map((x) => <View key={x} style={st.mChip}><Text style={st.mChipT}>{x}</Text></View>)}
                  </View>
                </View>
              </View>
              <View style={st.note}>
                <Image source={LOGO} style={{ width: 26, height: 26 }} accessibilityIgnoresInvertColors />
                <Text style={st.noteT}><Text style={{ fontFamily: F.bold }}>Boon: </Text>{boonNote(week)}</Text>
              </View>
              <View style={st.cta}>
                {!doneToday && isToday && <Svg width={14} height={14} viewBox="0 0 24 24"><Path d="M7 4.5v15l12.5-7.5z" fill="#fff" /></Svg>}
                <Text style={st.ctaT}>{doneToday ? 'See today’s workout' : isToday ? 'Start workout' : 'Preview workout'}</Text>
              </View>
            </Press>
          )}
        </Reveal>

        {/* The week */}
        <Reveal style={[st.gutter, { marginTop: 16 }]}>
          <View style={st.strip}>
            {order.map((dow) => {
              const k = days.findIndex((x) => x.t.trim().slice(0, 3).toLowerCase() === SHORT[dow].toLowerCase());
              const train = k >= 0 && dows.includes(dow);
              const isDone = train && done.has(days[k].t);
              const today = dow === todayDow;
              let dot: React.ReactNode;
              if (isDone) dot = <View style={[st.dot, { backgroundColor: E.ink }]}><Svg width={12} height={12} viewBox="0 0 24 24"><Path d="M5 12.5l4.5 4.5L19 7.5" stroke="#fff" strokeWidth={3.4} fill="none" strokeLinecap="round" strokeLinejoin="round" /></Svg></View>;
              else if (train) dot = <View style={[st.dot, st.dotTrain, today && { borderWidth: 2, borderColor: E.red }]}><Text style={[st.dTxt, today && { color: E.red }]}>{k + 1}</Text></View>;
              else if (dow === 0) dot = <View style={[st.dot, today && { borderWidth: 2, borderColor: E.red }]}><Svg width={13} height={13} viewBox="0 0 24 24"><Rect x={3} y={7} width={18} height={13} rx={2.5} stroke={E.sub} strokeWidth={2.2} fill="none" /><Circle cx={12} cy={13.5} r={3.2} stroke={E.sub} strokeWidth={2.2} fill="none" /></Svg></View>;
              else dot = <View style={[st.dot, today && { borderWidth: 2, borderColor: E.red }]}><View style={st.rest} /></View>;
              return (
                <Press key={dow} disabled={!train && dow !== 0} onPress={() => (train ? open(k) : router.push('/checkin'))}
                  accessibilityRole={train || dow === 0 ? 'button' : undefined}
                  accessibilityLabel={`${SHORT[dow]}: ${train ? `${metas[k].type}${isDone ? ', done' : ''}` : dow === 0 ? 'check-in day' : 'rest day'}`} style={st.col}>
                  <Text style={[st.letter, today && { color: E.ink, fontFamily: F.bold }]}>{LETTER[dow]}</Text>
                  {dot}
                </Press>
              );
            })}
          </View>
        </Reveal>

        <View style={[st.gutter, st.head]}>
          <Text style={st.h} accessibilityRole="header">This week</Text>
          <Text style={st.hR}>{days.filter((d) => done.has(d.t)).length} of {days.length} done</Text>
        </View>
        <View style={[st.gutter, { gap: 12 }]}>
          {days.map((d, k) => ({ d, k })).filter(({ k }) => locked || k !== index).map(({ d, k }, j) => {
            const isDone = done.has(d.t);
            const mm = metas[k];
            return (
              <Reveal key={k} delay={j * 60}>
                <Press onPress={() => open(k)} accessibilityRole="button" accessibilityLabel={`Day ${k + 1}, ${mm.type}${isDone ? ', done' : ''}`} style={st.day}>
                  <View style={st.dayPic}>
                    <Pic source={heroPhoto(mm.muscles[0], equip)} hd={workoutHD(mm.muscles[0], equip)} w={360} style={st.fill} />
                    {isDone && <View style={st.dayDone}><Svg width={18} height={18} viewBox="0 0 24 24"><Path d="M5 12.5l4.5 4.5L19 7.5" stroke="#fff" strokeWidth={3.2} fill="none" strokeLinecap="round" strokeLinejoin="round" /></Svg></View>}
                  </View>
                  <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
                    <Text style={st.dayK}>DAY {k + 1} · {FULL[dowOf(d.t)].toUpperCase()}</Text>
                    <Text style={st.dayT} numberOfLines={1}>{mm.type}</Text>
                    <Text style={st.dayS} numberOfLines={1}>{mm.items.length} exercises · {mm.minutes} min · {mm.muscles.slice(0, 2).join(', ')}</Text>
                  </View>
                  <Text style={[st.dayR, isDone && { color: E.green }]}>{isDone ? 'Done' : ''}</Text>
                  <Arrow />
                </Press>
              </Reveal>
            );
          })}
          {canEditTraining(profile) && (
            <Reveal delay={120}>
              <Press accessibilityRole="button" onPress={() => router.push('/training')} style={st.edit}>
                <View style={{ flex: 1 }}><Text style={st.editT}>Change split, days or equipment</Text><Text style={st.dayS}>Your plan rebuilds in seconds. Swap any move inside a workout.</Text></View>
                <Text style={st.editR}>Edit</Text>
              </Press>
            </Reveal>
          )}
          <View style={{ marginTop: 10 }}>
            <CoachCard where="training" title="Stuck on a lift? I'll fix it."
              body="Coached clients send me their week every Sunday. I read it myself and change one thing at a time, so you never stall for long." />
          </View>
        </View>
      </MotionScroll>
    </View>
  );
}

const Arrow = () => <Svg width={14} height={14} viewBox="0 0 24 24"><Path d="M9 5.5l6.5 6.5L9 18.5" stroke={E.ink} strokeWidth={2.4} fill="none" strokeLinecap="round" strokeLinejoin="round" /></Svg>;

const st = StyleSheet.create({
  fill: { position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' },
  gutter: { paddingHorizontal: 20 },
  k: { fontFamily: F.bold, fontSize: 10.5, letterSpacing: 1.4, color: E.sub },
  weeksHead: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
  weekN: { fontFamily: F.black, fontSize: 26, letterSpacing: -0.8, color: E.ink },
  weekOf: { fontFamily: F.semi, fontSize: 14, color: E.sub, letterSpacing: 0 },
  phases: { flexDirection: 'row', gap: 8, marginTop: 14 },
  segs: { flexDirection: 'row', gap: 3 },
  seg: { flex: 1, height: 4, borderRadius: 2, backgroundColor: '#dcd9d1' },
  phase: { fontFamily: F.semi, fontSize: 12.5, color: E.sub, marginTop: 8 },
  head: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: 30, marginBottom: 14 },
  h: { fontFamily: F.xbold, fontSize: 24, letterSpacing: -0.7, color: E.ink },
  hR: { fontFamily: F.semi, fontSize: 13, color: E.sub },
  hero: { borderRadius: 24, overflow: 'hidden', backgroundColor: E.surface, borderWidth: 1, borderColor: E.hair },
  heroPic: { height: 270, backgroundColor: E.ink, justifyContent: 'space-between' },
  heroTop: { padding: 16, flexDirection: 'row' },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 11, height: 28, borderRadius: 14, backgroundColor: 'rgba(16,23,42,0.72)' },
  chipT: { fontFamily: F.bold, fontSize: 10.5, letterSpacing: 1.3, color: '#fff' },
  heroT: { fontFamily: F.black, fontSize: 36, lineHeight: 39, letterSpacing: -1.2, color: '#fff' },
  heroM: { fontFamily: F.semi, fontSize: 13.5, color: 'rgba(255,255,255,0.88)', marginTop: 6 },
  muscles: { flexDirection: 'row', gap: 6, marginTop: 12, flexWrap: 'wrap' },
  mChip: { height: 24, paddingHorizontal: 9, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.16)', justifyContent: 'center' },
  mChipT: { fontFamily: F.semi, fontSize: 11.5, color: '#fff' },
  note: { flexDirection: 'row', gap: 10, alignItems: 'flex-start', padding: 16, paddingBottom: 4 },
  noteT: { flex: 1, fontFamily: F.medium, fontSize: 14.5, lineHeight: 21, color: E.ink },
  cta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 54, borderRadius: 27, backgroundColor: E.ink, margin: 16 },
  ctaT: { fontFamily: F.bold, fontSize: 16.5, color: '#fff' },
  strip: { flexDirection: 'row' },
  col: { flex: 1, alignItems: 'center', gap: 7 },
  letter: { fontFamily: F.semi, fontSize: 11.5, color: E.faint },
  dot: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  dotTrain: { backgroundColor: E.surface, borderWidth: 1, borderColor: E.hair },
  dTxt: { fontFamily: F.bold, fontSize: 13, color: E.ink },
  rest: { width: 4, height: 4, borderRadius: 2, backgroundColor: '#cfcbc2' },
  day: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 10, paddingRight: 16, borderRadius: 22, backgroundColor: E.surface, borderWidth: 1, borderColor: E.hair },
  dayPic: { width: 84, height: 84, borderRadius: 16, overflow: 'hidden', backgroundColor: E.soft },
  dayDone: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(18,128,79,0.72)', alignItems: 'center', justifyContent: 'center' },
  dayK: { fontFamily: F.bold, fontSize: 10.5, letterSpacing: 1.2, color: E.sub },
  dayT: { fontFamily: F.xbold, fontSize: 17, letterSpacing: -0.3, color: E.ink },
  dayS: { fontFamily: F.medium, fontSize: 12.5, color: E.sub },
  dayR: { fontFamily: F.bold, fontSize: 13, color: E.ink },
  edit: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderRadius: 20, borderWidth: 1, borderStyle: 'dashed', borderColor: '#cfcbc2' },
  editT: { fontFamily: F.bold, fontSize: 15, color: E.ink },
  editR: { fontFamily: F.bold, fontSize: 14, color: E.red },
});
