import React, { useCallback, useState } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useAuth } from '../../src/lib/auth';
import { supabase } from '../../src/lib/supabase';
import { C, F } from '../../src/lib/theme';
import { Button } from '../../src/components/ui';
import Screen from '../../src/components/Screen';
import FullHero from '../../src/components/FullHero';
import { WHATSAPP } from '../../src/components/NoPlan';
import { ChatIcon, CheckIcon, ForkIcon, SearchIcon, ShieldIcon, SparkIcon, TrendIcon, TrophyIcon } from '../../src/components/icons';
import { plain } from '../../src/lib/program';

const HERO = require('../../assets/hero/boon_full.jpg');
type Review = { id: string; week: number | null; body: string; created_at: string };

const wa = (text?: string) => Linking.openURL(`https://wa.me/${WHATSAPP}${text ? `?text=${encodeURIComponent(text)}` : ''}`);

const Badge = ({ children, tone = 'red' }: { children: React.ReactNode; tone?: 'red' | 'green' }) => (
  <View style={[st.badge, tone === 'green' && { backgroundColor: 'rgba(63,191,127,0.15)', borderColor: C.green }]}>{children}</View>
);

const PILLARS = [
  { n: '01', name: 'Strip', icon: <ShieldIcon color={C.red2} size={18} />, line: 'I audit your whole stack and cut what\'s wasting your money. No sponsors, so I have nothing to sell you.' },
  { n: '02', name: 'Stack', icon: <ForkIcon color={C.red2} />, line: 'Meals built from food you already love, a 4-day Push / Pull / Legs / Upper plan, and only the supplements that work.' },
  { n: '03', name: 'Six-Pack', icon: <TrendIcon color={C.red2} />, line: 'Every Sunday I read your check-in and change one thing at a time until the abs show.' },
];

export default function Boon() {
  const { session, profile, plan, signOut } = useAuth();
  const [reviews, setReviews] = useState<Review[]>([]);
  const name = plan?.name || profile?.first_name || '';

  useFocusEffect(useCallback(() => {
    if (!session) return;
    supabase.from('coach_reviews').select('id,week,body,created_at').eq('user_id', session.user.id)
      .order('created_at', { ascending: false }).limit(20)
      .then(({ data }) => setReviews((data as Review[]) || []));
  }, [session]));

  return (
    <Screen edgeToEdge header={
      <FullHero image={HERO} pills={[{ text: 'Your coach' }, { text: 'Replies within 24h', tone: 'green' }]}
        title="I've got you"
        lede={`${name ? `${name}, I` : 'I'} went from 225 to 175 lbs after years of wasting money on supplements that did nothing. Now I do for you what I wish someone did for me.`} />
    }>
      {/* Main action */}
      <Pressable accessibilityRole="button" onPress={() => wa()} style={({ pressed }) => [st.cta, pressed && { opacity: 0.9 }]}>
        <View style={st.ctaIcon}><ChatIcon color={C.white} size={22} /></View>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={st.ctaTitle}>Text me anytime</Text>
          <Text style={st.ctaSub}>Stuck, hungry, sore or not sure? Send it. I read and answer every message myself.</Text>
        </View>
      </Pressable>

      {/* The offer */}
      <View style={st.card}>
        <Text style={st.kicker}>Your 12 weeks with me</Text>
        <Text style={st.cardTitle}>Strip. Stack. Six-Pack.</Text>
        {PILLARS.map((p) => (
          <View key={p.n} style={st.pillar}>
            <Badge>{p.icon}</Badge>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={st.pillarName}><Text style={{ color: C.red2 }}>{p.n}  </Text>{p.name}</Text>
              <Text style={st.body}>{p.line}</Text>
            </View>
          </View>
        ))}
      </View>

      {/* Guarantee */}
      <View style={[st.card, { borderColor: C.green, backgroundColor: 'rgba(63,191,127,0.08)' }]}>
        <View style={st.row}>
          <Badge tone="green"><TrophyIcon color={C.green} /></Badge>
          <Text style={[st.cardTitle, { flex: 1 }]}>My promise to you</Text>
        </View>
        {!!plan?.goal_short && <Text style={st.goal}>{plain(plan.goal_short)}</Text>}
        <Text style={st.body}>Do your 12 Sunday check-ins, send your photos on photo weeks and hit your food 5 days out of 7. If you don't reach your goal, I keep coaching you for free for up to 12 more weeks until you do.</Text>
        {['12 Sunday check-ins', 'Photos on photo weeks', 'Food on point 5 of 7 days'].map((t) => (
          <View key={t} style={st.check}><View style={st.tick}><CheckIcon size={11} /></View><Text style={st.checkText}>{t}</Text></View>
        ))}
      </View>

      {/* Trend Shield */}
      <View style={st.card}>
        <View style={st.row}>
          <Badge><SearchIcon color={C.red2} /></Badge>
          <View style={{ flex: 1 }}>
            <Text style={st.kicker}>Trend Shield</Text>
            <Text style={st.cardTitle}>Saw something new?</Text>
          </View>
        </View>
        <Text style={st.body}>A new supplement, a viral trend, an ad that sounds too good. Send it before you buy it. You get my honest verdict within 24 hours. No sponsors, no affiliate links, ever.</Text>
        <Button title="Send me a product" variant="ghost" onPress={() => wa('Trend Shield: what do you think of this? ')} />
      </View>

      {/* Weekly reviews */}
      <Text style={st.section}>Your weekly reviews</Text>
      {reviews.length === 0 && (
        <View style={st.empty}>
          <Text style={st.body}>After your first Sunday check-in, my notes on your week land here: what's working, the one thing we change, and your focus for the next 7 days.</Text>
        </View>
      )}
      {reviews.map((r) => (
        <View key={r.id} style={st.review}>
          <View style={st.row}>
            <View style={st.wk}><Text style={st.wkText}>W{r.week ?? '–'}</Text></View>
            <Text style={[st.pillarName, { flex: 1 }]}>{r.week ? `Week ${r.week} review` : new Date(r.created_at).toLocaleDateString()}</Text>
          </View>
          <Text style={st.body}>{r.body}</Text>
        </View>
      ))}

      {/* Coming soon */}
      <View style={[st.card, { borderStyle: 'dashed' }]}>
        <View style={st.row}>
          <Badge><SparkIcon color={C.red2} /></Badge>
          <View style={{ flex: 1 }}>
            <Text style={st.kicker}>Coming soon</Text>
            <Text style={st.cardTitle}>Boon AI</Text>
          </View>
        </View>
        <Text style={st.body}>An AI coach trained on my rules and verdicts, so you can ask about any meal, product or workout at 2am and get my kind of answer. It will always be clearly labeled as AI. Real me stays your coach.</Text>
      </View>

      <Text style={st.fine}>
        Product names, logos and photos belong to their owners and are shown to identify the products Boon reviews. No sponsorships, no affiliate links. Not medical advice: check with your doctor before changing anything if you have a condition or take medication.
      </Text>
      <View style={{ gap: 8 }}>
        <Text style={st.fine}>Signed in as {profile?.email || session?.user.email}</Text>
        <Button title="Sign out" variant="ghost" onPress={signOut} />
      </View>
    </Screen>
  );
}

