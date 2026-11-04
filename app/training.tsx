import React, { useMemo, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth } from '../src/lib/auth';
import { C, F } from '../src/lib/theme';
import { Button } from '../src/components/ui';
import { BackIcon, CheckIcon, PlusIcon, SwapIcon } from '../src/components/icons';
import Backdrop from '../src/components/Backdrop';
import { twoTone } from '../src/components/TwoTone';
import SwapSheet from '../src/components/SwapSheet';
import { thumb } from '../src/lib/workoutMeta';
import { exercises } from '../src/lib/program';
import {
  addExtra, applySwap, buildWeek, changeSplit, DAY_NAMES, DEFAULT_DAYS, EQUIP_LABEL, EQUIP_SUB, EXTRA_TARGETS, FOCUS_LABEL, isSwapped,
  MAX_EXTRAS_PER_DAY, MAX_FOCUS, removeExtra, resetSwap, SPLITS, SPLITS_FOR, weekLine, type Equip, type Focus, type TrainCfg,
} from '../src/lib/training';
import { cfgOf, saveTraining } from '../src/lib/trainingSave';
import { track } from '../src/lib/track';

const LETTERS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

/**
 * Your training: split, days, equipment, focus, swaps and your own moves.
 * Sets, reps and the 12-week progression stay locked so the plan keeps working.
 */
