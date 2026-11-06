import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth } from '../src/lib/auth';
import { supabase } from '../src/lib/supabase';
import { C, F } from '../src/lib/theme';
import { Button } from '../src/components/ui';
import Backdrop from '../src/components/Backdrop';
import LoadingScreen from '../src/components/LoadingScreen';
import { twoTone } from '../src/components/TwoTone';
import { isPreviewing } from '../src/lib/preview';

/** Delete my account (Apple requires this inside the app). */
export default function DeleteAccount() {
  const { session, signOut } = useAuth();
  const router = useRouter();
  const [typed, setTyped] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState('');
  const ok = typed.trim().toUpperCase() === 'DELETE';

  const run = async () => {
    if (!session || !ok || busy) return;
    if (isPreviewing()) { setErr('Preview only. Nothing was deleted.'); return; }
    setBusy(true); setErr('');
    const uid = session.user.id;
    try {
      // Progress photos live in Storage, so they go first.
      const { data: files } = await supabase.storage.from('progress-photos').list(uid, { limit: 1000 });
      if (files?.length) await supabase.storage.from('progress-photos').remove(files.map((f) => `${uid}/${f.name}`));
      const { error } = await supabase.rpc('delete_my_account');
      if (error) throw error;
      setDone(true);
    } catch {
      setBusy(false);
      setErr("That didn't go through. Try again, or email bfay@boonfay-pt.com and I'll delete it for you within 48 hours.");
    }
  };

  if (busy) {
    return (
      <View style={{ flex: 1, backgroundColor: C.bg }}>
        <LoadingScreen title="Deleting your| account" steps={['Removing your progress photos', 'Deleting your plan, logs and check-ins', 'Closing your account']}
          stepMs={500} done={done} onFinish={async () => { await signOut(); router.replace('/welcome'); }} />
      </View>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }}>
      <Backdrop />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={st.wrap} keyboardShouldPersistTaps="handled">
          <Text style={st.k}>Account</Text>
          <Text style={st.h}>{twoTone('Delete your| account')}</Text>
          <Text style={st.body}>This permanently deletes:</Text>
          <View style={{ gap: 6 }}>
            {['Your account and login', 'Your plan, meals and training', 'Every workout you logged', 'Your check-ins and progress photos', 'Your Stack AI chats'].map((t) => (
              <Text key={t} style={st.li}>•  {t}</Text>
            ))}
          </View>
          <Text style={st.body}>It can't be undone. If you paid for The Full Stack, cancel the subscription too (in your App Store settings, or from the link in your receipt email if you paid on the web). Deleting the account doesn't cancel it.</Text>
          <Text style={st.body}>You'll still get my emails until you unsubscribe. The link is at the bottom of every email.</Text>
          <Text style={[st.k, { marginTop: 10 }]}>Type DELETE to confirm</Text>
          <TextInput value={typed} onChangeText={setTyped} autoCapitalize="characters" autoCorrect={false} placeholder="DELETE"
            placeholderTextColor="rgba(27,36,64,0.35)" style={st.input} accessibilityLabel="Type DELETE to confirm" />
          {!!err && <Text style={st.err}>{err}</Text>}
          <Button title="Delete my account" onPress={run} disabled={!ok} />
          <Button title="Keep my account" variant="ghost" onPress={() => router.back()} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const st = StyleSheet.create({
  wrap: { padding: 24, gap: 14, paddingBottom: 48 },
  k: { fontFamily: F.xbold, fontSize: 11, letterSpacing: 1.6, textTransform: 'uppercase', color: C.red },
  h: { fontFamily: F.black, fontSize: 30, lineHeight: 35, color: C.ink, marginBottom: 4 },
  body: { fontFamily: F.semi, fontSize: 15, lineHeight: 22, color: C.ink },
  li: { fontFamily: F.bold, fontSize: 15, lineHeight: 22, color: C.ink },
  input: { borderWidth: 1.5, borderColor: C.line, borderRadius: 14, backgroundColor: C.card, color: C.ink, fontFamily: F.black, fontSize: 18, letterSpacing: 2, paddingHorizontal: 16, paddingVertical: 14 },
  err: { fontFamily: F.bold, fontSize: 14, lineHeight: 20, color: C.red },
});
