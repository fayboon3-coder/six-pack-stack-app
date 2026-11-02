import React, { useEffect, useRef, useState } from 'react';
import { Animated, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth } from '../src/lib/auth';
import { C, F } from '../src/lib/theme';
import { Button } from '../src/components/ui';
import FullHero from '../src/components/FullHero';
import { BtlCard, CoachingCard } from '../src/components/Offers';
import { coachingFirst } from '../src/lib/access';
import { plain } from '../src/lib/program';
import Backdrop from '../src/components/Backdrop';
import LoadingScreen from '../src/components/LoadingScreen';

const HERO = require('../assets/hero/plan_full.jpg');

/** Right after the quiz: their plan, then one next step ranked by what they told the quiz. */
export default function Ready() {
  const { plan, profile, refresh } = useAuth();
  const router = useRouter();
  const [tries, setTries] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const reveal = useRef(new Animated.Value(0)).current;
  useEffect(() => { if (revealed) Animated.timing(reveal, { toValue: 1, duration: 450, useNativeDriver: true }).start(); }, [revealed]);

  useEffect(() => {
    if (plan || tries > 8) return;
    const t = setTimeout(async () => { await refresh(); setTries((x) => x + 1); }, 1200);
    return () => clearTimeout(t);
  }, [plan, tries, refresh]);

  if (!plan || !revealed) {
    const slow = !plan && tries > 8;
    return (
      <SafeAreaView edges={[]} style={{ flex: 1, backgroundColor: C.navy }}>
        <LoadingScreen
          title={slow ? 'Almost| there' : 'Building your| plan'}
          sub={slow ? 'This is taking longer than usual. Your plan will be on the Today tab.' : 'Made from your answers. Nothing generic.'}
          steps={['Setting your calories and protein', 'Building meals from the foods you picked', 'Writing your training split', 'Picking your starter stack', 'Mapping your 12 weeks']}
          stepMs={700}
          done={!!plan}
          onFinish={() => setRevealed(true)}
        >
          {slow && <View style={{ marginTop: 24, alignSelf: 'stretch' }}><Button title="Go to Today" onPress={() => router.replace('/')} /></View>}
        </LoadingScreen>
      </SafeAreaView>
    );
  }

  const first = plan.train.d[0];
  const hot = coachingFirst(profile);
  return (
    <SafeAreaView edges={[]} style={{ flex: 1, backgroundColor: C.navy }}>
      <Backdrop />
      <Animated.ScrollView style={{ opacity: reveal, transform: [{ translateY: reveal.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) }] }} contentContainerStyle={{ paddingBottom: 48 }}>
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
      </Animated.ScrollView>
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
