import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { C, F } from '../lib/theme';
import { BTL_URL, COACHING_URL, PRIVACY_URL, TERMS_URL } from '../lib/access';
import { useAuth } from '../lib/auth';
import { track } from '../lib/track';
import { buy, FALLBACK_PRICES, getOffers, purchasesEnabled, restore, type Offer } from '../lib/purchases';
import { CheckIcon, LockIcon } from './icons';

const BTL_IMG = require('../../assets/img/btl_cover.jpg');
const PROGRAM_IMG = require('../../assets/img/cover_program.jpg');
const COACH_IMG = require('../../assets/img/cover_coaching.jpg');
const Cover = ({ src }: { src: any }) => (
  <Image source={src} style={{ width: 132, height: 171, borderRadius: 6, alignSelf: 'center' }} resizeMode="cover" accessibilityIgnoresInvertColors />
);

const Tick = ({ children }: { children: string }) => (
  <View style={st.tick}>
    <View style={st.tickDot}><CheckIcon size={11} /></View>
    <Text style={st.tickText}>{children}</Text>
  </View>
);

/** The full app (subscription): yearly with a 7-day free trial, or monthly. Sold through the App Store. */
export function SubscriptionCard({ source = 'other' }: { source?: string }) {
  const { refresh } = useAuth();
  const [plan, setPlan] = useState<'yearly' | 'monthly'>('yearly');
  const [offers, setOffers] = useState<Record<'yearly' | 'monthly', Offer> | null>(null);
  const [busy, setBusy] = useState<'' | 'buy' | 'restore'>('');
  const [msg, setMsg] = useState('');
  const live = purchasesEnabled();
  useEffect(() => { if (live) getOffers().then(setOffers); }, [live]);
  useEffect(() => { track('paywall_view', { source, live }, { once: true }); }, [source]);
  const price = (id: 'yearly' | 'monthly') => offers?.[id].price || FALLBACK_PRICES[id];

  const start = async () => {
    if (!offers) return;
    setBusy('buy'); setMsg('');
    track('purchase_tap', { plan, source });
    const r = await buy(offers[plan]);
    track(r.ok ? 'purchase_done' : 'purchase_fail', { plan, source, reason: r.ok ? null : r.reason });
    if (r.ok) { await refresh(); setMsg("You're in. Weeks 3–12 are unlocked."); }
    else if (r.reason === 'unavailable') setMsg('The App Store is not responding. Try again in a minute.');
    else if (r.reason === 'failed') setMsg('That didn’t go through. You haven’t been charged.');
    setBusy('');
  };
  const doRestore = async () => {
    setBusy('restore'); setMsg('');
    const found = await restore();
    if (found) await refresh();
    setMsg(found ? 'Restored. Weeks 3–12 are unlocked.' : 'No active subscription found on this Apple ID.');
    setBusy('');
  };

  const Opt = ({ id, title, per, note, best }: { id: 'yearly' | 'monthly'; title: string; per: string; note: string; best?: boolean }) => {
    const on = plan === id;
    return (
      <Pressable accessibilityRole="radio" accessibilityState={{ selected: on }} onPress={() => setPlan(id)} style={[st.opt, on && st.optOn]}>
        {best && <View style={st.best}><Text style={st.bestText}>Best value</Text></View>}
        <Text style={st.optTitle}>{title}</Text>
        <Text style={st.optPrice}>{price(id)}<Text style={st.per}>{per}</Text></Text>
        <Text style={st.small}>{note}</Text>
      </Pressable>
    );
  };
  const label = !live ? 'Opens with the App Store launch'
    : busy === 'buy' ? 'One second…'
    : plan === 'yearly' ? 'Start 7-day free trial' : 'Start monthly';
  return (
    <View style={[st.card, { borderColor: C.red }]}>
      <Cover src={PROGRAM_IMG} />
      <Text style={st.kicker}>All 12 weeks</Text>
      <Text style={st.title}>The Full Stack</Text>
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <Opt id="yearly" title="Yearly" per="/yr" note="$1.90 a week · 7-day free trial" best />
        <Opt id="monthly" title="Monthly" per="/mo" note="Cancel anytime" />
      </View>
      <View style={{ gap: 8 }}>
        <Tick>Weeks 3–12: the Stack and Six-Pack phases, where your body changes</Tick>
        <Tick>Calories re-set at weeks 4 and 8 so your progress keeps moving</Tick>
        <Tick>Your meal plan, swaps, eating-out orders and grocery list</Tick>
        <Tick>Stack Check: all 47 Beyond the Label verdicts ($39.99 on its own)</Tick>
        <Tick>Weekly check-ins, progress photos, streaks and personal-record alerts</Tick>
      </View>
      <Text style={[st.small, { fontFamily: F.black }]}>Less than one tub of pre-workout a month.</Text>
      <Pressable accessibilityRole="button" onPress={start} disabled={!live || !offers || !!busy} style={[st.btn, (!live || !offers || !!busy) && { opacity: 0.55 }]}>
        {busy === 'buy' ? <ActivityIndicator color={C.white} /> : <Text style={st.btnText}>{label}</Text>}
      </Pressable>
      {!!msg && <Text style={[st.small, { fontFamily: F.bold }]}>{msg}</Text>}
      {live && (
        <>
          <Text style={st.legal}>
            {plan === 'yearly'
              ? `Free for 7 days, then ${price('yearly')} a year.`
              : `${price('monthly')} a month.`}{' '}
            Payment is charged to your Apple ID. Your subscription renews automatically unless you cancel at least 24 hours before the end of the current period. Manage or cancel any time in your App Store settings.
          </Text>
          <View style={st.links}>
            <Pressable accessibilityRole="button" onPress={doRestore} disabled={!!busy} hitSlop={8}><Text style={st.link}>{busy === 'restore' ? 'Restoring…' : 'Restore purchases'}</Text></Pressable>
            <Pressable accessibilityRole="link" onPress={() => Linking.openURL(TERMS_URL)} hitSlop={8}><Text style={st.link}>Terms</Text></Pressable>
            <Pressable accessibilityRole="link" onPress={() => Linking.openURL(PRIVACY_URL)} hitSlop={8}><Text style={st.link}>Privacy</Text></Pressable>
          </View>
        </>
      )}
    </View>
  );
}