export default function Training() {
  const router = useRouter();
  const { plan, profile, session, refresh } = useAuth();
  const start = useMemo(() => cfgOf(plan, profile), []);
  const [cfg, setCfg] = useState<TrainCfg>(start);
  const [swap, setSwap] = useState<{ day: number; ex: number } | null>(null);
  const [adding, setAdding] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const week = useMemo(() => buildWeek(cfg), [cfg]);
  const n = SPLITS[cfg.split].days;
  const daysOk = cfg.days.length === n;
  const changed = JSON.stringify(cfg) !== JSON.stringify(start) || !plan?.train.cfg;

  const up = (c: TrainCfg) => { setMsg(''); setCfg(c); };
  const setCount = (k: number) => up(changeSplit(cfg, SPLITS_FOR[k][0]));
  const toggleDay = (d: number) => {
    const has = cfg.days.includes(d);
    if (!has && cfg.days.length >= n) return setMsg(`You train ${n} days. Tap a day to remove it first.`);
    up({ ...cfg, days: has ? cfg.days.filter((x) => x !== d) : [...cfg.days, d].sort() });
  };
  const toggleFocus = (f: Focus) => {
    const has = cfg.focus.includes(f);
    if (!has && cfg.focus.length >= MAX_FOCUS) return setMsg(`Pick up to ${MAX_FOCUS}. More than that and nothing gets enough work to grow.`);
    up({ ...cfg, focus: has ? cfg.focus.filter((x) => x !== f) : [...cfg.focus, f] });
  };

  const save = async () => {
    if (!plan || !session) return;
    if (!daysOk) return setMsg(`Pick ${n} training days.`);
    setBusy(true); setMsg('');
    const r = await saveTraining(session.user.id, plan, profile, cfg);
    setBusy(false);
    if (!r.ok) return setMsg("That didn't save. Check your connection and try again.");
    track('training_saved', { split: cfg.split, equip: cfg.equip, focus: cfg.focus.join(','), swaps: Object.keys(cfg.swaps).length, extras: cfg.extras.length });
    await refresh();
    router.back();
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }}>
      <Backdrop />
      <ScrollView contentContainerStyle={{ padding: 20, gap: 18, paddingBottom: 48 }} keyboardShouldPersistTaps="handled">
        <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={() => router.back()} hitSlop={10} style={{ width: 40, height: 40, justifyContent: 'center' }}>
          <BackIcon />
        </Pressable>
        <Text style={st.k}>Your plan</Text>
        <Text style={st.h}>{twoTone('Your| training')}</Text>
        <Text style={st.body}>Pick your split, your days and what you've got to train with. Swap any move you don't like. Sets, reps and your 12-week progression stay locked in, so it keeps working.</Text>

        {/* Days a week + split */}
        <Section title="Days a week">
          <View style={st.row}>
            {[3, 4, 5, 6].map((k) => (
              <Pressable key={k} accessibilityRole="radio" accessibilityState={{ selected: n === k }} onPress={() => setCount(k)} style={[st.seg, n === k && st.segOn]}>
                <Text style={[st.segT, n === k && { color: C.bg }]}>{k}</Text>
              </Pressable>
            ))}
          </View>
          {SPLITS_FOR[n].map((id) => {
            const sp = SPLITS[id]; const on = cfg.split === id;
            return (
              <Pressable key={id} accessibilityRole="radio" accessibilityState={{ selected: on }} onPress={() => up(changeSplit(cfg, id))} style={[st.card, on && st.cardOn]}>
                <View style={{ flex: 1, gap: 4 }}>
                  <Text style={st.cardT}>{sp.label}</Text>
                  <Text style={st.small}>{sp.blurb}</Text>
                  <Text style={st.splitDays}>{weekLine(id)}</Text>
                </View>
                <View style={[st.radio, on && st.radioOn]}>{on && <CheckIcon size={12} />}</View>
              </Pressable>
            );
          })}
        </Section>

        <Section title={`Training days · pick ${n}`}>
          <View style={st.dayRow}>
            {LETTERS.map((l, d) => {
              const on = cfg.days.includes(d);
              return (
                <Pressable key={d} accessibilityRole="checkbox" accessibilityState={{ checked: on }} accessibilityLabel={DAY_NAMES[d]} onPress={() => toggleDay(d)} style={[st.dayDot, on && st.dayDotOn]}>
                  <Text style={[st.dayDotT, on && { color: C.ink }]}>{l}</Text>
                </Pressable>
              );
            })}
          </View>
          {!daysOk && <Text style={st.err}>Pick {n - cfg.days.length} more day{n - cfg.days.length > 1 ? 's' : ''}.</Text>}
          {daysOk && <Pressable onPress={() => up({ ...cfg, days: DEFAULT_DAYS[n] })}><Text style={st.link}>Use the recommended days</Text></Pressable>}
        </Section>

        <Section title="Equipment">
          {(['gym', 'db', 'bw'] as Equip[]).map((e) => {
            const on = cfg.equip === e;
            return (
              <Pressable key={e} accessibilityRole="radio" accessibilityState={{ selected: on }} onPress={() => up({ ...cfg, equip: e })} style={[st.card, on && st.cardOn]}>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={st.cardT}>{EQUIP_LABEL[e]}</Text>
                  <Text style={st.small}>{EQUIP_SUB[e]}</Text>
                </View>
                <View style={[st.radio, on && st.radioOn]}>{on && <CheckIcon size={12} />}</View>
              </Pressable>
            );
          })}
        </Section>

        <Section title="Extra focus · optional" sub={`Up to ${MAX_FOCUS}. Adds a few sets for that area on two days.`}>
          <View style={[st.row, { flexWrap: 'wrap' }]}>
            {(Object.keys(FOCUS_LABEL) as Focus[]).map((f) => {
              const on = cfg.focus.includes(f);
              return (
                <Pressable key={f} accessibilityRole="checkbox" accessibilityState={{ checked: on }} onPress={() => toggleFocus(f)} style={[st.chip, on && st.chipOn]}>
                  {on && <View style={st.tick}><CheckIcon size={9} /></View>}
                  <Text style={st.chipT}>{FOCUS_LABEL[f]}</Text>
                </Pressable>
              );
            })}
          </View>
        </Section>

        {!!msg && <Text style={st.err}>{msg}</Text>}

        {/* The week, live */}
        <Text style={st.weekTitle}>Your week</Text>
        {week.map((d, di) => {
          const [dayName, type] = d.t.split('·').map((x) => x.trim());
          const extras = cfg.extras.filter((e) => e.day === di);
          return (
            <View key={di} style={st.day}>
              <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' }}>
                <Text style={st.dayT}>{type}</Text>
                <Text style={st.dayN}>{dayName}</Text>
              </View>
              {d.x.map(([id, target], xi) => {
                const own = d.p[xi] === null;
                const e = exercises[id];
                const swapped = !own && isSwapped(cfg, di, xi);
                return (
                  <View key={id} style={st.ex}>
                    <Image source={thumb(e?.video)} style={st.thumb} resizeMode="cover" accessibilityIgnoresInvertColors />
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={st.exN} numberOfLines={2}>{e?.name || cfg.extras.find((x) => x.id === id)?.name || id}</Text>
                      <Text style={st.exT}>{target}{swapped ? ' · swapped' : own ? ' · your move' : ''}</Text>
                    </View>
                    {own ? (
                      <Pressable accessibilityRole="button" accessibilityLabel={`Remove ${id}`} onPress={() => up(removeExtra(cfg, di, id))} style={st.mini}>
                        <Text style={st.miniT}>Remove</Text>
                      </Pressable>
                    ) : (
                      <Pressable accessibilityRole="button" accessibilityLabel={`Swap ${e?.name || id}`} onPress={() => setSwap({ day: di, ex: xi })} style={[st.mini, swapped && { borderColor: C.red }]}>
                        <SwapIcon size={13} /><Text style={st.miniT}>Swap</Text>
                      </Pressable>
                    )}
                  </View>
                );
              })}
              {adding === di
                ? <AddMove onAdd={(name, target) => { up(addExtra(cfg, di, name, target)); setAdding(null); }} onCancel={() => setAdding(null)} />
                : extras.length < MAX_EXTRAS_PER_DAY && (
                  <Pressable accessibilityRole="button" onPress={() => setAdding(di)} style={st.add}>
                    <PlusIcon size={16} /><Text style={st.addT}>Add your own move</Text>
                  </Pressable>
                )}
            </View>
          );
        })}

        <Button title={busy ? 'Saving…' : changed ? 'Save my training' : 'Done'} loading={busy} onPress={changed ? save : () => router.back()} />
        <Text style={[st.small, { textAlign: 'center' }]}>Changing days starts this week's ticks fresh. Your logged weights carry over.</Text>
      </ScrollView>

      {swap && (
        <SwapSheet cfg={cfg} day={swap.day} ex={swap.ex} onClose={() => setSwap(null)}
          onPick={(to, hurts) => { track('exercise_swap', { to, hurts, where: 'editor' }); up(applySwap(cfg, swap.day, swap.ex, to, hurts)); setSwap(null); }}
          onReset={() => { up(resetSwap(cfg, swap.day, swap.ex)); setSwap(null); }} />
      )}
    </SafeAreaView>
  );
}

