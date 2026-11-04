import React, { useCallback, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import Svg, { Path } from 'react-native-svg';
import { C, F } from '../lib/theme';
import type { Plan } from '../lib/types';
import { isoDate, loggedDays } from '../lib/logs';
import { addProtein, allTimeStacked, phoneStepsAvailable, proteinGoal, setSteps, stepGoal, trainingDows, undoProtein, weekStatus, type Day } from '../lib/daily';

const DOW = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const fmt = (n: number) => n.toLocaleString('en-US');

/** Days Stacked: steps + protein + workout (rest days: steps + protein). Logged right here. */
export default function DaysStacked({ plan, userId }: { plan: Plan; userId: string }) {
  const router = useRouter();
  const [week, setWeek] = useState<Awaited<ReturnType<typeof weekStatus>>>([]);
  const [total, setTotal] = useState(0);
  const [auto, setAuto] = useState(false);
  const [editSteps, setEditSteps] = useState(false);
  const [stepsTxt, setStepsTxt] = useState('');

  const load = useCallback(async () => {
    // Never let a slow connection block the card: workouts fill in when they arrive.
    const timeout = new Promise<any[]>((r) => setTimeout(() => r([]), 4000));
    const rows = await Promise.race([loggedDays(userId, '2024-01-01').catch(() => [] as any[]), timeout]);
    const dates = new Set<string>(rows.map((r: any) => String(r.logged_on)));
    setWeek(await weekStatus(plan, dates));
    setTotal(await allTimeStacked(plan, dates));
    setAuto(await phoneStepsAvailable());
  }, [plan, userId]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const todayId = isoDate();
  const today = week.find((w) => w.date === todayId);
  const d: Day = today?.day || { steps: 0, protein: 0, adds: [] };
  const sg = stepGoal(plan), pg = proteinGoal(plan);
  const rest = today ? !trainingDows(plan).includes(today.dow) : false;
  const stackedCount = week.filter((w) => w.stacked).length;
  const range = week.length ? `${new Date(week[0].date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${new Date(week[6].date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}` : '';
  const left = [d.steps < sg && `${fmt(sg - d.steps)} steps`, !rest && !today?.worked && 'your workout', d.protein < pg && `${Math.round(pg - d.protein)} g protein`].filter(Boolean) as string[];

  const protein = async (g: number) => { await addProtein(g); load(); };
  const undo = async () => { await undoProtein(); load(); };
  const saveSteps = async () => { const n = Number(stepsTxt.replace(/\D/g, '')); if (n >= 0) await setSteps(n); setEditSteps(false); load(); };

  return (
    <View style={st.card}>
      <View style={st.head}><Text style={st.headT}>DAYS STACKED</Text></View>
      <View style={{ padding: 18, gap: 14 }}>
        <View style={st.rowEnd}>
          <View><Text style={st.big}>Current week</Text><Text style={st.small}>{range} · {total} stacked all-time</Text></View>
          <Text><Text style={st.score}>{stackedCount}</Text><Text style={st.of}>/7</Text></Text>
        </View>

        <View style={st.weekRow}>
          {week.map((w) => {
            const isToday = w.date === todayId;
            return (
              <View key={w.date} style={{ alignItems: 'center', gap: 6, flex: 1 }} accessibilityLabel={`${w.date}${w.stacked ? ', stacked' : ''}`}>
                <Text style={st.dow}>{DOW[w.dow]}</Text>
                <View style={[st.dot, w.stacked && { backgroundColor: C.red, borderColor: C.red }, isToday && !w.stacked && { borderColor: C.red }, w.future && { opacity: 0.45 }]}>
                  {w.stacked && <Svg width={13} height={13} viewBox="0 0 24 24"><Path d="M5 12.5l4.5 4.5L19 7.5" stroke="#fff" strokeWidth={3.4} fill="none" strokeLinecap="round" strokeLinejoin="round" /></Svg>}
                </View>
              </View>
            );
          })}
        </View>

        <View style={[st.tip, !left.length && { backgroundColor: C.redTint }]}>
          <Text style={st.tipT}>{left.length ? `To stack today: ${left.join(', ').replace(/, ([^,]*)$/, ' and $1')}.` : "Today's stacked. That's how abs get built."}</Text>
        </View>

        <Text style={st.label}>Today</Text>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Pressable accessibilityRole="button" accessibilityLabel={`Steps ${d.steps} of ${sg}. Tap to edit`} onPress={() => { setStepsTxt(d.steps ? String(d.steps) : ''); setEditSteps(true); }} style={st.tile}>
            <Text style={st.tileL}>Steps</Text>
            <Text style={[st.tileV, d.steps >= sg && { color: C.green }]}>{fmt(d.steps)}</Text>
            <Bar v={d.steps} max={sg} color="#17a062" />
            <Text style={st.tileS}>{auto && !d.stepsManual ? 'From your iPhone' : `of ${fmt(sg)} · tap to log`}</Text>
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel={rest ? 'Rest day' : today?.worked ? 'Workout done' : 'Start workout'} onPress={() => !rest && !today?.worked && router.push('/')} style={st.tile}>
            <Text style={st.tileL}>Workout</Text>
            <Text style={[st.tileV, (rest || today?.worked) && { color: C.green }]}>{rest ? 'Rest' : today?.worked ? 'Done' : 'To do'}</Text>
            <Bar v={rest || today?.worked ? 1 : 0} max={1} color="#1f6fd1" />
            <Text style={st.tileS}>{rest ? 'Counts as done' : today?.worked ? 'Nice work' : 'Tap to start'}</Text>
          </Pressable>
          <View style={st.tile}>
            <Text style={st.tileL}>Protein</Text>
            <Text style={[st.tileV, d.protein >= pg && { color: C.green }]}>{Math.round(d.protein)} g</Text>
            <Bar v={d.protein} max={pg} color={C.red} />
            <Text style={st.tileS}>of {pg} g</Text>
          </View>
        </View>

        {editSteps && (
          <View style={st.edit}>
            <TextInput autoFocus value={stepsTxt} onChangeText={setStepsTxt} keyboardType="number-pad" placeholder="Today's steps" placeholderTextColor={C.muted}
              style={st.input} onSubmitEditing={saveSteps} returnKeyType="done" accessibilityLabel="Today's steps" />
            <Pressable accessibilityRole="button" onPress={saveSteps} style={st.save}><Text style={st.saveT}>Save</Text></Pressable>
          </View>
        )}
        {editSteps && Platform.OS !== 'ios' && <Text style={st.small}>Copy today's number from your phone's health or fitness app.</Text>}

        <View style={st.addRow}>
          <Text style={[st.small, { marginTop: 0, flex: 1 }]}>Protein</Text>
          {[10, 25, 40].map((g) => (
            <Pressable key={g} accessibilityRole="button" accessibilityLabel={`Add ${g} grams protein`} onPress={() => protein(g)} style={st.add}><Text style={st.addT}>+{g}g</Text></Pressable>
          ))}
          {!!d.adds.length && <Pressable accessibilityRole="button" accessibilityLabel="Undo last protein" onPress={undo} style={st.undo}><Text style={st.undoT}>Undo</Text></Pressable>}
        </View>
      </View>
    </View>
  );
}

const Bar = ({ v, max, color }: { v: number; max: number; color: string }) => (
  <View style={st.bar}><View style={[st.barF, { width: `${Math.min(100, max ? (v / max) * 100 : 0)}%`, backgroundColor: color }]} /></View>
);

const st = StyleSheet.create({
  card: { backgroundColor: C.card, borderWidth: 1, borderColor: C.line, borderRadius: 22, overflow: 'hidden' },
  head: { paddingHorizontal: 18, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: C.line },
  headT: { fontFamily: F.bold, fontSize: 13, letterSpacing: 0.8, color: C.ink },
  rowEnd: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
  big: { fontFamily: F.xbold, fontSize: 22, color: C.ink },
  small: { fontFamily: F.medium, fontSize: 14, color: C.ink, marginTop: 2 },
  score: { fontFamily: F.black, fontSize: 42, color: C.ink },
  of: { fontFamily: F.semi, fontSize: 18, color: C.ink },
  weekRow: { flexDirection: 'row' },
  dow: { fontFamily: F.semi, fontSize: 12, color: C.ink },
  dot: { width: 32, height: 32, borderRadius: 16, borderWidth: 2, borderColor: '#d5d9e3', alignItems: 'center', justifyContent: 'center', backgroundColor: C.bg },
  tip: { padding: 12, borderRadius: 12, backgroundColor: '#e7f6ee' },
  tipT: { fontFamily: F.medium, fontSize: 14, lineHeight: 20, color: C.ink },
  label: { fontFamily: F.bold, fontSize: 15, color: C.ink, marginBottom: -4 },
  tile: { flex: 1, borderWidth: 1, borderColor: '#d9dde7', borderRadius: 14, padding: 10, backgroundColor: C.bg, gap: 4 },
  tileL: { fontFamily: F.semi, fontSize: 12, color: C.ink },
  tileV: { fontFamily: F.xbold, fontSize: 18, color: C.ink },
  tileS: { fontFamily: F.medium, fontSize: 11, color: C.ink },
  bar: { height: 5, borderRadius: 3, backgroundColor: '#e8eaf0', overflow: 'hidden', marginTop: 2 },
  barF: { height: 5, borderRadius: 3 },
  edit: { flexDirection: 'row', gap: 8 },
  input: { flex: 1, height: 48, borderRadius: 12, borderWidth: 1.5, borderColor: C.line, backgroundColor: C.bg, paddingHorizontal: 14, fontFamily: F.semi, fontSize: 17, color: C.ink, outlineWidth: 0 },
  save: { height: 48, paddingHorizontal: 18, borderRadius: 24, backgroundColor: C.navy, alignItems: 'center', justifyContent: 'center' },
  saveT: { fontFamily: F.bold, fontSize: 15, color: C.onAccent },
  addRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  add: { height: 38, paddingHorizontal: 12, borderRadius: 19, backgroundColor: C.red, alignItems: 'center', justifyContent: 'center' },
  addT: { fontFamily: F.bold, fontSize: 14, color: C.onAccent },
  undo: { height: 38, paddingHorizontal: 12, borderRadius: 19, borderWidth: 1.5, borderColor: '#d5d9e3', alignItems: 'center', justifyContent: 'center' },
  undoT: { fontFamily: F.bold, fontSize: 13, color: C.ink },
});
