import React, { useEffect } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { C, F } from '../src/lib/theme';
import { track } from '../src/lib/track';

const LOGO = require('../assets/logo-b.png');

/** The front door: logo, one promise, build my plan or log in. */
export default function Welcome() {
  const router = useRouter();
  useEffect(() => { track('welcome_view', {}, { once: true }); }, []);
  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <SafeAreaView edges={['top']} style={st.top}>
        <Image source={LOGO} style={{ width: 72, height: 72 }} accessibilityIgnoresInvertColors />
        <Text style={st.word} accessibilityRole="header">Six-Pack{'\n'}Stack</Text>
      </SafeAreaView>
      <SafeAreaView edges={['bottom']} style={st.sheet}>
        <Text style={st.h1}>Stop guessing.{'\n'}Start stacking.</Text>
        <Text style={st.sub}>A plan built around the food you already eat and workouts that fit your week. Snap a meal to log it, watch your real trend, and check any supplement before you buy it.</Text>
        <Pressable accessibilityRole="button" onPress={() => { track('welcome_pick', { want: 'plan' }); router.push('/quiz'); }} style={({ pressed }) => [st.btn, { opacity: pressed ? 0.88 : 1 }]}>
          <Text style={st.btnT}>Build my plan</Text>
        </Pressable>
        <Pressable accessibilityRole="button" onPress={() => router.push('/sign-in')} style={st.ghost}>
          <Text style={st.ghostT}>Log in</Text>
        </Pressable>
      </SafeAreaView>
    </View>
  );
}

const st = StyleSheet.create({
  top: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 14, paddingTop: 40 },
  word: { fontFamily: F.black, fontSize: 30, lineHeight: 30, letterSpacing: -0.5, color: C.ink },
  sheet: { backgroundColor: C.card, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 16, paddingTop: 40, paddingBottom: 18, gap: 14 },
  h1: { fontFamily: F.black, fontSize: 33, lineHeight: 36, textAlign: 'center', letterSpacing: -0.6, color: C.ink },
  sub: { fontFamily: F.medium, fontSize: 17, lineHeight: 25, textAlign: 'center', color: C.ink, paddingHorizontal: 8, marginBottom: 30 },
  btn: { height: 54, borderRadius: 27, backgroundColor: C.navy, alignItems: 'center', justifyContent: 'center' },
  btnT: { fontFamily: F.bold, fontSize: 18, color: C.onAccent },
  ghost: { height: 52, borderRadius: 26, borderWidth: 1.5, borderColor: '#d5d9e3', backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center' },
  ghostT: { fontFamily: F.bold, fontSize: 18, color: C.ink },
});
