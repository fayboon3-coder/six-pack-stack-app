import React, { useEffect, useState } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import {
  useFonts, Montserrat_500Medium, Montserrat_600SemiBold, Montserrat_700Bold,
  Montserrat_800ExtraBold, Montserrat_900Black,
} from '@expo-google-fonts/montserrat';
import { AuthProvider, useAuth } from '../src/lib/auth';
import { C } from '../src/lib/theme';
import Splash from '../src/components/Splash';

function Gate() {
  const { session, loading, profile } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    const seg = segments[0] as string | undefined;
    const open = ['sign-in', 'auth', 'welcome', 'quiz', 'lead', 'btl', 'apply', 'stack-check', 'verdict'].includes(seg || '');
    if (!session && !open) router.replace('/welcome');
    if (session && (seg === 'sign-in' || (seg === 'welcome' && profile?.role !== 'coach'))) router.replace('/');
  }, [session, loading, segments, router, profile]);

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: C.navy, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={C.red} />
      </View>
    );
  }
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: C.navy } }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="welcome" />
      <Stack.Screen name="lead" />
      <Stack.Screen name="btl" />
      <Stack.Screen name="quiz" options={{ gestureEnabled: false }} />
      <Stack.Screen name="ready" options={{ gestureEnabled: false }} />
      <Stack.Screen name="apply" options={{ presentation: 'modal' }} />
      <Stack.Screen name="unlock" options={{ presentation: 'modal' }} />
      <Stack.Screen name="stack-check" />
      <Stack.Screen name="verdict/[id]" />
      <Stack.Screen name="sign-in" />
      <Stack.Screen name="auth" />
      <Stack.Screen name="checkin" options={{ presentation: 'modal' }} />
      <Stack.Screen name="workout" />
      <Stack.Screen name="client/[id]" />
    </Stack>
  );
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Montserrat_500Medium, Montserrat_600SemiBold, Montserrat_700Bold, Montserrat_800ExtraBold, Montserrat_900Black,
  });
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <StatusBar style="light" />
        <View style={{ flex: 1, backgroundColor: C.navy }}>
          {fontsLoaded && <Gate />}
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
