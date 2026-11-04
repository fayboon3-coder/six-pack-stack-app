import React, { useEffect } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../src/lib/auth';
import { C, F } from '../src/lib/theme';
import Backdrop from '../src/components/Backdrop';
import { twoTone } from '../src/components/TwoTone';
import { SubscriptionCard } from '../src/components/Offers';
import { isFree } from '../src/lib/access';
import { track } from '../src/lib/track';

import { TRIAL_SEEN } from '../src/lib/purchases';

/**
 * Shown once, right after "your plan is ready": the moment people are most excited.
 * One clear offer (all 12 weeks, 7 days free) and an easy way to keep the free 2 weeks.
 */
export default function TrialOffer() {
  const router = useRouter();
  const { plan, profile } = useAuth();
  useEffect(() => { AsyncStorage.setItem(TRIAL_SEEN, '1').catch(() => {}); }, []);
  const done = (how: 'skip' | 'after') => { if (how === 'skip') track('trial_offer_skip'); router.replace('/'); };

  // Already paid (e.g. they subscribed from this screen): straight in.
  useEffect(() => { if (profile && !isFree(profile)) router.replace('/'); }, [profile?.tier]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }}>
      <Backdrop />
      <ScrollView contentContainerStyle={{ padding: 20, gap: 16, paddingBottom: 40 }}>
        <Text style={st.k}>{plan?.name ? `${plan.name}, your plan is ready` : 'Your plan is ready'}</Text>
        <Text style={st.h}>{twoTone('Get all 12 weeks.| Free for 7 days.')}</Text>
        <Text style={st.body}>Weeks 1–2 build the habits. Weeks 3–12 are where your body changes: your calories re-set as you lose, the training gets heavier and the photos start to look different.</Text>
        <View style={st.points}>
          {['Cancel any time in the first 7 days and pay nothing', 'All 47 product verdicts and Stack, your AI coach', 'Meals rebuilt any time from the foods you like'].map((t) => (
            <View key={t} style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start' }}>
              <Text style={st.dot}>✓</Text><Text style={[st.body, { flex: 1, fontSize: 14 }]}>{t}</Text>
            </View>
          ))}
        </View>
        <SubscriptionCard source="after_plan" />
        <Pressable accessibilityRole="button" onPress={() => done('skip')} hitSlop={8} style={st.skip}>
          <Text style={st.skipText}>Not now, start my free 2 weeks</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const st = StyleSheet.create({
  k: { fontFamily: F.xbold, fontSize: 12, letterSpacing: 1.6, textTransform: 'uppercase', color: C.red },
  h: { fontFamily: F.black, fontSize: 32, lineHeight: 36, color: C.ink, textTransform: 'uppercase', letterSpacing: -0.5 },
  body: { fontFamily: F.semi, fontSize: 15, lineHeight: 22, color: C.ink },
  points: { gap: 8, borderRadius: 18, borderWidth: 1.5, borderColor: C.line, backgroundColor: 'rgba(20,38,69,0.6)', padding: 16 },
  dot: { fontFamily: F.black, fontSize: 15, color: C.green },
  skip: { minHeight: 48, alignItems: 'center', justifyContent: 'center' },
  skipText: { fontFamily: F.bold, fontSize: 14, color: C.ink, textDecorationLine: 'underline' },
});
