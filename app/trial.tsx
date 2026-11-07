import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Image, Linking, Platform, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useAuth } from '../src/lib/auth';
import { F } from '../src/lib/theme';
import { useSubscribe, type PlanId } from '../src/components/Offers';
import { isFree, PRIVACY_URL, TERMS_URL } from '../src/lib/access';
import { track } from '../src/lib/track';

/**
 * The offer right after "your plan is ready", built like the app's landing page:
 * light, big type, real app screens in phone frames, real client results, Boon.
 * One action all the way down: start the 7-day free trial (Apple sheet on iPhone,
 * secure checkout on the web). "Not now" keeps the free 2 weeks.
 */

const L = {
  bg: '#f3f4f8', white: '#ffffff', ink: '#16203b', body: '#3b4664', muted: '#6d7894',
  line: '#e3e6ee', red: '#d6352c', redDeep: '#b8261f', redTint: '#fdeceb', green: '#12804f', greenTint: '#e6f4ec', navy: '#16203b',
};
const IMG = {
  programs: require('../assets/img/pay/lp-programs.jpg'),
  stack: require('../assets/img/pay/lp-stackcheck.jpg'),
  workout: require('../assets/img/pay/lp-workout.jpg'),
  you: require('../assets/img/pay/lp-you.jpg'),
  boon: require('../assets/img/pay/boon-red.jpg'),
};
const RESULTS = [
  { name: 'Robert', what: '−30+ lbs in 3 months', a: require('../assets/img/pay/robert-a.jpg'), b: require('../assets/img/pay/robert-b.jpg') },
  { name: 'Gerardo, 22', what: '−40 lbs in 4 months', a: require('../assets/img/pay/gerardo-a.jpg'), b: require('../assets/img/pay/gerardo-b.jpg') },
  { name: 'James, 24', what: '+10 lbs of muscle in 4 months', a: require('../assets/img/pay/james-a.jpg'), b: require('../assets/img/pay/james-b.jpg') },
];

/** Fades and lifts a section in once, on mount, with a small stagger. */
function Rise({ delay = 0, children, style }: { delay?: number; children: React.ReactNode; style?: any }) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => { Animated.timing(v, { toValue: 1, duration: 520, delay, useNativeDriver: true }).start(); }, []);
  return <Animated.View style={[style, { opacity: v, transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [18, 0] }) }] }]}>{children}</Animated.View>;
}

/** A real app screen in an iPhone frame. */
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

function Chip({ text, tone = 'white', style }: { text: string; tone?: 'white' | 'green' | 'red'; style?: any }) {
  const bg = tone === 'green' ? L.green : tone === 'red' ? L.red : L.white;
  const fg = tone === 'white' ? L.ink : '#fff';
  return <View style={[s.chip, { backgroundColor: bg }, style]}><Text style={[s.chipText, { color: fg }]}>{text}</Text></View>;
}

function PlanPicker({ plan, setPlan, price, trial }: { plan: PlanId; setPlan: (p: PlanId) => void; price: (p: PlanId) => string; trial: (p: PlanId) => string }) {
  const Opt = ({ id, title, per, note }: { id: PlanId; title: string; per: string; note: string }) => {
    const free = trial(id);
    const on = plan === id;
    return (
      <Pressable accessibilityRole="radio" accessibilityState={{ selected: on }} onPress={() => { setPlan(id); track('plan_pick', { plan: id }); }}
        style={[s.opt, on && s.optOn]}>
        {!!free && <View style={s.best}><Text style={s.bestText}>{free} free</Text></View>}
        <View style={[s.radio, on && s.radioOn]}>{on && <View style={s.radioDot} />}</View>
        <Text style={s.optTitle}>{title}</Text>
        <Text style={s.optPrice}>{price(id)}<Text style={s.per}>{per}</Text></Text>
        <Text style={s.optNote}>{note}</Text>
      </Pressable>
    );
  };
  return (
    <View style={{ flexDirection: 'row', gap: 10, alignSelf: 'stretch' }}>
      <Opt id="monthly" title="Monthly" per="/mo" note="Cancel anytime" />
      <Opt id="yearly" title="Yearly" per="/yr" note="Just $1.90 a week" />
    </View>
  );
}

