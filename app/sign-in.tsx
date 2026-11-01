import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Linking from 'expo-linking';
import { supabase } from '../src/lib/supabase';
import { C, F } from '../src/lib/theme';
import { Button, Eyebrow, H1 } from '../src/components/ui';

export default function SignIn() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const send = async () => {
    setErr('');
    const e = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) return setErr('Enter a valid email.');
    setBusy(true);
    const { error } = await supabase.auth.signInWithOtp({
      email: e,
      options: { shouldCreateUser: true, emailRedirectTo: Linking.createURL('auth') },
    });
    setBusy(false);
    if (error) return setErr(error.message.includes('rate') ? 'Too many tries. Wait a few minutes, then send again.' : error.message);
    setSent(true);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.navy }}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={st.wrap}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <View style={st.dot} />
          <Text style={st.brand}>Six-Pack Stack</Text>
        </View>
        <View style={{ gap: 10, marginTop: 40 }}>
          <Eyebrow>{sent ? 'Check your email' : 'Welcome'}</Eyebrow>
          <H1 style={{ fontSize: 34, textTransform: 'uppercase', lineHeight: 36 }}>
            {sent ? 'Tap the link we sent you.' : 'Sign in to your plan.'}
          </H1>
          <Text style={st.sub}>
            {sent
              ? `We sent a sign-in link to ${email.trim()}. Open it on this phone and you're in. Check spam if you don't see it.`
              : 'Use the email you signed up with. We\'ll email you a sign-in link. No password needed.'}
          </Text>
        </View>
        <View style={{ gap: 12, marginTop: 28 }}>
          {!sent ? (
            <>
              <Text style={st.label} nativeID="emailLabel">Email</Text>
              <TextInput
                accessibilityLabelledBy="emailLabel"
                value={email} onChangeText={setEmail} autoCapitalize="none" autoComplete="email"
                keyboardType="email-address" textContentType="emailAddress" placeholder="you@email.com"
                placeholderTextColor="#ffffff99" style={st.input} returnKeyType="send" onSubmitEditing={send}
              />
              <Button title="Email me a sign-in link" onPress={send} loading={busy} />
            </>
          ) : (
            <>
              <Button title="Send it again" variant="ghost" onPress={send} loading={busy} />
              <Button title="Use a different email" variant="ghost" onPress={() => setSent(false)} />
            </>
          )}
          {!!err && <Text style={st.err} accessibilityLiveRegion="polite">{err}</Text>}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const st = StyleSheet.create({
  wrap: { flex: 1, paddingHorizontal: 22, paddingTop: 24 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: C.red },
  brand: { fontFamily: F.xbold, fontSize: 12, letterSpacing: 2, textTransform: 'uppercase', color: C.white },
  sub: { fontFamily: F.semi, fontSize: 15, lineHeight: 22, color: C.white },
  label: { fontFamily: F.xbold, fontSize: 12, letterSpacing: 1.4, textTransform: 'uppercase', color: C.white },
  input: { height: 56, borderRadius: 14, backgroundColor: C.navy2, borderWidth: 1, borderColor: C.line, color: C.white, fontFamily: F.semi, fontSize: 17, paddingHorizontal: 16 },
  err: { fontFamily: F.bold, fontSize: 14, color: C.red2 },
});
