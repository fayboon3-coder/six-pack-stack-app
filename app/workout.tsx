import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Image, KeyboardAvoidingView, Linking, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuth } from '../src/lib/auth';
import { thumb } from '../src/lib/workoutMeta';
import { C, F } from '../src/lib/theme';
import { Button, s as ui } from '../src/components/ui';
import { BackIcon, CheckIcon, PlayIcon } from '../src/components/icons';
import { exercises, repsOf, setsFor, weekOf } from '../src/lib/program';
import { isoDate, lastSession, saveSet } from '../src/lib/logs';

type Entry = { w: string; r: string; done: boolean };
const REST = 90;

export default function Workout() {
  const { d } = useLocalSearchParams<{ d: string }>();
  const { plan, session } = useAuth();
  const router = useRouter();
  const dayIdx = Number(d || 0);
  const day = plan?.train.d[dayIdx];
  const week = weekOf(plan?.train.s);
  const [i, setI] = useState(0);
  const [entries, setEntries] = useState<Record<string, Entry[]>>({});
  const [prev, setPrev] = useState<Record<string, { weight: number | null; reps: number | null }[]>>({});
  const [rest, setRest] = useState(0);
  const [startedAt] = useState(Date.now());
  const [now, setNow] = useState(Date.now());
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!day || !session) return;
    lastSession(session.user.id, day.x.map((x) => x[0]), isoDate()).then(setPrev);
  }, [day, session]);

  useEffect(() => {
    timer.current = setInterval(() => { setNow(Date.now()); setRest((r) => (r > 0 ? r - 1 : 0)); }, 1000);
    return () => { if (timer.current) clearInterval(timer.current); };
  }, []);

  const ex = day?.x[i];
  const info = ex ? exercises[ex[0]] : undefined;
  const nSets = ex && plan ? setsFor(ex[1], i, plan, week) : 0;
  const list = useMemo(() => {
    if (!ex) return [];
    const cur = entries[ex[0]] || [];
    return Array.from({ length: nSets }, (_, k) => cur[k] || { w: '', r: '', done: false });
  }, [entries, ex, nSets]);

  if (!plan || !day || !ex) return null;

  const update = (k: number, patch: Partial<Entry>) => {
    const next = [...list];
    next[k] = { ...next[k], ...patch };
    setEntries({ ...entries, [ex[0]]: next });
  };

  const tick = async (k: number) => {
    const e = list[k];
    if (e.done) return update(k, { done: false });
    const p = prev[ex[0]]?.[k];
    const w = e.w || (p?.weight != null ? String(p.weight) : '');
    const r = e.r || (p?.reps != null ? String(p.reps) : '');
    update(k, { done: true, w, r });
    setRest(REST);
    if (session) {
      await saveSet({
        user_id: session.user.id, logged_on: isoDate(), day_label: day.t, exercise_id: ex[0], set_no: k + 1,
        weight: w ? Number(w) : null, reps: r ? Number(r) : null,
      });
    }
  };

  const nextUndone = list.findIndex((e) => !e.done);
  const elapsed = Math.floor((now - startedAt) / 1000);
  const mmss = (t: number) => `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`;
  const last = i === day.x.length - 1;
  const p0 = prev[ex[0]] || [];
  const beat = list.some((e, k) => e.done && p0[k]?.weight != null && Number(e.w) > Number(p0[k]!.weight));

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.navy }}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <View style={st.top}>
          <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={() => router.back()} style={st.icon}><BackIcon /></Pressable>
          <View style={{ alignItems: 'center' }}>
            <Text style={st.title}>{(day.t.split('·')[1] || day.t).trim()}</Text>
            <Text style={st.time}>{mmss(elapsed)}</Text>
          </View>
          <Text style={[st.time, { width: 44, textAlign: 'right' }]}>{i + 1}/{day.x.length}</Text>
        </View>
        <View style={st.progress}>
          {day.x.map((_, k) => (
            <View key={k} style={[st.seg, { backgroundColor: k < i ? C.green : k === i ? C.red : C.line }]} />
          ))}
        </View>

        <ScrollView contentContainerStyle={{ padding: 20, gap: 14, paddingBottom: 24 }} keyboardShouldPersistTaps="handled">
          {!!info?.video && (
            <Pressable accessibilityRole="button" accessibilityLabel={`Watch form video for ${info.name}`} style={st.video}
              onPress={() => Linking.openURL(`https://www.youtube.com/watch?v=${info.video}`)}>
              <Image source={thumb(info.video, 'hq')} style={StyleSheet.absoluteFill} resizeMode="cover" accessibilityIgnoresInvertColors />
              <View style={st.shade} />
              <View style={st.play}><PlayIcon size={22} /></View>
              <Text style={[ui.label, st.videoLabel]}>Watch form video</Text>
            </Pressable>
          )}
          <View style={{ gap: 6 }}>
            <Text style={st.exName}>{info?.name || ex[0]}</Text>
            <Text style={st.target}>{nSets} sets · {repsOf(ex[1])} reps</Text>
            {!!ex[2] && <Text style={st.note}>{ex[2]}</Text>}
            {(info?.cues || []).map((c, k) => <Text key={k} style={st.cue}>{k + 1}. {c}</Text>)}
          </View>

          <View style={st.table}>
            <View style={st.row}>
              <Text style={[ui.label, { width: 36 }]}>Set</Text>
              <Text style={[ui.label, { flex: 1 }]}>Last time</Text>
              <Text style={[ui.label, { flex: 1.4 }]}>Today (lbs × reps)</Text>
              <View style={{ width: 36 }} />
            </View>
            {list.map((e, k) => {
              const p = p0[k];
              const active = k === nextUndone;
              return (
                <View key={k} style={[st.row, st.rowLine]}>
                  <Text style={[st.cell, { width: 36, color: active ? C.red2 : C.white }]}>{k + 1}</Text>
                  <Text style={[st.cell, { flex: 1 }]}>{p ? `${p.weight ?? '–'} × ${p.reps ?? '–'}` : '–'}</Text>
                  <View style={{ flex: 1.4, flexDirection: 'row', gap: 6 }}>
                    <TextInput value={e.w} onChangeText={(t) => update(k, { w: t.replace(/[^\d.]/g, '') })} keyboardType="decimal-pad"
                      placeholder={p?.weight != null ? String(p.weight) : 'lbs'} placeholderTextColor="#ffffff80"
                      accessibilityLabel={`Set ${k + 1} weight`} style={[st.input, active && { borderColor: C.red }]} />
                    <TextInput value={e.r} onChangeText={(t) => update(k, { r: t.replace(/\D/g, '') })} keyboardType="number-pad"
                      placeholder={p?.reps != null ? String(p.reps) : 'reps'} placeholderTextColor="#ffffff80"
                      accessibilityLabel={`Set ${k + 1} reps`} style={st.input} />
                  </View>
                  <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: e.done }} accessibilityLabel={`Set ${k + 1} done`}
                    onPress={() => tick(k)} style={[st.tick, e.done && { backgroundColor: C.green, borderColor: C.green }]}>
                    {e.done && <CheckIcon />}
                  </Pressable>
                </View>
              );
            })}
          </View>

          {(rest > 0 || beat) && (
            <View style={st.rest}>
              <View>
                <Text style={[ui.label, { color: C.green }]}>{rest > 0 ? 'Rest' : 'Nice'}</Text>
                <Text style={st.restTime}>{rest > 0 ? mmss(rest) : 'Done'}</Text>
              </View>
              {beat && <Text style={st.cell}>More weight than last time</Text>}
            </View>
          )}
        </ScrollView>

        <View style={{ padding: 20, paddingTop: 0, flexDirection: 'row', gap: 10 }}>
          {i > 0 && <Button title="Back" variant="ghost" onPress={() => setI(i - 1)} style={{ flex: 1 }} />}
          <Button title={last ? 'Finish workout' : 'Next exercise'} onPress={() => (last ? router.back() : setI(i + 1))} style={{ flex: 2 }} />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const st = StyleSheet.create({
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingTop: 4 },
  icon: { width: 44, height: 44, justifyContent: 'center' },
  title: { fontFamily: F.black, fontSize: 15, color: C.white, textTransform: 'uppercase', letterSpacing: 0.6 },
  time: { fontFamily: F.bold, fontSize: 13, color: C.white },
  progress: { flexDirection: 'row', gap: 4, paddingHorizontal: 20, paddingTop: 8 },
  seg: { flex: 1, height: 4, borderRadius: 2 },
  video: { height: 200, borderRadius: 20, backgroundColor: C.navy2, borderWidth: 1, borderColor: C.line, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  shade: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(13,27,51,0.35)' },
  videoLabel: { position: 'absolute', left: 14, bottom: 12, backgroundColor: 'rgba(13,27,51,0.85)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, overflow: 'hidden' },
  play: { width: 58, height: 58, borderRadius: 29, backgroundColor: C.red, alignItems: 'center', justifyContent: 'center' },
  exName: { fontFamily: F.black, fontSize: 24, color: C.white },
  target: { fontFamily: F.xbold, fontSize: 13, color: C.red2 },
  note: { fontFamily: F.bold, fontSize: 13, color: C.white },
  cue: { fontFamily: F.semi, fontSize: 14, color: C.white, lineHeight: 20 },
  table: { backgroundColor: C.navy2, borderWidth: 1, borderColor: C.line, borderRadius: 18, paddingHorizontal: 14, paddingVertical: 6 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8 },
  rowLine: { borderTopWidth: 1, borderTopColor: C.line, paddingVertical: 10 },
  cell: { fontFamily: F.xbold, fontSize: 15, color: C.white },
  input: { flex: 1, height: 44, borderRadius: 10, borderWidth: 1, borderColor: C.line, backgroundColor: C.navy, color: C.white, fontFamily: F.xbold, fontSize: 16, textAlign: 'center' },
  tick: { width: 36, height: 36, borderRadius: 9, borderWidth: 2, borderColor: C.line, alignItems: 'center', justifyContent: 'center' },
  rest: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'rgba(63,191,127,0.12)', borderWidth: 1, borderColor: 'rgba(63,191,127,0.4)', borderRadius: 14, padding: 14 },
  restTime: { fontFamily: F.black, fontSize: 22, color: C.white },
});