function Faq({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <Pressable accessibilityRole="button" accessibilityState={{ expanded: open }} onPress={() => { if (!open) track('paywall_faq', { q }, { once: true }); setOpen(!open); }} style={s.faq}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <Text style={[s.faqQ, { flex: 1 }]}>{q}</Text>
        <Text style={s.faqPlus}>{open ? '−' : '+'}</Text>
      </View>
      {open && <Text style={s.faqA}>{a}</Text>}
    </Pressable>
  );
}

export default function TrialOffer() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const wide = width >= 820;
  const { plan, profile } = useAuth();
  const sub = useSubscribe('after_plan', 'monthly');
  const { plan: pick, setPlan, price, trial, today, start, doRestore, busy, msg, can, label, live, legal } = sub;
  const t = trial(pick);
  const cap = (x: string) => x.charAt(0).toUpperCase() + x.slice(1);
  /** "7 days" / "2 weeks" from today, as "November 21". */
  const endDate = (tr: string) => {
    const n = parseInt(tr, 10) || 0; const d = new Date();
    d.setDate(d.getDate() + (/week/.test(tr) ? n * 7 : /month/.test(tr) ? n * 30 : n));
    return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
  };

  const depth = useRef(0);
  const skip = () => { track('trial_offer_skip', { depth: depth.current }); router.replace('/'); };
  /** How far down the page people get, in quarters (25/50/75/100), once each. */
  const onScroll = (e: any) => {
    const { contentOffset, layoutMeasurement, contentSize } = e.nativeEvent;
    const pct = Math.min(100, Math.round(((contentOffset.y + layoutMeasurement.height) / Math.max(1, contentSize.height)) * 100));
    for (const q of [25, 50, 75, 100]) if (pct >= q && depth.current < q) { depth.current = q; track('paywall_scroll', { pct: q }, { once: true }); }
  };
  // Already paid (e.g. they just subscribed): straight in.
  useEffect(() => { if (profile && !isFree(profile)) router.replace('/'); }, [profile?.tier]);

  const name = plan?.name || profile?.first_name || '';
  const phoneW = Math.min(wide ? 250 : width * 0.56, 260);

  const Cta = ({ big, where }: { big?: boolean; where: string }) => (
    <Pressable accessibilityRole="button" onPress={() => start(where)} disabled={!can || !!busy}
      style={({ pressed }) => [s.cta, big && { height: 60 }, (!can || !!busy) && { opacity: 0.55 }, pressed && { transform: [{ scale: 0.985 }] }]}>
      <LinearGradient colors={[L.red, L.redDeep]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
      {busy === 'buy' ? <ActivityIndicator color="#fff" /> : <Text style={s.ctaText}>{label}{can ? '  →' : ''}</Text>}
    </Pressable>
  );

  const Feature = ({ title, accent, body, img, flip, chips }: { title: string; accent: string; body: string; img: any; flip?: boolean; chips: { t: string; tone?: 'white' | 'green' | 'red' }[] }) => (
    <View style={[s.feature, wide && { flexDirection: flip ? 'row-reverse' : 'row', alignItems: 'center', gap: 48 }]}>
      <View style={[{ gap: 12 }, wide && { flex: 1 }]}>
        <Text style={s.h2}>{title} <Text style={{ color: L.red }}>{accent}</Text></Text>
        <Text style={s.body}>{body}</Text>
      </View>
      <View style={[s.featureArt, wide && { flex: 1 }]}>
        <LinearGradient colors={[L.redTint, '#ffffff']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[StyleSheet.absoluteFill, { borderRadius: 28 }]} />
        <Phone src={img} width={Math.min(phoneW * 0.86, 220)} tilt={flip ? 3 : -3} />
        {chips.map((c, i) => (
          <Chip key={c.t} text={c.t} tone={c.tone} style={[s.floatChip, i === 0 ? { top: 28, left: 10 } : { bottom: 34, right: 10 }]} />
        ))}
      </View>
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: L.white }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 130 + insets.bottom }} showsVerticalScrollIndicator={false} onScroll={onScroll} scrollEventThrottle={250}>
        {/* HERO */}
        <LinearGradient colors={[L.bg, '#fbf4f3']} style={{ paddingTop: insets.top + 28 }}>
          <View style={[s.wrap, wide && { flexDirection: 'row', alignItems: 'center', gap: 56 }]}>
            <Rise style={[{ alignItems: wide ? 'flex-start' : 'center', gap: 16 }, wide && { flex: 1.1 }]}>
              <View style={s.pill}><View style={s.pillDot} /><Text style={s.pillText}>{name ? `${name}, your plan is ready` : 'Your plan is ready'}</Text></View>
              <Text style={[s.zero, !wide && { textAlign: 'center' }]}>{t ? '$0 today.' : `${price(pick)} today.`}</Text>
              <Text style={[s.h1sub, !wide && { textAlign: 'center' }]}>Unlock all 12 weeks of your plan.</Text>
              <View style={s.receipt}>
                <View style={s.rRow}><Text style={s.rK}>Due today</Text><Text style={s.rToday}>{t ? '$0.00' : price(pick)}</Text></View>
                <View style={s.rLine} />
                <View style={s.rRow}><Text style={s.rK}>{t ? `After your ${t} free` : 'Then'}</Text><Text style={s.rV}>{price(pick)}<Text style={s.rPer}>{pick === 'yearly' ? '/yr' : '/mo'}</Text></Text></View>
                {!!t && <View style={s.rRow}><Text style={s.rK}>Cancel before</Text><Text style={s.rV}>{endDate(t)}</Text></View>}
                <Text style={s.rNote}>{t ? "Cancel any time before then and you pay nothing. I'll email you a reminder 2 days before." : 'Cancel anytime.'}</Text>
              </View>
              <PlanPicker plan={pick} setPlan={setPlan} price={price} trial={trial} />
              <View style={{ alignSelf: 'stretch', gap: 8 }}>
                <Cta big where="hero" />
                <Text style={[s.micro, !wide && { textAlign: 'center' }]}>{live || sub.web ? today(pick) : 'Subscriptions open with the App Store launch.'}</Text>
                {!!msg && <Text style={[s.micro, { fontFamily: F.bold, color: L.ink, textAlign: wide ? 'left' : 'center' }]}>{msg}</Text>}
              </View>
            </Rise>
            <Rise delay={140} style={[s.heroArt, wide && { flex: 1 }]}>
              <Phone src={IMG.programs} width={phoneW} tilt={-4} />
              <Chip text="✓ Weeks 1–2 ready" tone="green" style={[s.floatChip, { top: 40, left: wide ? 0 : 4 }]} />
              <Chip text="Weeks 3–12 unlock today" tone="red" style={[s.floatChip, { top: phoneW * 0.95, right: wide ? 0 : 2 }]} />
              <Chip text="Calories re-set at wk 4 & 8" style={[s.floatChip, { bottom: 30, left: wide ? 10 : 8 }]} />
            </Rise>
          </View>
        </LinearGradient>

        {/* 12-WEEK ROADMAP */}
        <View style={[s.wrap, { paddingVertical: 44, gap: 18 }]}>
          <Text style={[s.h2, { textAlign: 'center' }]}>Your <Text style={{ color: L.red }}>12 weeks</Text></Text>
          <Text style={[s.body, { textAlign: 'center' }]}>The free plan is the start. The trial unlocks the rest.</Text>
          <View style={[{ gap: 12 }, wide && { flexDirection: 'row' }]}>
            {[
              { k: 'Weeks 1–2', t: 'Strip', d: 'Clean up your stack, set your calories, learn the lifts.', state: 'Free · Ready', on: true },
              { k: 'Weeks 3–8', t: 'Stack', d: 'Training gets heavier. Calories re-set at week 4 so the scale keeps moving.', state: t ? 'Unlocks with trial' : 'Unlocks today' },
              { k: 'Weeks 9–12', t: 'Six-Pack', d: 'The final cut. Re-set at week 8, progress photos, your before and after.', state: t ? 'Unlocks with trial' : 'Unlocks today' },
            ].map((w, i) => (
              <Rise key={w.t} delay={i * 90} style={[s.week, wide && { flex: 1 }, w.on && { borderColor: '#bfe3cf' }]}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={s.weekK}>{w.k}</Text>
                  <View style={[s.state, { backgroundColor: w.on ? L.greenTint : L.redTint }]}><Text style={[s.stateText, { color: w.on ? L.green : L.red }]}>{w.state}</Text></View>
                </View>
                <Text style={s.weekT}>{w.t}</Text>
                <Text style={s.small}>{w.d}</Text>
              </Rise>
            ))}
          </View>
        </View>

        {/* FEATURES */}
        <View style={[s.wrap, { gap: 56, paddingBottom: 48 }]}>
          <Feature title="Train with" accent="a real plan" img={IMG.workout}
            body="Every exercise has a form video and 3 cues. Log your sets, see last week's numbers and beat them. The rest timer runs itself."
            chips={[{ t: 'Form video for every lift' }, { t: 'New PR: +10 lb', tone: 'green' }]} />
          <Feature title="Know what's" accent="worth buying" img={IMG.stack} flip
            body="All 47 products I investigated, each with a verdict. Score your whole stack, cut the waste, and ask Boon, the AI coach built on my plans, any time."
            chips={[{ t: 'Skip it: fat burners', tone: 'red' }, { t: 'Worth it: creatine', tone: 'green' }]} />
          <Feature title="Stay on" accent="track" img={IMG.you}
            body="A 2-minute check-in every Sunday. Your calories re-set at weeks 4 and 8, streaks keep you honest, and your progress photos show what the scale can't."
            chips={[{ t: 'Sunday check-in · 2 min' }, { t: 'On track ✓', tone: 'green' }]} />
        </View>

        {/* RESULTS */}
        <View style={{ backgroundColor: L.bg, paddingVertical: 48 }}>
          <View style={[s.wrap, { gap: 18 }]}>
            <Text style={[s.h2, { textAlign: 'center' }]}>Real results from guys who <Text style={{ color: L.red }}>followed the system</Text></Text>
            <View style={[{ gap: 12 }, wide && { flexDirection: 'row' }]}>
              {RESULTS.map((r, i) => (
                <Rise key={r.name} delay={i * 90} style={[s.result, wide && { flex: 1 }]}>
                  <View style={{ flexDirection: 'row', gap: 4 }}>
                    <Image source={r.a} style={s.rImg} accessibilityLabel={`${r.name} before`} />
                    <Image source={r.b} style={s.rImg} accessibilityLabel={`${r.name} after`} />
                  </View>
                  <View style={{ flex: 1, gap: 2, justifyContent: 'center' }}>
                    <Text style={s.rName}>{r.name}</Text>
                    <Text style={s.rWhat}>{r.what}</Text>
                  </View>
                </Rise>
              ))}
            </View>
            <Text style={[s.micro, { textAlign: 'center' }]}>Results vary and depend on following the plan.</Text>
          </View>
        </View>

        {/* BOON */}
        <View style={[s.wrap, { paddingVertical: 48, gap: 20 }, wide && { flexDirection: 'row', alignItems: 'center', gap: 48 }]}>
          <View style={[{ gap: 12 }, wide && { flex: 1 }]}>
            <Text style={s.h2}>Built by <Text style={{ color: L.red }}>Boon</Text></Text>
            <Text style={s.body}>I went from 225 to 175 lbs, and I investigate fitness products with no sponsors and no affiliate links. This app is the exact system that worked for me, built around your food, your schedule and your goal.</Text>
          </View>
          <View style={[s.boonCard, wide && { flex: 1, maxWidth: 380 }]}>
            <Image source={IMG.boon} style={{ width: '100%', height: '100%' }} resizeMode="cover" accessibilityLabel="Boon" />
            <LinearGradient colors={['transparent', 'rgba(22,32,59,0.92)']} style={s.boonShade} />
            <View style={s.boonCap}><Text style={s.boonName}>Boon</Text><Text style={s.boonSub}>225 → 175 lbs · Los Angeles</Text></View>
          </View>
        </View>

        {/* PRICE RECAP */}
        <View style={s.wrap}>
          <LinearGradient colors={['#1d2a4d', L.navy]} style={s.recap}>
            <Text style={[s.h2, { color: '#fff', textAlign: 'center' }]}>{t ? <><Text style={{ color: '#ff7a70' }}>$0 today.</Text> Then less than a tub of pre-workout.</> : <>Less than one tub of <Text style={{ color: '#ff7a70' }}>pre-workout</Text> a month.</>}</Text>
            <Text style={[s.body, { color: 'rgba(255,255,255,0.8)', textAlign: 'center' }]}>
              {t ? `${cap(t)} free, then ${price(pick)} ${pick === 'yearly' ? "a year. That's $1.90 a week." : 'a month. Cancel anytime.'}` : `${price(pick)} ${pick === 'yearly' ? 'a year' : 'a month'}. Cancel anytime.`}
            </Text>
            <View style={{ alignSelf: 'stretch', gap: 10 }}>
              {['All 12 weeks of training and meals', 'Calorie re-sets at weeks 4 and 8', 'All 47 product verdicts + Stack, your AI coach', 'Sunday check-ins, photos and streaks'].map((t) => (
                <View key={t} style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
                  <View style={s.tick}><Text style={s.tickMark}>✓</Text></View>
                  <Text style={[s.small, { color: '#fff', fontFamily: F.semi, flex: 1 }]}>{t}</Text>
                </View>
              ))}
            </View>
            <View style={{ alignSelf: 'stretch' }}><Cta where="recap" /></View>
          </LinearGradient>
        </View>

        {/* FAQ */}
        <View style={[s.wrap, { paddingVertical: 44, gap: 10 }]}>
          <Text style={[s.h2, { textAlign: 'center', marginBottom: 6 }]}>Questions</Text>
          <Faq q="Do I pay anything today?" a={`No. ${trial('yearly') ? `Yearly is ${trial('yearly')} free, then ${price('yearly')} a year.` : `Yearly is ${price('yearly')} a year.`} ${trial('monthly') ? `Monthly is ${trial('monthly')} free, then ${price('monthly')} a month.` : `Monthly is ${price('monthly')} a month.`} Cancel before your trial ends and you pay nothing.`} />
          <Faq q="How do I cancel?" a={Platform.OS === 'web' ? 'Use the link in your receipt email, any time. It takes a few seconds.' : 'iPhone Settings → your name → Subscriptions → Six-Pack Stack. It takes a few seconds.'} />
          <Faq q="What if I skip this?" a="You keep your free weeks 1–2. Weeks 3–12 stay locked until you unlock them, and you can do that any time from the Boon tab." />
          <Faq q="Is this the same as coaching?" a="No. The app is my system, run by you. Coaching is me in your corner 1:1: I review your check-in every Sunday and adjust your plan myself. You can apply any time." />
        </View>

        {/* LEGAL */}
        <View style={[s.wrap, { gap: 12, alignItems: 'center' }]}>
          <Pressable accessibilityRole="button" onPress={skip} hitSlop={8} style={{ minHeight: 44, justifyContent: 'center' }}>
            <Text style={s.skip}>Not now, start my free 2 weeks</Text>
          </Pressable>
          {(live || sub.web) && <Text style={s.legal}>{legal}</Text>}
          <View style={{ flexDirection: 'row', gap: 22 }}>
            {live && <Pressable accessibilityRole="button" onPress={doRestore} disabled={!!busy} hitSlop={8}><Text style={s.link}>{busy === 'restore' ? 'Restoring…' : 'Restore purchases'}</Text></Pressable>}
            <Pressable accessibilityRole="link" onPress={() => Linking.openURL(TERMS_URL)} hitSlop={8}><Text style={s.link}>Terms</Text></Pressable>
            <Pressable accessibilityRole="link" onPress={() => Linking.openURL(PRIVACY_URL)} hitSlop={8}><Text style={s.link}>Privacy</Text></Pressable>
          </View>
        </View>
      </ScrollView>

      {/* STICKY BAR */}
      <View style={[s.sticky, { paddingBottom: 12 + insets.bottom }]}>
        <View style={[s.wrap, { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 0 }]}>
          <View style={{ flex: 1 }}>
            <Text style={s.stickyT}>{t ? <><Text style={{ color: L.red }}>$0</Text> today</> : `${price(pick)}${pick === 'yearly' ? '/yr' : '/mo'}`}</Text>
            <Text style={s.stickyS}>{t ? `${cap(t)} free, then ${price(pick)}${pick === 'yearly' ? '/yr' : '/mo'}` : 'Cancel anytime'}</Text>
          </View>
          <Pressable accessibilityRole="button" onPress={() => start('sticky')} disabled={!can || !!busy}
            style={[s.stickyBtn, (!can || !!busy) && { opacity: 0.55 }]}>
            <LinearGradient colors={[L.red, L.redDeep]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
            {busy === 'buy' ? <ActivityIndicator color="#fff" /> : <Text style={s.stickyBtnText}>{can ? (t ? 'Start free trial' : pick === 'yearly' ? 'Start yearly' : 'Start monthly') : 'Coming soon'}</Text>}
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { width: '100%', maxWidth: 1080, alignSelf: 'center', paddingHorizontal: 20 },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: L.white, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1, borderColor: L.line },
  pillDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: L.green },
  pillText: { fontFamily: F.bold, fontSize: 13, color: L.ink },
  h1: { fontFamily: F.black, fontSize: 40, lineHeight: 44, letterSpacing: -1.2, color: L.ink },
  zero: { fontFamily: F.black, fontSize: 64, lineHeight: 66, letterSpacing: -2.5, color: L.red },
  h1sub: { fontFamily: F.black, fontSize: 24, lineHeight: 29, letterSpacing: -0.5, color: L.ink, marginTop: -8 },
  receipt: { alignSelf: 'stretch', backgroundColor: L.white, borderRadius: 18, borderWidth: 1.5, borderColor: L.line, borderStyle: 'dashed', padding: 16, gap: 10 },
  rRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: 10 },
  rK: { fontFamily: F.semi, fontSize: 15, color: L.body },
  rToday: { fontFamily: F.black, fontSize: 26, color: L.green },
  rV: { fontFamily: F.black, fontSize: 17, color: L.ink },
  rPer: { fontFamily: F.bold, fontSize: 13, color: L.muted },
  rLine: { height: 1, backgroundColor: L.line },
  rNote: { fontFamily: F.medium, fontSize: 12.5, lineHeight: 18, color: L.muted },
  h2: { fontFamily: F.black, fontSize: 28, lineHeight: 33, letterSpacing: -0.6, color: L.ink },
  lede: { fontFamily: F.medium, fontSize: 16, lineHeight: 24, color: L.body, maxWidth: 520 },
  body: { fontFamily: F.medium, fontSize: 16, lineHeight: 25, color: L.body },
  small: { fontFamily: F.medium, fontSize: 14, lineHeight: 20, color: L.body },
  micro: { fontFamily: F.semi, fontSize: 12.5, lineHeight: 18, color: L.muted },
  opt: { flex: 1, backgroundColor: L.white, borderWidth: 2, borderColor: L.line, borderRadius: 18, padding: 14, paddingTop: 16, gap: 2 },
  optOn: { borderColor: L.red, shadowColor: L.red, shadowOpacity: 0.18, shadowRadius: 14, shadowOffset: { width: 0, height: 6 }, elevation: 4 },
  radio: { position: 'absolute', top: 14, right: 14, width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: L.line, alignItems: 'center', justifyContent: 'center' },
  radioOn: { borderColor: L.red },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: L.red },
  best: { position: 'absolute', top: -11, left: 12, backgroundColor: L.green, borderRadius: 999, paddingHorizontal: 9, paddingVertical: 3 },
  bestText: { fontFamily: F.black, fontSize: 10, letterSpacing: 0.6, textTransform: 'uppercase', color: '#fff' },
  optTitle: { fontFamily: F.xbold, fontSize: 12, letterSpacing: 1.2, textTransform: 'uppercase', color: L.muted },
  optPrice: { fontFamily: F.black, fontSize: 26, color: L.ink, letterSpacing: -0.5 },
  per: { fontFamily: F.bold, fontSize: 14, color: L.muted },
  optNote: { fontFamily: F.semi, fontSize: 12, color: L.body },
  cta: { height: 56, borderRadius: 14, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 18,
    shadowColor: L.red, shadowOpacity: 0.32, shadowRadius: 18, shadowOffset: { width: 0, height: 10 }, elevation: 6 },
  ctaText: { fontFamily: F.black, fontSize: 17, color: '#fff', letterSpacing: -0.2 },
  heroArt: { alignItems: 'center', justifyContent: 'center', paddingTop: 34, paddingBottom: 40, minHeight: 420 },
  phone: { backgroundColor: '#0d1220', padding: 7, shadowColor: '#16203b', shadowOpacity: 0.28, shadowRadius: 30, shadowOffset: { width: 0, height: 20 }, elevation: 10,
    borderWidth: 1.5, borderColor: '#8a90a0' },
  phoneInner: { flex: 1, overflow: 'hidden', backgroundColor: '#fff' },
  island: { position: 'absolute', alignSelf: 'center', backgroundColor: '#0d1220' },
  chip: { borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8, shadowColor: '#16203b', shadowOpacity: 0.14, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 5 },
  chipText: { fontFamily: F.xbold, fontSize: 12.5 },
  floatChip: { position: 'absolute' },
  week: { backgroundColor: L.white, borderRadius: 20, borderWidth: 1.5, borderColor: L.line, padding: 18, gap: 6,
    shadowColor: '#16203b', shadowOpacity: 0.06, shadowRadius: 16, shadowOffset: { width: 0, height: 8 }, elevation: 2 },
  weekK: { fontFamily: F.xbold, fontSize: 11.5, letterSpacing: 1.2, textTransform: 'uppercase', color: L.muted },
  weekT: { fontFamily: F.black, fontSize: 22, color: L.ink, letterSpacing: -0.4 },
  state: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  stateText: { fontFamily: F.xbold, fontSize: 11 },
  feature: { gap: 22 },
  featureArt: { alignItems: 'center', justifyContent: 'center', paddingVertical: 34, borderRadius: 28, overflow: 'visible', minHeight: 300 },
  result: { flexDirection: 'row', gap: 14, backgroundColor: L.white, borderRadius: 18, padding: 10, borderWidth: 1, borderColor: L.line },
  rImg: { width: 66, height: 88, borderRadius: 10, backgroundColor: L.bg },
  rName: { fontFamily: F.black, fontSize: 16, color: L.ink },
  rWhat: { fontFamily: F.xbold, fontSize: 15, color: L.green },
  boonCard: { alignSelf: 'stretch', aspectRatio: 0.8, maxWidth: '100%', borderRadius: 24, overflow: 'hidden', backgroundColor: L.red,
    shadowColor: '#16203b', shadowOpacity: 0.2, shadowRadius: 24, shadowOffset: { width: 0, height: 14 }, elevation: 6 },
  boonShade: { position: 'absolute', left: 0, right: 0, bottom: 0, height: '38%' },
  boonCap: { position: 'absolute', left: 20, bottom: 18 },
  boonName: { fontFamily: F.black, fontSize: 20, color: '#fff' },
  boonSub: { fontFamily: F.semi, fontSize: 13, color: 'rgba(255,255,255,0.85)' },
  recap: { borderRadius: 28, padding: 26, gap: 18, alignItems: 'center' },
  tick: { width: 22, height: 22, borderRadius: 11, backgroundColor: L.green, alignItems: 'center', justifyContent: 'center' },
  tickMark: { fontFamily: F.black, fontSize: 12, color: '#fff' },
  faq: { backgroundColor: L.white, borderRadius: 16, borderWidth: 1.5, borderColor: L.line, paddingHorizontal: 18, paddingVertical: 16, gap: 10 },
  faqQ: { fontFamily: F.xbold, fontSize: 15.5, color: L.ink },
  faqPlus: { fontFamily: F.black, fontSize: 22, color: L.red, width: 20, textAlign: 'center' },
  faqA: { fontFamily: F.medium, fontSize: 14.5, lineHeight: 22, color: L.body },
  skip: { fontFamily: F.bold, fontSize: 14, color: L.ink, textDecorationLine: 'underline' },
  legal: { fontFamily: F.medium, fontSize: 11.5, lineHeight: 17, color: L.muted, textAlign: 'center', maxWidth: 560 },
  link: { fontFamily: F.bold, fontSize: 12.5, color: L.ink, textDecorationLine: 'underline' },
  sticky: { position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(255,255,255,0.97)', borderTopWidth: 1, borderTopColor: L.line,
    paddingTop: 12, paddingHorizontal: 20, shadowColor: '#16203b', shadowOpacity: 0.1, shadowRadius: 18, shadowOffset: { width: 0, height: -6 }, elevation: 12 },
  stickyT: { fontFamily: F.black, fontSize: 17, color: L.ink },
  stickyS: { fontFamily: F.semi, fontSize: 11.5, color: L.muted },
  stickyBtn: { height: 50, borderRadius: 13, overflow: 'hidden', paddingHorizontal: 22, alignItems: 'center', justifyContent: 'center' },
  stickyBtnText: { fontFamily: F.black, fontSize: 15.5, color: '#fff' },
});
