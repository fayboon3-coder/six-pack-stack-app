import React, { useCallback, useState } from 'react';
import { Linking, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useAuth } from '../../src/lib/auth';
import { supabase } from '../../src/lib/supabase';
import { C, F } from '../../src/lib/theme';
import { Body, Button, Card, Eyebrow, H1, s as ui } from '../../src/components/ui';
import Screen from '../../src/components/Screen';
import { WHATSAPP } from '../../src/components/NoPlan';
import PageHeader from '../../src/components/PageHeader';
import HeroCard from '../../src/components/HeroCard';
import { useRouter } from 'expo-router';
import { COACHING_URL, isCoached, isFree, PRIVACY_URL, TERMS_URL } from '../../src/lib/access';
import { BtlCard, CoachingCard, SubscriptionCard } from '../../src/components/Offers';
import RemindersCard from '../../src/components/RemindersCard';
import AskBoonCard from '../../src/components/AskBoonCard';

const FACE_IMG = require('../../assets/hero/boon_wide.jpg');

type Review = { id: string; week: number | null; body: string; created_at: string };

export default function Boon() {
  const { session, profile, signOut } = useAuth();
  const [reviews, setReviews] = useState<Review[]>([]);
  const router = useRouter();
  const free = isFree(profile);
  const coached = isCoached(profile) || profile?.role === 'coach';
  const sub = !free && !coached; // The Full Stack subscriber

  useFocusEffect(useCallback(() => {
    if (!session) return;
    supabase.from('coach_reviews').select('id,week,body,created_at').eq('user_id', session.user.id)
      .order('created_at', { ascending: false }).limit(20)
      .then(({ data }) => setReviews((data as Review[]) || []));
  }, [session]));

  return (
    <Screen header={
      <View style={{ gap: 18 }}>
        <PageHeader kicker="Your coach" title="Meet| Boon" subtitle="I went from 225 to 175 lbs after wasting years on supplements that did nothing. Now I do for you what I wish someone did for me." right={<View />} />
        <AskBoonCard title="Ask Stack anything, any time." sub="Stack, our AI, knows your plan, your numbers and every product I've investigated. Answers in seconds." />
        {free || sub ? (
          <HeroCard image={FACE_IMG} imageRatio={16 / 9} title="Want me in your corner?"
            subtitle={sub
              ? "You've got The Full Stack. If you want me reviewing your check-ins every Sunday and answering you on WhatsApp, you get $100 off coaching. Mention it in your application."
              : "I audit your supplements, build your plan around your life, review your check-in every Sunday and answer you on WhatsApp."}
            cta="See how coaching works" onPress={() => Linking.openURL(COACHING_URL)} />
        ) : (
          <HeroCard image={FACE_IMG} imageRatio={16 / 9} badge="Replies within 24 hours" title="I've got you"
            subtitle="Stuck, hungry, sore, or staring at a supplement you saw online? Send it. I read and answer every message myself." cta="Text Boon on WhatsApp"
            onPress={() => Linking.openURL(`https://wa.me/${WHATSAPP}`)} />
        )}
      </View>
    }>

      {free ? (
        <>
          <Eyebrow>Your options</Eyebrow>
          <SubscriptionCard />
          <BtlCard />
        </>
      ) : sub ? (
        <>
          <Eyebrow>Your program</Eyebrow>
          <Card>
            <Text style={ui.label}>The Full Stack</Text>
            <Body>All 12 weeks are unlocked: your training, your meal plan, eating-out orders, the grocery list and every Stack Check verdict. Your calories re-set at weeks 4 and 8, so do your Sunday check-in.</Body>
          </Card>
          <CoachingCard />
        </>
      ) : (<>
      <Eyebrow>Your weekly reviews</Eyebrow>
      {reviews.length === 0 && <Body>After your first Sunday check-in, my notes on your week land here: what's working, the one thing we change, and your focus for the next 7 days.</Body>}
      {reviews.map((r) => (
        <Card key={r.id}>
          <Text style={ui.label}>{r.week ? `Week ${r.week}` : new Date(r.created_at).toLocaleDateString()}</Text>
          <Body>{r.body}</Body>
        </Card>
      ))}
      </>)}

      <Eyebrow style={{ marginTop: 12 }}>Settings</Eyebrow>
      <RemindersCard />

      <Text style={[st.sub, { fontFamily: 'Montserrat_500Medium', lineHeight: 16, marginTop: 16 }]}>
        Product names, logos and photos belong to their owners and are shown to identify the products Boon reviews. No sponsorships, no affiliate links. Not medical advice: check with your doctor before changing anything if you have a condition or take medication.
      </Text>
      <View style={{ marginTop: 8, gap: 8 }}>
        <Text style={st.sub}>Signed in as {profile?.email || session?.user.email}</Text>
        <Button title="Sign out" variant="ghost" onPress={signOut} />
        <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 18, flexWrap: 'wrap', marginTop: 4 }}>
          <Text accessibilityRole="link" onPress={() => Linking.openURL(TERMS_URL)} style={st.legal}>Terms</Text>
          <Text accessibilityRole="link" onPress={() => Linking.openURL(PRIVACY_URL)} style={st.legal}>Privacy</Text>
          {profile?.role !== 'coach' && <Text accessibilityRole="link" onPress={() => router.push('/delete-account')} style={st.legal}>Delete my account</Text>}
        </View>
      </View>
    </Screen>
  );
}

const st = StyleSheet.create({
  legal: { fontFamily: F.bold, fontSize: 13, color: C.white, textDecorationLine: 'underline', paddingVertical: 6 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 8 },
  avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: C.red, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontFamily: F.black, fontSize: 20, color: C.white },
  sub: { fontFamily: F.bold, fontSize: 12, color: C.white },
});
