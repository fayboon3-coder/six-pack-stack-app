import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { useAuth } from '../lib/auth';
import { C, F } from '../lib/theme';
import { applyReminders, askPermission, DEFAULT_PREFS, hasPermission, readPrefs, ReminderPrefs, timeLabel } from '../lib/reminders';
import { registerPush } from '../lib/push';
import { isFree } from '../lib/access';
import { proteinGoal } from '../lib/daily';

const TIMES: [number, number][] = [[6, 0], [12, 0], [17, 30], [19, 0]];
const WEIGH: number[] = [6, 7, 8];
const PROTEIN: number[] = [17, 19, 21];

/** Every reminder in one place: training days, morning weigh-in, evening protein, Sunday check-in. */
export default function RemindersCard({ compact }: { compact?: boolean }) {
  const { plan, profile } = useAuth();
  const [p, setP] = useState<ReminderPrefs>(DEFAULT_PREFS);
  const [note, setNote] = useState('');
  const [allowed, setAllowed] = useState(false);
  useEffect(() => { readPrefs().then(setP); hasPermission().then(setAllowed); }, []);

  const save = async (next: ReminderPrefs) => {
    setNote('');
    if ((next.on || next.checkin || next.weigh || next.protein) && !(await askPermission())) {
      setNote('Notifications are off for this app. Turn them on in your phone Settings, then try again.');
      next = { ...next, on: false, checkin: false, weigh: false, protein: false };
    }
    setP(next);
    const ok = await hasPermission();
    setAllowed(ok);
    if (ok) registerPush().catch(() => {});
    await applyReminders(plan, next, { free: isFree(profile) });
  };
  const days = (plan?.train.d || []).map((d) => d.t.split(' ')[0].slice(0, 3)).join(', ');
  const pg = plan ? proteinGoal(plan) : 150;

  const Row = ({ title, sub, value, onChange, label }: { title: string; sub: string; value: boolean; onChange: (v: boolean) => void; label: string }) => (
    <View style={st.row}>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={st.t}>{title}</Text>
        <Text style={st.sub}>{sub}</Text>
      </View>
      <Switch value={value && allowed} onValueChange={onChange} trackColor={{ true: C.green, false: C.line }} accessibilityLabel={label} />
    </View>
  );
  const Chips = ({ opts, on, pick }: { opts: [number, number][]; on: (h: number, m: number) => boolean; pick: (h: number, m: number) => void }) => (
    <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
      {opts.map(([h, m]) => (
        <Pressable key={`${h}${m}`} accessibilityRole="radio" accessibilityState={{ selected: on(h, m) }} onPress={() => pick(h, m)} style={[st.chip, on(h, m) && st.chipOn]}>
          <Text style={st.chipText}>{timeLabel(h, m)}</Text>
        </Pressable>
      ))}
    </View>
  );

  return (
    <View style={st.card}>
      {!compact && <Text style={st.k}>REMINDERS</Text>}
      <Row title="Workout reminders" sub={`${days || 'Your training days'} at ${timeLabel(p.hour, p.minute)}`} value={p.on} onChange={(on) => save({ ...p, on })} label="Workout reminders" />
      {p.on && !compact && <Chips opts={TIMES} on={(h, m) => p.hour === h && p.minute === m} pick={(h, m) => save({ ...p, hour: h, minute: m })} />}
      {!compact && (
        <>
          <View style={st.line} />
          <Row title="Morning weigh-in" sub={`Every day at ${timeLabel(p.weighHour ?? 7, 0)}. Feeds your trend weight.`} value={!!p.weigh} onChange={(weigh) => save({ ...p, weigh })} label="Morning weigh-in reminder" />
          {!!p.weigh && <Chips opts={WEIGH.map((h) => [h, 0] as [number, number])} on={(h) => (p.weighHour ?? 7) === h} pick={(h) => save({ ...p, weighHour: h })} />}
          <View style={st.line} />
          <Row title="Protein check" sub={`${timeLabel(p.proteinHour ?? 19, 0)} if you're not at ${pg} g yet. Skipped once you hit it.`} value={!!p.protein} onChange={(protein) => save({ ...p, protein })} label="Evening protein reminder" />
          {!!p.protein && <Chips opts={PROTEIN.map((h) => [h, 0] as [number, number])} on={(h) => (p.proteinHour ?? 19) === h} pick={(h) => save({ ...p, proteinHour: h })} />}
          <View style={st.line} />
          <Row title="Sunday check-in" sub="Sunday at 9:00 am, plus a nudge at 6:00 pm if you haven't done it yet" value={p.checkin} onChange={(checkin) => save({ ...p, checkin })} label="Sunday check-in reminder" />
        </>
      )}
      {!!note && <Text style={st.note}>{note}</Text>}
    </View>
  );
}

const st = StyleSheet.create({
  card: { backgroundColor: C.card, borderRadius: 18, borderWidth: 1, borderColor: C.line, padding: 16, gap: 12 },
  k: { fontFamily: F.bold, fontSize: 13, letterSpacing: 0.8, color: C.ink },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  line: { height: 1, backgroundColor: '#e9ebf1' },
  t: { fontFamily: F.black, fontSize: 16, color: C.ink },
  sub: { fontFamily: F.semi, fontSize: 13, lineHeight: 18, color: C.ink },
  chip: { minHeight: 40, borderRadius: 999, borderWidth: 1.5, borderColor: C.line, paddingHorizontal: 14, justifyContent: 'center' },
  chipOn: { borderColor: C.green, backgroundColor: 'rgba(63,191,127,0.15)' },
  chipText: { fontFamily: F.bold, fontSize: 13, color: C.ink },
  note: { fontFamily: F.bold, fontSize: 13, color: C.red },
});
