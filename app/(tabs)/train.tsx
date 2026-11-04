import React, { useCallback, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { useAuth } from '../../src/lib/auth';
import { C, F } from '../../src/lib/theme';
import Page from '../../src/components/Page';
import Panel from '../../src/components/Panel';
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

const LOGO = require('../../assets/logo-b.png');
const LETTER = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const EQUIP: Record<string, string> = { gym: 'Gym', db: 'Home', bw: 'Bodyweight' };

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

export default function Train() {
  const { plan, profile, session } = useAuth();
  const router = useRouter();
  const [done, setDone] = useState<Set<string>>(new Set());

  useFocusEffect(useCallback(() => {
    if (!session) return;
    loggedDays(session.user.id, isoDate(mondayOf())).then((r) => setDone(new Set(r.map((x) => x.day_label)))).catch(() => {});
  }, [session]));

  if (!plan) return <NoPlan name={profile?.first_name} />;
  const week = weekOf(plan.train.s);
  const phase = phaseOf(week);
  const { index, isToday } = todayIndex(plan);
  const days = plan.train.d;
  const metas = days.map((d) => dayMeta(d, plan.train.c));
  const locked = isLocked(profile, week);
  const open = (k: number) => locked ? router.push('/unlock') : router.push({ pathname: '/day', params: { d: String(k) } });
  const dows = trainingDows(plan);
  const todayDow = new Date().getDay();
  const equip = plan.train.cfg?.equip ? EQUIP[plan.train.cfg.equip] : undefined;
  const m = metas[index];
  const inPhase = ((week - 1) % 4) + 1;
  const order = [1, 2, 3, 4, 5, 6, 0];

  return (
    <Page header={<ProgramsHeader active="train" />}>
      <Panel title="12-Week Transformation" right={`Week ${week} of 12`}>
        <View style={{ flexDirection: 'row', gap: 6 }}>
          {['Strip', 'Stack', 'Six-Pack'].map((name, k) => {
            const n = k + 1;
            const fill = n < phase.n ? 1 : n === phase.n ? inPhase / 4 : 0;
            return (
              <View key={name} style={{ flex: 1 }}>
                <View style={st.track}><View style={[st.fill, { width: `${fill * 100}%` }]} /></View>
                <Text style={[st.phase, n === phase.n && { fontFamily: F.xbold }]}>{name}</Text>
              </View>
            );
          })}
        </View>
        <View style={st.strip}>
          {order.map((dow) => {
            const k = days.findIndex((x) => x.t.trim().slice(0, 3).toLowerCase() === SHORT[dow].toLowerCase());
            const train = k >= 0 && dows.includes(dow);
            const isDone = train && done.has(days[k].t);
            const today = dow === todayDow;
            let dot: React.ReactNode;
            if (isDone) dot = <View style={[st.dot, { backgroundColor: '#1f6e4a' }]}><Svg width={14} height={14} viewBox="0 0 24 24"><Path d="M5 12.5l4.5 4.5L19 7.5" stroke="#fff" strokeWidth={3.2} fill="none" strokeLinecap="round" strokeLinejoin="round" /></Svg></View>;
            else if (train) dot = <View style={[st.dot, today ? { borderWidth: 2, borderColor: C.red } : { backgroundColor: '#e8eaf0' }]}><Text style={[st.dTxt, today && { fontFamily: F.xbold }]}>D{k + 1}</Text></View>;
            else if (dow === 0) dot = <View style={[st.dot, { backgroundColor: C.redTint }, today && { borderWidth: 2, borderColor: C.red }]}><Svg width={15} height={15} viewBox="0 0 24 24"><Rect x={3} y={7} width={18} height={13} rx={2} stroke="#d22f26" strokeWidth={2.2} fill="none" /><Circle cx={12} cy={13.5} r={3.5} stroke="#d22f26" strokeWidth={2.2} fill="none" /></Svg></View>;
            else dot = <View style={[st.dot, { backgroundColor: '#f1f3f7' }, today && { borderWidth: 2, borderColor: C.red }]}><Text style={st.rest}>Rest</Text></View>;
            return (
              <Pressable key={dow} disabled={!train && dow !== 0} onPress={() => (train ? open(k) : router.push('/checkin'))}
                accessibilityRole={train || dow === 0 ? 'button' : undefined}
                accessibilityLabel={`${SHORT[dow]}: ${train ? `${metas[k].type}${isDone ? ', done' : ''}` : dow === 0 ? 'check-in day' : 'rest day'}`} style={st.col}>
                <Text style={[st.letter, today && { fontFamily: F.bold }]}>{LETTER[dow]}</Text>
                {dot}
              </Pressable>
            );
          })}
        </View>
      </Panel>

      {locked ? <LockedWeek week={week} onUnlock={() => router.push('/unlock')} /> : (
        <Panel title={isToday ? 'Today' : `Up next · ${SHORT[todayDowOf(days[index].t)]}`} right={`Day ${index + 1} of ${days.length}`} bodyStyle={{ gap: 12 }}>
          <View>
            <Text style={st.big}>{m.type}</Text>
            <View style={st.meta}>
              <Text style={st.metaT}>{m.items.length} exercises</Text>
              <Text style={st.metaT}>About {m.minutes} min</Text>
              {!!equip && <Text style={st.metaT}>{equip}</Text>}
            </View>
          </View>
          <View style={st.note}>
            <Image source={LOGO} style={{ width: 26, height: 26 }} accessibilityIgnoresInvertColors />
            <Text style={st.noteT}><Text style={{ fontFamily: F.bold }}>Boon: </Text>{boonNote(week)}</Text>
          </View>
          <Pressable accessibilityRole="button" onPress={() => open(index)} style={({ pressed }) => [st.cta, pressed && { opacity: 0.88 }]}>
            <Svg width={16} height={16} viewBox="0 0 24 24"><Path d="M7 4v16l13-8z" fill="#fff" /></Svg>
            <Text style={st.ctaT}>{isToday ? 'Start workout' : 'Preview workout'}</Text>
          </Pressable>
        </Panel>
      )}

      <Panel title="This week" bodyStyle={{ paddingVertical: 4 }}>
        {days.map((d, k) => ({ d, k })).filter(({ k }) => locked || k !== index).map(({ d, k }, j, arr) => {
          const isDone = done.has(d.t);
          return (
            <Pressable key={k} onPress={() => open(k)} accessibilityRole="button" accessibilityLabel={`Day ${k + 1}, ${metas[k].type}${isDone ? ', done' : ''}`}
              style={[st.row, j < arr.length - 1 && st.rowLine]}>
              <Text style={[st.rowD, isDone && { color: C.green }]}>D{k + 1}</Text>
              <Text style={st.rowT} numberOfLines={1}>{metas[k].type}</Text>
              <Text style={[st.rowR, isDone && { color: C.green, fontFamily: F.bold }]}>{isDone ? 'Done' : SHORT[todayDowOf(d.t)]}</Text>
            </Pressable>
          );
        })}
        {canEditTraining(profile) && (
          <Pressable accessibilityRole="button" onPress={() => router.push('/training')} style={[st.row, st.rowTop]}>
            <Text style={[st.rowT, { fontFamily: F.semi }]}>Change split, days or equipment</Text>
            <Text style={[st.rowR, { color: C.red, fontFamily: F.bold }]}>Edit</Text>
          </Pressable>
        )}
      </Panel>

      <CoachCard where="training" title="Stuck on a lift? I'll fix it."
        body="Coached clients send me their week every Sunday. I read it myself and change one thing at a time, so you never stall for long." />
    </Page>
  );
}

const todayDowOf = (t: string) => Math.max(0, SHORT.findIndex((s) => s.toLowerCase() === t.trim().slice(0, 3).toLowerCase()));

const st = StyleSheet.create({
  track: { height: 6, borderRadius: 3, backgroundColor: '#e8eaf0', overflow: 'hidden' },
  fill: { height: 6, borderRadius: 3, backgroundColor: '#e2433b' },
  phase: { fontFamily: F.bold, fontSize: 14, color: C.ink, marginTop: 8 },
  strip: { flexDirection: 'row', marginTop: 16 },
  col: { flex: 1, alignItems: 'center', gap: 6 },
  letter: { fontFamily: F.semi, fontSize: 12, color: C.ink },
  dot: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  dTxt: { fontFamily: F.bold, fontSize: 13, color: C.ink },
  rest: { fontFamily: F.medium, fontSize: 11, color: C.muted },
  big: { fontFamily: F.xbold, fontSize: 22, color: C.ink },
  meta: { flexDirection: 'row', gap: 14, marginTop: 4, flexWrap: 'wrap' },
  metaT: { fontFamily: F.medium, fontSize: 14, color: C.ink },
  note: { flexDirection: 'row', gap: 10, alignItems: 'flex-start', paddingVertical: 12, paddingHorizontal: 14, borderRadius: 14, backgroundColor: C.bg, borderWidth: 1, borderColor: C.line },
  noteT: { flex: 1, fontFamily: F.medium, fontSize: 14, lineHeight: 20, color: C.ink },
  cta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 52, borderRadius: 26, backgroundColor: C.red },
  ctaT: { fontFamily: F.bold, fontSize: 17, color: C.onAccent },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 11 },
  rowLine: { borderBottomWidth: 1, borderBottomColor: '#e9ebf1' },
  rowTop: { borderTopWidth: 1, borderTopColor: '#e9ebf1' },
  rowD: { width: 28, fontFamily: F.xbold, fontSize: 15, color: C.ink },
  rowT: { flex: 1, fontFamily: F.medium, fontSize: 15, color: C.ink },
  rowR: { fontFamily: F.medium, fontSize: 13, color: C.ink },
});
