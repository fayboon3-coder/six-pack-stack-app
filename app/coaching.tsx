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
 * "Want me in your corner?": the in-app 1:1 coaching page. The one dark, premium page in an
 * otherwise light app, so it stands out: Boon up top, the guarantee, real results, the method,
 * everything you get, and one action (apply).
 * Coaching is a person-to-person service paid outside the app (App Store 3.1.3(d)),
 * so this page only leads to the application. No prices here.
 */

const D = {
  bg: '#0d1326', navy: '#141c33', surface: '#1a2340', surface2: '#212b4b', line: '#2a3456',
  white: '#ffffff', body: '#c7cde0', muted: '#8f99b8', red: '#d0362f', redDeep: '#b92d27', redSoft: '#ff8a82', green: '#2fbf78', greenSoft: '#7fe3b0',
};
const BOON_WIDE = require('../assets/hero/boon_wide.jpg');
const BOON = require('../assets/hero/boon_avatar.jpg');
const BOON_BA = require('../assets/hero/boon_jacked.jpg');
const PAIRS = [
  [require('../assets/clients/robert-b.jpg'), require('../assets/clients/robert-a.jpg')],
  [require('../assets/clients/gerardo-b.jpg'), require('../assets/clients/gerardo-a.jpg')],
  [require('../assets/clients/james-b.jpg'), require('../assets/clients/james-a.jpg')],
];
const RESULTS = [
  { name: 'Robert', res: '−30+ lbs', when: '3 months', p: PAIRS[0], why: "Robert didn't need another product. He needed a simple plan and someone checking in every week." },
  { name: 'Gerardo, 22', res: '−40 lbs', when: '4 months', p: PAIRS[1], why: 'Gerardo kept his weekends. We built his plan around his real life, not a perfect one.' },
  { name: 'James, 24', res: '+10 lbs muscle', when: '4 months', p: PAIRS[2], why: 'James trained before work around a 9-to-5. Just a program built for his schedule.' },
];
const IC = {
  bolt: 'M13 3L5 13.5h6L10 21l8-10.5h-6z',
  scan: 'M4 8V5.5A1.5 1.5 0 0 1 5.5 4H8M16 4h2.5A1.5 1.5 0 0 1 20 5.5V8M20 16v2.5a1.5 1.5 0 0 1-1.5 1.5H16M8 20H5.5A1.5 1.5 0 0 1 4 18.5V16M7 12h10',
  calendar: 'M5 5h14a1.5 1.5 0 0 1 1.5 1.5v12A1.5 1.5 0 0 1 19 20H5a1.5 1.5 0 0 1-1.5-1.5v-12A1.5 1.5 0 0 1 5 5zM3.5 10h17M8 3v4M16 3v4',
  chat: 'M4 5.5h16v10H9l-4 3.5v-3.5H4z',
  home: 'M3.5 11l8.5-7 8.5 7M5.5 9.5V20h13V9.5M9.5 20v-5.5h5V20',
  unlock: 'M5 10.5h14v10H5zM8.5 10.5V7.5a3.5 3.5 0 0 1 6.8-1.2',
  check: 'M5 12.5l4.5 4.5L19 7.5',
  shield: 'M12 3l7.5 3v5.5c0 4.6-3.2 8.2-7.5 9.5-4.3-1.3-7.5-4.9-7.5-9.5V6zM8.8 12l2.3 2.3 4.2-4.6',
  close: 'M6 6l12 12M18 6L6 18',
};
const Ico = ({ d, size = 20, color = D.white, w = 1.9 }: { d: string; size?: number; color?: string; w?: number }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24"><Path d={d} stroke={color} strokeWidth={w} fill="none" strokeLinecap="round" strokeLinejoin="round" /></Svg>
);
const GETS: [string, string, string][] = [
  [IC.bolt, 'Your plan in 48 hours', 'Training for your days and gym, meals from foods you like, and what to order when you eat out.'],
  [IC.scan, 'A full stack audit', 'Every product you take: cut, keep or swap. Most guys save money in week one.'],
  [IC.calendar, 'Sunday check-ins I read myself', 'I change one thing at a time, so a stall gets fixed that week.'],
  [IC.chat, 'Text me anytime on WhatsApp', 'Answers within 24 hours on weekdays.'],
  [IC.home, 'Your own coach home in the app', 'My notes on your week and your one thing to focus on, right when you open it.'],
  [IC.unlock, 'Every week of the app unlocked', 'All 12 weeks, food logging, your trend weight, Stack Check and Stack, your AI coach.'],
];
const CHAT = [
  { me: true, t: 'Down 2.4 lbs but I blew it at a birthday Saturday 😬' },
  { me: false, t: "One night doesn't undo a week. Your average is still dropping." },
  { me: false, t: "This week: add 1,500 steps a day. That's the only change. 💪" },
];

