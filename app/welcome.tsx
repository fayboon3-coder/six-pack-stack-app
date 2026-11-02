import React, { useEffect, useRef } from 'react';
import { Animated, Image, ImageSourcePropType, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { C, F } from '../src/lib/theme';
import type { Want } from '../src/lib/lead';

const HERO = require('../assets/hero/boon_jacked.jpg');
const PLAN = require('../assets/hero/plan_full.jpg');
const BTL = require('../assets/img/btl_cover.jpg');
const COACH = require('../assets/hero/progress_full.jpg');
const LOGO = require('../assets/logo-b.png');

const PATHS: { want: Want; img: ImageSourcePropType; tag: string; price: string; title: string; line: string; contain?: boolean }[] = [
  { want: 'plan', img: PLAN, tag: 'Start here', price: 'Free', title: 'My free 12-week plan', line: 'Your calories, your meals and a 4-day program with form videos. Built from a 2-minute quiz.' },
  { want: 'btl', img: BTL, tag: 'The guide', price: '$39.99', title: 'Beyond the Label', line: 'What actually works out of 40+ supplements and gadgets, and what\'s marketing.', contain: true },
  { want: 'coaching', img: COACH, tag: '1:1 with Boon', price: 'Apply', title: 'Six-Pack Stack Coaching', line: 'I audit your stack, build your plan and check in with you every Sunday for 12 weeks.' },
];

/** The front door: pick what you're here for. */
export default function Welcome() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const w = Math.min(width, 640);
  const fade = useRef(PATHS.map(() => new Animated.Value(0))).current;
  useEffect(() => {
    Animated.stagger(110, fade.map((v) => Animated.timing(v, { toValue: 1, duration: 420, useNativeDriver: true }))).start();
  }, []);

  return (
    <SafeAreaView edges={[]} style={{ flex: 1, backgroundColor: C.navy }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 48 }}>
        <View style={st.brand}>
          <Image source={LOGO} style={{ width: 34, height: 34 }} />
          <Text style={st.brandText}>SIX-PACK STACK</Text>
        </View>
        <View style={{ width: w, height: w * 0.95, alignSelf: 'center' }}>
          <Image source={HERO} style={{ width: w, height: w * 0.95 }} resizeMode="cover" accessibilityIgnoresInvertColors />
          <LinearGradient colors={['rgba(13,27,51,0.55)', 'rgba(13,27,51,0)', 'rgba(13,27,51,0.75)', C.navy]} locations={[0, 0.25, 0.65, 1]} style={StyleSheet.absoluteFill} />
          <View style={st.heroText}>
            <Text style={st.kicker}>225 → 175 lbs. No magic pills.</Text>
            <Text style={st.h} accessibilityRole="header">Build the body.{'\n'}Skip the BS.</Text>
          </View>
        </View>

        <View style={{ paddingHorizontal: 20, gap: 14 }}>
          <Text style={st.pick}>What are you here for?</Text>
          {PATHS.map((p, i) => (
            <Animated.View key={p.want} style={{ opacity: fade[i], transform: [{ translateY: fade[i].interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) }] }}>
              <Pressable accessibilityRole="button" accessibilityLabel={`${p.title}, ${p.price}`}
                onPress={() => router.push({ pathname: '/lead', params: { want: p.want } })}
                style={({ pressed }) => [st.card, i === 0 && st.cardHot, { transform: [{ scale: pressed ? 0.98 : 1 }] }]}>
                <View style={st.thumb}>
                  <Image source={p.img} style={p.contain ? { width: '82%', height: '92%' } : { width: 88, height: 104 }} resizeMode={p.contain ? 'contain' : 'cover'} accessibilityIgnoresInvertColors />
                </View>
                <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
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
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const st = StyleSheet.create({
  brand: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 20, paddingTop: 58, paddingBottom: 12, backgroundColor: '#08142a' },
  brandText: { fontFamily: F.black, fontSize: 14, letterSpacing: 2.4, color: C.white },
  heroText: { position: 'absolute', left: 20, right: 20, bottom: 6, gap: 8 },
  kicker: { fontFamily: F.xbold, fontSize: 12, letterSpacing: 1.6, textTransform: 'uppercase', color: C.red2 },
  h: { fontFamily: F.black, fontSize: 40, lineHeight: 42, color: C.white, textTransform: 'uppercase', letterSpacing: -0.8 },
  pick: { fontFamily: F.black, fontSize: 20, color: C.white, marginTop: 10 },
  card: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: C.navy2, borderWidth: 1.5, borderColor: C.line, borderRadius: 22, padding: 12 },
  cardHot: { borderColor: C.red },
  thumb: { width: 88, height: 104, borderRadius: 14, overflow: 'hidden', backgroundColor: '#e9edf4', alignItems: 'center', justifyContent: 'center' },
  tag: { fontFamily: F.xbold, fontSize: 10, letterSpacing: 1.4, textTransform: 'uppercase', color: C.red2 },
  price: { backgroundColor: C.red, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 },
  priceText: { fontFamily: F.black, fontSize: 10, letterSpacing: 0.6, textTransform: 'uppercase', color: C.white },
  title: { fontFamily: F.black, fontSize: 17, lineHeight: 21, color: C.white },
  line: { fontFamily: F.semi, fontSize: 12.5, lineHeight: 17, color: C.white },
  chev: { fontFamily: F.bold, fontSize: 30, color: C.white, marginTop: -4 },
  link: { minHeight: 48, justifyContent: 'center', alignItems: 'center', marginTop: 4 },
  linkText: { fontFamily: F.bold, fontSize: 14, color: C.white, textDecorationLine: 'underline' },
});
