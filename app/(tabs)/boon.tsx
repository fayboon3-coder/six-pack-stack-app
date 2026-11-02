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
import { isFree } from '../../src/lib/access';
import { BtlCard, CoachingCard, SubscriptionCard } from '../../src/components/Offers';

const HERO_IMG = require('../../assets/hero/boon.jpg');
const FACE_IMG = require('../../assets/hero/boon_full.jpg');

type Review = { id: string; week: number | null; body: string; created_at: string };

export default function Boon() {
  const { session, profile, signOut } = useAuth();
  const [reviews, setReviews] = useState<Review[]>([]);
  const router = useRouter();
  const free = isFree(profile);

  useFocusEffect(useCallback(() => {
    if (!session) return;
    supabase.from('coach_reviews').select('id,week,body,created_at').eq('user_id', session.user.id)
      .order('created_at', { ascending: false }).limit(20)
      .then(({ data }) => setReviews((data as Review[]) || []));
  }, [session]));

  return (
    <Screen header={
      <View style={{ gap: 18 }}>
        <PageHeader kicker="Your coach" title="Boon" subtitle="I went from 225 to 175 lbs after wasting years on supplements that did nothing. Now I do for you what I wish someone did for me." right={<View />} />
        {free ? (
          <HeroCard image={FACE_IMG} imageRatio={1200 / 640} badge="1:1 coaching" title="Want me in your corner?"
            subtitle="I audit your supplements, build your plan around your life, review your check-in every Sunday and answer you on WhatsApp." cta="Apply for coaching"
            onPress={() => router.push('/apply')} />
        ) : (
          <HeroCard image={HERO_IMG} badge="Replies within 24 hours" title="I've got you"
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

      <Text style={[st.sub, { fontFamily: 'Montserrat_500Medium', lineHeight: 16, marginTop: 16 }]}>
        Product names, logos and photos belong to their owners and are shown to identify the products Boon reviews. No sponsorships, no affiliate links. Not medical advice: check with your doctor before changing anything if you have a condition or take medication.
      </Text>
      <View style={{ marginTop: 8, gap: 8 }}>
        <Text style={st.sub}>Signed in as {profile?.email || session?.user.email}</Text>
        <Button title="Sign out" variant="ghost" onPress={signOut} />
      </View>
    </Screen>
  );
}

const st = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 8 },
  avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: C.red, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontFamily: F.black, fontSize: 20, color: C.white },
  sub: { fontFamily: F.bold, fontSize: 12, color: C.white },
});
