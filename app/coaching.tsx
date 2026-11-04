import React, { useEffect } from 'react';
import { Image, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { C, F } from '../src/lib/theme';
import { COACHING_URL } from '../src/lib/access';
import { track } from '../src/lib/track';

const BOON = require('../assets/hero/boon_avatar.jpg');
const CLIENTS = [
  { name: 'Robert', b: require('../assets/clients/robert-b.jpg'), a: require('../assets/clients/robert-a.jpg') },
  { name: 'Gerardo', b: require('../assets/clients/gerardo-b.jpg'), a: require('../assets/clients/gerardo-a.jpg') },
  { name: 'James', b: require('../assets/clients/james-b.jpg'), a: require('../assets/clients/james-a.jpg') },
];
const GETS: [string, string][] = [
  ['Your plan in 48 hours.', 'Training, meals from foods you like, and what to order when you eat out.'],
  ['Sunday check-ins with me.', 'I read every one and change one thing at a time.'],
  ['Text me anytime', 'on WhatsApp.'],
  ['A full stack audit.', "Keep what works, drop what's wasting your money."],
];

/** In-app ad for 1:1 coaching: apply, or see how it works. */
export default function Coaching() {
  const router = useRouter();
  useEffect(() => { track('coaching_view', {}, { once: true }); }, []);
  const tick = <View style={st.tick}><Svg width={12} height={12} viewBox="0 0 24 24"><Path d="M5 12.5l4.5 4.5L19 7.5" stroke="#fff" strokeWidth={3.4} fill="none" strokeLinecap="round" strokeLinejoin="round" /></Svg></View>;
  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 170 }}>
        <SafeAreaView edges={['top']} style={st.hero}>
          <Pressable accessibilityRole="button" accessibilityLabel="Close" onPress={() => (router.canGoBack() ? router.back() : router.replace('/you'))} style={st.close}>
            <Svg width={16} height={16} viewBox="0 0 24 24"><Path d="M6 6l12 12M18 6L6 18" stroke={C.ink} strokeWidth={2.6} strokeLinecap="round" /></Svg>
          </Pressable>
          <Text style={st.eyebrow}>1:1 COACHING</Text>
          <Text style={st.h1} accessibilityRole="header">Want me in your corner?</Text>
          <View style={st.chat}>
            <View style={st.chatHead}>
              <Image source={BOON} style={st.avatar} accessibilityLabel="Boon Fay" />
              <View style={{ flex: 1 }}><Text style={st.chatName}>Coach Boon</Text><Text style={st.chatSub}>Your coaching chat</Text></View>
              <Text style={st.online}>ONLINE</Text>
            </View>
            <View style={st.chatBody}>
              <Text style={[st.bub, st.me]}>Down 2.4 lbs this week but I blew it at a birthday Saturday</Text>
              <Text style={[st.bub, st.him]}>One night doesn't undo a week. Your average is still dropping. Back on plan at breakfast, no "making up for it."</Text>
              <Text style={[st.bub, st.him]}>This week: add 1,500 steps a day. That's the only change.</Text>
            </View>
          </View>
          <Text style={st.example}>Example chat. Every client gets me directly.</Text>
        </SafeAreaView>
        <View style={{ padding: 16, gap: 18 }}>
          <Text style={st.body}>The app gives you the plan. Coaching gives you <Text style={{ fontFamily: F.bold }}>me</Text>. 12 weeks, built around your life, adjusted every Sunday until you hit your goal.</Text>
          <View style={st.card}>
            {GETS.map(([b, r], k) => (
              <View key={b} style={[st.get, k < GETS.length - 1 && { borderBottomWidth: 1, borderBottomColor: C.line }]}>{tick}<Text style={st.getT}><Text style={{ fontFamily: F.bold }}>{b}</Text> {r}</Text></View>
            ))}
          </View>
          <Text style={st.label}>REAL CLIENTS</Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {CLIENTS.map((c) => (
              <View key={c.name} style={{ flex: 1 }}>
                <View style={st.pair}><Image source={c.b} style={st.pic} accessibilityLabel={`${c.name} before`} /><Image source={c.a} style={st.pic} accessibilityLabel={`${c.name} after`} /></View>
                <Text style={st.cname}>{c.name}</Text>
              </View>
            ))}
          </View>
          <View style={st.guar}>
            <Svg width={26} height={26} viewBox="0 0 24 24"><Path d="M12 3l8 3v6c0 4.5-3.4 8.3-8 9-4.6-.7-8-4.5-8-9V6z" stroke={C.red} strokeWidth={2} fill="none" strokeLinejoin="round" /><Path d="M8.5 12l2.5 2.5 4.5-5" stroke={C.red} strokeWidth={2} fill="none" strokeLinecap="round" strokeLinejoin="round" /></Svg>
            <Text style={[st.getT, { flex: 1 }]}><Text style={{ fontFamily: F.bold }}>My guarantee:</Text> follow the plan and miss your goal, and I'll coach you up to 12 more weeks for free.</Text>
          </View>
          <Text style={st.fine}>Limited spots. 2-minute application, I reply personally.</Text>
        </View>
      </ScrollView>
      <SafeAreaView edges={['bottom']} style={st.bottom}>
        <Pressable accessibilityRole="button" onPress={() => { track('coaching_apply_tap'); router.push('/apply'); }} style={[st.cta, { backgroundColor: C.red }]}><Text style={st.ctaT}>Apply here</Text></Pressable>
        <Pressable accessibilityRole="link" onPress={() => { track('coaching_page_tap'); Linking.openURL(COACHING_URL); }} style={[st.cta, { backgroundColor: C.navy, height: 52 }]}><Text style={[st.ctaT, { fontSize: 17 }]}>Want to know how coaching works?</Text></Pressable>
      </SafeAreaView>
    </View>
  );
}