const st = StyleSheet.create({
  cta: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: C.red, borderRadius: 22, padding: 18 },
  ctaIcon: { width: 50, height: 50, borderRadius: 25, backgroundColor: 'rgba(13,27,51,0.3)', alignItems: 'center', justifyContent: 'center' },
  ctaTitle: { fontFamily: F.black, fontSize: 20, color: C.white },
  ctaSub: { fontFamily: F.semi, fontSize: 13, lineHeight: 18, color: C.white },
  card: { backgroundColor: C.navy2, borderWidth: 1, borderColor: C.line, borderRadius: 22, padding: 16, gap: 14 },
  kicker: { fontFamily: F.xbold, fontSize: 11, letterSpacing: 1.4, textTransform: 'uppercase', color: C.red2 },
  cardTitle: { fontFamily: F.black, fontSize: 20, color: C.white },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  badge: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(226,67,59,0.14)', borderWidth: 1, borderColor: 'rgba(226,67,59,0.45)', alignItems: 'center', justifyContent: 'center' },
  pillar: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  pillarName: { fontFamily: F.black, fontSize: 16, color: C.white, textTransform: 'uppercase', letterSpacing: 0.4 },
  body: { fontFamily: F.semi, fontSize: 14, lineHeight: 20, color: C.white },
  goal: { fontFamily: F.black, fontSize: 18, lineHeight: 23, color: C.green, textTransform: 'uppercase' },
  check: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  tick: { width: 20, height: 20, borderRadius: 10, backgroundColor: C.green, alignItems: 'center', justifyContent: 'center' },
  checkText: { fontFamily: F.xbold, fontSize: 14, color: C.white },
  section: { fontFamily: F.black, fontSize: 21, color: C.white, marginTop: 4 },
  empty: { backgroundColor: C.navy2, borderWidth: 1, borderColor: C.line, borderRadius: 18, padding: 16 },
  review: { backgroundColor: C.navy2, borderWidth: 1, borderColor: C.line, borderRadius: 18, padding: 16, gap: 10 },
  wk: { width: 36, height: 36, borderRadius: 18, backgroundColor: C.red, alignItems: 'center', justifyContent: 'center' },
  wkText: { fontFamily: F.black, fontSize: 12, color: C.white },
  fine: { fontFamily: F.medium, fontSize: 11, lineHeight: 16, color: C.white, marginTop: 4 },
});
