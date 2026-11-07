import React, { useEffect, useRef, useState } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';
import LoadingScreen from '../src/components/LoadingScreen';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import {
  useFonts, Inter_500Medium, Inter_600SemiBold, Inter_700Bold,
  Inter_800ExtraBold, Inter_900Black,
} from '@expo-google-fonts/inter';
import { AuthProvider, useAuth } from '../src/lib/auth';
import { C } from '../src/lib/theme';
import Splash from '../src/components/Splash';
import PreviewBar from '../src/components/PreviewBar';
import { track } from '../src/lib/track';

function Gate() {
  const { session, loading, profile } = useAuth();
  useEffect(() => { track('app_open', {}, { once: true }); }, []);
  const segments = useSegments();
  const router = useRouter();
  const landed = useRef(false);

  useEffect(() => {
    if (loading) return;
    const seg = segments[0] as string | undefined;
    const open = ['sign-in', 'auth', 'welcome', 'quiz', 'lead', 'btl', 'apply', 'coaching', 'stack-check', 'verdict'].includes(seg || '');
    if (!session && !open) router.replace('/welcome');
    if (session && (seg === 'sign-in' || (seg === 'welcome' && profile?.role !== 'coach'))) router.replace('/');
    // 1:1 coaching clients open on their coach home (once per launch).
    if (session && profile && !landed.current) {
      landed.current = true;
      const sub = (segments as string[])[1];
      const home = seg === '(tabs)' && (!sub || sub === 'index');
      if (home && profile.role === 'client' && profile.tier === 'coached') router.replace('/corner');
    }
  }, [session, loading, segments, router, profile]);

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: C.bg }}>
        <LoadingScreen title="Loading your| plan" />
      </View>
    );
  }
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: C.bg } }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="welcome" />
      <Stack.Screen name="lead" />
      <Stack.Screen name="btl" />
      <Stack.Screen name="quiz" options={{ gestureEnabled: false }} />
      <Stack.Screen name="ready" options={{ gestureEnabled: false }} />
      <Stack.Screen name="apply" options={{ presentation: 'modal' }} />
      <Stack.Screen name="coaching" />
      <Stack.Screen name="unlock" options={{ presentation: 'modal' }} />
      <Stack.Screen name="stack-check" />
      <Stack.Screen name="verdict/[id]" />
      <Stack.Screen name="sign-in" />
      <Stack.Screen name="auth" />
      <Stack.Screen name="checkin" options={{ presentation: 'modal' }} />
      <Stack.Screen name="day" />
      <Stack.Screen name="plan-details" />
      <Stack.Screen name="workout" />
      <Stack.Screen name="ask" />
      <Stack.Screen name="foods" />
      <Stack.Screen name="training" />
      <Stack.Screen name="trial" options={{ gestureEnabled: false }} />
      <Stack.Screen name="delete-account" options={{ presentation: 'modal' }} />
      <Stack.Screen name="client/[id]" />
      <Stack.Screen name="weigh-in" options={{ presentation: 'modal' }} />
      <Stack.Screen name="photos" />
      <Stack.Screen name="recap" />
      <Stack.Screen name="log-food" />
      <Stack.Screen name="scan" />
    </Stack>
  );
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Inter_500Medium, Inter_600SemiBold, Inter_700Bold, Inter_800ExtraBold, Inter_900Black,
  });
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <StatusBar style="light" />
        <View style={{ flex: 1, backgroundColor: C.bg }}>
          {fontsLoaded && <Gate />}
          {fontsLoaded && <PreviewBar />}
          <Intro fontsLoaded={fontsLoaded} />
        </View>
      </AuthProvider>
    </SafeAreaProvider>
  );
}

/** The opening animation plays on every launch while fonts and the account load. */
function Intro({ fontsLoaded }: { fontsLoaded: boolean }) {
  const { loading } = useAuth();
  const [done, setDone] = useState(false);
  if (done) return null;
  return <Splash ready={fontsLoaded && !loading} onDone={() => setDone(true)} />;
}
