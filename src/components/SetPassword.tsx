import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Svg, { Path } from 'react-native-svg';
import { supabase } from '../lib/supabase';
import { F } from '../lib/theme';
import { track } from '../lib/track';

/**
 * Accounts are made without a password step (they stay signed in on this device).
 * This card lets them add one, so they can log in on another phone or computer.
 */
export default function SetPassword() {
  const [need, setNeed] = useState(false);
  const [open, setOpen] = useState(false);
  const [pw, setPw] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  useEffect(() => { AsyncStorage.getItem('sps:needs-password').then((v) => setNeed(v === '1')).catch(() => {}); }, []);
  if (!need) return null;
  const save = async () => {
    setMsg('');
    if (pw.length < 8) return setMsg('Use at least 8 characters.');
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password: pw });
    setBusy(false);
    if (error) return setMsg(error.message);
    track('password_set');
    AsyncStorage.removeItem('sps:needs-password').catch(() => {});
    setNeed(false);
  };
  return (
    <View style={s.card}>
      <View style={s.row}>
        <View style={s.ico}><Svg width={19} height={19} viewBox="0 0 24 24"><Path d="M5 10.5h14v10H5zM8.5 10.5V7.5a3.5 3.5 0 0 1 7 0v3" stroke="#141c33" strokeWidth={1.9} fill="none" strokeLinecap="round" strokeLinejoin="round" /></Svg></View>
        <View style={{ flex: 1 }}>
          <Text style={s.t}>Set a password</Text>
          <Text style={s.sub}>So you can log in on another phone or computer.</Text>
        </View>
        {!open && <Pressable accessibilityRole="button" onPress={() => setOpen(true)} style={s.btn}><Text style={s.btnT}>Set</Text></Pressable>}
      </View>
      {open && (
        <View style={{ gap: 10 }}>
          <TextInput accessibilityLabel="New password" value={pw} onChangeText={setPw} secureTextEntry placeholder="8 or more characters" placeholderTextColor="#8a92a8"
            style={s.input} autoComplete="new-password" textContentType="newPassword" onSubmitEditing={save} />
          <Pressable accessibilityRole="button" onPress={save} disabled={busy} style={[s.save, busy && { opacity: 0.6 }]}><Text style={s.saveT}>{busy ? 'Saving…' : 'Save password'}</Text></Pressable>
          {!!msg && <Text style={s.err}>{msg}</Text>}
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  card: { backgroundColor: '#fff', borderRadius: 20, borderWidth: 1, borderColor: '#e6e8ef', padding: 16, gap: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  ico: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#eef1f8', alignItems: 'center', justifyContent: 'center' },
  t: { fontFamily: F.black, fontSize: 16, color: '#141c33' },
  sub: { fontFamily: F.medium, fontSize: 13, color: '#4a5470', marginTop: 2 },
  btn: { height: 38, paddingHorizontal: 16, borderRadius: 10, backgroundColor: '#141c33', justifyContent: 'center' },
  btnT: { fontFamily: F.bold, fontSize: 14, color: '#fff' },
  input: { height: 50, borderRadius: 12, borderWidth: 1.5, borderColor: '#d7dbe6', paddingHorizontal: 14, fontFamily: F.semi, fontSize: 16, color: '#141c33' },
  save: { height: 48, borderRadius: 12, backgroundColor: '#141c33', alignItems: 'center', justifyContent: 'center' },
  saveT: { fontFamily: F.black, fontSize: 15, color: '#fff' },
  err: { fontFamily: F.bold, fontSize: 13, color: '#d0362f' },
});
