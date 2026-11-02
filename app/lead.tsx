import React, { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Linking from 'expo-linking';
import { COACHING_URL } from '../src/lib/access';
import { C, F } from '../src/lib/theme';
import { Button } from '../src/components/ui';
import { BackIcon, CheckIcon } from '../src/components/icons';
import { captureLead, readLead, Want } from '../src/lib/lead';

const COPY: Record<Want, { k: string; h: string; sub: string; cta: string; next: string }> = {
  plan: { k: 'The Free Stack · 2 weeks free', h: 'Where should I send your plan?', sub: 'Next: a 2-minute quiz, then your plan is built from your answers.', cta: 'Build my plan', next: '/quiz' },
  btl: { k: 'Beyond the Label', h: 'Where should I send it?', sub: "You'll see everything inside Beyond the Label next.", cta: 'Show me', next: '/btl' },
  sub: { k: 'The Full Stack', h: 'Where should I send your plan?', sub: 'Next: a 2-minute quiz to build your plan. Weeks 1 and 2 are free, then unlock all 12 weeks.', cta: 'Build my plan', next: '/quiz' },
  coaching: { k: '1:1 coaching', h: 'Where should I send the details?', sub: "Next: everything you get with 1:1 coaching, and the Abs or It's Free guarantee.", cta: 'Show me', next: 'coaching' },
};

/** One screen between "what are you here for" and the path: name + email, straight into Boon's emails. */
export default function LeadScreen() {
  const { want: w } = useLocalSearchParams<{ want?: string }>();
  const want: Want = w === 'btl' || w === 'coaching' || w === 'sub' ? w : 'plan';
  const c = COPY[want];
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [src, setSrc] = useState<string | undefined>();
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    readLead().then((l) => { if (l) { setName(l.first_name); setEmail(l.email); } });
    Linking.getInitialURL().then((u) => { const s = u ? Linking.parse(u).queryParams?.src : undefined; if (s) setSrc(String(s).slice(0, 80)); }).catch(() => {});
  }, []);

  const go = async () => {
    setErr('');
    const e = email.trim().toLowerCase();
    if (name.trim().length < 2) return setErr('Add your first name.');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) return setErr('Enter a valid email.');
    setBusy(true);
    await captureLead({ first_name: name.trim(), email: e, want, src });
    setBusy(false);
    if (c.next === 'coaching') { Linking.openURL(COACHING_URL); return router.replace('/welcome'); }
    router.replace({ pathname: c.next as any, params: { name: name.trim(), email: e, ...(src ? { src } : {}) } });
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.navy }}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ padding: 22, gap: 16, paddingBottom: 48 }} keyboardShouldPersistTaps="handled">
          <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={() => router.back()} hitSlop={10} style={{ width: 40, height: 40, justifyContent: 'center' }}>
            <BackIcon />
          </Pressable>
          <Text style={st.k}>{c.k}</Text>
          <Text style={st.h}>{c.h}</Text>
          <Text style={st.sub}>{c.sub}</Text>
          <TextInput accessibilityLabel="First name" value={name} onChangeText={setName} placeholder="First name" placeholderTextColor="#ffffff77"
            style={st.input} autoComplete="given-name" textContentType="givenName" returnKeyType="next" />
          <TextInput accessibilityLabel="Email" value={email} onChangeText={setEmail} placeholder="Email" placeholderTextColor="#ffffff77"
            style={st.input} autoCapitalize="none" keyboardType="email-address" autoComplete="email" textContentType="emailAddress" returnKeyType="go" onSubmitEditing={go} />
          {!!err && <Text style={st.err} accessibilityLiveRegion="polite">{err}</Text>}
          <Button title={c.cta} onPress={go} loading={busy} />
          <Text style={st.fine}>I'll email you tips and offers. Unsubscribe anytime. No spam, no selling your email.</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const st = StyleSheet.create({
  k: { fontFamily: F.xbold, fontSize: 12, letterSpacing: 1.6, textTransform: 'uppercase', color: C.red2 },
  h: { fontFamily: F.black, fontSize: 30, lineHeight: 34, color: C.white, letterSpacing: -0.4 },
  sub: { fontFamily: F.semi, fontSize: 15, lineHeight: 22, color: C.white },
  input: { height: 58, borderRadius: 14, backgroundColor: C.navy2, borderWidth: 1, borderColor: C.line, color: C.white, fontFamily: F.semi, fontSize: 17, paddingHorizontal: 16 },
  bonus: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  tick: { width: 22, height: 22, borderRadius: 11, backgroundColor: C.green, alignItems: 'center', justifyContent: 'center' },
  bonusText: { flex: 1, fontFamily: F.bold, fontSize: 14, color: C.white },
  err: { fontFamily: F.bold, fontSize: 14, color: C.red2 },
  fine: { fontFamily: F.medium, fontSize: 12, lineHeight: 17, color: C.white, textAlign: 'center' },
});
