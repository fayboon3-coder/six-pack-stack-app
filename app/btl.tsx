import React from 'react';
import { Image, Linking, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { C, F } from '../src/lib/theme';
import { Button } from '../src/components/ui';
import { BackIcon, CheckIcon } from '../src/components/icons';
import { BTL_URL } from '../src/lib/access';
import { VERDICTS } from '../src/lib/stackcheck';
import Backdrop from '../src/components/Backdrop';
import { twoTone } from '../src/components/TwoTone';

const COVER = require('../assets/img/btl_cover.jpg');
const counts = { worth: 0, situational: 0, skip: 0 } as Record<string, number>;
VERDICTS.forEach((v) => { counts[v.kind]++; });

const INSIDE = [
  `${VERDICTS.length} products and gadgets, each with a verdict, the evidence, the real cost and a cheaper swap`,
  'The trends behind them: Ozempic and "nature\'s Ozempic", peptides, TRT clinics, protein in everything',
  'How to spot a weak study and buy without getting burned',
  'What worked for me: how I eat, how I train, my stack and the starter stacks',
  'The one-page cheat sheet to screenshot and use in the store',
];

/** Beyond the Label: what's inside, then checkout (Kit). */
export default function Btl() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const cw = Math.min(width - 120, 300);
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }}>
      <Backdrop />
      <ScrollView contentContainerStyle={{ padding: 22, gap: 18, paddingBottom: 56 }}>
        <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={() => (router.canGoBack() ? router.back() : router.replace('/welcome'))} hitSlop={10} style={{ width: 40, height: 40, justifyContent: 'center' }}>
          <BackIcon />
        </Pressable>
        <Image source={COVER} style={{ width: cw, height: cw * 1.294, alignSelf: 'center', borderRadius: 6 }} resizeMode="cover" accessibilityLabel="Beyond the Label cover" />
        <Text style={st.k}>Beyond the Label · by Boon Fay</Text>
        <Text style={st.h}>{twoTone("The truth behind| what you're buying.")}</Text>
        <Text style={st.body}>I wasted years and a lot of money on supplements that did nothing. This is everything I found when I investigated them properly.</Text>

        <View style={st.score}>
          <Score n={counts.worth} l="Worth it" c={C.green} />
          <Score n={counts.situational} l="Depends" c="#f2b234" />
          <Score n={counts.skip} l="Skip it" c={C.red} />
        </View>

        <View style={{ gap: 10 }}>
          <Text style={st.label}>What's inside</Text>
          {INSIDE.map((t) => (
            <View key={t} style={st.row}><View style={st.tick}><CheckIcon size={12} /></View><Text style={st.rowText}>{t}</Text></View>
          ))}
        </View>

        <View style={st.buy}>
          <Text style={st.price}>$39.99 <Text style={st.once}>one time</Text></Text>
          <Text style={st.body}>Skip one product you didn't need and it's paid for itself.</Text>
          <Button title="Get Beyond the Label" onPress={() => Linking.openURL(BTL_URL)} />
        </View>

        <Pressable accessibilityRole="button" onPress={() => router.push('/stack-check')} style={st.link}>
          <Text style={st.linkText}>Not sure yet? Check a product free in Stack Check</Text>
        </Pressable>
        <Pressable accessibilityRole="button" onPress={() => router.replace('/welcome')} style={st.link}>
          <Text style={st.linkText}>Or start The Free Stack (2 weeks free)</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const Score = ({ n, l, c }: { n: number; l: string; c: string }) => (
  <View style={[st.sTile, { borderColor: c }]}><Text style={[st.sN, { color: c }]}>{n}</Text><Text style={st.sL}>{l}</Text></View>
);

const st = StyleSheet.create({
  k: { fontFamily: F.xbold, fontSize: 12, letterSpacing: 1.6, textTransform: 'uppercase', color: C.red },
  h: { fontFamily: F.black, fontSize: 30, lineHeight: 34, color: C.ink, letterSpacing: -0.5 },
  body: { fontFamily: F.semi, fontSize: 15, lineHeight: 22, color: C.ink },
  label: { fontFamily: F.xbold, fontSize: 11, letterSpacing: 1.4, textTransform: 'uppercase', color: C.red },
  score: { flexDirection: 'row', gap: 10 },
  sTile: { flex: 1, borderWidth: 1.5, borderRadius: 16, padding: 12, alignItems: 'center', backgroundColor: C.card },
  sN: { fontFamily: F.black, fontSize: 28 },
  sL: { fontFamily: F.xbold, fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', color: C.ink },
  row: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  tick: { width: 22, height: 22, borderRadius: 11, backgroundColor: C.green, alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  rowText: { flex: 1, fontFamily: F.semi, fontSize: 15, lineHeight: 21, color: C.ink },
  buy: { backgroundColor: C.card, borderWidth: 1.5, borderColor: C.red, borderRadius: 22, padding: 18, gap: 12 },
  price: { fontFamily: F.black, fontSize: 34, color: C.ink },
  once: { fontFamily: F.xbold, fontSize: 15, color: C.ink },
  link: { minHeight: 44, justifyContent: 'center', alignItems: 'center' },
  linkText: { fontFamily: F.bold, fontSize: 14, color: C.ink, textDecorationLine: 'underline', textAlign: 'center' },
});
