import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import FullHero from '../src/components/FullHero';
import { C, F } from '../src/lib/theme';
import { Button } from '../src/components/ui';
import { CalendarIcon, DumbbellIcon, ForkIcon, ShieldIcon } from '../src/components/icons';

const HERO = require('../assets/hero/progress_full.jpg');

const Row = ({ icon, title, sub }: { icon: React.ReactNode; title: string; sub: string }) => (
  <View style={st.row}>
    <View style={st.icon}>{icon}</View>
    <View style={{ flex: 1, gap: 2 }}>
      <Text style={st.rowTitle}>{title}</Text>
      <Text style={st.rowSub}>{sub}</Text>
    </View>
  </View>
);

/** The front door: everyone who isn't signed in lands here. */
export default function Welcome() {
  const router = useRouter();
  return (
    <SafeAreaView edges={[]} style={{ flex: 1, backgroundColor: C.navy }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 48 }}>
        <FullHero image={HERO} pills={[{ text: 'Free 12-week plan' }, { text: 'No supplements needed', tone: 'green' }]}
          title="Build the body. Skip the BS."
          lede="Answer a few questions and get a 12-week plan built around your body, your gym and the food you actually eat." />
        <View style={{ paddingHorizontal: 20, gap: 14, marginTop: 18 }}>
          <Row icon={<DumbbellIcon color={C.red2} size={20} />} title="Push, Pull, Legs, Upper" sub="Every exercise with a form video, sets, reps and your last numbers." />
          <Row icon={<ForkIcon color={C.red2} size={20} />} title="Your calories and protein" sub="Real meals, eating-out orders and a grocery list. No meal-prep cult." />
          <Row icon={<ShieldIcon color={C.red2} size={18} />} title="Only supplements that work" sub="From someone who wasted years and hundreds of dollars on the ones that don't." />
          <Row icon={<CalendarIcon color={C.red2} size={20} />} title="Your goal date" sub="See exactly when you hit your number, before you start." />
          <Button title="Get my free plan" onPress={() => router.push('/quiz')} style={{ marginTop: 8 }} />
          <Text style={st.small}>Takes about 2 minutes.</Text>
          <Pressable accessibilityRole="button" onPress={() => router.push('/sign-in')} style={st.link}>
            <Text style={st.linkText}>Already have an account or coaching with Boon? Sign in</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const st = StyleSheet.create({
  row: { flexDirection: 'row', gap: 14, alignItems: 'center', backgroundColor: C.navy2, borderWidth: 1, borderColor: C.line, borderRadius: 18, padding: 14 },
  icon: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(226,67,59,0.15)', borderWidth: 1, borderColor: C.red, alignItems: 'center', justifyContent: 'center' },
  rowTitle: { fontFamily: F.black, fontSize: 16, color: C.white },
  rowSub: { fontFamily: F.semi, fontSize: 13, lineHeight: 18, color: C.white },
  small: { fontFamily: F.semi, fontSize: 13, color: C.white, textAlign: 'center' },
  link: { minHeight: 48, justifyContent: 'center', alignItems: 'center' },
  linkText: { fontFamily: F.bold, fontSize: 14, color: C.white, textDecorationLine: 'underline', textAlign: 'center' },
});
