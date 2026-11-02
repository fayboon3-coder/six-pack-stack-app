import React, { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import LoadingScreen from '../src/components/LoadingScreen';
import Backdrop from '../src/components/Backdrop';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { supabase } from '../src/lib/supabase';
import { C, F } from '../src/lib/theme';
import { Button } from '../src/components/ui';

/** Opened by the sign-in link in the email: finishes signing in. */
export default function AuthCallback() {
  const { code, error_description } = useLocalSearchParams<{ code?: string; error_description?: string }>();
  const router = useRouter();
  const [err, setErr] = useState(error_description || '');

  useEffect(() => {
    if (!code) return;
    supabase.auth.exchangeCodeForSession(String(code)).then(({ error }) => {
      if (error) setErr('That link expired or was already used. Send a new one.');
      else router.replace('/');
    });
  }, [code, router]);

  if (!err) return <View style={{ flex: 1, backgroundColor: C.navy }}><LoadingScreen title="Signing you| in" sub="One second. Your plan is on its way." /></View>;
  return (
    <View style={{ flex: 1, backgroundColor: C.navy, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 16 }}>
      <Backdrop />
      {err ? (
        <>
          <Text style={{ fontFamily: F.bold, fontSize: 16, color: C.white, textAlign: 'center' }}>{err}</Text>
          <Button title="Back to sign in" onPress={() => router.replace('/sign-in')} style={{ alignSelf: 'stretch' }} />
        </>
      ) : null}
    </View>
  );
}
