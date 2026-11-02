import React, { useCallback, useState } from 'react';
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


export default function Today() {
  const { profile, plan, session, refresh } = useAuth();
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const [doneDays, setDoneDays] = useState<Set<string>>(new Set());
  const [taken, setTaken] = useState<Record<string, boolean>>({});
  const today = isoDate();

  const load = useCallback(async () => {
    if (!session) return;
    await flushQueue();
    const sunday = new Date(); sunday.setDate(sunday.getDate() - sunday.getDay());
    const rows = await loggedDays(session.user.id, isoDate(sunday));
    setDoneDays(new Set(rows.map((r) => r.day_label)));
    try { setTaken(JSON.parse((await AsyncStorage.getItem('sps:stack:' + today)) || '{}')); } catch { setTaken({}); }
  }, [session, today]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

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
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: C.navy }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 48 }}
        refreshControl={<RefreshControl refreshing={refreshing} tintColor={C.white}
          onRefresh={async () => { setRefreshing(true); await refresh(); await load(); setRefreshing(false); }} />}>

        <PageHeader kicker={`Week ${week} of 12 · ${phase.name}`} title={`${greet}, ${plan.name}`} week={week} />
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

        <WorkoutPreview
          meta={dayMeta(day)}
          badge={doneToday ? 'Done today ✓' : isToday ? "Today's workout" : `Next up · ${dayName}`}
          cta={doneToday ? 'Review workout' : isToday ? 'Start workout' : 'Preview workout'}
          onPress={() => router.push({ pathname: '/workout', params: { d: String(index) } })}
        />

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
  alertKicker: { fontFamily: F.xbold, fontSize: 11, letterSpacing: 1.4, textTransform: 'uppercase', color: C.navy },
  alertTitle: { fontFamily: F.black, fontSize: 18, color: C.navy },
  alertArrow: { fontFamily: F.black, fontSize: 24, color: C.navy },
  section: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', paddingHorizontal: 20, marginTop: 28, marginBottom: 12 },
  sectionTitle: { fontFamily: F.black, fontSize: 21, color: C.white },
  sectionRight: { fontFamily: F.bold, fontSize: 13, color: C.white },
  targets: { flexDirection: 'row', gap: 10, paddingHorizontal: 20 },
  target: { flex: 1, backgroundColor: C.navy2, borderWidth: 1, borderColor: C.line, borderRadius: 18, paddingVertical: 16, paddingHorizontal: 12, gap: 2 },
  targetVal: { fontFamily: F.black, fontSize: 22, color: C.white },
  targetLabel: { fontFamily: F.xbold, fontSize: 11, letterSpacing: 1.2, textTransform: 'uppercase', color: C.white },
  check: { position: 'absolute', top: 10, right: 10, width: 28, height: 28, borderRadius: 14, borderWidth: 2, borderColor: C.white, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(13,27,51,0.6)' },
  posterName: { fontFamily: F.xbold, fontSize: 14, color: C.white },
  posterSub: { fontFamily: F.semi, fontSize: 12, color: C.white },
  row: { marginHorizontal: 20, flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: C.navy2, borderWidth: 1, borderColor: C.line, borderRadius: 20, padding: 16 },
  rowIcon: { width: 48, height: 48, borderRadius: 24, borderWidth: 2, borderColor: C.red, alignItems: 'center', justifyContent: 'center' },
  rowIconText: { fontFamily: F.black, fontSize: 18, color: C.white },
  rowTitle: { fontFamily: F.black, fontSize: 17, color: C.white },
  rowSub: { fontFamily: F.semi, fontSize: 13, color: C.white },
  chev: { fontFamily: F.bold, fontSize: 30, color: C.white, marginTop: -4 },
  tip: { marginHorizontal: 20, marginTop: 28, borderLeftWidth: 4, borderLeftColor: C.red, paddingLeft: 14, gap: 4 },
  tipKicker: { fontFamily: F.xbold, fontSize: 11, letterSpacing: 1.4, textTransform: 'uppercase', color: C.red2 },
  tipText: { fontFamily: F.semi, fontSize: 15, lineHeight: 22, color: C.white },
});