const st = StyleSheet.create({
  hero: { backgroundColor: C.bg, paddingHorizontal: 16, paddingBottom: 8 },
  close: { width: 42, height: 42, borderRadius: 21, backgroundColor: C.card, alignItems: 'center', justifyContent: 'center', marginTop: 10, marginBottom: 14 },
  eyebrow: { fontFamily: F.xbold, fontSize: 12, letterSpacing: 1.2, color: C.red },
  h1: { fontFamily: F.black, fontSize: 32, lineHeight: 34, letterSpacing: -0.6, color: C.ink, marginTop: 6, marginBottom: 16 },
  chat: {},
  chatHead: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingBottom: 12 },
  avatar: { width: 40, height: 40, borderRadius: 20 },
  chatName: { fontFamily: F.xbold, fontSize: 15, color: C.ink },
  chatSub: { fontFamily: F.medium, fontSize: 12, color: C.ink },
  online: { fontFamily: F.xbold, fontSize: 11, color: C.green, backgroundColor: '#e7f6ee', paddingHorizontal: 9, paddingVertical: 4, borderRadius: 10, overflow: 'hidden' },
  chatBody: { gap: 8 },
  bub: { maxWidth: '82%', paddingHorizontal: 13, paddingVertical: 10, fontFamily: F.medium, fontSize: 14, lineHeight: 20, overflow: 'hidden' },
  me: { alignSelf: 'flex-end', backgroundColor: C.navy, color: C.onAccent, borderRadius: 16, borderBottomRightRadius: 4 },
  him: { alignSelf: 'flex-start', backgroundColor: C.bg, color: C.ink, borderRadius: 16, borderBottomLeftRadius: 4, borderWidth: 1, borderColor: C.line },
  example: { fontFamily: F.medium, fontSize: 11, color: C.ink, textAlign: 'center', marginTop: 10 },
  body: { fontFamily: F.medium, fontSize: 17, lineHeight: 25, color: C.ink },
  card: { backgroundColor: C.card, borderWidth: 1, borderColor: C.line, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 4 },
  get: { flexDirection: 'row', gap: 12, alignItems: 'flex-start', paddingVertical: 12 },
  tick: { width: 24, height: 24, borderRadius: 12, backgroundColor: C.red, alignItems: 'center', justifyContent: 'center' },
  getT: { flex: 1, fontFamily: F.medium, fontSize: 15, lineHeight: 22, color: C.ink },
  label: { fontFamily: F.xbold, fontSize: 13, letterSpacing: 1, color: C.ink, marginBottom: -8 },
  pair: { flexDirection: 'row', gap: 2, borderRadius: 12, overflow: 'hidden' },
  pic: { flex: 1, height: 96 },
  cname: { fontFamily: F.bold, fontSize: 13, color: C.ink, marginTop: 6 },
  guar: { flexDirection: 'row', gap: 12, alignItems: 'flex-start', borderWidth: 1.5, borderColor: C.navy, borderRadius: 20, padding: 16 },
  fine: { fontFamily: F.medium, fontSize: 13, color: C.ink },
  bottom: { position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: C.bg, borderTopWidth: 1, borderTopColor: C.line, paddingHorizontal: 16, paddingTop: 14, gap: 10 },
  cta: { height: 54, borderRadius: 27, alignItems: 'center', justifyContent: 'center', marginBottom: 2 },
  ctaT: { fontFamily: F.bold, fontSize: 18, color: C.onAccent },
});
