import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Image, Linking, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path } from 'react-native-svg';
import { F } from '../src/lib/theme';
import { COACHING_URL } from '../src/lib/access';
import { track } from '../src/lib/track';

/**
 * "Want me in your corner?": the in-app 1:1 coaching page, in the same style as the
 * coaching landing page (moving client wall, live chat, guarantee seal, results).
 * Coaching is a person-to-person service paid outside the app (App Store 3.1.3(d)),
 * so this page only leads to the application. No prices here.
 */

const L = { bg: '#f3f4f8', ink: '#141c33', body: '#3b4664', muted: '#6d7894', line: '#e3e6ee', red: '#d0362f', redDeep: '#b92d27', green: '#1f9d5f', greenTint: '#e9f7f0' };
const BOON = require('../assets/hero/boon_avatar.jpg');
const PAIRS = [
  [require('../assets/clients/robert-b.jpg'), require('../assets/clients/robert-a.jpg')],
  [require('../assets/clients/gerardo-b.jpg'), require('../assets/clients/gerardo-a.jpg')],
  [require('../assets/clients/james-b.jpg'), require('../assets/clients/james-a.jpg')],
  [require('../assets/clients/c4-b.jpg'), require('../assets/clients/c4-a.jpg')],
  [require('../assets/clients/c5-front.jpg'), require('../assets/clients/c5-back.jpg')],
];
const RESULTS = [
  { name: 'Robert', res: '−30+ lbs', when: 'in 3 months', p: PAIRS[0], why: "Robert didn't need another product. He needed a simple plan and someone checking in every week." },
  { name: 'Gerardo, 22', res: '−40 lbs', when: 'in 4 months', p: PAIRS[1], why: 'Gerardo kept his weekends. We built his plan around his real life, not a perfect one.' },
  { name: 'James, 24', res: '+10 lbs muscle', when: 'in 4 months', p: PAIRS[2], why: 'James trained before work around a 9-to-5. Just a program built for his schedule.' },
];
const GETS: [string, string][] = [
  ['Your plan in 48 hours', 'Training for your days and gym, meals from foods you like, and what to order when you eat out.'],
  ['A full stack audit', "Every product you take: cut, keep or swap. Most guys save money in week one."],
  ['Sunday check-ins I read myself', 'I change one thing at a time, so a stall gets fixed that week.'],
  ['Text me anytime on WhatsApp', 'Answers within 24 hours on weekdays.'],
  ['Every week of the app unlocked', 'All 12 weeks, Stack Check and Stack, your AI coach.'],
];
const CHAT = [
  { me: true, t: 'Down 2.4 lbs but I blew it at a birthday Saturday 😬' },
  { me: false, t: "One night doesn't undo a week. Your average is still dropping." },
  { me: false, t: "This week: add 1,500 steps a day. That's the only change. 💪" },
];

/** A column of before/after pairs that scrolls forever. */
function WallCol({ order, w, dur, down }: { order: number[]; w: number; dur: number; down?: boolean }) {
  const v = useRef(new Animated.Value(0)).current;
  const h = w * 0.66 + 8;
  const half = order.length * h;
  useEffect(() => {
    const a = Animated.loop(Animated.timing(v, { toValue: 1, duration: dur, easing: Easing.linear, useNativeDriver: true }));
    a.start(); return () => a.stop();
  }, []);
  const ty = v.interpolate({ inputRange: [0, 1], outputRange: down ? [-half, 0] : [0, -half] });
  const items = [...order, ...order];
  return (
    <View style={{ width: w, overflow: 'hidden' }}>
      <Animated.View style={{ gap: 8, transform: [{ translateY: ty }] }}>
        {items.map((i, k) => (
          <View key={k} style={[s.pair, { height: w * 0.66 }]}>
            <Image source={PAIRS[i][0]} style={s.pairImg} /><Image source={PAIRS[i][1]} style={s.pairImg} />
          </View>
        ))}
      </Animated.View>
    </View>
  );
}

