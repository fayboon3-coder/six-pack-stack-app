import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '../lib/auth';
import { C, F } from '../lib/theme';
import { isFree } from '../lib/access';
import { applyReminders, askPermission, dismissPrompt, readPrefs, shouldPrompt } from '../lib/reminders';

/** Today-tab card: one tap turns on the Sunday check-in reminder (and workout-day reminders). */
export default function ReminderPrompt({ style }: { style?: object }) {
  const { plan, profile } = useAuth();
  const [show, setShow] = useState(false);
  const [note, setNote] = useState('');
  useEffect(() => { shouldPrompt().then(setShow); }, []);
  if (!show || !plan) return null;

  const turnOn = async () => {
    const ok = await askPermission();
    await dismissPrompt();
    if (!ok) { setNote('No problem. You can turn reminders on anytime from the Boon tab.'); setTimeout(() => setShow(false), 2500); return; }
    const prefs = { ...(await readPrefs()), on: true, checkin: true };
    await applyReminders(plan, prefs, { free: isFree(profile) });
    setShow(false);
  };
  const later = async () => { await dismissPrompt(); setShow(false); };

  return (
    <View style={[st.card, style]}>
      <Text style={st.k}>Don't miss a week</Text>
      <Text style={st.t}>Get a nudge on training days and on Sunday for your check-in.</Text>
      {!!note && <Text style={st.note}>{note}</Text>}
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <Pressable accessibilityRole="button" onPress={turnOn} style={st.on}><Text style={st.onT}>Turn on reminders</Text></Pressable>
        <Pressable accessibilityRole="button" onPress={later} style={st.off}><Text style={st.offT}>Not now</Text></Pressable>
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  card: { backgroundColor: C.card, borderWidth: 1.5, borderColor: C.green, borderRadius: 18, padding: 16, gap: 10 },
  k: { fontFamily: F.xbold, fontSize: 11, letterSpacing: 1.4, textTransform: 'uppercase', color: C.green },
  t: { fontFamily: F.black, fontSize: 16, lineHeight: 21, color: C.ink },
  note: { fontFamily: F.bold, fontSize: 13, color: C.ink },
  on: { flex: 1, backgroundColor: C.green, borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  onT: { fontFamily: F.black, fontSize: 13, color: C.bg, textTransform: 'uppercase', letterSpacing: 0.5 },
  off: { paddingHorizontal: 14, borderRadius: 12, borderWidth: 1.5, borderColor: C.line, justifyContent: 'center' },
  offT: { fontFamily: F.bold, fontSize: 13, color: C.ink },
});
