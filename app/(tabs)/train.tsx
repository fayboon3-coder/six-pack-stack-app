import React, { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useAuth } from '../../src/lib/auth';
import { C, F } from '../../src/lib/theme';
import { Body, Card, s as ui } from '../../src/components/ui';
import Screen from '../../src/components/Screen';
import NoPlan from '../../src/components/NoPlan';
import PageHeader from '../../src/components/PageHeader';
import HeroCard from '../../src/components/HeroCard';

const HERO_IMG = require('../../assets/hero/dumbbells.jpg');
import { CheckIcon } from '../../src/components/icons';
import { exercises, phaseOf, plain, todayIndex, weekOf } from '../../src/lib/program';
import { isoDate, loggedDays } from '../../src/lib/logs';

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
  const { index } = todayIndex(plan);
  const doneCount = plan.train.d.filter((d) => done.has(d.t)).length;

  return (
    <Screen header={
      <View style={{ gap: 18 }}>
        <PageHeader kicker={`Week ${week} · ${phase.name}`} title="This week"
          subtitle={`${doneCount} of ${plan.train.d.length} workouts done`} week={week} />
        <HeroCard image={HERO_IMG} badge={`Up next · ${plan.train.d[index].t.split('·')[0].trim()}`}
          title={(plan.train.d[index].t.split('·')[1] || plan.train.d[index].t).trim()}
          subtitle={`${plan.train.d[index].x.length} exercises · about 45 min`} cta="Start workout"
          onPress={() => router.push({ pathname: '/workout', params: { d: String(index) } })} />
      </View>
    }>
      <Text style={st.listTitle}>All workouts</Text>
      {plan.train.d.map((d, k) => {
        const [name, type] = d.t.split('·').map((x) => x.trim());
        const isDone = done.has(d.t);
        const isNext = k === index && !isDone;
        return (
          <Pressable key={k} accessibilityRole="button"
            accessibilityLabel={`${d.t}, ${d.x.length} exercises${isDone ? ', done this week' : ''}`}
            onPress={() => router.push({ pathname: '/workout', params: { d: String(k) } })}
            style={({ pressed }) => [st.row, isNext && st.rowNext, pressed && { opacity: 0.85 }]}>
            <View style={[st.day, isDone ? { backgroundColor: C.green, borderColor: C.green } : isNext ? { backgroundColor: C.red, borderColor: C.red } : null]}>
              {isDone ? <CheckIcon size={18} /> : <Text style={st.dayText}>{name.slice(0, 3).toUpperCase()}</Text>}
            </View>
            <View style={{ flex: 1, gap: 3, minWidth: 0 }}>
              {isNext && <Text style={[ui.label, { color: C.red2 }]}>Up next</Text>}
              <Text style={st.type}>{type || name}</Text>
              <Text style={st.meta} numberOfLines={1}>
                {d.x.length} exercises · ~45 min · {exercises[d.x[0][0]]?.name || d.x[0][0]}
              </Text>
            </View>
            <Text style={st.chev}>›</Text>
          </Pressable>
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
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: C.navy2, borderWidth: 1, borderColor: C.line, borderRadius: 20, padding: 16, minHeight: 88 },
  rowNext: { borderColor: C.red, borderWidth: 2 },
  day: { width: 52, height: 52, borderRadius: 26, borderWidth: 2, borderColor: C.line, alignItems: 'center', justifyContent: 'center' },
  dayText: { fontFamily: F.black, fontSize: 13, color: C.white, letterSpacing: 0.5 },
  type: { fontFamily: F.black, fontSize: 20, color: C.white },
  meta: { fontFamily: F.semi, fontSize: 13, color: C.white },
  listTitle: { fontFamily: F.black, fontSize: 21, color: C.white, marginTop: 8 },
  chev: { fontFamily: F.bold, fontSize: 30, color: C.white, marginTop: -4 },
});