/** A chat bubble that pops in after `delay`. */
function Bubble({ me, t, delay }: { me: boolean; t: string; delay: number }) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => { Animated.spring(v, { toValue: 1, delay, friction: 6, tension: 80, useNativeDriver: true }).start(); }, []);
  return (
    <Animated.View style={{ alignSelf: me ? 'flex-end' : 'flex-start', maxWidth: '84%', opacity: v, transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) }, { scale: v.interpolate({ inputRange: [0, 1], outputRange: [0.94, 1] }) }] }}>
      <Text style={[s.bub, me ? s.bubMe : s.bubHim]}>{t}</Text>
    </Animated.View>
  );
}

function Rise({ delay = 0, children, style }: { delay?: number; children: React.ReactNode; style?: any }) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => { Animated.timing(v, { toValue: 1, duration: 600, delay, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start(); }, []);
  return <Animated.View style={[style, { opacity: v, transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }] }]}>{children}</Animated.View>;
}

/** The results strip: slides sideways forever. */
function Marquee() {
  const v = useRef(new Animated.Value(0)).current;
  const items = [
    { r: '−30+ lbs', w: 'Robert, 3 months', p: PAIRS[0] }, { r: '−40 lbs', w: 'Gerardo, 4 months', p: PAIRS[1] },
    { r: '+10 lbs muscle', w: 'James, 4 months', p: PAIRS[2] }, { r: '−11 lbs', w: 'Anthony, first month', p: null },
  ];
  const cardW = 214;
  const half = items.length * (cardW + 12);
  useEffect(() => {
    const a = Animated.loop(Animated.timing(v, { toValue: 1, duration: 26000, easing: Easing.linear, useNativeDriver: true }));
    a.start(); return () => a.stop();
  }, []);
  return (
    <View style={{ overflow: 'hidden', paddingVertical: 6 }}>
      <Animated.View style={{ flexDirection: 'row', gap: 12, transform: [{ translateX: v.interpolate({ inputRange: [0, 1], outputRange: [0, -half] }) }] }}>
        {[...items, ...items].map((x, k) => (
          <View key={k} style={[s.mcard, { width: cardW }]}>
            {x.p ? <View style={s.mph}><Image source={x.p[0]} style={s.mimg} /><Image source={x.p[1]} style={s.mimg} /></View>
              : <View style={[s.mph, { width: 62, backgroundColor: L.greenTint, alignItems: 'center', justifyContent: 'center' }]}><Text style={{ fontSize: 24 }}>🔥</Text></View>}
            <View style={{ flex: 1 }}><Text style={s.mres}>{x.r}</Text><Text style={s.mwho}>{x.w}</Text></View>
          </View>
        ))}
      </Animated.View>
    </View>
  );
}

/** The spinning "Abs or it's free" seal. */
function Seal() {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => { const a = Animated.loop(Animated.timing(v, { toValue: 1, duration: 16000, easing: Easing.linear, useNativeDriver: true })); a.start(); return () => a.stop(); }, []);
  const rot = v.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  return (
    <View style={s.seal}>
      <Animated.View style={[StyleSheet.absoluteFill, { transform: [{ rotate: rot }] }]}>
        <Svg width="100%" height="100%" viewBox="0 0 120 120">
          {Array.from({ length: 24 }).map((_, i) => {
            const a = (i / 24) * Math.PI * 2;
            return <Path key={i} d={`M${60 + Math.cos(a) * 52} ${60 + Math.sin(a) * 52} L${60 + Math.cos(a) * 58} ${60 + Math.sin(a) * 58}`} stroke="#ff8a82" strokeWidth={2.4} strokeLinecap="round" />;
          })}
        </Svg>
      </Animated.View>
      <LinearGradient colors={[L.red, L.redDeep]} style={s.sealCore}>
        <Text style={s.sealBig}>ABS</Text><Text style={s.sealSmall}>OR IT'S FREE</Text>
      </LinearGradient>
    </View>
  );
}

