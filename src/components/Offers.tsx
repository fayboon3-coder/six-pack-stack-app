import React from 'react';
import { Image, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { C, F } from '../lib/theme';
import { BTL_URL } from '../lib/access';
import { CheckIcon, LockIcon } from './icons';

const BTL_IMG = require('../../assets/hero/stack_full.jpg');

const Tick = ({ children }: { children: string }) => (
  <View style={st.tick}>
    <View style={st.tickDot}><CheckIcon size={11} /></View>
    <Text style={st.tickText}>{children}</Text>
  </View>
);

/** The full 12 weeks (subscription). Purchases switch on with payments (phase 3). */
export function SubscriptionCard({ onStart }: { onStart?: () => void }) {
  return (
    <View style={[st.card, { borderColor: C.red }]}>
      <View style={st.badge}><Text style={st.badgeText}>Most popular</Text></View>
      <Text style={st.title}>All 12 weeks</Text>
      <Text style={st.price}>$99<Text style={st.per}> / year</Text>  <Text style={st.small}>($1.90 a week)</Text></Text>
      <View style={{ gap: 8 }}>
        <Tick>Weeks 3–12 of your program, with re-sets at weeks 4 and 8</Tick>
        <Tick>Your meal plan, swaps and eating-out orders</Tick>
        <Tick>Every supplement verdict from Beyond the Label</Tick>
        <Tick>Progress photos, trends and weekly check-ins</Tick>
      </View>
      <Pressable accessibilityRole="button" onPress={onStart} disabled={!onStart} style={[st.btn, !onStart && { opacity: 0.55 }]}>
        <Text style={st.btnText}>{onStart ? 'Start 7-day free trial' : 'Opens with the App Store launch'}</Text>
      </Pressable>
      <Text style={st.small}>Or $19.99 a month. Cancel anytime.</Text>
    </View>
  );
}

export function CoachingCard() {
  const router = useRouter();
  return (
    <View style={st.card}>
      <Text style={st.kicker}>1:1 with Boon</Text>
      <Text style={st.title}>Six-Pack Stack Coaching</Text>
      <Text style={st.body}>I audit your supplements, build your plan around your life, review your check-in every Sunday and answer you on WhatsApp. 12 weeks, with a results guarantee.</Text>
      <Pressable accessibilityRole="button" onPress={() => router.push('/apply')} style={st.btn}>
        <Text style={st.btnText}>Apply for coaching</Text>
      </Pressable>
      <Text style={st.small}>2 minutes. I read every application myself.</Text>
    </View>
  );
}

export function BtlCard() {
  return (
    <View style={[st.card, { padding: 0, overflow: 'hidden' }]}>
      <Image source={BTL_IMG} style={{ width: '100%', aspectRatio: 1200 / 1104 }} resizeMode="cover" accessibilityIgnoresInvertColors />
      <View style={{ padding: 18, gap: 10 }}>
        <Text style={st.kicker}>Beyond the Label · $39.99</Text>
        <Text style={st.title}>What actually works, and what's marketing</Text>
        <Text style={st.body}>My full investigation of 40+ fitness products. Check anything before you buy it.</Text>
        <Pressable accessibilityRole="link" onPress={() => Linking.openURL(BTL_URL)} style={[st.btn, { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: C.white }]}>
          <Text style={st.btnText}>Get Beyond the Label</Text>
        </Pressable>
      </View>
    </View>
  );
}

export function LockedWeek({ week, onUnlock }: { week: number; onUnlock: () => void }) {
  return (
    <Pressable accessibilityRole="button" onPress={onUnlock} style={st.locked}>
      <View style={st.lockIcon}><LockIcon size={22} /></View>
      <Text style={st.kicker}>Week {week} is ready</Text>
      <Text style={st.title}>Your free 2 weeks are done.</Text>
      <Text style={st.body}>Don't stop now. The next 10 weeks are where the results show. Unlock the rest of your plan to keep going.</Text>
      <View style={st.btn}><Text style={st.btnText}>Unlock weeks 3–12</Text></View>
    </Pressable>
  );
}

const st = StyleSheet.create({
  card: { backgroundColor: C.navy2, borderWidth: 1.5, borderColor: C.line, borderRadius: 22, padding: 18, gap: 10 },
  badge: { alignSelf: 'flex-start', backgroundColor: C.red, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 },
  badgeText: { fontFamily: F.black, fontSize: 10, letterSpacing: 1.2, textTransform: 'uppercase', color: C.white },
  kicker: { fontFamily: F.xbold, fontSize: 11, letterSpacing: 1.4, textTransform: 'uppercase', color: C.red2 },
  title: { fontFamily: F.black, fontSize: 22, lineHeight: 26, color: C.white },
  price: { fontFamily: F.black, fontSize: 34, color: C.white },
  per: { fontFamily: F.xbold, fontSize: 16, color: C.white },
  body: { fontFamily: F.semi, fontSize: 14, lineHeight: 20, color: C.white },
  small: { fontFamily: F.semi, fontSize: 12, color: C.white, textAlign: 'center' },
  tick: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  tickDot: { width: 20, height: 20, borderRadius: 10, backgroundColor: C.green, alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  tickText: { flex: 1, fontFamily: F.semi, fontSize: 14, lineHeight: 20, color: C.white },
  btn: { height: 54, borderRadius: 14, backgroundColor: C.red, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 },
  btnText: { fontFamily: F.black, fontSize: 15, letterSpacing: 0.6, textTransform: 'uppercase', color: C.white, textAlign: 'center' },
  locked: { marginHorizontal: 20, backgroundColor: C.navy2, borderWidth: 1.5, borderColor: C.red, borderRadius: 24, padding: 20, gap: 10 },
  lockIcon: { width: 48, height: 48, borderRadius: 24, backgroundColor: C.red, alignItems: 'center', justifyContent: 'center' },
});
