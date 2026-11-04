import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../../src/lib/auth';
import { C, F } from '../../src/lib/theme';
import NoPlan from '../../src/components/NoPlan';
import Poster from '../../src/components/Poster';
import PageHeader from '../../src/components/PageHeader';
import WorkoutPreview from '../../src/components/WorkoutPreview';
import { dayMeta } from '../../src/lib/workoutMeta';
import { CheckIcon } from '../../src/components/icons';
import { daysToSunday, exercises, phaseOf, PHOTO_WEEKS, todayIndex, weekOf } from '../../src/lib/program';
import { flushQueue, isoDate, loggedDays } from '../../src/lib/logs';
import { productImage } from '../../src/lib/images';
import { isFree, isLocked, FREE_WEEKS } from '../../src/lib/access';
import { LockedWeek } from '../../src/components/Offers';
import StackCheckCard from '../../src/components/StackCheckCard';
import AskBoonCard from '../../src/components/AskBoonCard';
import ReminderPrompt from '../../src/components/ReminderPrompt';
import { applyReminders, hasPermission, readPrefs } from '../../src/lib/reminders';
import { getStreak } from '../../src/lib/streak';
import { FlameIcon } from '../../src/components/icons';
import Backdrop from '../../src/components/Backdrop';


export default function Today() {
  const { profile, plan, session, refresh, viewAs } = useAuth();
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const [doneDays, setDoneDays] = useState<Set<string>>(new Set());
  const [taken, setTaken] = useState<Record<string, boolean>>({});
  const [streak, setStreak] = useState<{ weeks: number; workouts: number } | null>(null);
  const today = isoDate();

  const load = useCallback(async () => {
    if (!session) return;
    await flushQueue();
    const sunday = new Date(); sunday.setDate(sunday.getDate() - sunday.getDay());
    const rows = await loggedDays(session.user.id, isoDate(sunday));
    setDoneDays(new Set(rows.map((r) => r.day_label)));
    if (plan) getStreak(session.user.id, plan.train.d.length).then(setStreak).catch(() => {});
    try { setTaken(JSON.parse((await AsyncStorage.getItem('sps:stack:' + today)) || '{}')); } catch { setTaken({}); }
  }, [session, today, plan]);

  useFocusEffect(useCallback(() => { load(); }, [load]));
  // Keep reminders current (re-arms this Sunday's 6pm check-in nudge).
  useEffect(() => { if (plan && !viewAs) hasPermission().then((ok) => { if (ok) readPrefs().then((p) => applyReminders(plan, p, { free: isFree(profile) })); }); }, [plan?.train.s]);

  if (!plan) return <NoPlan name={profile?.first_name} />;

  const week = weekOf(plan.train.s);
  const phase = phaseOf(week);
  const { index, isToday } = todayIndex(plan);
  const day = plan.train.d[index];
  const [dayName, dayType] = day.t.split('·').map((x) => x.trim());
  const doneToday = doneDays.has(day.t) && isToday;
  const toSunday = daysToSunday();
  const photoWeek = PHOTO_WEEKS.includes(week);
  const hour = new Date().getHours();
  const greet = hour < 12 ? 'Morning' : hour < 18 ? 'Afternoon' : 'Evening';
  const stack = plan.stack || [];
  const takenCount = stack.filter((x) => taken[x.product]).length;

  const toggle = async (k: string) => {
    const next = { ...taken, [k]: !taken[k] };
    setTaken(next);
    await AsyncStorage.setItem('sps:stack:' + today, JSON.stringify(next));
  };

  // The ONE thing to do right now, in order of priority.
  const checkinDue = toSunday === 0;

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: C.bg }}>
      <Backdrop />
      <ScrollView contentContainerStyle={{ paddingBottom: 48 }}
        refreshControl={<RefreshControl refreshing={refreshing} tintColor={C.ink}
          onRefresh={async () => { setRefreshing(true); await refresh(); await load(); setRefreshing(false); }} />}>

        <PageHeader kicker={`Week ${week} of 12 · ${phase.name}`} title={`${greet}, |${plan.name}`} week={week} />
        {!!streak && streak.workouts > 0 && (
          <View style={st.streak} accessibilityLabel={`${streak.weeks} week streak, ${streak.workouts} workouts logged`}>
            <FlameIcon size={18} />
            <Text style={st.streakT}>{streak.weeks > 0 ? `${streak.weeks}-week streak` : 'Start your streak this week'}</Text>
            <Text style={st.streakS}>· {streak.workouts} workout{streak.workouts === 1 ? '' : 's'} logged</Text>
          </View>
        )}
        <View style={{ height: 18 }} />

        {checkinDue && (
          <Pressable accessibilityRole="button" onPress={() => router.push('/checkin')} style={st.alert}>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={st.alertKicker}>It's Sunday{photoWeek ? ' · photo week' : ''}</Text>
              <Text style={st.alertTitle}>Do your check-in (2 min)</Text>
            </View>
            <Text style={st.alertArrow}>→</Text>
          </Pressable>
        )}

        {isLocked(profile, week) ? <LockedWeek week={week} onUnlock={() => router.push('/unlock')} /> : <WorkoutPreview
          meta={dayMeta(day, plan.train.c)}
          badge={doneToday ? 'Done today ✓' : isToday ? "Today's workout" : `Next up · ${dayName}`}
          cta={doneToday ? 'Review workout' : isToday ? 'Start workout' : 'Preview workout'}
          onPress={() => router.push({ pathname: '/workout', params: { d: String(index) } })}
        />}

        {isFree(profile) && !isLocked(profile, week) && (
          <Pressable accessibilityRole="button" onPress={() => router.push('/unlock')} style={st.free}>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={st.freeK}>The Free Stack · week {week} of {FREE_WEEKS}</Text>
              <Text style={st.freeT}>{FREE_WEEKS - week + 1 === 1 ? 'Last free week. Unlock weeks 3–12' : 'Weeks 3–12: see your options'}</Text>
            </View>
            <Text style={st.chev}>›</Text>
          </Pressable>
        )}

        <ReminderPrompt style={{ marginHorizontal: 20, marginTop: 14 }} />

        <Section title="Hit these today" />
        <View style={st.targets}>
          <Target value={plan.kcal} label="Calories" />
          <Target value={`${plan.protein}g`} label="Protein" />
          <Target value={plan.steps} label="Steps" />
        </View>

        {stack.length > 0 && (
          <>
            <Section title="Your stack" right={`${takenCount}/${stack.length} taken`} />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, gap: 12 }}>
              {stack.map((x) => {
                const k = x.product; const on = !!taken[k];
                return (
                  <Pressable key={k} accessibilityRole="checkbox" accessibilityState={{ checked: on }} accessibilityLabel={`${k}, tap when taken`}
                    onPress={() => toggle(k)} style={{ width: 140, gap: 8 }}>
                    <Poster source={productImage(k)} label={k} size={140} style={on ? { borderColor: C.green, borderWidth: 2 } : undefined}>
                      <View style={[st.check, on && { backgroundColor: C.green, borderColor: C.green }]}>{on && <CheckIcon size={13} />}</View>
                    </Poster>
                    <Text style={st.posterName} numberOfLines={1}>{k.split('(')[0].trim()}</Text>
                    <Text style={st.posterSub} numberOfLines={1}>{on ? 'Taken ✓' : `${x.dose} · tap when taken`}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </>
        )}

        {!checkinDue && (
          <>
            <Section title="Coming up" />
            <Pressable accessibilityRole="button" onPress={() => router.push('/checkin')} style={st.row}>
              <View style={st.rowIcon}><Text style={st.rowIconText}>{toSunday}</Text></View>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={st.rowTitle}>Sunday check-in</Text>
                <Text style={st.rowSub}>In {toSunday} day{toSunday > 1 ? 's' : ''}{photoWeek ? ' · bring your photos' : ''}</Text>
              </View>
              <Text style={st.chev}>›</Text>
            </Pressable>
          </>
        )}

        <AskBoonCard style={{ marginHorizontal: 20, marginTop: 28 }} />
        <StackCheckCard style={{ marginHorizontal: 20, marginTop: 12 }} />

        <View style={st.tip}>
          <Text style={st.tipKicker}>Boon's focus for {phase.name.toLowerCase()} weeks</Text>
          <Text style={st.tipText}>{week <= 4 ? plan.phase1 : week <= 8 ? plan.phase2 : plan.phase3}</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const Section = ({ title, right }: { title: string; right?: string }) => (
  <View style={st.section}>
    <Text style={st.sectionTitle}>{title}</Text>
    {!!right && <Text style={st.sectionRight}>{right}</Text>}
  </View>
);

const Target = ({ value, label }: { value: string; label: string }) => (
  <View style={st.target}>
    <Text style={st.targetVal}>{value}</Text>
    <Text style={st.targetLabel}>{label}</Text>
  </View>
);

const st = StyleSheet.create({
  alert: { marginHorizontal: 20, marginBottom: 14, flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: C.green, borderRadius: 18, padding: 16 },
  alertKicker: { fontFamily: F.xbold, fontSize: 11, letterSpacing: 1.4, textTransform: 'uppercase', color: C.bg },
  alertTitle: { fontFamily: F.black, fontSize: 18, color: C.bg },
  alertArrow: { fontFamily: F.black, fontSize: 24, color: C.bg },
  section: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', paddingHorizontal: 20, marginTop: 28, marginBottom: 12 },
  sectionTitle: { fontFamily: F.black, fontSize: 21, color: C.ink },
  sectionRight: { fontFamily: F.bold, fontSize: 13, color: C.ink },
  targets: { flexDirection: 'row', gap: 10, paddingHorizontal: 20 },
  target: { flex: 1, backgroundColor: C.card, borderWidth: 1, borderColor: C.line, borderRadius: 18, paddingVertical: 16, paddingHorizontal: 12, gap: 2 },
  targetVal: { fontFamily: F.black, fontSize: 22, color: C.ink },
  targetLabel: { fontFamily: F.xbold, fontSize: 11, letterSpacing: 1.2, textTransform: 'uppercase', color: C.ink },
  check: { position: 'absolute', top: 10, right: 10, width: 28, height: 28, borderRadius: 14, borderWidth: 2, borderColor: C.ink, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(13,27,51,0.6)' },
  posterName: { fontFamily: F.xbold, fontSize: 14, color: C.ink },
  posterSub: { fontFamily: F.semi, fontSize: 12, color: C.ink },
  row: { marginHorizontal: 20, flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: C.card, borderWidth: 1, borderColor: C.line, borderRadius: 20, padding: 16 },
  rowIcon: { width: 48, height: 48, borderRadius: 24, borderWidth: 2, borderColor: C.red, alignItems: 'center', justifyContent: 'center' },
  rowIconText: { fontFamily: F.black, fontSize: 18, color: C.ink },
  rowTitle: { fontFamily: F.black, fontSize: 17, color: C.ink },
  rowSub: { fontFamily: F.semi, fontSize: 13, color: C.ink },
  chev: { fontFamily: F.bold, fontSize: 30, color: C.ink, marginTop: -4 },
  streak: { flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: 20, marginTop: 10 },
  streakT: { fontFamily: F.black, fontSize: 14, color: C.ink },
  streakS: { fontFamily: F.semi, fontSize: 13, color: C.ink },
  free: { marginHorizontal: 20, marginTop: 14, flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 18, borderWidth: 1.5, borderColor: C.red, padding: 14 },
  freeK: { fontFamily: F.xbold, fontSize: 11, letterSpacing: 1.4, textTransform: 'uppercase', color: C.red },
  freeT: { fontFamily: F.black, fontSize: 16, color: C.ink },
  tip: { marginHorizontal: 20, marginTop: 28, borderLeftWidth: 4, borderLeftColor: C.red, paddingLeft: 14, gap: 4 },
  tipKicker: { fontFamily: F.xbold, fontSize: 11, letterSpacing: 1.4, textTransform: 'uppercase', color: C.red },
  tipText: { fontFamily: F.semi, fontSize: 15, lineHeight: 22, color: C.ink },
});