function Rise({ delay = 0, children, style }: { delay?: number; children: React.ReactNode; style?: any }) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => { Animated.timing(v, { toValue: 1, duration: 600, delay, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start(); }, []);
  return <Animated.View style={[style, { opacity: v, transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }] }]}>{children}</Animated.View>;
}

function Bubble({ me, t, delay }: { me: boolean; t: string; delay: number }) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => { Animated.spring(v, { toValue: 1, delay, friction: 6, tension: 80, useNativeDriver: true }).start(); }, []);
  return (
    <Animated.View style={{ alignSelf: me ? 'flex-end' : 'flex-start', maxWidth: '84%', opacity: v, transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) }] }}>
      <Text style={[s.bub, me ? s.bubMe : s.bubHim]}>{t}</Text>
    </Animated.View>
  );
}

/** The "Abs or it's free" seal: a slow-turning ring around a red core. */
function Seal() {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => { const a = Animated.loop(Animated.timing(v, { toValue: 1, duration: 18000, easing: Easing.linear, useNativeDriver: true })); a.start(); return () => a.stop(); }, []);
  const rot = v.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  return (
    <View style={s.seal}>
      <Animated.View style={[StyleSheet.absoluteFill, { transform: [{ rotate: rot }] }]}>
        <Svg width="100%" height="100%" viewBox="0 0 120 120">
          {Array.from({ length: 30 }).map((_, i) => {
            const a = (i / 30) * Math.PI * 2;
            return <Path key={i} d={`M${60 + Math.cos(a) * 53} ${60 + Math.sin(a) * 53} L${60 + Math.cos(a) * 58} ${60 + Math.sin(a) * 58}`} stroke={i % 2 ? D.line : D.redSoft} strokeWidth={2.2} strokeLinecap="round" />;
          })}
        </Svg>
      </Animated.View>
      <View style={s.sealCore}><Text style={s.sealBig}>ABS</Text><Text style={s.sealSmall}>OR IT'S FREE</Text></View>
    </View>
  );
}

const Kicker = ({ t }: { t: string }) => <Text style={s.k}>{t}</Text>;

