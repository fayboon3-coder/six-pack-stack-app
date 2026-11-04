import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { supabase } from '../src/lib/supabase';
import { C, F } from '../src/lib/theme';
import { Button, Eyebrow, H1 } from '../src/components/ui';
import Backdrop from '../src/components/Backdrop';

export default function SignIn() {
  const router = useRouter();
  const [mode, setMode] = useState<'in' | 'up'>('in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [note, setNote] = useState('');

  const submit = async () => {
    setErr(''); setNote('');
    const e = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) return setErr('Enter a valid email.');
    if (password.length < 8) return setErr('Use at least 8 characters for your password.');
    setBusy(true);
    const res = mode === 'up'
      ? await supabase.auth.signUp({ email: e, password })
      : await supabase.auth.signInWithPassword({ email: e, password });
    setBusy(false);
    if (res.error) {
      const m = res.error.message.toLowerCase();
      if (m.includes('invalid login')) return setErr('Email or password is wrong. New here? Tap "Create your account".');
      if (m.includes('already registered')) { setMode('in'); return setErr('You already have an account. Sign in with your password.'); }
      return setErr(res.error.message);
    }
    if (mode === 'up' && !res.data.session) setNote('Check your email to confirm your account, then sign in here.');
  };

  const reset = async () => {
    setErr(''); setNote('');
    const e = email.trim().toLowerCase();
    if (!e) return setErr('Enter your email first.');
    const { error } = await supabase.auth.resetPasswordForEmail(e);
    if (error) return setErr(error.message);
    setNote('We sent you an email to reset your password.');
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }}>
      <Backdrop />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 22, paddingTop: 24, paddingBottom: 40 }}>
            <View style={st.dot} />
            <Text style={st.brand}>Six-Pack Stack</Text>
          </View>
          <View style={st.wrap}>
          <View style={{ gap: 10 }}>
            <Eyebrow>{mode === 'in' ? 'Welcome back' : 'Welcome'}</Eyebrow>
            <H1 style={{ fontSize: 34, textTransform: 'uppercase', lineHeight: 36 }}>
              {mode === 'in' ? 'Sign in to your plan.' : 'Create your account.'}
            </H1>
            <Text style={st.sub}>{mode === 'up' ? 'Use the email you bought coaching with. Your plan attaches to it automatically.' : 'Welcome back. Your plan is right where you left it.'}</Text>
          </View>
          <View style={{ gap: 12, marginTop: 24 }}>
            <Text style={st.label} nativeID="emailLabel">Email</Text>
            <TextInput accessibilityLabelledBy="emailLabel" value={email} onChangeText={setEmail} autoCapitalize="none"
              autoComplete="email" keyboardType="email-address" textContentType="emailAddress" placeholder="you@email.com"
              placeholderTextColor="#1b244099" style={st.input} returnKeyType="next" />
            <Text style={st.label} nativeID="pwLabel">Password</Text>
            <TextInput accessibilityLabelledBy="pwLabel" value={password} onChangeText={setPassword} secureTextEntry
              autoComplete={mode === 'up' ? 'new-password' : 'current-password'}
              textContentType={mode === 'up' ? 'newPassword' : 'password'} placeholder={mode === 'up' ? 'At least 8 characters' : 'Your password'}
              placeholderTextColor="#1b244099" style={st.input} returnKeyType="go" onSubmitEditing={submit} />
            <Button title={mode === 'in' ? 'Sign in' : 'Create account'} onPress={submit} loading={busy} />
            {!!err && <Text style={st.err} accessibilityLiveRegion="polite">{err}</Text>}
            {!!note && <Text style={st.note} accessibilityLiveRegion="polite">{note}</Text>}
            <Pressable accessibilityRole="button" onPress={() => { setMode(mode === 'in' ? 'up' : 'in'); setErr(''); setNote(''); }} style={st.link}>
              <Text style={st.linkText}>{mode === 'in' ? 'Coaching client, first time here? Create your account' : 'Already have an account? Sign in'}</Text>
            </Pressable>
            <Pressable accessibilityRole="button" onPress={() => router.replace('/quiz')} style={st.link}>
              <Text style={st.linkText}>New here? Start The Free Stack (2 weeks free)</Text>
            </Pressable>
            {mode === 'in' && (
              <Pressable accessibilityRole="button" onPress={reset} style={st.link}>
                <Text style={st.linkText}>Forgot your password?</Text>
              </Pressable>
            )}
          </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const st = StyleSheet.create({
  wrap: { paddingHorizontal: 22, paddingTop: 4 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: C.red },
  brand: { fontFamily: F.xbold, fontSize: 12, letterSpacing: 2, textTransform: 'uppercase', color: C.ink },
  sub: { fontFamily: F.semi, fontSize: 15, lineHeight: 22, color: C.ink },
  label: { fontFamily: F.xbold, fontSize: 12, letterSpacing: 1.4, textTransform: 'uppercase', color: C.ink },
  input: { height: 56, borderRadius: 14, backgroundColor: C.card, borderWidth: 1, borderColor: C.line, color: C.ink, fontFamily: F.semi, fontSize: 17, paddingHorizontal: 16 },
  err: { fontFamily: F.bold, fontSize: 14, color: C.red },
  note: { fontFamily: F.bold, fontSize: 14, color: C.green },
  link: { minHeight: 44, justifyContent: 'center', alignItems: 'center' },
  linkText: { fontFamily: F.bold, fontSize: 14, color: C.ink, textDecorationLine: 'underline' },
});
