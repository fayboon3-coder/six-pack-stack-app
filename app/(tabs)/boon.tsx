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

const HERO_IMG = require('../../assets/hero/boon.jpg');

type Review = { id: string; week: number | null; body: string; created_at: string };

export default function Boon() {
  const { session, profile, signOut } = useAuth();
  const [reviews, setReviews] = useState<Review[]>([]);

  useFocusEffect(useCallback(() => {
    if (!session) return;
    supabase.from('coach_reviews').select('id,week,body,created_at').eq('user_id', session.user.id)
      .order('created_at', { ascending: false }).limit(20)
      .then(({ data }) => setReviews((data as Review[]) || []));
  }, [session]));

  return (
    <Screen header={
      <View style={{ gap: 18 }}>
        <PageHeader kicker="Your coach" title="Boon" subtitle="225 to 175 lbs. No sponsors, no affiliate links. Just what works." right={<View />} />
        <HeroCard image={HERO_IMG} badge="Your coach" title="Ask me anything"
          subtitle="Stuck, hungry, sore or not sure? Text me. I answer every message myself." cta="Text Boon on WhatsApp"
          onPress={() => Linking.openURL(`https://wa.me/${WHATSAPP}`)} />
      </View>
    }>

      <Eyebrow>Your weekly reviews</Eyebrow>
      {reviews.length === 0 && <Body>After your first Sunday check-in, my review for your week shows up here.</Body>}
      {reviews.map((r) => (
        <Card key={r.id}>
          <Text style={ui.label}>{r.week ? `Week ${r.week}` : new Date(r.created_at).toLocaleDateString()}</Text>
          <Body>{r.body}</Body>
        </Card>
      ))}

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