export default function Coaching() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const W = Math.min(width, 640);
  useEffect(() => { track('coaching_view', {}, { once: true }); }, []);
  const apply = (where: string) => { track('coaching_apply_tap', { where }); router.push('/coaching-application'); };
  const heroH = Math.round(W * 0.78);

  return (
    <View style={{ flex: 1, backgroundColor: D.bg }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 140 + insets.bottom }} showsVerticalScrollIndicator={false}>
        {/* HERO: Boon, then the promise */}
        <View style={{ width: W, alignSelf: 'center' }}>
          <View style={{ height: heroH + insets.top }}>
            <Image source={BOON_WIDE} style={[StyleSheet.absoluteFill, { width: '100%', height: '100%' }]} resizeMode="cover" accessibilityLabel="Boon Fay" />
            <LinearGradient colors={['rgba(13,19,38,0.35)', 'rgba(13,19,38,0)', 'rgba(13,19,38,0.7)', D.bg]} locations={[0, 0.25, 0.75, 1]} style={StyleSheet.absoluteFill} pointerEvents="none" />
            <View style={[s.topRow, { top: insets.top + 10 }]}>
              <View style={s.chip}><View style={s.live} /><Text style={s.chipT}>1:1 COACHING · LIMITED SPOTS</Text></View>
              <Pressable accessibilityRole="button" accessibilityLabel="Close" onPress={() => (router.canGoBack() ? router.back() : router.replace('/you'))} style={s.close} hitSlop={8}>
                <Ico d={IC.close} size={16} w={2.6} />
              </Pressable>
            </View>
          </View>
          <View style={[s.inner, { marginTop: -54 }]}>
            <Rise><Text style={s.h1} accessibilityRole="header">Want me in{'\n'}<Text style={{ color: D.red }}>your corner?</Text></Text></Rise>
            <Rise delay={100}><Text style={s.lede}>The app gives you the plan. Coaching gives you <Text style={{ fontFamily: F.black, color: D.white }}>me</Text>: 12 weeks built around your life, adjusted every Sunday until you hit your goal.</Text></Rise>
            <Rise delay={180}>
              <Pressable accessibilityRole="button" onPress={() => apply('hero')} style={({ pressed }) => [s.cta, { opacity: pressed ? 0.9 : 1 }]}>
                <Text style={s.ctaT}>See if I qualify  →</Text>
              </Pressable>
              <View style={s.micro}>{['Takes 2 minutes', 'No sales call', 'Limited spots'].map((m) => (
                <View key={m} style={s.microI}><Ico d={IC.check} size={13} color={D.green} w={3} /><Text style={s.microT}>{m}</Text></View>
              ))}</View>
            </Rise>
          </View>
        </View>

        <View style={s.body}>
          {/* PROOF */}
          <Rise delay={240} style={s.stats}>
            {[['225→175', 'My own transformation', D.white], ['−40 lbs', 'Gerardo, in 4 months', D.greenSoft], ['$0', 'I make from supplements', D.redSoft]].map(([v, l, c]) => (
              <View key={l} style={s.stat}><Text style={[s.statV, { color: c }]}>{v}</Text><Text style={s.statL}>{l}</Text></View>
            ))}
          </Rise>

          {/* CHAT */}
          <Rise delay={300} style={s.chat}>
            <View style={s.chatHead}>
              <Image source={BOON} style={s.avatar} accessibilityLabel="Boon Fay" />
              <View style={{ flex: 1 }}><Text style={s.chatName}>Coach Boon</Text><Text style={s.chatSub}>Your coaching chat</Text></View>
              <View style={s.online}><View style={[s.live, { width: 6, height: 6 }]} /><Text style={s.onlineT}>ONLINE</Text></View>
            </View>
            <View style={{ gap: 8 }}>{CHAT.map((c, i) => <Bubble key={i} me={c.me} t={c.t} delay={700 + i * 900} />)}</View>
            <Text style={s.example}>Example chat. Every client gets me directly.</Text>
          </Rise>

          {/* GUARANTEE */}
          <View style={s.guar}>
            <Seal />
            <Kicker t="THE GUARANTEE" />
            <Text style={[s.h2, { textAlign: 'center' }]}>Abs or it's free.</Text>
            <Text style={[s.p, { textAlign: 'center' }]}>Show up for your Sunday check-ins, do your workouts, hit your nutrition most days and send your photos on photo weeks.</Text>
            <Text style={[s.p, { textAlign: 'center', color: D.white, fontFamily: F.bold }]}>Do that and miss your goal in 12 weeks? I keep coaching you free for up to 12 more weeks, until you do.</Text>
          </View>

          {/* RESULTS */}
          <View style={{ gap: 6, marginTop: 10 }}>
            <Kicker t="REAL RESULTS" />
            <Text style={s.h2}>Guys I've coached</Text>
          </View>
          {RESULTS.map((r) => (
            <View key={r.name} style={s.rcard}>
              <View style={s.rph}>
                <Image source={r.p[0]} style={s.rimg} accessibilityLabel={`${r.name} before`} />
                <Image source={r.p[1]} style={s.rimg} accessibilityLabel={`${r.name} after`} />
                <Text style={[s.tag, { left: 10 }]}>BEFORE</Text><Text style={[s.tag, s.tagA]}>AFTER</Text>
              </View>
              <View style={{ padding: 16, gap: 4 }}>
                <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 10 }}>
                  <Text style={s.rname}>{r.name}</Text><Text style={s.rwhen}>{r.when}</Text>
                </View>
                <Text style={s.rres}>{r.res}</Text>
                <Text style={s.p}>{r.why}</Text>
              </View>
            </View>
          ))}
          <Text style={s.fine}>Anthony lost 11 lbs in his first month. Results vary and depend on effort and consistency with the plan.</Text>

          {/* METHOD */}
          <View style={{ gap: 6, marginTop: 10 }}>
            <Kicker t="THE METHOD" />
            <Text style={s.h2}>Strip. Stack. <Text style={{ color: D.red }}>Six-Pack.</Text></Text>
          </View>
          <View style={s.steps}>
            {[
              ['1', 'Week 1', 'Strip', 'I audit every supplement and product you use and tell you what to cut, keep or swap.'],
              ['2', 'Weeks 1–2', 'Stack', 'Your plan in 48 hours: meals from foods you like and training built for your days, your gym and old injuries.'],
              ['3', 'Weeks 3–12', 'Six-Pack', 'Every Sunday I read your check-in and change one thing, so you keep losing fat until the abs show.'],
            ].map(([n, w, t, d], k) => (
              <View key={n} style={s.mstep}>
                <View style={{ alignItems: 'center' }}>
                  <View style={[s.mn, n === '3' && { backgroundColor: D.red, borderColor: D.red }]}><Text style={s.mnT}>{n}</Text></View>
                  {k < 2 && <View style={s.mline} />}
                </View>
                <View style={{ flex: 1, gap: 3, paddingBottom: k < 2 ? 18 : 0 }}><Text style={s.mw}>{w.toUpperCase()}</Text><Text style={s.mt}>{t}</Text><Text style={s.p}>{d}</Text></View>
              </View>
            ))}
          </View>

          {/* WHAT YOU GET */}
          <View style={{ gap: 6, marginTop: 10 }}>
            <Kicker t="WHAT YOU GET" />
            <Text style={s.h2}>Everything, <Text style={{ color: D.red }}>plus me</Text></Text>
          </View>
          <View style={s.card}>
            {GETS.map(([d, b, r], k) => (
              <View key={b} style={[s.get, k < GETS.length - 1 && { borderBottomWidth: 1, borderBottomColor: D.line }]}>
                <View style={s.getI}><Ico d={d} size={19} /></View>
                <View style={{ flex: 1 }}><Text style={s.getB}>{b}</Text><Text style={s.p}>{r}</Text></View>
              </View>
            ))}
          </View>

          {/* BOON */}
          <View style={s.me}>
            <Image source={BOON_BA} style={[s.meImg, { height: Math.round((W - 38) * 9 / 16) }]} resizeMode="cover" accessibilityLabel="Boon before and after: 225 to 175 lbs" />
            <View style={{ padding: 18, gap: 8 }}>
              <Kicker t="WHY ME" />
              <Text style={s.h3}>I did everything wrong first.</Text>
              <Text style={s.p}>At 225 lbs I trained without a plan, guessed my food and bought every supplement with a good ad. I got to 175 once I fixed the basics. Now I coach guys through the same 12 weeks, with no sponsors and no affiliate links.</Text>
              <Text style={s.sign}>Boon Fay</Text>
            </View>
          </View>

          <Pressable accessibilityRole="button" onPress={() => apply('bottom')} style={({ pressed }) => [s.cta, { opacity: pressed ? 0.9 : 1 }]}>
            <Text style={s.ctaT}>See if I qualify  →</Text>
          </Pressable>
          <Pressable accessibilityRole="link" onPress={() => { track('coaching_page_tap'); Linking.openURL(COACHING_URL); }} style={s.ghost}>
            <Text style={s.ghostT}>See the full coaching page  ↗</Text>
          </Pressable>
        </View>
      </ScrollView>

      {/* STICKY */}
      <View style={[s.sticky, { paddingBottom: 12 + insets.bottom }]}>
        <View style={s.stickyIn}>
          <View style={s.stickySeal}><Ico d={IC.shield} size={20} color={D.greenSoft} /></View>
          <View style={{ flex: 1 }}><Text style={s.stickyT}>Abs in 12 weeks</Text><Text style={s.stickyS}>or I coach you free until you do</Text></View>
          <Pressable accessibilityRole="button" onPress={() => apply('sticky')} style={s.stickyBtn}><Text style={s.stickyBtnT}>Apply</Text></Pressable>
        </View>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  topRow: { position: 'absolute', left: 18, right: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(13,19,38,0.72)', borderWidth: 1, borderColor: D.line, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7 },
  chipT: { fontFamily: F.xbold, fontSize: 11, letterSpacing: 1.2, color: D.white },
  live: { width: 8, height: 8, borderRadius: 4, backgroundColor: D.green },
  close: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(13,19,38,0.72)', borderWidth: 1, borderColor: D.line, alignItems: 'center', justifyContent: 'center' },
  inner: { paddingHorizontal: 18, gap: 14 },
  h1: { fontFamily: F.black, fontSize: 42, lineHeight: 44, letterSpacing: -1.2, color: D.white },
  lede: { fontFamily: F.medium, fontSize: 16.5, lineHeight: 24, color: D.body },
  cta: { height: 60, borderRadius: 16, backgroundColor: D.red, alignItems: 'center', justifyContent: 'center', shadowColor: D.red, shadowOpacity: 0.35, shadowRadius: 18, shadowOffset: { width: 0, height: 10 }, elevation: 6, marginTop: 4 },
  ctaT: { fontFamily: F.black, fontSize: 18, color: '#fff' },
  micro: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 14, marginTop: 12 },
  microI: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  microT: { fontFamily: F.semi, fontSize: 12.5, color: D.body },
  body: { width: '100%', maxWidth: 640, alignSelf: 'center', paddingHorizontal: 18, paddingTop: 26, gap: 16 },
  stats: { flexDirection: 'row', gap: 8 },
  stat: { flex: 1, gap: 4, backgroundColor: D.surface, borderWidth: 1, borderColor: D.line, borderRadius: 16, padding: 12 },
  statV: { fontFamily: F.black, fontSize: 18, letterSpacing: -0.6 },
  statL: { fontFamily: F.semi, fontSize: 11.5, lineHeight: 15, color: D.muted },
  chat: { backgroundColor: D.surface, borderRadius: 22, padding: 16, gap: 12, borderWidth: 1, borderColor: D.line },
  chatHead: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: D.line },
  avatar: { width: 42, height: 42, borderRadius: 21, borderWidth: 2, borderColor: D.red },
  chatName: { fontFamily: F.black, fontSize: 15, color: D.white },
  chatSub: { fontFamily: F.medium, fontSize: 12, color: D.muted },
  online: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(47,191,120,0.12)', paddingHorizontal: 9, paddingVertical: 4, borderRadius: 10 },
  onlineT: { fontFamily: F.xbold, fontSize: 10.5, color: D.greenSoft, letterSpacing: 0.6 },
  bub: { paddingHorizontal: 13, paddingVertical: 10, fontFamily: F.semi, fontSize: 14.5, lineHeight: 20, overflow: 'hidden' },
  bubMe: { backgroundColor: D.surface2, color: D.white, borderRadius: 18, borderBottomRightRadius: 5 },
  bubHim: { backgroundColor: '#ffffff', color: D.navy, borderRadius: 18, borderBottomLeftRadius: 5 },
  example: { fontFamily: F.medium, fontSize: 11, color: D.muted, textAlign: 'center' },
  guar: { backgroundColor: D.surface, borderRadius: 24, padding: 22, gap: 10, alignItems: 'center', borderWidth: 1, borderColor: D.line, marginTop: 6 },
  seal: { width: 128, height: 128, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  sealCore: { width: 94, height: 94, borderRadius: 47, backgroundColor: D.red, alignItems: 'center', justifyContent: 'center' },
  sealBig: { fontFamily: F.black, fontSize: 27, color: '#fff', letterSpacing: -0.5 },
  sealSmall: { fontFamily: F.xbold, fontSize: 8.5, color: '#fff', letterSpacing: 1.2 },
  k: { fontFamily: F.xbold, fontSize: 12, letterSpacing: 1.6, color: D.redSoft },
  h2: { fontFamily: F.black, fontSize: 28, lineHeight: 32, color: D.white, letterSpacing: -0.5 },
  h3: { fontFamily: F.black, fontSize: 22, lineHeight: 26, color: D.white },
  p: { fontFamily: F.medium, fontSize: 14.5, lineHeight: 21, color: D.body },
  rcard: { backgroundColor: D.surface, borderRadius: 22, borderWidth: 1, borderColor: D.line, overflow: 'hidden' },
  rph: { flexDirection: 'row', gap: 3, height: 220, backgroundColor: D.line },
  rimg: { flex: 1, height: '100%' },
  tag: { position: 'absolute', top: 10, fontFamily: F.black, fontSize: 10, letterSpacing: 1, backgroundColor: 'rgba(13,19,38,0.8)', color: '#fff', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, overflow: 'hidden' },
  tagA: { left: '52%', backgroundColor: D.red },
  rname: { fontFamily: F.black, fontSize: 17, color: D.white },
  rres: { fontFamily: F.black, fontSize: 24, color: D.greenSoft, letterSpacing: -0.5 },
  rwhen: { fontFamily: F.bold, fontSize: 13, color: D.muted },
  fine: { fontFamily: F.medium, fontSize: 12, lineHeight: 17, color: D.muted, textAlign: 'center' },
  steps: { backgroundColor: D.surface, borderRadius: 22, borderWidth: 1, borderColor: D.line, padding: 18 },
  mstep: { flexDirection: 'row', gap: 14 },
  mn: { width: 44, height: 44, borderRadius: 14, backgroundColor: D.surface2, borderWidth: 1, borderColor: D.line, alignItems: 'center', justifyContent: 'center' },
  mnT: { fontFamily: F.black, fontSize: 19, color: '#fff' },
  mline: { width: 2, flex: 1, backgroundColor: D.line, marginVertical: 6 },
  mw: { fontFamily: F.xbold, fontSize: 11, letterSpacing: 1.2, color: D.muted },
  mt: { fontFamily: F.black, fontSize: 20, color: D.white },
  card: { backgroundColor: D.surface, borderWidth: 1, borderColor: D.line, borderRadius: 22, paddingHorizontal: 16, paddingVertical: 4 },
  get: { flexDirection: 'row', gap: 14, alignItems: 'flex-start', paddingVertical: 14 },
  getI: { width: 38, height: 38, borderRadius: 11, backgroundColor: D.surface2, borderWidth: 1, borderColor: D.line, alignItems: 'center', justifyContent: 'center' },
  getB: { fontFamily: F.black, fontSize: 15.5, color: D.white, marginBottom: 2 },
  me: { backgroundColor: D.surface, borderRadius: 22, borderWidth: 1, borderColor: D.line, overflow: 'hidden', marginTop: 10 },
  meImg: { width: '100%' },
  sign: { fontFamily: F.black, fontSize: 16, color: D.white, marginTop: 4, fontStyle: 'italic' },
  ghost: { height: 52, borderRadius: 16, borderWidth: 1.5, borderColor: D.line, alignItems: 'center', justifyContent: 'center' },
  ghostT: { fontFamily: F.bold, fontSize: 15.5, color: D.body },
  sticky: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 12, paddingTop: 10, backgroundColor: 'rgba(13,19,38,0.94)', borderTopWidth: 1, borderTopColor: D.line },
  stickyIn: { width: '100%', maxWidth: 640, alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: 12 },
  stickySeal: { width: 40, height: 40, borderRadius: 12, backgroundColor: D.surface, borderWidth: 1, borderColor: D.line, alignItems: 'center', justifyContent: 'center' },
  stickyT: { fontFamily: F.black, fontSize: 15, color: D.white },
  stickyS: { fontFamily: F.medium, fontSize: 12.5, color: D.muted },
  stickyBtn: { height: 50, borderRadius: 14, paddingHorizontal: 26, backgroundColor: D.red, alignItems: 'center', justifyContent: 'center' },
  stickyBtnT: { fontFamily: F.black, fontSize: 16.5, color: '#fff' },
});
