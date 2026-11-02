import React, { useEffect, useRef } from 'react';
import { Animated, Image, ImageSourcePropType, Linking, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { C, F } from '../src/lib/theme';
import type { Want } from '../src/lib/lead';
import { BTL_URL, COACHING_URL } from '../src/lib/access';
import Backdrop from '../src/components/Backdrop';
import { twoTone } from '../src/components/TwoTone';

const PLAN = require('../assets/img/tile_plan.jpg');
const APP = require('../assets/img/cover_program.jpg');
const BTL = require('../assets/img/btl_cover.jpg');
const COACH = require('../assets/img/cover_coaching.jpg');
const LOGO = require('../assets/logo-b.png');


const PATHS: { want: Want; img: ImageSourcePropType; tag: string; price: string; title: string; line: string; contain?: boolean }[] = [
  { want: 'plan', img: PLAN, tag: 'Start here', price: 'Free', title: 'The Free Stack', line: 'Your first 2 weeks free: your calories, your meals and your training, built from a 2-minute quiz.' },
  { want: 'btl', img: BTL, tag: 'The guide', price: '$39.99', title: 'Beyond the Label', line: '47 supplements and gadgets investigated: what actually works, and what\'s just marketing.' },
  { want: 'sub', img: APP, tag: 'Best value', price: '$19.99/mo', title: 'The Full Stack', line: 'All 12 weeks: everything you need to finish on your own. Or $99 a year ($1.90 a week).' },
  { want: 'coaching', img: COACH, tag: '1:1 with Boon', price: 'By application', title: 'Six-Pack Stack Coaching', line: 'I audit your stack, build your plan and check in with you every Sunday for 12 weeks.' },
];

/** The front door: pick what you're here for. */
export default function Welcome() {
  const router = useRouter();
  const fade = useRef(PATHS.map(() => new Animated.Value(0))).current;
  useEffect(() => {
    Animated.stagger(110, fade.map((v) => Animated.timing(v, { toValue: 1, duration: 420, useNativeDriver: true }))).start();
  }, []);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.navy }}>
      <Backdrop />
      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 48, gap: 14 }}>
        <View style={st.brand}>
          <Image source={LOGO} style={{ width: 36, height: 36 }} />
          <Text style={st.brandText}>SIX-PACK STACK</Text>
        </View>
        <View style={{ gap: 10, marginTop: 18, marginBottom: 8 }}>
          <Text style={st.kicker}>Build the body. Skip the BS.</Text>
          <Text style={st.h} accessibilityRole="header">{twoTone('What are you|\nhere for?')}</Text>
          <Text style={st.sub}>Pick one to start. The others are always here.</Text>
        </View>
        {PATHS.map((p, i) => (
          <Animated.View key={p.want} style={{ opacity: fade[i], transform: [{ translateY: fade[i].interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) }] }}>
            <Pressable accessibilityRole="button" accessibilityLabel={`${p.title}, ${p.price}`}
              onPress={() => (p.want === 'btl' ? Linking.openURL(BTL_URL) : p.want === 'coaching' ? Linking.openURL(COACHING_URL) : router.push({ pathname: '/lead', params: { want: p.want } }))}
              style={({ pressed }) => [st.card, p.want === 'sub' && st.cardSub, { transform: [{ scale: pressed ? 0.98 : 1 }] }]}>
              <View style={st.thumb}>
                <Image source={p.img} style={{ width: 100, height: 126 }} resizeMode="cover" accessibilityIgnoresInvertColors />
              </View>
              <View style={{ flex: 1, minWidth: 0, gap: 5 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Text style={st.tag}>{p.tag}</Text>
                  <View style={[st.price, p.price === 'Free' && { backgroundColor: C.green }]}><Text style={[st.priceText, p.price === 'Free' && { color: C.navy }]}>{p.price}</Text></View>
                </View>
                <Text style={st.title}>{p.title}</Text>
                <Text style={st.line}>{p.line}</Text>
              </View>
              <Text style={st.chev}>›</Text>
            </Pressable>
          </Animated.View>
        ))}
        <Pressable accessibilityRole="button" onPress={() => router.push('/sign-in')} style={st.link}>
          <Text style={st.linkText}>Already have an account? Sign in</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const st = StyleSheet.create({
  brand: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingTop: 12 },
  sub: { fontFamily: F.semi, fontSize: 15, lineHeight: 21, color: C.white },
  brandText: { fontFamily: F.black, fontSize: 14, letterSpacing: 2.4, color: C.white },
  heroText: { position: 'absolute', left: 20, right: 20, bottom: 6, gap: 8 },
  kicker: { fontFamily: F.xbold, fontSize: 12, letterSpacing: 1.6, textTransform: 'uppercase', color: C.red2 },
  h: { fontFamily: F.black, fontSize: 40, lineHeight: 43, color: C.white, textTransform: 'uppercase', letterSpacing: -0.8 },
  pick: { fontFamily: F.black, fontSize: 20, color: C.white, marginTop: 10 },
  card: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: C.navy2, borderWidth: 1.5, borderColor: C.line, borderRadius: 22, padding: 12, minHeight: 140 },
  cardHot: { borderColor: C.green },
  cardSub: { borderColor: C.red, borderWidth: 2 },
  thumb: { width: 100, height: 126, borderRadius: 14, overflow: 'hidden', backgroundColor: C.navy },
  tag: { fontFamily: F.xbold, fontSize: 10, letterSpacing: 1.4, textTransform: 'uppercase', color: C.red2 },
  price: { backgroundColor: C.red, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 },
  priceText: { fontFamily: F.black, fontSize: 10, letterSpacing: 0.6, textTransform: 'uppercase', color: C.white },
  title: { fontFamily: F.black, fontSize: 17, lineHeight: 21, color: C.white },
  line: { fontFamily: F.semi, fontSize: 12.5, lineHeight: 17, color: C.white },
  chev: { fontFamily: F.bold, fontSize: 30, color: C.white, marginTop: -4 },
  link: { minHeight: 48, justifyContent: 'center', alignItems: 'center', marginTop: 4 },
  linkText: { fontFamily: F.bold, fontSize: 14, color: C.white, textDecorationLine: 'underline' },
});
