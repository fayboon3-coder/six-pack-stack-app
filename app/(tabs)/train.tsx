import React, { useCallback, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useAuth } from '../../src/lib/auth';
import { C, F } from '../../src/lib/theme';
import { Body, Card, Eyebrow, H1, s as ui } from '../../src/components/ui';
import Screen from '../../src/components/Screen';
import NoPlan from '../../src/components/NoPlan';
import { CheckIcon, PlayIcon } from '../../src/components/icons';
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
  const { index } = todayIndex(plan);

  return (
    <Screen>
      <View style={{ gap: 4, marginTop: 8 }}>
        <Eyebrow>Week {week} · {phaseOf(week).name}</Eyebrow>
        <H1>Your program</H1>
      </View>
      {!!plan.train.note && (
        <Card style={{ borderColor: C.red }}>
          <Text style={ui.label}>Note from Boon</Text>
          <Body>{plain(plan.train.note)}</Body>
        </Card>
      )}
      {plan.train.d.map((d, k) => {
        const [name, type] = d.t.split('·').map((x) => x.trim());
        const isDone = done.has(d.t);
        const isNext = k === index;
        return (
          <Pressable key={k} accessibilityRole="button" accessibilityLabel={`${d.t}, ${d.x.length} exercises${isDone ? ', done this week' : ''}`}
            onPress={() => router.push({ pathname: '/workout', params: { d: String(k) } })}>
            <Card style={isNext ? { borderColor: C.red, borderWidth: 2 } : undefined}>
              <View style={st.row}>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={ui.label}>{name}</Text>
                  <Text style={st.type}>{type || name}</Text>
                </View>
                {isDone ? (
                  <View style={[st.badge, { backgroundColor: C.green }]}><CheckIcon /></View>
                ) : (
                  <View style={[st.badge, { backgroundColor: isNext ? C.red : C.navy }]}><PlayIcon size={14} /></View>
                )}
              </View>
              <View style={st.thumbs}>
                {d.x.slice(0, 4).map((x, j) => {
                  const v = exercises[x[0]]?.video;
                  return v ? <Image key={j} source={{ uri: `https://i.ytimg.com/vi/${v}/mqdefault.jpg` }} style={st.thumb} accessibilityIgnoresInvertColors /> : null;
                })}
              </View>
              <Text style={st.list} numberOfLines={2}>{d.x.map((x) => exercises[x[0]]?.name || x[0]).join(' · ')}</Text>
            </Card>
          </Pressable>
        );
      })}
    </Screen>
  );
}

const st = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  type: { fontFamily: F.black, fontSize: 22, color: C.white, textTransform: 'uppercase' },
  badge: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  list: { fontFamily: F.semi, fontSize: 13, color: C.white, lineHeight: 19 },
  thumbs: { flexDirection: 'row', gap: 6 },
  thumb: { flex: 1, aspectRatio: 16 / 9, borderRadius: 8, backgroundColor: C.navy },
});
