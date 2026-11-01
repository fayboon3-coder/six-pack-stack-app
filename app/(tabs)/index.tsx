import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../../src/lib/auth';
import { C, F } from '../../src/lib/theme';
import { Body, Button, Card, Eyebrow, H1, s as ui } from '../../src/components/ui';
import Screen from '../../src/components/Screen';
import NoPlan from '../../src/components/NoPlan';
import { CheckIcon, FlameIcon, PlayIcon } from '../../src/components/icons';
import { daysToSunday, exercises, phaseOf, PHOTO_WEEKS, todayIndex, weekOf } from '../../src/lib/program';
import { flushQueue, isoDate, loggedDays } from '../../src/lib/logs';

export default function Today() {
  const { profile, plan, session, refresh } = useAuth();
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const [doneThisWeek, setDoneThisWeek] = useState(0);
  const [taken, setTaken] = useState<Record<string, boolean>>({});
  const today = isoDate();

  const load = useCallback(async () => {
    if (!session) return;
    await flushQueue();
    const sunday = new Date(); sunday.setDate(sunday.getDate() - sunday.getDay());
    const rows = await loggedDays(session.user.id, isoDate(sunday));
    setDoneThisWeek(new Set(rows.map((r) => r.logged_on)).size);
    try { setTaken(JSON.parse((await AsyncStorage.getItem('sps:stack:' + today)) || '{}')); } catch { setTaken({}); }
  }, [session, today]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  if (!plan) return <NoPlan name={profile?.first_name} />;

  const week = weekOf(plan.train.s);
  const phase = phaseOf(week);
  const { index, isToday } = todayIndex(plan);
  const day = plan.train.d[index];
  const [dayName, dayType] = day.t.split('·').map((x) => x.trim());
  const toSunday = daysToSunday();
  const photoWeek = PHOTO_WEEKS.includes(week);
  const hour = new Date().getHours();
  const greet = hour < 12 ? 'Morning' : hour < 18 ? 'Afternoon' : 'Evening';
  const stack = (plan.stack || []).slice(0, 4);

  const toggle = async (k: string) => {
    const next = { ...taken, [k]: !taken[k] };
    setTaken(next);
    await AsyncStorage.setItem('sps:stack:' + today, JSON.stringify(next));
  };

  return (
    <Screen refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await refresh(); await load(); setRefreshing(false); }}>
      <View style={st.head}>
        <View style={{ gap: 4, flex: 1 }}>
          <Eyebrow>Week {week} · {phase.name}</Eyebrow>
          <H1>{greet}, {plan.name}</H1>
        </View>
        <View style={st.pill} accessibilityLabel={`${doneThisWeek} workouts this week`}>
          <FlameIcon />
          <Text style={st.pillText}>{doneThisWeek}/{plan.train.d.length}</Text>
        </View>
      </View>

      <View style={st.hero}>
        <Text style={[ui.eyebrow, { color: C.white }]}>{isToday ? "Today's workout" : `Next up · ${dayName}`}</Text>
        <View style={{ gap: 4 }}>
          <Text style={st.heroTitle}>{dayType || dayName}</Text>
          <Text style={st.heroSub}>{day.x.length} exercises · about 45 min</Text>
        </View>
        <Pressable accessibilityRole="button" style={st.heroBtn} onPress={() => router.push({ pathname: '/workout', params: { d: String(index) } })}>
          <Text style={st.heroBtnText}>{isToday ? 'Start workout' : 'Preview workout'}</Text>
          <PlayIcon size={16} />
        </Pressable>
        <Text style={st.heroSub}>First up: {exercises[day.x[0][0]]?.name || day.x[0][0]}</Text>
      </View>

      <Card>
        <Text style={ui.label}>Your daily targets</Text>
        <View style={st.targets}>
          <Target value={plan.kcal} label="calories" />
          <Target value={`${plan.protein} g`} label="protein" />
          <Target value={plan.steps} label="steps" />
        </View>
      </Card>

      <View style={{ flexDirection: 'row', gap: 10 }}>
        <Card style={{ flex: 1 }}>
          <Text style={ui.label}>Stack today</Text>
          {stack.map((x) => {
            const k = x.product;
            const on = !!taken[k];
            return (
              <Pressable key={k} accessibilityRole="checkbox" accessibilityState={{ checked: on }} onPress={() => toggle(k)} style={st.stackRow}>
                <View style={[st.box, on && { backgroundColor: C.green, borderColor: C.green }]}>{on && <CheckIcon size={11} />}</View>
                <Text style={st.stackText} numberOfLines={1}>{k.split('(')[0].trim()}</Text>
              </Pressable>
            );
          })}
        </Card>
        <Pressable style={{ flex: 1 }} accessibilityRole="button" onPress={() => router.push('/checkin')}>
          <Card style={{ flex: 1 }}>
            <Text style={ui.label}>Check-in</Text>
            <Text style={st.big}>{toSunday === 0 ? 'Today' : 'Sunday'}</Text>
            <Body style={{ fontSize: 12 }}>{toSunday === 0 ? 'Tap to check in' : `In ${toSunday} day${toSunday > 1 ? 's' : ''}`}{photoWeek ? ' · photo week' : ''}</Body>
          </Card>
        </Pressable>
      </View>

      <Pressable accessibilityRole="button" onPress={() => router.push('/boon')}>
        <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View style={st.avatar}><Text style={st.avatarText}>B</Text></View>
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={st.tipTitle}>{week <= 4 ? 'This phase: build the habit' : week <= 8 ? 'This phase: beat last week' : 'This phase: finish strong'}</Text>
            <Text style={st.tipSub}>{week <= 4 ? plan.phase1 : week <= 8 ? plan.phase2 : plan.phase3}</Text>
          </View>
        </Card>
      </Pressable>
    </Screen>
  );
}

