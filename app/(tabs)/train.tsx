import React, { useCallback, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useAuth } from '../../src/lib/auth';
import { C, F } from '../../src/lib/theme';
import { Body, Card, s as ui } from '../../src/components/ui';
import Screen from '../../src/components/Screen';
import NoPlan from '../../src/components/NoPlan';
import PageHeader from '../../src/components/PageHeader';
import WorkoutPreview from '../../src/components/WorkoutPreview';
import { MuscleChips, Stat } from '../../src/components/WorkoutBits';
import { CheckIcon, ChevronIcon, ClockIcon, DumbbellIcon, LayersIcon, PlayIcon } from '../../src/components/icons';
import { phaseOf, plain, todayIndex, weekOf } from '../../src/lib/program';
import { dayMeta, thumb } from '../../src/lib/workoutMeta';
import { isoDate, loggedDays } from '../../src/lib/logs';

const WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function Train() {
  const { plan, profile, session } = useAuth();
  const router = useRouter();
  const [done, setDone] = useState<Set<string>>(new Set());

  useFocusEffect(useCallback(() => {
    if (!session) return;
    const sunday = new Date(); sunday.setDate(sunday.getDate() - sunday.getDay());
    loggedDays(session.user.id, isoDate(sunday)).then((r) => setDone(new Set(r.map((x) => x.day_label))));
  }, [session]));

  if (!plan) return <NoPlan name={profile?.first_name} />;
  const week = weekOf(plan.train.s);
  const phase = phaseOf(week);
  const { index, isToday } = todayIndex(plan);
  const metas = plan.train.d.map(dayMeta);
  const doneCount = plan.train.d.filter((d) => done.has(d.t)).length;
  const go = (k: number) => router.push({ pathname: '/workout', params: { d: String(k) } });
  const todayDow = new Date().getDay();

  return (
    <Screen header={
      <View style={{ gap: 18 }}>
        <PageHeader kicker={`Week ${week} · ${phase.name}`} title="This week"
          subtitle={`${doneCount} of ${plan.train.d.length} workouts done`} week={week} />

        {/* Week strip: every day at a glance */}
        <View style={st.weekRow}>
          {WEEK.map((d, i) => {
            const k = plan.train.d.findIndex((x) => x.t.toLowerCase().startsWith(d.toLowerCase()));
            const isDone = k >= 0 && done.has(plan.train.d[k].t);
            const isNext = k === index && !isDone;
            return (
              <Pressable key={d} disabled={k < 0} onPress={() => go(k)} accessibilityRole={k >= 0 ? 'button' : undefined}
                accessibilityLabel={k >= 0 ? `${d}: ${metas[k].type}${isDone ? ', done' : ''}` : `${d}: rest day`} style={st.weekDay}>
                <Text style={[st.weekLabel, i === todayDow && { color: C.red2 }]}>{d}</Text>
                <View style={[st.weekDot, k < 0 && st.rest, isNext && { backgroundColor: C.red, borderColor: C.red }, isDone && { backgroundColor: C.green, borderColor: C.green }]}>
                  {isDone ? <CheckIcon size={13} /> : k >= 0 ? <Text style={st.weekType}>{metas[k].type.split(/\s|\+/)[0].slice(0, 5).toUpperCase()}</Text> : <Text style={st.restText}>–</Text>}
                </View>
              </Pressable>
            );
          })}
        </View>

        <WorkoutPreview meta={metas[index]} badge={isToday ? "Today's workout" : `Up next · ${metas[index].day}`}
          cta={isToday ? 'Start workout' : 'Preview workout'} onPress={() => go(index)} maxRows={4} />
      </View>
    }>
      <Text style={st.listTitle}>All {plan.train.d.length} workouts</Text>
      {metas.map((m, k) => {
        const isDone = done.has(plan.train.d[k].t);
        const isNext = k === index && !isDone;
        return (
          <View key={k} style={[st.card, isNext && st.cardNext]}>
            <Pressable accessibilityRole="button" accessibilityLabel={`${m.day} ${m.type}, ${m.items.length} exercises${isDone ? ', done this week' : ''}`}
              onPress={() => go(k)} style={st.head}>
              <View style={[st.day, isDone ? { backgroundColor: C.green, borderColor: C.green } : isNext ? { backgroundColor: C.red, borderColor: C.red } : null]}>
                {isDone ? <CheckIcon size={18} /> : <Text style={st.dayText}>{m.day.slice(0, 3).toUpperCase()}</Text>}
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={[ui.label, { color: isDone ? C.green : isNext ? C.red2 : C.white }]}>{isDone ? 'Done this week' : isNext ? 'Up next' : `Workout ${k + 1}`}</Text>
                <Text style={st.type}>{m.type}</Text>
              </View>
              <ChevronIcon />
            </Pressable>

            <View style={st.stats}>
              <Stat icon={<ClockIcon color={C.red2} size={14} />} value={`${m.minutes} min`} />
              <Stat icon={<DumbbellIcon color={C.red2} size={14} />} value={`${m.items.length}`} />
              <Stat icon={<LayersIcon color={C.red2} size={14} />} value={`${m.sets} sets`} />
            </View>
            <MuscleChips muscles={m.muscles} />

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingRight: 4 }} style={{ marginHorizontal: -2 }}>
              {m.items.map((x, i) => (
                <Pressable key={i} onPress={() => go(k)} style={{ width: 128, gap: 6 }} accessibilityLabel={`${i + 1}. ${x.name}, ${x.target}`}>
                  <View>
                    <Image source={thumb(x.video)} style={st.thumb} resizeMode="cover" accessibilityIgnoresInvertColors />
                    <View style={st.thumbNum}><Text style={st.thumbNumText}>{i + 1}</Text></View>
                    <View style={st.thumbPlay}><PlayIcon size={10} /></View>
                  </View>
                  <Text style={st.thumbName} numberOfLines={2}>{x.name}</Text>
                  <Text style={st.thumbTarget}>{x.target}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        );
      })}

      {!!plan.train.note && (
        <Card style={{ marginTop: 8 }}>
          <Text style={ui.label}>Note from Boon</Text>
          <Body>{plain(plan.train.note)}</Body>
        </Card>
      )}
    </Screen>
  );
}

const st = StyleSheet.create({
  weekRow: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 20 },
  weekDay: { alignItems: 'center', gap: 6, minWidth: 40 },
  weekLabel: { fontFamily: F.xbold, fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', color: C.white },
  weekDot: { width: 42, height: 42, borderRadius: 21, borderWidth: 2, borderColor: C.line, backgroundColor: C.navy2, alignItems: 'center', justifyContent: 'center' },
  rest: { backgroundColor: 'transparent', borderStyle: 'dashed' },
  restText: { fontFamily: F.bold, fontSize: 14, color: C.white },
  weekType: { fontFamily: F.black, fontSize: 9, color: C.white, letterSpacing: 0.3 },
  listTitle: { fontFamily: F.black, fontSize: 21, color: C.white, marginTop: 8 },
  card: { backgroundColor: C.navy2, borderWidth: 1, borderColor: C.line, borderRadius: 22, padding: 16, gap: 12 },
  cardNext: { borderColor: C.red, borderWidth: 2 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  day: { width: 52, height: 52, borderRadius: 26, borderWidth: 2, borderColor: C.line, alignItems: 'center', justifyContent: 'center' },
  dayText: { fontFamily: F.black, fontSize: 13, color: C.white, letterSpacing: 0.5 },
  type: { fontFamily: F.black, fontSize: 22, color: C.white },
  stats: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  thumb: { width: 128, height: 76, borderRadius: 12, backgroundColor: C.navy },
  thumbNum: { position: 'absolute', left: 6, top: 6, minWidth: 22, height: 22, borderRadius: 11, backgroundColor: C.red, alignItems: 'center', justifyContent: 'center' },
  thumbNumText: { fontFamily: F.black, fontSize: 11, color: C.white },
  thumbPlay: { position: 'absolute', right: 6, bottom: 6, width: 22, height: 22, borderRadius: 11, backgroundColor: 'rgba(13,27,51,0.8)', alignItems: 'center', justifyContent: 'center' },
  thumbName: { fontFamily: F.xbold, fontSize: 13, lineHeight: 17, color: C.white },
  thumbTarget: { fontFamily: F.semi, fontSize: 12, color: C.white },
});