export function CoachingCard() {
  const router = useRouter();
  return (
    <View style={st.card}>
      <Cover src={COACH_IMG} />
      <Text style={st.kicker}>1:1 with Boon</Text>
      <Text style={st.title}>Six-Pack Stack Coaching</Text>
      <Text style={st.body}>I audit your supplements, build your plan around your life, review your check-in every Sunday and answer you on WhatsApp. 12 weeks, with a results guarantee.</Text>
      <Pressable accessibilityRole="button" onPress={() => Linking.openURL(COACHING_URL)} style={st.btn}>
        <Text style={st.btnText}>See how coaching works</Text>
      </Pressable>
      <Text style={st.small}>The Abs or It's Free guarantee is on the page.</Text>
    </View>
  );
}

export function BtlCard() {
  return (
    <View style={st.card}>
      <Cover src={BTL_IMG} />
      <View style={{ gap: 10 }}>
        <Text style={st.kicker}>Beyond the Label · $39.99</Text>
        <Text style={st.title}>What actually works, and what's marketing</Text>
        <Text style={st.body}>My full investigation of 47 supplements and gadgets. Check anything before you buy it.</Text>
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
      <Text style={st.title}>Your Free Stack is done.</Text>
      <Text style={st.body}>Don't stop now. The next 10 weeks are where the results show. Unlock the rest of your plan to keep going.</Text>
      <View style={st.btn}><Text style={st.btnText}>Unlock weeks 3–12</Text></View>
    </Pressable>
  );
}

const st = StyleSheet.create({
  opt: { flex: 1, borderWidth: 1.5, borderColor: C.line, borderRadius: 16, padding: 12, gap: 2, backgroundColor: C.navy },
  optOn: { borderColor: C.red, backgroundColor: 'rgba(226,67,59,0.12)' },
  optTitle: { fontFamily: F.xbold, fontSize: 12, letterSpacing: 1.2, textTransform: 'uppercase', color: C.white },
  optPrice: { fontFamily: F.black, fontSize: 26, color: C.white },
  best: { position: 'absolute', top: -10, right: 8, backgroundColor: C.green, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 },
  bestText: { fontFamily: F.black, fontSize: 9, letterSpacing: 0.8, textTransform: 'uppercase', color: C.navy },
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
  legal: { fontFamily: F.semi, fontSize: 11, lineHeight: 16, color: 'rgba(255,255,255,0.6)', textAlign: 'center' },
  links: { flexDirection: 'row', justifyContent: 'center', gap: 22 },
  link: { fontFamily: F.bold, fontSize: 12, color: C.white, textDecorationLine: 'underline' },
  btnText: { fontFamily: F.black, fontSize: 15, letterSpacing: 0.6, textTransform: 'uppercase', color: C.white, textAlign: 'center' },
  locked: { marginHorizontal: 20, backgroundColor: C.navy2, borderWidth: 1.5, borderColor: C.red, borderRadius: 24, padding: 20, gap: 10 },
  lockIcon: { width: 48, height: 48, borderRadius: 24, backgroundColor: C.red, alignItems: 'center', justifyContent: 'center' },
});