const Target = ({ value, label }: { value: string; label: string }) => (
  <View style={{ flex: 1, gap: 2 }}>
    <Text style={st.targetVal}>{value}</Text>
    <Text style={st.targetLabel}>{label}</Text>
  </View>
);

const st = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginTop: 8 },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: C.navy2, borderWidth: 1, borderColor: C.line, borderRadius: 999, paddingVertical: 8, paddingHorizontal: 12 },
  pillText: { fontFamily: F.black, fontSize: 14, color: C.white },
  hero: { backgroundColor: C.red, borderRadius: 22, padding: 20, gap: 14 },
  heroTitle: { fontFamily: F.black, fontSize: 30, color: C.white, textTransform: 'uppercase' },
  heroSub: { fontFamily: F.bold, fontSize: 14, color: C.white },
  heroBtn: { height: 52, borderRadius: 12, backgroundColor: C.navy, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  heroBtnText: { fontFamily: F.black, fontSize: 15, color: C.white, textTransform: 'uppercase', letterSpacing: 0.6 },
  targets: { flexDirection: 'row', gap: 10 },
  targetVal: { fontFamily: F.black, fontSize: 22, color: C.white },
  targetLabel: { fontFamily: F.semi, fontSize: 12, color: C.white },
  stackRow: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 28 },
  box: { width: 18, height: 18, borderRadius: 5, borderWidth: 2, borderColor: C.line, alignItems: 'center', justifyContent: 'center' },
  stackText: { fontFamily: F.bold, fontSize: 13, color: C.white, flex: 1 },
  big: { fontFamily: F.black, fontSize: 20, color: C.white },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: C.red, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontFamily: F.black, fontSize: 16, color: C.white },
  tipTitle: { fontFamily: F.xbold, fontSize: 13, color: C.white },
  tipSub: { fontFamily: F.semi, fontSize: 12, color: C.white, lineHeight: 17 },
});
