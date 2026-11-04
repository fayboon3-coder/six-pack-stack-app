import { track } from '../src/lib/track';
import { askForRatingAfterWin } from '../src/lib/rating';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Image, InputAccessoryView, Keyboard, Linking, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuth } from '../src/lib/auth';
import { thumb } from '../src/lib/workoutMeta';
import { C, F } from '../src/lib/theme';
import { Button, s as ui } from '../src/components/ui';
import { BackIcon, CheckIcon, PlayIcon } from '../src/components/icons';
import { exercises, repsOf, setsFor, weekOf } from '../src/lib/program';
import { isoDate, lastSession, saveSet } from '../src/lib/logs';
import { isLocked } from '../src/lib/access';
import { getStreak } from '../src/lib/streak';
import RemindersCard from '../src/components/RemindersCard';
import { ClockIcon, FlameIcon, TrophyIcon } from '../src/components/icons';
import { RoundBtn } from '../src/components/PageTitle';
import Backdrop from '../src/components/Backdrop';
import SwapSheet from '../src/components/SwapSheet';
import { SwapIcon } from '../src/components/icons';
import { exName } from '../src/lib/workoutMeta';
import { applySwap, resetSwap, type TrainCfg } from '../src/lib/training';
import { canEditTraining, saveTraining } from '../src/lib/trainingSave';

type Entry = { w: string; r: string; done: boolean };
const REST = 90;
const ACC = 'setInputs';

