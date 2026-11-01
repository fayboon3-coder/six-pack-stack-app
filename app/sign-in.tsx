import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../src/lib/supabase';
import { C, F } from '../src/lib/theme';
import { Button, Eyebrow, H1 } from '../src/components/ui';

export default function SignIn() {
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const sendCode = async () => {
    setErr('');
    const e = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) return setErr('Enter a valid email.');
    setBusy(true);
    const { error } = await supabase.auth.signInWithOtp({ email: e, options: { shouldCreateUser: true } });
    setBusy(false);
    if (error) return setErr(error.message);
    setStep('code');
  };

  const verify = async () => {
    setErr('');
    setBusy(true);
    const { error } = await supabase.auth.verifyOtp({ email: email.trim().toLowerCase(), token: code.trim(), type: 'email' });
    setBusy(false);
    if (error) setErr('That code didn\'t work. Check it or send a new one.');
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.navy }}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={st.wrap}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <View style={st.dot} />
          <Text style={st.brand}>Six-Pack Stack</Text>
        </View>
        <View style={{ gap: 10, marginTop: 40 }}>
          <Eyebrow>{step === 'email' ? 'Welcome' : 'Check your email'}</Eyebrow>
          <H1 style={{ fontSize: 34, textTransform: 'uppercase', lineHeight: 36 }}>
            {step === 'email' ? 'Sign in to your plan.' : 'Enter your code.'}
          </H1>
          <Text style={st.sub}>
            {step === 'email'
              ? 'Use the email you signed up with. We\'ll send you a 6-digit code. No password needed.'
              : `We sent a 6-digit code to ${email.trim()}.`}
          </Text>
        </View>
        <View style={{ gap: 12, marginTop: 28 }}>
          {step === 'email' ? (
            <>
              <Text style={st.label} nativeID="emailLabel">Email</Text>
              <TextInput
                accessibilityLabelledBy="emailLabel"
                value={email} onChangeText={setEmail} autoCapitalize="none" autoComplete="email"
                keyboardType="email-address" textContentType="emailAddress" placeholder="you@email.com"
                placeholderTextColor="#ffffff99" style={st.input} returnKeyType="send" onSubmitEditing={sendCode}
              />
              <Button title="Send my code" onPress={sendCode} loading={busy} />
            </>
          ) : (
            <>
              <Text style={st.label} nativeID="codeLabel">6-digit code</Text>
              <TextInput
                accessibilityLabelledBy="codeLabel"
                value={code} onChangeText={(t) => setCode(t.replace(/\D/g, '').slice(0, 6))}
                keyboardType="number-pad" textContentType="oneTimeCode" autoComplete="one-time-code"
                placeholder="123456" placeholderTextColor="#ffffff99"
                style={[st.input, { letterSpacing: 8, fontSize: 24, textAlign: 'center' }]}
              />
              <Button title="Sign in" onPress={verify} loading={busy} disabled={code.length < 6} />
              <Button title="Use a different email" variant="ghost" onPress={() => { setStep('email'); setCode(''); }} />
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
