import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Svg, { Path } from 'react-native-svg';
import { useAuth } from '../src/lib/auth';
import { C, F } from '../src/lib/theme';
import Page from '../src/components/Page';
import { RoundBtn } from '../src/components/PageTitle';
import { phaseOf, repsOf, setsFor, weekOf } from '../src/lib/program';
import { dayMeta } from '../src/lib/workoutMeta';
import { isoDate, lastSession } from '../src/lib/logs';
import { isLocked } from '../src/lib/access';

const EQUIP: Record<string, string> = { gym: 'Gym', db: 'Home', bw: 'Bodyweight' };

/** Workout overview: warm-up, every exercise with last week's weight, then Start. */
export default function Day() {
  const { d } = useLocalSearchParams<{ d: string }>();
  const { plan, session, profile } = useAuth();
  const router = useRouter();
  const k = Number(d || 0);
  const day = plan?.train.d[k];
  const week = weekOf(plan?.train.s);
  const [prev, setPrev] = useState<Record<string, { weight: number | null; reps: number | null }[]>>({});

  useEffect(() => { if (isLocked(profile, week)) router.replace('/unlock'); }, [profile, week]);
  useEffect(() => {
    if (!day || !session) return;
    lastSession(session.user.id, day.x.map((x) => x[0]), isoDate()).then(setPrev).catch(() => {});
  }, [day, session]);

  if (!plan || !day) return null;
  const m = dayMeta(day, plan.train.c);
  const equip = plan.train.cfg?.equip ? EQUIP[plan.train.cfg.equip] : undefined;
  const lower = /lower|leg/i.test(m.type);
  const first = m.items[0]?.name.toLowerCase() || 'your first move';
  const go = (i = 0) => router.push({ pathname: '/workout', params: { d: String(k), i: String(i) } });

  const header = (
    <View style={st.head}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <RoundBtn kind="back" onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} />
        <Text style={st.crumb}>{phaseOf(week).name} · Week {week} · Day {k + 1}</Text>
      </View>
      <Text style={st.title} accessibilityRole="header">{m.type}</Text>
      <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
        <Text style={st.chip}>About {m.minutes} min</Text>
        <Text style={st.chip}>{m.items.length} exercises</Text>
        {!!equip && <Text style={st.chip}>{equip}</Text>}
      </View>
    </View>
  );

  const footer = (
    <Pressable accessibilityRole="button" onPress={() => go(0)} style={({ pressed }) => [st.cta, pressed && { opacity: 0.88 }]}>
      <Svg width={16} height={16} viewBox="0 0 24 24"><Path d="M7 4v16l13-8z" fill="#fff" /></Svg>
      <Text style={st.ctaT}>Start workout</Text>
    </Pressable>
  );

  return (
    <Page header={header} footer={footer} style={{ gap: 10 }}>
      <View style={st.warm}>
        <View style={st.warmIcon}><Svg width={20} height={20} viewBox="0 0 24 24"><Path d="M12 3c3 4 6 7 6 11a6 6 0 0 1-12 0c0-2 1-4 2-5 0 2 1 3 2 3 0-4 1-6 2-9z" stroke="#a86400" strokeWidth={2} fill="none" strokeLinecap="round" strokeLinejoin="round" /></Svg></View>
        <View style={{ flex: 1 }}>
          <Text style={st.warmT}>Warm-up</Text>
          <Text style={st.warmS}>5 min {lower ? 'bike' : 'row or brisk walk'} + 2 light sets of {first}</Text>
        </View>
      </View>
      {m.items.map((x, i) => {
        const p = (prev[x.id] || []).filter(Boolean);
        const top = Math.max(0, ...p.map((s) => Number(s.weight) || 0));
        const last = !p.length ? 'first time' : top > 0 ? `${top} lbs` : 'bodyweight';
        const sets = setsFor(day.x[i][1], i, plan, week);
        return (
          <Pressable key={i} accessibilityRole="button" accessibilityLabel={`${i + 1}. ${x.name}, ${sets} sets of ${repsOf(day.x[i][1])}. Last: ${last}`} onPress={() => go(i)} style={st.ex}>
            <View style={st.thumb}>
              <Svg width={18} height={18} viewBox="0 0 24 24"><Path d="M8 5v14l11-7z" fill="#fff" /></Svg>
              <View style={st.num}><Text style={st.numT}>{i + 1}</Text></View>
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={st.exT} numberOfLines={1}>{x.name}</Text>
              <Text style={st.exS} numberOfLines={1}>{sets} × {repsOf(day.x[i][1])} · Last: {last}</Text>
            </View>
            <Svg width={16} height={16} viewBox="0 0 24 24"><Path d="M9 5l7 7-7 7" stroke={C.ink} strokeWidth={2.4} fill="none" strokeLinecap="round" strokeLinejoin="round" /></Svg>
          </Pressable>
        );
      })}
    </Page>
  );
}

const st = StyleSheet.create({
  head: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: '#e6e8ef', backgroundColor: C.bg, gap: 0 },
  crumb: { fontFamily: F.semi, fontSize: 14, color: C.ink },
  title: { fontFamily: F.black, fontSize: 28, letterSpacing: -0.5, color: C.ink, marginTop: 14, marginBottom: 6 },
  chip: { paddingVertical: 6, paddingHorizontal: 11, borderRadius: 14, backgroundColor: '#e8eaf0', fontFamily: F.semi, fontSize: 13, color: C.ink, overflow: 'hidden' },
  warm: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 14, borderRadius: 16, backgroundColor: '#f1f3f7', borderWidth: 1, borderStyle: 'dashed', borderColor: '#cfd4de' },
  warmIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#e8eaf0', alignItems: 'center', justifyContent: 'center' },
  warmT: { fontFamily: F.bold, fontSize: 15, color: C.ink },
  warmS: { fontFamily: F.medium, fontSize: 13, color: C.ink },
  ex: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, paddingHorizontal: 14, borderRadius: 16, backgroundColor: C.card, borderWidth: 1, borderColor: C.line },
  thumb: { width: 52, height: 52, borderRadius: 12, backgroundColor: C.navy, alignItems: 'center', justifyContent: 'center' },
  num: { position: 'absolute', top: -6, left: -6, width: 22, height: 22, borderRadius: 11, backgroundColor: C.red, alignItems: 'center', justifyContent: 'center' },
  numT: { fontFamily: F.xbold, fontSize: 12, color: C.onAccent },
  exT: { fontFamily: F.bold, fontSize: 16, color: C.ink },
  exS: { fontFamily: F.medium, fontSize: 13, color: C.ink, marginTop: 3 },
  cta: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 54, borderRadius: 27, backgroundColor: C.red },
  ctaT: { fontFamily: F.bold, fontSize: 18, color: C.onAccent },
});
