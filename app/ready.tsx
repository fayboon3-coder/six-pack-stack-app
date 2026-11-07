import React, { useEffect, useRef, useState } from 'react';
import { Animated, Image, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useAuth } from '../src/lib/auth';
import { F } from '../src/lib/theme';
import { Button } from '../src/components/ui';
import { CoachingCard } from '../src/components/Offers';
import { coachingFirst, isFree } from '../src/lib/access';
import { purchasesEnabled, webCheckoutEnabled } from '../src/lib/purchases';
import { plain } from '../src/lib/program';
import LoadingScreen from '../src/components/LoadingScreen';
import { track } from '../src/lib/track';
import { exName } from '../src/lib/workoutMeta';

/**
 * "You're in": the first thing after the account is made, built like the landing page.
 * Their real plan up top (numbers, first workout, first meals, the 12 weeks), one action
 * all the way down: start week 1 (which leads to the free-trial offer for free users).
 */

const L = {
  bg: '#f3f4f8', white: '#ffffff', ink: '#16203b', body: '#3b4664', muted: '#6d7894',
  line: '#e3e6ee', red: '#d6352c', redTint: '#fdeceb', green: '#12804f', greenTint: '#e6f4ec',
};
const IMG = {
  programs: require('../assets/img/pay/lp-programs.jpg'),
  workout: require('../assets/img/pay/lp-workout.jpg'),
};

function Rise({ delay = 0, children, style }: { delay?: number; children: React.ReactNode; style?: any }) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => { Animated.timing(v, { toValue: 1, duration: 520, delay, useNativeDriver: true }).start(); }, []);
  return <Animated.View style={[style, { opacity: v, transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [18, 0] }) }] }]}>{children}</Animated.View>;
}

function Phone({ src, width, tilt = 0 }: { src: any; width: number; tilt?: number }) {
  const h = width * 2.06;
  return (
    <View style={[s.phone, { width, height: h, borderRadius: width * 0.16, transform: [{ rotate: `${tilt}deg` }] }]}>
      <View style={[s.phoneInner, { borderRadius: width * 0.135 }]}>
        <Image source={src} style={{ width: '100%', height: '100%' }} resizeMode="cover" accessibilityIgnoresInvertColors />
        <View style={[s.island, { width: width * 0.3, height: width * 0.085, top: width * 0.035, borderRadius: width * 0.05 }]} />
      </View>
    </View>
  );
}

const Kicker = ({ t, light }: { t: string; light?: boolean }) => <Text style={[s.kicker, light && { color: '#ff8a82' }]}>{t}</Text>;