export default function Coaching() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const W = Math.min(width, 640);
  const colW = (W - 16) / 3;
  useEffect(() => { track('coaching_view', {}, { once: true }); }, []);
  const apply = (where: string) => { track('coaching_apply_tap', { where }); router.push('/coaching-application'); };
  const tick = <View style={s.tick}><Svg width={12} height={12} viewBox="0 0 24 24"><Path d="M5 12.5l4.5 4.5L19 7.5" stroke="#fff" strokeWidth={3.4} fill="none" strokeLinecap="round" strokeLinejoin="round" /></Svg></View>;

  return (
    <View style={{ flex: 1, backgroundColor: '#fff' }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 150 + insets.bottom }} showsVerticalScrollIndicator={false}>
        {/* HERO: clients moving behind a live chat */}
        <View style={[s.hero, { paddingTop: insets.top + 10 }]}>
          <View style={[s.wall, { width: W, alignSelf: 'center' }]} pointerEvents="none">
            <WallCol order={[0, 1, 2, 3, 4]} w={colW} dur={36000} />
            <WallCol order={[2, 4, 0, 3, 1]} w={colW} dur={42000} down />
            <WallCol order={[3, 1, 4, 0, 2]} w={colW} dur={48000} />
          </View>
          <LinearGradient colors={['rgba(243,244,248,0.45)', 'rgba(243,244,248,0.88)', 'rgba(243,244,248,0.94)', L.bg]} locations={[0, 0.22, 0.6, 1]} style={StyleSheet.absoluteFill} pointerEvents="none" />
          <View style={s.inner}>
            <Pressable accessibilityRole="button" accessibilityLabel="Close" onPress={() => (router.canGoBack() ? router.back() : router.replace('/you'))} style={s.close} hitSlop={8}>
              <Svg width={16} height={16} viewBox="0 0 24 24"><Path d="M6 6l12 12M18 6L6 18" stroke={L.ink} strokeWidth={2.6} strokeLinecap="round" /></Svg>
            </Pressable>
            <Rise><View style={s.pill}><View style={s.dot} /><Text style={s.pillT}>1:1 coaching with Boon</Text></View></Rise>
            <Rise delay={80}><Text style={s.h1} accessibilityRole="header">Want me in{'\n'}<Text style={{ color: L.red }}>your corner?</Text></Text></Rise>
            <Rise delay={160}><Text style={s.lede}>The app gives you the plan. Coaching gives you <Text style={{ fontFamily: F.black, color: L.ink }}>me</Text>. 12 weeks built around your life, adjusted every Sunday until you hit your goal.</Text></Rise>

            <Rise delay={240} style={s.chat}>
              <View style={s.chatHead}>
                <Image source={BOON} style={s.avatar} accessibilityLabel="Boon Fay" />
                <View style={{ flex: 1 }}><Text style={s.chatName}>Coach Boon</Text><Text style={s.chatSub}>Your coaching chat</Text></View>
                <View style={s.online}><View style={[s.dot, { width: 6, height: 6 }]} /><Text style={s.onlineT}>ONLINE</Text></View>
              </View>
              <View style={{ gap: 8 }}>{CHAT.map((c, i) => <Bubble key={i} me={c.me} t={c.t} delay={600 + i * 900} />)}</View>
              <Text style={s.example}>Example chat. Every client gets me directly.</Text>
            </Rise>

            <Pressable accessibilityRole="button" onPress={() => apply('hero')} style={s.cta}>
              <LinearGradient colors={[L.red, L.redDeep]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
              <Text style={s.ctaT}>See if I qualify  →</Text>
            </Pressable>
            <View style={s.micro}>{['Takes 2 minutes', 'No sales call', 'Limited spots'].map((m) => <Text key={m} style={s.microT}><Text style={{ color: L.green }}>✓ </Text>{m}</Text>)}</View>
          </View>
        </View>

        {/* STATS */}
        <View style={s.stats}>
          <View style={s.stat}><Text style={s.statV}>225→175</Text><Text style={s.statL}>My own transformation</Text></View>
          <View style={s.stat}><Text style={[s.statV, { color: L.green }]}>−40 lbs</Text><Text style={s.statL}>Gerardo, in 4 months</Text></View>
          <View style={s.stat}><Text style={[s.statV, { color: L.red }]}>$0</Text><Text style={s.statL}>I make from supplements</Text></View>
        </View>
        <Marquee />

        <View style={s.body}>
          {/* GUARANTEE */}
          <LinearGradient colors={['#141c33', '#1d2a52', '#2a1530']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.guar}>
            <Seal />
            <Text style={s.kLight}>THE GUARANTEE</Text>
            <Text style={s.h2Light}>Abs or It's Free.</Text>
            <Text style={s.pLight}>Show up for your Sunday check-ins, do your workouts, hit your nutrition most days and send your photos on photo weeks.</Text>
            <Text style={[s.pLight, { color: '#fff', fontFamily: F.bold }]}>Do that and miss your goal in 12 weeks? I keep coaching you free for up to 12 more weeks, until you do.</Text>
          </LinearGradient>

          {/* RESULTS */}
          <View style={{ gap: 6 }}>
            <Text style={s.k}>REAL RESULTS</Text>
            <Text style={s.h2}>Guys I've <Text style={{ color: L.red }}>coached</Text></Text>
          </View>
          {RESULTS.map((r) => (
            <View key={r.name} style={s.rcard}>
              <View style={s.rph}>
                <Image source={r.p[0]} style={s.rimg} accessibilityLabel={`${r.name} before`} />
                <Image source={r.p[1]} style={s.rimg} accessibilityLabel={`${r.name} after`} />
                <Text style={[s.tag, { left: 10 }]}>BEFORE</Text><Text style={[s.tag, s.tagA]}>AFTER</Text>
              </View>
              <View style={{ padding: 16, gap: 4 }}>
                <Text style={s.rname}>{r.name}</Text>
                <Text style={s.rres}>{r.res} <Text style={s.rwhen}>{r.when}</Text></Text>
                <Text style={s.p}>{r.why}</Text>
              </View>
            </View>
          ))}
          <Text style={s.fine}>Anthony lost 11 lbs in his first month. Results vary and depend on effort and consistency with the plan.</Text>

          {/* METHOD */}
          <View style={{ gap: 6, marginTop: 8 }}>
            <Text style={s.k}>THE METHOD</Text>
            <Text style={s.h2}>Strip. Stack. <Text style={{ color: L.red }}>Six-Pack.</Text></Text>
          </View>
          {[
            ['1', 'Week 1', 'Strip', 'I audit every supplement and product you use and tell you what to cut, keep or swap.'],
            ['2', 'Weeks 1–2', 'Stack', 'Your plan in 48 hours: meals from foods you like and training built for your days, your gym and old injuries.'],
            ['3', 'Weeks 3–12', 'Six-Pack', 'Every Sunday I read your check-in and change one thing, so you keep losing fat until the abs show.'],
          ].map(([n, w, t, d]) => (
            <View key={n} style={s.mstep}>
              <View style={[s.mn, n === '3' && { backgroundColor: L.red }]}><Text style={s.mnT}>{n}</Text></View>
              <View style={{ flex: 1, gap: 3 }}><Text style={s.mw}>{w.toUpperCase()}</Text><Text style={s.mt}>{t}</Text><Text style={s.p}>{d}</Text></View>
            </View>
          ))}

          {/* WHAT YOU GET */}
          <View style={{ gap: 6, marginTop: 8 }}>
            <Text style={s.k}>WHAT YOU GET</Text>
            <Text style={s.h2}>Everything, <Text style={{ color: L.red }}>plus me</Text></Text>
          </View>
          <View style={s.card}>
            {GETS.map(([b, r], k) => (
              <View key={b} style={[s.get, k < GETS.length - 1 && { borderBottomWidth: 1, borderBottomColor: L.line }]}>{tick}
                <View style={{ flex: 1 }}><Text style={s.getB}>{b}</Text><Text style={s.p}>{r}</Text></View>
              </View>
            ))}
          </View>

          <Pressable accessibilityRole="link" onPress={() => { track('coaching_page_tap'); Linking.openURL(COACHING_URL); }} style={s.ghost}>
            <Text style={s.ghostT}>See the full coaching page  ↗</Text>
          </Pressable>
        </View>
      </ScrollView>

      {/* STICKY */}
      <View style={[s.sticky, { paddingBottom: 12 + insets.bottom }]}>
        <View style={{ flex: 1 }}><Text style={s.stickyT}>Abs in 12 weeks</Text><Text style={s.stickyS}>or I coach you free until you do</Text></View>
        <Pressable accessibilityRole="button" onPress={() => apply('sticky')} style={s.stickyBtn}>
          <LinearGradient colors={[L.red, L.redDeep]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
          <Text style={s.stickyBtnT}>Apply here</Text>
        </Pressable>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  hero: { backgroundColor: L.bg, overflow: 'hidden' },
  wall: { position: 'absolute', top: 0, bottom: 0, flexDirection: 'row', gap: 8, opacity: 0.9 },
  pair: { flexDirection: 'row', gap: 2, borderRadius: 10, overflow: 'hidden' },
  pairImg: { flex: 1, height: '100%' },
  inner: { width: '100%', maxWidth: 640, alignSelf: 'center', paddingHorizontal: 18, paddingBottom: 26, gap: 14 },
  close: { width: 42, height: 42, borderRadius: 21, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', shadowColor: L.ink, shadowOpacity: 0.1, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 3, marginBottom: 4 },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 8, alignSelf: 'flex-start', backgroundColor: '#fff', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7, borderWidth: 1, borderColor: L.line },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: L.green },
  pillT: { fontFamily: F.bold, fontSize: 13, color: L.ink },
  h1: { fontFamily: F.black, fontSize: 40, lineHeight: 42, letterSpacing: -1.2, color: L.ink },
  lede: { fontFamily: F.medium, fontSize: 16.5, lineHeight: 24, color: L.body },
  chat: { backgroundColor: '#fff', borderRadius: 24, padding: 16, gap: 12, shadowColor: L.ink, shadowOpacity: 0.16, shadowRadius: 30, shadowOffset: { width: 0, height: 16 }, elevation: 8, borderWidth: 1, borderColor: 'rgba(20,28,51,0.05)' },
  chatHead: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: L.line },
  avatar: { width: 42, height: 42, borderRadius: 21, borderWidth: 2, borderColor: L.red },
  chatName: { fontFamily: F.black, fontSize: 15, color: L.ink },
  chatSub: { fontFamily: F.medium, fontSize: 12, color: L.muted },
  online: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: L.greenTint, paddingHorizontal: 9, paddingVertical: 4, borderRadius: 10 },
  onlineT: { fontFamily: F.xbold, fontSize: 10.5, color: L.green, letterSpacing: 0.6 },
  bub: { paddingHorizontal: 13, paddingVertical: 10, fontFamily: F.semi, fontSize: 14.5, lineHeight: 20, overflow: 'hidden' },
  bubMe: { backgroundColor: '#eef0f5', color: L.ink, borderRadius: 18, borderBottomRightRadius: 5 },
  bubHim: { backgroundColor: L.ink, color: '#fff', borderRadius: 18, borderBottomLeftRadius: 5 },
  example: { fontFamily: F.medium, fontSize: 11, color: L.muted, textAlign: 'center' },
  cta: { height: 60, borderRadius: 16, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', shadowColor: L.red, shadowOpacity: 0.38, shadowRadius: 18, shadowOffset: { width: 0, height: 10 }, elevation: 6, marginTop: 4 },
  ctaT: { fontFamily: F.black, fontSize: 18, color: '#fff' },
  micro: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 14 },
  microT: { fontFamily: F.semi, fontSize: 12.5, color: L.body },
  stats: { flexDirection: 'row', width: '100%', maxWidth: 640, alignSelf: 'center', paddingHorizontal: 18, paddingVertical: 20, gap: 10, borderBottomWidth: 1, borderBottomColor: L.line },
  stat: { flex: 1, gap: 2 },
  statV: { fontFamily: F.black, fontSize: 22, color: L.ink, letterSpacing: -0.5 },
  statL: { fontFamily: F.semi, fontSize: 11.5, lineHeight: 15, color: L.muted },
  mcard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: L.bg, borderRadius: 16, padding: 8 },
  mph: { flexDirection: 'row', gap: 2, borderRadius: 8, overflow: 'hidden', height: 62 },
  mimg: { width: 31, height: 62 },
  mres: { fontFamily: F.black, fontSize: 17, color: L.green },
  mwho: { fontFamily: F.semi, fontSize: 12, color: L.muted },
  body: { width: '100%', maxWidth: 640, alignSelf: 'center', paddingHorizontal: 18, paddingTop: 22, gap: 16 },
  guar: { borderRadius: 26, padding: 22, gap: 10, alignItems: 'center', overflow: 'hidden' },
  seal: { width: 132, height: 132, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  sealCore: { width: 96, height: 96, borderRadius: 48, alignItems: 'center', justifyContent: 'center', shadowColor: L.red, shadowOpacity: 0.5, shadowRadius: 20, shadowOffset: { width: 0, height: 10 } },
  sealBig: { fontFamily: F.black, fontSize: 28, color: '#fff', letterSpacing: -0.5 },
  sealSmall: { fontFamily: F.xbold, fontSize: 8.5, color: '#fff', letterSpacing: 1.2 },
  kLight: { fontFamily: F.xbold, fontSize: 12, letterSpacing: 1.6, color: '#ff8a82' },
  h2Light: { fontFamily: F.black, fontSize: 28, lineHeight: 32, color: '#fff', textAlign: 'center', letterSpacing: -0.5 },
  pLight: { fontFamily: F.medium, fontSize: 15, lineHeight: 22, color: '#c7cde0', textAlign: 'center' },
  k: { fontFamily: F.xbold, fontSize: 12, letterSpacing: 1.6, color: L.red },
  h2: { fontFamily: F.black, fontSize: 28, lineHeight: 32, color: L.ink, letterSpacing: -0.5 },
  p: { fontFamily: F.medium, fontSize: 14.5, lineHeight: 21, color: L.body },
  rcard: { backgroundColor: '#fff', borderRadius: 22, borderWidth: 1, borderColor: L.line, overflow: 'hidden', shadowColor: L.ink, shadowOpacity: 0.07, shadowRadius: 20, shadowOffset: { width: 0, height: 8 }, elevation: 3 },
  rph: { flexDirection: 'row', gap: 3, height: 210 },
  rimg: { flex: 1, height: '100%' },
  tag: { position: 'absolute', top: 10, fontFamily: F.black, fontSize: 10, letterSpacing: 1, backgroundColor: '#fff', color: L.ink, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, overflow: 'hidden' },
  tagA: { left: '52%', backgroundColor: L.red, color: '#fff' },
  rname: { fontFamily: F.black, fontSize: 17, color: L.ink },
  rres: { fontFamily: F.black, fontSize: 21, color: L.green },
  rwhen: { fontFamily: F.bold, fontSize: 14, color: L.muted },
  fine: { fontFamily: F.medium, fontSize: 12, lineHeight: 17, color: L.muted, textAlign: 'center' },
  mstep: { flexDirection: 'row', gap: 14, backgroundColor: '#fff', borderRadius: 20, borderWidth: 1, borderColor: L.line, padding: 16 },
  mn: { width: 48, height: 48, borderRadius: 14, backgroundColor: L.ink, alignItems: 'center', justifyContent: 'center' },
  mnT: { fontFamily: F.black, fontSize: 21, color: '#fff' },
  mw: { fontFamily: F.xbold, fontSize: 11, letterSpacing: 1.2, color: L.muted },
  mt: { fontFamily: F.black, fontSize: 20, color: L.ink },
  card: { backgroundColor: '#fff', borderWidth: 1, borderColor: L.line, borderRadius: 22, paddingHorizontal: 16, paddingVertical: 4 },
  get: { flexDirection: 'row', gap: 12, alignItems: 'flex-start', paddingVertical: 14 },
  getB: { fontFamily: F.black, fontSize: 15.5, color: L.ink, marginBottom: 2 },
  tick: { width: 24, height: 24, borderRadius: 12, backgroundColor: L.red, alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  boon: { height: 470, borderRadius: 26, overflow: 'hidden', justifyContent: 'flex-end', marginTop: 8 },
  boonTx: { padding: 20, gap: 8, alignItems: 'center' },
  ghost: { height: 52, borderRadius: 16, borderWidth: 1.5, borderColor: '#d7dbe6', alignItems: 'center', justifyContent: 'center' },
  ghostT: { fontFamily: F.bold, fontSize: 15.5, color: L.ink },
  sticky: { position: 'absolute', left: 0, right: 0, bottom: 0, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingTop: 12, backgroundColor: 'rgba(255,255,255,0.97)', borderTopWidth: 1, borderTopColor: L.line },
  stickyT: { fontFamily: F.black, fontSize: 15, color: L.ink },
  stickyS: { fontFamily: F.medium, fontSize: 12.5, color: L.muted },
  stickyBtn: { height: 52, borderRadius: 14, paddingHorizontal: 26, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  stickyBtnT: { fontFamily: F.black, fontSize: 16.5, color: '#fff' },
});
