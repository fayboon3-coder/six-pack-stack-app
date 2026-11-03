import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth } from '../src/lib/auth';
import { C, F } from '../src/lib/theme';
import { BackIcon } from '../src/components/icons';
import { CoachingCard, SubscriptionCard } from '../src/components/Offers';
import { coachingFirst } from '../src/lib/access';
import Backdrop from '../src/components/Backdrop';
import { twoTone } from '../src/components/TwoTone';

/** The offers screen: The Full Stack (App Store subscription) and coaching. */
export default function Unlock() {
  const { profile, plan } = useAuth();
  const router = useRouter();
  const hot = coachingFirst(profile);
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.navy }}>
      <Backdrop />
      <ScrollView contentContainerStyle={{ padding: 20, gap: 16, paddingBottom: 48 }}>
        <Pressable accessibilityRole="button" accessibilityLabel="Close" onPress={() => router.back()} hitSlop={10} style={{ width: 40, height: 40, justifyContent: 'center' }}>
          <BackIcon />
        </Pressable>
        <Text style={st.k}>Keep going{plan?.name ? `, ${plan.name}` : ''}</Text>
        <Text style={st.h}>{twoTone('Finish what| you started.')}</Text>
        <Text style={st.body}>Weeks 1–2 build the habits. Weeks 3 to 12 are where your body changes. Pick how you want to get there.</Text>
        {hot && <CoachingCard />}
        <SubscriptionCard source="unlock" />
        {!hot && <CoachingCard />}
      </ScrollView>
    </SafeAreaView>
  );
}

const st = StyleSheet.create({
  k: { fontFamily: F.xbold, fontSize: 12, letterSpacing: 1.6, textTransform: 'uppercase', color: C.red2 },
  h: { fontFamily: F.black, fontSize: 32, lineHeight: 36, color: C.white, textTransform: 'uppercase', letterSpacing: -0.5 },
  body: { fontFamily: F.semi, fontSize: 15, lineHeight: 22, color: C.white },
});