export default function Ready() {
  const { plan, profile, refresh } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const wide = width >= 820;
  const [tries, setTries] = useState(0);
  const [revealed, setRevealed] = useState(false);
  useEffect(() => { if (revealed) track('plan_ready', {}, { once: true }); }, [revealed]);

  useEffect(() => {
    if (plan || tries > 8) return;
    const t = setTimeout(async () => { await refresh(); setTries((x) => x + 1); }, 1200);
    return () => clearTimeout(t);
  }, [plan, tries, refresh]);

  if (!plan || !revealed) {
    const slow = !plan && tries > 8;
    return (
      <SafeAreaView edges={[]} style={{ flex: 1, backgroundColor: L.bg }}>
        <LoadingScreen
          title={slow ? 'Almost| there' : 'Building your| plan'}
          sub={slow ? 'This is taking longer than usual. Your plan will be on the Today tab.' : 'Made from your answers. Nothing generic.'}
          steps={['Setting your calories and protein', 'Building meals from the foods you picked', 'Writing your training split', 'Picking your starter stack', 'Mapping your 12 weeks']}
          stepMs={700}
          done={!!plan}
          onFinish={() => setRevealed(true)}
        >
          {slow && <View style={{ marginTop: 24, alignSelf: 'stretch' }}><Button title="Go to Today" onPress={() => router.replace('/')} /></View>}
        </LoadingScreen>
      </SafeAreaView>
    );
  }

  // Free users go to the free-trial offer first (Apple sheet on iPhone, secure checkout on the web).
  const startWeek1 = (where: string) => {
    track('ready_start', { where });
    router.replace(isFree(profile) && (purchasesEnabled() || webCheckoutEnabled()) ? '/trial' : '/');
  };
  const hot = coachingFirst(profile);
  const first = plan.train.d[0];
  const moves = (first?.x || []).map((e) => exName(e[0], plan)).filter(Boolean);
  const meals = (plan.meals || []).slice(0, 3).map((m) => ({ slot: m.slot, o: m.options[0] })).filter((m) => m.o);
  const out = (plan.eat_out || [])[0];
  const days = plan.train.d.length;
  const phases = [
    { n: 'Strip', w: 'Weeks 1–4', t: plain(plan.phase1) || 'Lock in your calories, protein and training. Build the habit.' },
    { n: 'Stack', w: 'Weeks 5–8', t: plain(plan.phase2) || 'Calories re-set to your new weight. Lifts get heavier.' },
    { n: 'Six-Pack', w: 'Weeks 9–12', t: plain(plan.phase3) || 'Final re-set and the push to see your abs.' },
  ];
  const today = (plan.week1 && plan.week1.length ? plan.week1.map(plain) : [
    `Do ${first?.t || 'your first workout'}. Every move has a form video.`,
    `Hit ${plan.protein}g of protein. Your meals already add up to it.`,
    `Walk ${plan.steps} steps.`,
  ]).slice(0, 3);
  const pw = wide ? 230 : Math.min(140, (width - 80) / 2);

  return (
    <View style={{ flex: 1, backgroundColor: L.bg }}>
      <ScrollView contentContainerStyle={{ paddingBottom: (wide ? 40 : 110) + insets.bottom }}>
        {/* Hero */}
        <LinearGradient colors={['#141c33', '#1d2a52', '#2a1530']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[s.hero, { paddingTop: insets.top + 28 }]}>
          <View style={[s.wrap, wide && { flexDirection: 'row', alignItems: 'center', gap: 40 }]}>
            <Rise style={{ flex: wide ? 1.1 : undefined, gap: 16 }}>
              <View style={s.pill}><View style={s.dot} /><Text style={s.pillT}>YOU'RE IN · WEEK 1 STARTS TODAY</Text></View>
              <Text style={[s.h1, wide && { fontSize: 52, lineHeight: 56 }]}>{plan.name}, you're in.</Text>
              <Text style={s.lede}>{plain(plan.goal_long) || plan.goal_short}</Text>
              <View style={s.stats}>
                <View style={s.stat}><Text style={s.statV}>{plan.kcal}</Text><Text style={s.statL}>CALORIES</Text></View>
                <View style={s.stat}><Text style={s.statV}>{plan.protein}g</Text><Text style={s.statL}>PROTEIN</Text></View>
                <View style={s.stat}><Text style={s.statV}>{days}x</Text><Text style={s.statL}>WORKOUTS</Text></View>
              </View>
              {wide && <Pressable accessibilityRole="button" onPress={() => startWeek1('hero')} style={s.cta}><Text style={s.ctaT}>Start week 1  →</Text></Pressable>}
            </Rise>
            <Rise delay={150} style={[s.phones, wide ? { flex: 1, height: pw * 2.06 + 20 } : { height: pw * 2.06 * 0.7, marginTop: 24, marginHorizontal: 10 }]}>
              <View style={{ position: 'absolute', left: wide ? 10 : 0, top: 30 }}><Phone src={IMG.workout} width={pw * 0.92} tilt={-6} /></View>
              <View style={{ position: 'absolute', right: wide ? 10 : 0, top: 0 }}><Phone src={IMG.programs} width={pw} tilt={5} /></View>
              <View style={[s.float, { left: wide ? 0 : -4, bottom: wide ? 60 : 30 }]}><Text style={s.floatT}>✓ Built from your answers</Text></View>
            </Rise>
          </View>
        </LinearGradient>

        <View style={[s.wrap, { gap: 26, marginTop: -26 }]}>
          {/* First week */}
          <Rise delay={250} style={s.card}>
            <Kicker t="Your first workout" />
            <Text style={s.h2}>{first?.t || 'Day 1'}</Text>
            <Text style={s.meta}>{moves.length} exercises · about {Math.max(35, moves.length * 7)} min · a form video on every move</Text>
            <View style={{ gap: 8, marginTop: 6 }}>
              {moves.slice(0, 4).map((m, i) => (
                <View key={m + i} style={s.moveRow}><Text style={s.moveN}>{i + 1}</Text><Text style={s.moveT} numberOfLines={1}>{m}</Text></View>
              ))}
              {moves.length > 4 && <Text style={s.more}>+ {moves.length - 4} more</Text>}
            </View>
          </Rise>

          {meals.length > 0 && (
            <Rise delay={320} style={s.card}>
              <Kicker t="Your meals, from foods you picked" />
              <Text style={s.h2}>{plan.kcal} calories · {plan.protein}g protein</Text>
              <View style={{ gap: 10, marginTop: 6 }}>
                {meals.map((m) => (
                  <View key={m.slot} style={s.mealRow}>
                    <View style={{ flex: 1, minWidth: 0 }}><Text style={s.mealSlot}>{m.slot.toUpperCase()}</Text><Text style={s.mealT} numberOfLines={2}>{m.o.name}</Text></View>
                    <Text style={s.mealK}>{m.o.kcal} · {m.o.protein}</Text>
                  </View>
                ))}
              </View>
              {!!out && <View style={s.outRow}><Text style={s.outK}>Eating out?</Text><Text style={s.outT} numberOfLines={2}>{out.where}: {out.order}</Text></View>}
            </Rise>
          )}

          {/* Today */}
          <Rise delay={380} style={[s.card, { backgroundColor: L.ink, borderColor: L.ink }]}>
            <Kicker t="Do these 3 things today" light />
            <View style={{ gap: 12, marginTop: 4 }}>
              {today.map((t, i) => (
                <View key={i} style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-start' }}>
                  <View style={s.todayN}><Text style={s.todayNT}>{i + 1}</Text></View>
                  <Text style={s.todayT}>{t}</Text>
                </View>
              ))}
            </View>
          </Rise>

          {/* 12 weeks */}
          <Rise delay={420}>
            <Kicker t="Your 12 weeks" />
            <Text style={[s.h2, { marginBottom: 12 }]}>Strip. Stack. Six-Pack.</Text>
            <View style={[{ gap: 10 }, wide && { flexDirection: 'row' }]}>
              {phases.map((p, i) => (
                <View key={p.n} style={[s.phase, wide && { flex: 1 }, i === 0 && { borderColor: L.red, backgroundColor: L.redTint }]}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={[s.phaseN, i === 0 && { color: L.red }]}>{p.n}</Text>
                    <Text style={s.phaseW}>{i === 0 ? 'Now · ' : ''}{p.w}</Text>
                  </View>
                  <Text style={s.phaseT}>{p.t}</Text>
                </View>
              ))}
            </View>
          </Rise>

          <Pressable accessibilityRole="button" onPress={() => startWeek1('bottom')} style={[s.cta, { alignSelf: 'stretch' }]}><Text style={s.ctaT}>Start week 1  →</Text></Pressable>

          <View style={{ gap: 10 }}>
            <Kicker t={hot ? 'You said you want to start now' : 'Want me to do it with you?'} />
            <CoachingCard />
          </View>
        </View>
      </ScrollView>

      {!wide && (
        <View style={[s.sticky, { paddingBottom: 12 + insets.bottom }]}>
          <Pressable accessibilityRole="button" onPress={() => startWeek1('sticky')} style={[s.cta, { alignSelf: 'stretch' }]}><Text style={s.ctaT}>Start week 1  →</Text></Pressable>
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { width: '100%', maxWidth: 1040, alignSelf: 'center', paddingHorizontal: 20 },
  hero: { paddingBottom: 56, borderBottomLeftRadius: 30, borderBottomRightRadius: 30, overflow: 'hidden' },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 8, alignSelf: 'flex-start', backgroundColor: 'rgba(47,209,127,0.14)', borderWidth: 1, borderColor: 'rgba(47,209,127,0.4)', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#2fd17f' },
  pillT: { fontFamily: F.xbold, fontSize: 11.5, letterSpacing: 1.2, color: '#7ff0b5' },
  h1: { fontFamily: F.black, fontSize: 40, lineHeight: 44, color: '#fff', letterSpacing: -1 },
  lede: { fontFamily: F.medium, fontSize: 16.5, lineHeight: 24, color: '#c7cde0' },
  stats: { flexDirection: 'row', gap: 10, marginTop: 4 },
  stat: { flex: 1, backgroundColor: 'rgba(255,255,255,0.08)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', borderRadius: 16, paddingVertical: 12, alignItems: 'center', gap: 2 },
  statV: { fontFamily: F.black, fontSize: 21, color: '#fff' },
  statL: { fontFamily: F.xbold, fontSize: 10, letterSpacing: 1.2, color: '#9aa3bd' },
  phones: { position: 'relative', alignSelf: 'stretch' },
  float: { position: 'absolute', backgroundColor: '#fff', borderRadius: 999, paddingHorizontal: 14, paddingVertical: 9, shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 14, shadowOffset: { width: 0, height: 8 }, elevation: 6 },
  floatT: { fontFamily: F.xbold, fontSize: 13, color: L.ink },
  phone: { backgroundColor: '#0d1220', padding: 6, shadowColor: '#000', shadowOpacity: 0.4, shadowRadius: 30, shadowOffset: { width: 0, height: 20 }, elevation: 10 },
  phoneInner: { flex: 1, overflow: 'hidden', backgroundColor: '#fff' },
  island: { position: 'absolute', alignSelf: 'center', backgroundColor: '#0d1220' },
  card: { backgroundColor: L.white, borderRadius: 24, borderWidth: 1, borderColor: L.line, padding: 20, gap: 6, shadowColor: L.ink, shadowOpacity: 0.08, shadowRadius: 24, shadowOffset: { width: 0, height: 10 }, elevation: 3 },
  kicker: { fontFamily: F.xbold, fontSize: 12, letterSpacing: 1.6, textTransform: 'uppercase', color: L.red },
  h2: { fontFamily: F.black, fontSize: 26, lineHeight: 30, color: L.ink, letterSpacing: -0.4 },
  meta: { fontFamily: F.semi, fontSize: 14, color: L.muted },
  moveRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, paddingHorizontal: 12, backgroundColor: L.bg, borderRadius: 14 },
  moveN: { width: 26, height: 26, borderRadius: 13, backgroundColor: L.ink, color: '#fff', textAlign: 'center', lineHeight: 26, fontFamily: F.black, fontSize: 13, overflow: 'hidden' },
  moveT: { flex: 1, fontFamily: F.bold, fontSize: 16, color: L.ink },
  more: { fontFamily: F.bold, fontSize: 14, color: L.muted, paddingLeft: 4 },
  mealRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: L.line },
  mealSlot: { fontFamily: F.xbold, fontSize: 11, letterSpacing: 1.2, color: L.muted },
  mealT: { fontFamily: F.bold, fontSize: 16, color: L.ink, marginTop: 2 },
  mealK: { fontFamily: F.semi, fontSize: 13, color: L.body },
  outRow: { marginTop: 8, backgroundColor: L.greenTint, borderRadius: 14, padding: 12, gap: 2 },
  outK: { fontFamily: F.xbold, fontSize: 12, color: L.green, letterSpacing: 0.6 },
  outT: { fontFamily: F.semi, fontSize: 14, color: L.ink, lineHeight: 20 },
  todayN: { width: 28, height: 28, borderRadius: 14, backgroundColor: L.red, alignItems: 'center', justifyContent: 'center' },
  todayNT: { fontFamily: F.black, fontSize: 14, color: '#fff' },
  todayT: { flex: 1, fontFamily: F.semi, fontSize: 16, lineHeight: 23, color: '#fff' },
  phase: { backgroundColor: L.white, borderRadius: 18, borderWidth: 1.5, borderColor: L.line, padding: 16, gap: 6 },
  phaseN: { fontFamily: F.black, fontSize: 19, color: L.ink },
  phaseW: { fontFamily: F.bold, fontSize: 12.5, color: L.muted },
  phaseT: { fontFamily: F.medium, fontSize: 14.5, lineHeight: 21, color: L.body },
  cta: { height: 60, borderRadius: 30, backgroundColor: L.red, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 28, alignSelf: 'flex-start', minWidth: 260, shadowColor: L.red, shadowOpacity: 0.4, shadowRadius: 18, shadowOffset: { width: 0, height: 10 }, elevation: 6 },
  ctaT: { fontFamily: F.black, fontSize: 19, color: '#fff' },
  sticky: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 16, paddingTop: 12, backgroundColor: 'rgba(243,244,248,0.96)', borderTopWidth: 1, borderTopColor: L.line },
});