export default function Workout() {
  const { d, i: i0 } = useLocalSearchParams<{ d: string; i?: string }>();
  const { plan, session, profile, refresh } = useAuth();
  const [swapOpen, setSwapOpen] = useState(false);
  const router = useRouter();
  const dayIdx = Number(d || 0);
  const day = plan?.train.d[dayIdx];
  const week = weekOf(plan?.train.s);
  const [i, setI] = useState(Math.max(0, Number(i0 || 0)));
  const [entries, setEntries] = useState<Record<string, Entry[]>>({});
  const [prev, setPrev] = useState<Record<string, { weight: number | null; reps: number | null }[]>>({});
  const [rest, setRest] = useState(0);
  const [startedAt] = useState(Date.now());
  const [now, setNow] = useState(Date.now());
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const [kb, setKb] = useState(false);
  const [pr, setPr] = useState<string>('');
  const [prs, setPrs] = useState<string[]>([]);
  const [finished, setFinished] = useState(false);
  const [streak, setStreak] = useState<{ weeks: number; workouts: number } | null>(null);

  // Free plan past week 2: send them to the offers instead of the workout.
  useEffect(() => { if (isLocked(profile, week)) router.replace('/unlock'); }, [profile, week]);

  // Hide the bottom buttons while typing so they never jump up over the keyboard.
  useEffect(() => {
    const show = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow', () => setKb(true));
    const hide = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide', () => setKb(false));
    return () => { show.remove(); hide.remove(); };
  }, []);

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
    // Personal record: more weight than any set last time, or same top weight for more reps
    const past = (prev[ex[0]] || []).filter(Boolean) as { weight: number | null; reps: number | null }[];
    const topW = Math.max(0, ...past.map((x) => Number(x.weight) || 0));
    const topR = Math.max(0, ...past.filter((x) => Number(x.weight) === topW).map((x) => Number(x.reps) || 0));
    const nw = Number(w), nr = Number(r);
    if (past.length && nw > 0 && (nw > topW || (nw === topW && nr > topR)) && !prs.includes(ex[0])) {
      const name = exName(ex[0], plan);
      setPr(`${name}: ${nw} lbs × ${nr || '?'}`);
      setPrs([...prs, ex[0]]);
      setTimeout(() => setPr(''), 4500);
    }
    if (session) {
      await saveSet({
        user_id: session.user.id, logged_on: isoDate(), day_label: day.t, exercise_id: ex[0], set_no: k + 1,
        weight: w ? Number(w) : null, reps: r ? Number(r) : null,
      });
    }
  };

  // Swaps work on plans the app built (the person's own training choices).
  const cfg = plan.train.cfg as TrainCfg | undefined;
  const canSwap = !!cfg && canEditTraining(profile) && !(entries[ex[0]] || []).some((e) => e.done);
  const doSwap = async (next: TrainCfg) => {
    setSwapOpen(false);
    if (!session) return;
    await saveTraining(session.user.id, plan, profile, next);
    await refresh();
  };

  const nextUndone = list.findIndex((e) => !e.done);
  const elapsed = Math.floor((now - startedAt) / 1000);
  const mmss = (t: number) => `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`;
  const last = i === day.x.length - 1;
  const p0 = prev[ex[0]] || [];
  const beat = list.some((e, k) => e.done && p0[k]?.weight != null && Number(e.w) > Number(p0[k]!.weight));

  const finish = async () => {
    setFinished(true);
    track('workout_done', { prs: prs.length });
    if (prs.length) askForRatingAfterWin('pr');
    if (session) setStreak(await getStreak(session.user.id, plan.train.d.length));
  };
  const setsDone = Object.values(entries).flat().filter((e) => e.done).length;

  if (finished) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }}>
      <Backdrop />
        <ScrollView contentContainerStyle={{ padding: 24, gap: 16, paddingBottom: 48 }}>
          <View style={st.doneBadge}><CheckIcon color={C.bg} size={30} /></View>
          <Text style={st.doneK}>{(day.t.split('·')[1] || day.t).trim()} done</Text>
          <Text style={st.doneH}>{prs.length ? `${prs.length} new personal record${prs.length > 1 ? 's' : ''}.` : 'Another one in the bank.'}</Text>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <View style={st.doneTile}><Text style={st.doneV}>{mmss(elapsed)}</Text><Text style={st.doneL}>Time</Text></View>
            <View style={st.doneTile}><Text style={st.doneV}>{setsDone}</Text><Text style={st.doneL}>Sets</Text></View>
            <View style={st.doneTile}><Text style={st.doneV}>{streak ? streak.workouts : '–'}</Text><Text style={st.doneL}>Workouts</Text></View>
          </View>
          {!!streak && streak.weeks > 0 && (
            <View style={st.streak}><FlameIcon size={22} /><Text style={st.streakT}>{streak.weeks}-week streak. Don't break it.</Text></View>
          )}
          {prs.map((id) => (
            <View key={id} style={st.prRow}><TrophyIcon color={C.green} /><Text style={st.prT}>{exName(id, plan)}</Text></View>
          ))}
          <Text style={st.doneSub}>Want a nudge on your next training day?</Text>
          <RemindersCard compact />
          <Button title="Back to my plan" onPress={() => router.back()} />
        </ScrollView>
      </SafeAreaView>
    );
  }

  const nextName = !last ? exName(day.x[i + 1][0], plan) : '';
  const go = (n: number) => { Keyboard.dismiss(); setI(n); };
  const exit = () => (router.canGoBack() ? router.back() : router.replace('/'));

  return (
    <SafeAreaView edges={['top', 'bottom']} style={{ flex: 1, backgroundColor: C.bg }}>
      {!!pr && (
        <View style={st.prBanner} accessibilityLiveRegion="polite">
          <TrophyIcon color={C.onAccent} size={22} />
          <View style={{ flex: 1 }}><Text style={st.prK}>New personal record</Text><Text style={st.prV}>{pr}</Text></View>
        </View>
      )}
      <View style={{ flex: 1 }}>
        <View style={st.top}>
          <RoundBtn kind="close" label="Close workout" onPress={exit} />
          <View style={st.progress}>
            {day.x.map((_, k) => (
              <Pressable key={k} onPress={() => go(k)} accessibilityLabel={`Exercise ${k + 1}`} hitSlop={{ top: 12, bottom: 12 }} style={{ flex: 1 }}>
                <View style={[st.seg, { backgroundColor: k === i ? '#e2433b' : k < i ? C.navy : '#e8eaf0' }]} />
              </Pressable>
            ))}
          </View>
          <Text style={st.count}>{i + 1} / {day.x.length}</Text>
        </View>

        <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }} keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive" automaticallyAdjustKeyboardInsets>
          <Pressable accessibilityRole="button" accessibilityLabel={`Watch form video for ${exName(ex[0], plan)}`} style={st.video} disabled={!info?.video}
            onPress={() => info?.video && Linking.openURL(`https://www.youtube.com/watch?v=${info.video}`)}>
            {!!info?.video && <Image source={thumb(info.video, 'hq')} style={StyleSheet.absoluteFill} resizeMode="cover" accessibilityIgnoresInvertColors />}
            <View style={st.play}><PlayIcon color="#fff" size={24} /></View>
            <Text style={[st.vTag, { left: 12 }]}>HD form demo</Text>
            <Text style={[st.vTag, { right: 12, fontFamily: F.medium, fontSize: 12 }]}>Curated YouTube video</Text>
          </Pressable>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 14 }}>
            <Text style={st.exName} accessibilityRole="header">{exName(ex[0], plan)}</Text>
            {canSwap && (
              <Pressable accessibilityRole="button" accessibilityLabel={`Swap ${exName(ex[0], plan)}`} onPress={() => setSwapOpen(true)} hitSlop={6} style={st.swapBtn}>
                <SwapIcon size={15} /><Text style={st.swapT}>Swap</Text>
              </Pressable>
            )}
          </View>
          <Text style={st.target}>{nSets} sets · {repsOf(ex[1])} reps</Text>
          {!!ex[2] && <Text style={st.note}>{ex[2]}</Text>}
          <View style={{ gap: 6, marginTop: 10 }}>
            {(info?.cues || []).slice(0, 3).map((c, k) => (
              <View key={k} style={{ flexDirection: 'row', gap: 10 }}><Text style={st.cueN}>{k + 1}</Text><Text style={st.cue}>{c}</Text></View>
            ))}
          </View>

          <View style={st.table}>
            <View style={[st.grid, st.head]}>
              <Text style={[st.h, { width: 34 }]}>SET</Text>
              <Text style={[st.h, { flex: 1 }]}>LAST WEEK</Text>
              <Text style={[st.h, { width: 74 }]}>LBS</Text>
              <Text style={[st.h, { width: 64 }]}>REPS</Text>
              <View style={{ width: 44 }} />
            </View>
            {list.map((e, k) => {
              const p = p0[k];
              return (
                <View key={k} style={[st.grid, st.setRow, e.done && { backgroundColor: '#e7f6ee' }]}>
                  <Text style={[st.setNo, { width: 34 }]}>{k + 1}</Text>
                  <Text style={st.last} numberOfLines={1}>{p ? `${p.weight ?? '–'} × ${p.reps ?? '–'}` : '—'}</Text>
                  <TextInput value={e.w} onChangeText={(t) => update(k, { w: t.replace(/[^\d.]/g, '') })} keyboardType="decimal-pad"
                    placeholder={p?.weight != null ? String(p.weight) : ''} placeholderTextColor="#1b244066" returnKeyType="done"
                    inputAccessoryViewID={ACC} accessibilityLabel={`Set ${k + 1} weight in pounds`} style={[st.input, { width: 74 }, k === nextUndone && { borderColor: '#e2433b' }]} />
                  <TextInput value={e.r} onChangeText={(t) => update(k, { r: t.replace(/\D/g, '') })} keyboardType="number-pad"
                    placeholder={p?.reps != null ? String(p.reps) : ''} placeholderTextColor="#1b244066" returnKeyType="done"
                    inputAccessoryViewID={ACC} accessibilityLabel={`Set ${k + 1} reps`} style={[st.input, { width: 64 }]} />
                  <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: e.done }} accessibilityLabel={`Complete set ${k + 1}`} hitSlop={6}
                    onPress={() => { Keyboard.dismiss(); tick(k); }} style={[st.tick, e.done && { backgroundColor: C.red, borderWidth: 0 }]}>
                    <CheckIcon color={e.done ? '#fff' : C.muted} size={16} />
                  </Pressable>
                </View>
              );
            })}
          </View>
          {beat && <Text style={st.beat}>More weight than last week. That's progress.</Text>}
        </ScrollView>

        {Platform.OS === 'ios' && (
          <InputAccessoryView nativeID={ACC}>
            <View style={st.acc}>
              <Text style={st.accText}>{exName(ex[0], plan)}</Text>
              <Pressable accessibilityRole="button" onPress={() => Keyboard.dismiss()} hitSlop={10} style={st.accBtn}><Text style={st.accBtnText}>Done</Text></Pressable>
            </View>
          </InputAccessoryView>
        )}

        {swapOpen && cfg && (
          <SwapSheet cfg={cfg} day={dayIdx} ex={i} onClose={() => setSwapOpen(false)}
            onPick={(to, hurts) => { track('exercise_swap', { to, hurts, where: 'workout' }); doSwap(applySwap(cfg, dayIdx, i, to, hurts)); }}
            onReset={() => doSwap(resetSwap(cfg, dayIdx, i))} />
        )}

        {!kb && <View style={st.footer}>
          <View style={[st.timer, rest > 0 ? { backgroundColor: '#e8eaf0' } : { backgroundColor: '#e7f6ee' }]} accessibilityLabel={rest > 0 ? `Rest ${mmss(rest)}` : 'Go'}>
            <ClockIcon color={rest > 0 ? C.ink : C.green} size={18} />
            <Text style={[st.timerT, { color: rest > 0 ? C.ink : C.green }]}>{rest > 0 ? `Rest ${mmss(rest)}` : 'Go'}</Text>
          </View>
          <Pressable accessibilityRole="button" onPress={() => (last ? finish() : go(i + 1))} style={({ pressed }) => [st.next, pressed && { opacity: 0.88 }]}>
            <Text style={st.nextT} numberOfLines={1}>{last ? 'Finish workout' : `Next: ${nextName}`}</Text>
          </Pressable>
        </View>}
      </View>
    </SafeAreaView>
  );
}

