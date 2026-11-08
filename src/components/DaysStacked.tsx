import React, { useCallback, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import Svg, { Path } from 'react-native-svg';
import { C, F } from '../lib/theme';
import type { Plan } from '../lib/types';
import { isoDate, loggedDays } from '../lib/logs';
import { allTimeStacked, phoneStepsAvailable, setSteps, stepGoal, proteinGoal, trainingDows, weekStatus, type Day } from '../lib/daily';
import Panel from './Panel';
import { MiniRing } from './charts';

const DOW = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const fmt = (n: number) => Math.round(n).toLocaleString('en-US');
const short = (iso: string) => new Date(iso + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

/** Days Stacked: steps + workout + protein (rest days: steps + protein). */
export default function DaysStacked({ plan, userId, onProtein }: { plan: Plan; userId: string; onProtein?: () => void }) {
  const [week, setWeek] = useState<Awaited<ReturnType<typeof weekStatus>>>([]);
  const [total, setTotal] = useState(0);
  const [auto, setAuto] = useState(false);
  const [open, setOpen] = useState(false);
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
  const dows = trainingDows(plan);
  const rest = today ? !dows.includes(today.dow) : false;
  const stacked = week.filter((w) => w.stacked).length;
  const workouts = week.filter((w) => w.worked).length;
  const nTrain = plan.train.d.length;
  const left = [d.steps < sg && `${fmt(sg - d.steps)} more steps`, !rest && !today?.worked && "today's workout", d.protein < pg && `${fmt(pg - d.protein)} g protein`].filter(Boolean) as string[];
  const tip = !today ? '' : !left.length ? "Today's stacked. That's how abs get built."
    : d.steps === 0 && d.protein === 0 ? `Hit ${fmt(sg)} steps, ${rest ? 'rest up' : "today's workout"} and your protein to stack today`
    : `To stack today: ${left.join(', ').replace(/, ([^,]*)$/, ' and $1')}`;
  const saveSteps = async () => { const n = Number(stepsTxt.replace(/\D/g, '')); if (n >= 0) await setSteps(n); setEditSteps(false); load(); };

  return (
    <Panel title="Days Stacked" bodyStyle={{ paddingHorizontal: 0, paddingVertical: 0 }}>
      <View style={st.top}>
        <View style={{ flex: 1 }}>
          <Text style={st.big}>Current week</Text>
          <Text style={st.small}>{week.length ? `${short(week[0].date)} – ${short(week[6].date)} · ` : ''}{total} stacked all-time</Text>
        </View>
        <View accessibilityLabel={`${stacked} of 7 days stacked`}>
          <MiniRing pct={stacked / 7} color={C.red} size={64} stroke={6}>
            <Text><Text style={st.ringV}>{stacked}</Text><Text style={st.ringO}>/7</Text></Text>
          </MiniRing>
        </View>
      </View>

      {(
        <View style={st.weekRow}>
          {week.map((w) => (
            <View key={w.date} style={{ alignItems: 'center', gap: 6, flex: 1 }} accessibilityLabel={`${w.date}${w.stacked ? ', stacked' : ''}`}>
              <Text style={st.dow}>{DOW[w.dow]}</Text>
              <View style={[st.dot, w.stacked && { backgroundColor: C.red, borderColor: C.red }, w.date === todayId && !w.stacked && { borderColor: C.red }, w.future && { opacity: 0.45 }]}>
                {w.stacked && <Svg width={13} height={13} viewBox="0 0 24 24"><Path d="M5 12.5l4.5 4.5L19 7.5" stroke="#fff" strokeWidth={3.4} fill="none" strokeLinecap="round" strokeLinejoin="round" /></Svg>}
              </View>
            </View>
          ))}
        </View>
      )}

      {!!tip && (
        <View style={[st.tip, !left.length && { backgroundColor: C.redTint }]}>
          <View style={[st.tipI, !left.length && { backgroundColor: C.red }]}><Text style={st.tipIT}>{left.length ? 'i' : '✓'}</Text></View>
          <Text style={st.tipT}>{tip}</Text>
        </View>
      )}

      <View style={{ paddingHorizontal: 18, paddingTop: 14, paddingBottom: 16, gap: 10 }}>
        <Text style={st.label}>Today</Text>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Pressable accessibilityRole="button" accessibilityLabel={`Steps ${d.steps} of ${sg}. Tap to edit`} onPress={() => { setStepsTxt(d.steps ? String(d.steps) : ''); setEditSteps(!editSteps); }} style={st.tile}>
            <MiniRing pct={d.steps / sg} color="#17a062" size={54} stroke={5.5}><Text style={st.ringIn}>{d.steps >= 1000 ? `${(d.steps / 1000).toFixed(1)}k` : fmt(d.steps)}</Text></MiniRing>
            <Text style={st.tileL}>Steps</Text>
            <Text style={st.tileS}>of {fmt(sg)}</Text>
          </Pressable>
          <View style={st.tile} accessibilityLabel={`${workouts} of ${nTrain} workouts this week`}>
            <MiniRing pct={workouts / Math.max(1, nTrain)} color={C.ink} size={54} stroke={5.5}><Text style={st.ringIn}>{workouts}/{nTrain}</Text></MiniRing>
            <Text style={st.tileL}>Workouts</Text>
            <Text style={st.tileS}>this week</Text>
          </View>
          <Pressable accessibilityRole="button" accessibilityLabel={`Protein ${Math.round(d.protein)} of ${pg} grams. Tap to add`} onPress={onProtein} style={st.tile}>
            <MiniRing pct={d.protein / pg} color={C.red} size={54} stroke={5.5}><Text style={st.ringIn}>{fmt(d.protein)}g</Text></MiniRing>
            <Text style={st.tileL}>Protein</Text>
            <Text style={st.tileS}>of {fmt(pg)} g</Text>
          </Pressable>
        </View>
        {editSteps && (
          <View style={{ gap: 6 }}>
            <View style={st.edit}>
              <TextInput autoFocus value={stepsTxt} onChangeText={setStepsTxt} keyboardType="number-pad" placeholder="Today's steps" placeholderTextColor={C.muted}
                style={st.input} onSubmitEditing={saveSteps} returnKeyType="done" accessibilityLabel="Today's steps" />
              <Pressable accessibilityRole="button" onPress={saveSteps} style={st.save}><Text style={st.saveT}>Save</Text></Pressable>
            </View>
            <Text style={st.small}>{auto && Platform.OS === 'ios' ? 'Your iPhone counts steps for you. Type a number only if you want to change it.' : "Copy today's number from your phone's health or fitness app."}</Text>
          </View>
        )}
      </View>
    </Panel>
  );
}

const Bar = ({ v, max, color }: { v: number; max: number; color: string }) => (
  <View style={st.bar}><View style={[st.barF, { width: `${Math.min(100, max ? (v / max) * 100 : 0)}%`, backgroundColor: color }]} /></View>
);

const st = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: 18, paddingTop: 16, paddingBottom: 14, gap: 10 },
  big: { fontFamily: F.xbold, fontSize: 22, color: C.ink },
  small: { fontFamily: F.medium, fontSize: 14, color: C.ink, marginTop: 2 },
  score: { fontFamily: F.black, fontSize: 42, color: C.ink },
  of: { fontFamily: F.semi, fontSize: 18, color: C.ink },
  weekRow: { flexDirection: 'row', paddingHorizontal: 12, paddingBottom: 14 },
  dow: { fontFamily: F.semi, fontSize: 12, color: C.ink },
  dot: { width: 32, height: 32, borderRadius: 16, borderWidth: 2, borderColor: '#d5d9e3', alignItems: 'center', justifyContent: 'center', backgroundColor: C.bg },
  tip: { flexDirection: 'row', gap: 10, alignItems: 'center', paddingVertical: 12, paddingHorizontal: 18, backgroundColor: '#e7f6ee' },
  tipI: { width: 22, height: 22, borderRadius: 11, backgroundColor: '#1f9a63', alignItems: 'center', justifyContent: 'center' },
  tipIT: { fontFamily: F.xbold, fontSize: 13, color: '#ffffff' },
  tipT: { flex: 1, fontFamily: F.medium, fontSize: 14, lineHeight: 20, color: C.ink },
  label: { fontFamily: F.bold, fontSize: 15, color: C.ink },
  tile: { flex: 1, borderWidth: 1, borderColor: '#d9dde7', borderRadius: 14, paddingHorizontal: 8, paddingVertical: 12, backgroundColor: C.bg, gap: 2, alignItems: 'center' },
  tileL: { fontFamily: F.bold, fontSize: 13, color: C.ink, marginTop: 6 },
  tileS: { fontFamily: F.medium, fontSize: 11.5, color: C.muted },
  ringIn: { fontFamily: F.xbold, fontSize: 12, color: C.ink },
  ringV: { fontFamily: F.black, fontSize: 22, color: C.ink },
  ringO: { fontFamily: F.bold, fontSize: 12, color: C.muted },
  tileV: { fontFamily: F.xbold, fontSize: 20 },
  bar: { height: 5, borderRadius: 3, backgroundColor: '#e8eaf0', overflow: 'hidden', marginTop: 2 },
  barF: { height: 5, borderRadius: 3 },
  edit: { flexDirection: 'row', gap: 8 },
  input: { flex: 1, height: 48, borderRadius: 12, borderWidth: 1.5, borderColor: C.line, backgroundColor: C.bg, paddingHorizontal: 14, fontFamily: F.semi, fontSize: 17, color: C.ink, outlineWidth: 0 } as any,
  save: { height: 48, paddingHorizontal: 18, borderRadius: 24, backgroundColor: C.navy, alignItems: 'center', justifyContent: 'center' },
  saveT: { fontFamily: F.bold, fontSize: 15, color: C.onAccent },
});
