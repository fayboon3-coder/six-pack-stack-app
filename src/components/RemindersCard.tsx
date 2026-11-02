import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { useAuth } from '../lib/auth';
import { C, F } from '../lib/theme';
import { applyReminders, askPermission, DEFAULT_PREFS, readPrefs, ReminderPrefs, timeLabel } from '../lib/reminders';
import { isFree } from '../lib/access';

const TIMES: [number, number][] = [[6, 0], [12, 0], [17, 30], [19, 0]];

/** Workout-day and Sunday check-in reminders. */
export default function RemindersCard({ compact }: { compact?: boolean }) {
  const { plan, profile } = useAuth();
  const [p, setP] = useState<ReminderPrefs>(DEFAULT_PREFS);
  const [note, setNote] = useState('');
  useEffect(() => { readPrefs().then(setP); }, []);

  const save = async (next: ReminderPrefs) => {
    setNote('');
    if (next.on && !(await askPermission())) {
      setNote('Notifications are off for this app. Turn them on in your phone Settings, then try again.');
      next = { ...next, on: false };
    }
    setP(next);
    await applyReminders(plan, next, { free: isFree(profile) });
  };
  const days = (plan?.train.d || []).map((d) => d.t.split(' ')[0].slice(0, 3)).join(', ');

  return (
    <View style={st.card}>
      <View style={st.row}>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={st.t}>Workout reminders</Text>
          <Text style={st.sub}>{days || 'Your training days'} at {timeLabel(p.hour, p.minute)}, plus Sunday check-in at 9:00 am</Text>
        </View>
        <Switch value={p.on} onValueChange={(on) => save({ ...p, on })} trackColor={{ true: C.green, false: C.line }} accessibilityLabel="Workout reminders" />
      </View>
      {p.on && !compact && (
        <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
          {TIMES.map(([h, m]) => {
            const on = p.hour === h && p.minute === m;
            return (
              <Pressable key={`${h}${m}`} accessibilityRole="radio" accessibilityState={{ selected: on }} onPress={() => save({ ...p, hour: h, minute: m })} style={[st.chip, on && st.chipOn]}>
                <Text style={st.chipText}>{timeLabel(h, m)}</Text>
              </Pressable>
            );
          })}
        </View>
      )}
      {!!note && <Text style={st.note}>{note}</Text>}
    </View>
  );
}

const st = StyleSheet.create({
  card: { backgroundColor: C.navy2, borderRadius: 18, borderWidth: 1, borderColor: C.line, padding: 16, gap: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  t: { fontFamily: F.black, fontSize: 16, color: C.white },
  sub: { fontFamily: F.semi, fontSize: 13, lineHeight: 18, color: C.white },
  chip: { minHeight: 40, borderRadius: 999, borderWidth: 1.5, borderColor: C.line, paddingHorizontal: 14, justifyContent: 'center' },
  chipOn: { borderColor: C.green, backgroundColor: 'rgba(63,191,127,0.15)' },
  chipText: { fontFamily: F.bold, fontSize: 13, color: C.white },
  note: { fontFamily: F.bold, fontSize: 13, color: C.red2 },
});