function Section({ title, sub, children }: { title: string; sub?: string; children: React.ReactNode }) {
  return (
    <View style={{ gap: 10 }}>
      <Text style={st.secT}>{title}</Text>
      {!!sub && <Text style={st.small}>{sub}</Text>}
      {children}
    </View>
  );
}

function AddMove({ onAdd, onCancel }: { onAdd: (name: string, target: string) => void; onCancel: () => void }) {
  const [name, setName] = useState('');
  const [target, setTarget] = useState(EXTRA_TARGETS[0]);
  return (
    <View style={st.own}>
      <Text style={st.cardT}>Add your own move</Text>
      <Text style={st.small}>It goes at the end, after your main lifts.</Text>
      <TextInput value={name} onChangeText={setName} placeholder="e.g. Sled push, farmer carry" placeholderTextColor="rgba(27,36,64,0.45)" style={st.input} maxLength={40} autoFocus />
      <View style={[st.row, { flexWrap: 'wrap' }]}>
        {EXTRA_TARGETS.map((t) => (
          <Pressable key={t} onPress={() => setTarget(t)} style={[st.chip, target === t && st.chipOn]}><Text style={st.chipT}>{t}</Text></Pressable>
        ))}
      </View>
      <View style={st.row}>
        <Pressable accessibilityRole="button" onPress={onCancel} style={[st.btn2, { flex: 1 }]}><Text style={st.btn2T}>Cancel</Text></Pressable>
        <Pressable accessibilityRole="button" onPress={() => name.trim() && onAdd(name, target)} style={[st.btn2, { flex: 1, backgroundColor: C.red, borderColor: C.red, opacity: name.trim() ? 1 : 0.5 }]}>
          <Text style={st.btn2T}>Add</Text>
        </Pressable>
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  k: { fontFamily: F.xbold, fontSize: 12, letterSpacing: 1.6, textTransform: 'uppercase', color: C.red },
  h: { fontFamily: F.black, fontSize: 32, lineHeight: 36, color: C.ink, letterSpacing: -0.5 },
  body: { fontFamily: F.semi, fontSize: 15, lineHeight: 22, color: C.ink },
  small: { fontFamily: F.semi, fontSize: 13, lineHeight: 19, color: 'rgba(27,36,64,0.75)' },
  secT: { fontFamily: F.xbold, fontSize: 12, letterSpacing: 1.4, textTransform: 'uppercase', color: C.ink },
  row: { flexDirection: 'row', gap: 8 },
  seg: { flex: 1, height: 48, borderRadius: 14, borderWidth: 1.5, borderColor: C.line, backgroundColor: C.card, alignItems: 'center', justifyContent: 'center' },
  segOn: { backgroundColor: C.ink, borderColor: C.ink },
  segT: { fontFamily: F.black, fontSize: 18, color: C.ink },
  card: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 18, borderWidth: 1.5, borderColor: C.line, backgroundColor: C.card, padding: 16 },
  cardOn: { borderColor: C.red, backgroundColor: 'rgba(226,67,59,0.12)' },
  cardT: { fontFamily: F.black, fontSize: 16, color: C.ink },
  splitDays: { fontFamily: F.xbold, fontSize: 12, color: C.red, letterSpacing: 0.3 },
  radio: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: C.line, alignItems: 'center', justifyContent: 'center' },
  radioOn: { backgroundColor: C.green, borderColor: C.green },
  dayRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 6 },
  dayDot: { flex: 1, maxWidth: 46, aspectRatio: 1, borderRadius: 999, borderWidth: 1.5, borderColor: C.line, backgroundColor: C.card, alignItems: 'center', justifyContent: 'center' },
  dayDotOn: { backgroundColor: C.red, borderColor: C.red },
  dayDotT: { fontFamily: F.black, fontSize: 14, color: 'rgba(27,36,64,0.7)' },
  link: { fontFamily: F.bold, fontSize: 13, color: C.ink, textDecorationLine: 'underline' },
  err: { fontFamily: F.bold, fontSize: 14, color: C.red },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 13, paddingVertical: 10, borderRadius: 14, borderWidth: 1.5, borderColor: C.line, backgroundColor: C.card },
  chipOn: { borderColor: C.red, backgroundColor: 'rgba(226,67,59,0.16)' },
  chipT: { fontFamily: F.semi, fontSize: 14, color: C.ink },
  tick: { width: 16, height: 16, borderRadius: 8, backgroundColor: C.red, alignItems: 'center', justifyContent: 'center' },
  weekTitle: { fontFamily: F.black, fontSize: 21, color: C.ink, marginTop: 6 },
  day: { backgroundColor: C.card, borderWidth: 1, borderColor: C.line, borderRadius: 22, padding: 14, gap: 10 },
  dayT: { fontFamily: F.black, fontSize: 19, color: C.ink },
  dayN: { fontFamily: F.xbold, fontSize: 12, letterSpacing: 1.2, textTransform: 'uppercase', color: C.red },
  ex: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  thumb: { width: 64, height: 40, borderRadius: 8, backgroundColor: C.bg },
  exN: { fontFamily: F.xbold, fontSize: 14, lineHeight: 18, color: C.ink },
  exT: { fontFamily: F.semi, fontSize: 12, color: 'rgba(27,36,64,0.75)' },
  mini: { flexDirection: 'row', alignItems: 'center', gap: 5, height: 34, paddingHorizontal: 10, borderRadius: 10, borderWidth: 1.5, borderColor: C.line },
  miniT: { fontFamily: F.xbold, fontSize: 12, color: C.ink },
  add: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, height: 44, borderRadius: 12, borderWidth: 1.5, borderStyle: 'dashed', borderColor: C.line },
  addT: { fontFamily: F.bold, fontSize: 13, color: C.ink },
  own: { gap: 10, borderRadius: 16, borderWidth: 1.5, borderColor: C.red, padding: 14, backgroundColor: C.bg },
  input: { height: 48, borderRadius: 12, borderWidth: 1.5, borderColor: C.line, backgroundColor: C.card, color: C.ink, paddingHorizontal: 14, fontFamily: F.semi, fontSize: 15 },
  btn2: { height: 46, borderRadius: 12, borderWidth: 1.5, borderColor: C.ink, alignItems: 'center', justifyContent: 'center' },
  btn2T: { fontFamily: F.bold, fontSize: 16, color: C.ink },
});