const st = StyleSheet.create({
  count: { fontFamily: F.bold, fontSize: 14, color: C.ink },
  vTag: { position: 'absolute', bottom: 10, fontFamily: F.semi, fontSize: 13, color: C.ink, backgroundColor: 'rgba(255,255,255,0.92)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, overflow: 'hidden' },
  cueN: { fontFamily: F.xbold, fontSize: 14, color: C.ink, width: 10 },
  grid: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12 },
  beat: { fontFamily: F.bold, fontSize: 14, color: C.green, marginTop: 12 },
  timer: { flexDirection: 'row', alignItems: 'center', gap: 8, height: 54, paddingHorizontal: 16, borderRadius: 27 },
  timerT: { fontFamily: F.xbold, fontSize: 17, fontVariant: ['tabular-nums'] },
  next: { flex: 1, height: 54, borderRadius: 27, backgroundColor: C.red, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 14 },
  nextT: { fontFamily: F.bold, fontSize: 17, color: C.onAccent },
  prBanner: { position: 'absolute', zIndex: 10, top: 60, left: 16, right: 16, flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: C.green, borderRadius: 18, padding: 14 },
  prK: { fontFamily: F.xbold, fontSize: 11, letterSpacing: 1.4, textTransform: 'uppercase', color: C.onAccent },
  prV: { fontFamily: F.black, fontSize: 17, color: C.onAccent },
  doneBadge: { width: 64, height: 64, borderRadius: 32, backgroundColor: C.green, alignItems: 'center', justifyContent: 'center', marginTop: 20 },
  doneK: { fontFamily: F.xbold, fontSize: 12, letterSpacing: 1.6, textTransform: 'uppercase', color: C.green },
  doneH: { fontFamily: F.black, fontSize: 32, lineHeight: 36, color: C.ink, textTransform: 'uppercase', letterSpacing: -0.5 },
  doneTile: { flex: 1, backgroundColor: C.card, borderRadius: 16, borderWidth: 1, borderColor: C.line, padding: 12, gap: 2 },
  doneV: { fontFamily: F.black, fontSize: 22, color: C.ink },
  doneL: { fontFamily: F.xbold, fontSize: 10, letterSpacing: 1.2, textTransform: 'uppercase', color: C.ink },
  streak: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1.5, borderColor: C.red, borderRadius: 16, padding: 14 },
  streakT: { fontFamily: F.black, fontSize: 16, color: C.ink, flex: 1 },
  prRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  prT: { fontFamily: F.bold, fontSize: 15, color: C.ink },
  doneSub: { fontFamily: F.bold, fontSize: 15, color: C.ink, marginTop: 8 },
  top: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 12 },
  icon: { width: 44, height: 44, justifyContent: 'center' },
  title: { fontFamily: F.black, fontSize: 15, color: C.ink, textTransform: 'uppercase', letterSpacing: 0.6 },
  time: { fontFamily: F.bold, fontSize: 13, color: C.ink },
  progress: { flex: 1, flexDirection: 'row', gap: 4 },
  seg: { height: 5, borderRadius: 3 },
  video: { height: 190, borderRadius: 20, backgroundColor: C.bg, borderWidth: 1, borderColor: C.line, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  shade: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(13,27,51,0.35)' },
  videoLabel: { position: 'absolute', left: 14, bottom: 12, backgroundColor: 'rgba(13,27,51,0.85)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, overflow: 'hidden' },
  play: { width: 60, height: 60, borderRadius: 30, backgroundColor: 'rgba(217,58,49,0.95)', alignItems: 'center', justifyContent: 'center' },
  exName: { flex: 1, fontFamily: F.black, fontSize: 24, letterSpacing: -0.4, color: C.ink },
  target: { fontFamily: F.semi, fontSize: 13, color: C.red, marginTop: 4 },
  note: { fontFamily: F.medium, fontSize: 13, lineHeight: 18, color: C.ink, marginTop: 2 },
  cue: { flex: 1, fontFamily: F.medium, fontSize: 14, lineHeight: 20, color: C.ink },
  table: { marginTop: 14, backgroundColor: C.card, borderWidth: 1, borderColor: C.line, borderRadius: 18, overflow: 'hidden' },
  head: { paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: C.line },
  h: { fontFamily: F.bold, fontSize: 12, letterSpacing: 0.5, color: C.ink },
  setRow: { paddingVertical: 8 },
  setRowActive: { borderColor: C.red },
  setRowDone: { borderColor: 'rgba(63,191,127,0.6)', backgroundColor: 'rgba(63,191,127,0.08)' },
  setNo: { fontFamily: F.xbold, fontSize: 16, color: C.ink },
  setNoText: { fontFamily: F.black, fontSize: 14, color: C.ink },
  last: { flex: 1, minWidth: 0, fontFamily: F.medium, fontSize: 14, color: C.ink },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8 },
  rowLine: { borderTopWidth: 1, borderTopColor: C.line, paddingVertical: 10 },
  cell: { fontFamily: F.xbold, fontSize: 15, color: C.ink },
  input: { height: 40, borderRadius: 10, borderWidth: 1.5, borderColor: '#d5d9e3', backgroundColor: C.bg, color: C.ink, fontFamily: F.bold, fontSize: 16, textAlign: 'center', paddingHorizontal: 4 },
  tick: { width: 44, height: 40, borderRadius: 10, borderWidth: 1.5, borderColor: '#c3c8d4', alignItems: 'center', justifyContent: 'center' },
  rest: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'rgba(63,191,127,0.12)', borderWidth: 1, borderColor: 'rgba(63,191,127,0.4)', borderRadius: 14, padding: 14 },
  footer: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8, flexDirection: 'row', gap: 10, alignItems: 'center', borderTopWidth: 1, borderTopColor: '#e6e8ef', backgroundColor: C.bg },
  acc: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: C.card, borderTopWidth: 1, borderTopColor: C.line, paddingHorizontal: 16, paddingVertical: 8 },
  accText: { fontFamily: F.xbold, fontSize: 13, color: C.ink, flex: 1 },
  accBtn: { backgroundColor: C.red, borderRadius: 10, paddingHorizontal: 16, paddingVertical: 8 },
  accBtnText: { fontFamily: F.black, fontSize: 14, color: C.onAccent },
  swapBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 40, paddingHorizontal: 14, borderRadius: 20, borderWidth: 1.5, borderColor: '#d9dde7', backgroundColor: C.bg },
  swapT: { fontFamily: F.bold, fontSize: 15, color: C.ink },
  restTime: { fontFamily: F.black, fontSize: 22, color: C.ink },
});
