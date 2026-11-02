import React, { useEffect } from 'react';
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

function Gate() {
  const { session, loading, profile } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    const seg = segments[0] as string | undefined;
    const open = ['sign-in', 'auth', 'welcome', 'quiz'].includes(seg || '');
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
  if (!fontsLoaded) return <View style={{ flex: 1, backgroundColor: C.navy }} />;
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <StatusBar style="light" />
        <Gate />
      </AuthProvider>
    </SafeAreaProvider>
  );
}
