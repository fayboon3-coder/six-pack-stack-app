import React, { useEffect, useRef } from 'react';
import { Animated, Image, ImageSourcePropType, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { C, F } from '../src/lib/theme';
import { CheckIcon } from '../src/components/icons';
import type { Want } from '../src/lib/lead';

const PLAN = require('../assets/img/tile_plan.jpg');
const APP = require('../assets/img/tile_app.jpg');
const BTL = require('../assets/img/btl_cover.jpg');
const COACH = require('../assets/img/tile_coach.jpg');
const LOGO = require('../assets/logo-b.png');

const INCLUDED = [
  'All 12 weeks: Strip, Stack and Six-Pack phases',
  'Calories re-set at weeks 4 and 8 so you never stall',
  'Your meal plan, swaps, eating-out orders and grocery list',
  'Stack Check: all 47 Beyond the Label verdicts ($39.99 on its own)',
  'Form videos, last-week numbers, streaks and PR alerts',
  'Weekly check-ins, progress photos and your trend',
];

const PATHS: { want: Want; img: ImageSourcePropType; tag: string; price: string; title: string; line: string; contain?: boolean }[] = [
  { want: 'plan', img: PLAN, tag: 'Start here', price: 'Free', title: 'Try the plan free', line: 'Your calories, your meals and your first 2 weeks of training, built from a 2-minute quiz.' },
  { want: 'btl', img: BTL, tag: 'The guide', price: '$39.99', title: 'Beyond the Label', line: 'What actually works out of 40+ supplements and gadgets, and what\'s marketing.' },
  { want: 'sub', img: APP, tag: 'Best value', price: '$19.99/mo', title: 'The Full 12-Week Program', line: 'Everything you need to finish the 12 weeks on your own. Or $99 a year ($1.90 a week).' },
  { want: 'coaching', img: COACH, tag: '1:1 with Boon', price: 'Apply', title: 'Six-Pack Stack Coaching', line: 'I audit your stack, build your plan and check in with you every Sunday for 12 weeks.' },
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
      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 48, gap: 14 }}>
        <View style={st.brand}>
          <Image source={LOGO} style={{ width: 36, height: 36 }} />
          <Text style={st.brandText}>SIX-PACK STACK</Text>
        </View>
        <View style={{ gap: 10, marginTop: 18, marginBottom: 8 }}>
          <Text style={st.kicker}>Build the body. Skip the BS.</Text>
          <Text style={st.h} accessibilityRole="header">What are you here for?</Text>
          <Text style={st.sub}>Pick one to start. The others are always here.</Text>
        </View>
        {PATHS.map((p, i) => (
          <Animated.View key={p.want} style={{ opacity: fade[i], transform: [{ translateY: fade[i].interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) }] }}>
            <Pressable accessibilityRole="button" accessibilityLabel={`${p.title}, ${p.price}`}
              onPress={() => router.push({ pathname: '/lead', params: { want: p.want } })}
              style={({ pressed }) => [st.card, i === 0 && st.cardHot, p.want === 'sub' && st.cardSub, { transform: [{ scale: pressed ? 0.98 : 1 }] }]}>
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
            {p.want === 'sub' && (
              <Pressable accessibilityRole="button" accessibilityLabel="What's in the Full 12-Week Program"
                onPress={() => router.push({ pathname: '/lead', params: { want: 'sub' } })} style={st.included}>
                <Text style={st.incK}>What you get</Text>
                {INCLUDED.map((t) => (
                  <View key={t} style={st.incRow}><View style={st.incTick}><CheckIcon size={10} /></View><Text style={st.incText}>{t}</Text></View>
                ))}
                <Text style={st.incFoot}>Less than one tub of pre-workout a month. Cancel anytime.</Text>
              </Pressable>
            )}
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
  cardSub: { borderColor: C.red, borderWidth: 2, borderBottomLeftRadius: 0, borderBottomRightRadius: 0, backgroundColor: '#1a2e55' },
  included: { marginTop: -2, backgroundColor: '#1a2e55', borderWidth: 2, borderTopWidth: 0, borderColor: C.red, borderBottomLeftRadius: 22, borderBottomRightRadius: 22, paddingHorizontal: 16, paddingBottom: 16, paddingTop: 4, gap: 8 },
  incK: { fontFamily: F.xbold, fontSize: 10, letterSpacing: 1.4, textTransform: 'uppercase', color: C.red2 },
  incRow: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  incTick: { width: 18, height: 18, borderRadius: 9, backgroundColor: C.green, alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  incText: { flex: 1, fontFamily: F.semi, fontSize: 13.5, lineHeight: 19, color: C.white },
  incFoot: { fontFamily: F.black, fontSize: 13, color: C.white, marginTop: 4 },
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
