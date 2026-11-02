import React, { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth } from '../src/lib/auth';
import { C, F } from '../src/lib/theme';
import { Button } from '../src/components/ui';
import FullHero from '../src/components/FullHero';
import { BtlCard, CoachingCard } from '../src/components/Offers';
import { coachingFirst } from '../src/lib/access';
import { plain } from '../src/lib/program';

const HERO = require('../assets/hero/plan_full.jpg');

/** Right after the quiz: their plan, then one next step ranked by what they told the quiz. */
export default function Ready() {
  const { plan, profile, refresh } = useAuth();
  const router = useRouter();
  const [tries, setTries] = useState(0);

  useEffect(() => {
    if (plan || tries > 8) return;
    const t = setTimeout(async () => { await refresh(); setTries((x) => x + 1); }, 1200);
    return () => clearTimeout(t);
  }, [plan, tries, refresh]);

  if (!plan) {
    return (
      <SafeAreaView style={st.center}>
        <ActivityIndicator color={C.red} size="large" />
        <Text style={st.loading}>{tries > 8 ? 'Taking longer than usual. Pull to refresh on the Today tab.' : 'Building your plan…'}</Text>
        {tries > 8 && <Button title="Go to Today" onPress={() => router.replace('/')} />}
      </SafeAreaView>
    );
  }

  const first = plan.train.d[0];
  const hot = coachingFirst(profile);
  return (
    <SafeAreaView edges={[]} style={{ flex: 1, backgroundColor: C.navy }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 48 }}>
        <FullHero image={HERO} pills={[{ text: 'Plan ready', tone: 'green' }, { text: 'Weeks 1–2 free' }]}
          title={`${plan.name}, you're in.`} lede={plain(plan.goal_long)} />
        <View style={{ paddingHorizontal: 20, gap: 14, marginTop: 16 }}>
          <View style={st.goal}><Text style={st.goalK}>Your goal</Text><Text style={st.goalT}>{plan.goal_short}</Text></View>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Tile v={plan.kcal} l="Calories" /><Tile v={`${plan.protein}g`} l="Protein" /><Tile v={plan.steps} l="Steps" />
          </View>
          <Text style={st.body}>First workout: <Text style={{ fontFamily: F.black }}>{first.t}</Text>. Every exercise has a form video.</Text>
          <Button title="Start week 1" onPress={() => router.replace('/')} />
          <Text style={[st.k, { marginTop: 14 }]}>{hot ? 'You said you want to start now' : 'Want to go faster?'}</Text>
          {hot ? <CoachingCard /> : <BtlCard />}
          {hot ? <BtlCard /> : <CoachingCard />}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const Tile = ({ v, l }: { v: string; l: string }) => (
  <View style={st.tile}><Text style={st.tileV}>{v}</Text><Text style={st.tileL}>{l}</Text></View>
);

const st = StyleSheet.create({
  center: { flex: 1, backgroundColor: C.navy, alignItems: 'center', justifyContent: 'center', gap: 16, padding: 24 },
  loading: { fontFamily: F.xbold, fontSize: 16, color: C.white, textAlign: 'center' },
  goal: { backgroundColor: C.red, borderRadius: 18, padding: 16, gap: 4 },
  goalK: { fontFamily: F.xbold, fontSize: 11, letterSpacing: 1.4, textTransform: 'uppercase', color: C.white },
  goalT: { fontFamily: F.black, fontSize: 20, lineHeight: 24, color: C.white },
  body: { fontFamily: F.semi, fontSize: 15, lineHeight: 22, color: C.white },
  k: { fontFamily: F.xbold, fontSize: 12, letterSpacing: 1.6, textTransform: 'uppercase', color: C.red2 },
  tile: { flex: 1, backgroundColor: C.navy2, borderRadius: 16, borderWidth: 1, borderColor: C.line, padding: 12, gap: 2 },
  tileV: { fontFamily: F.black, fontSize: 20, color: C.white },
  tileL: { fontFamily: F.xbold, fontSize: 10, letterSpacing: 1.2, textTransform: 'uppercase', color: C.white },
});
