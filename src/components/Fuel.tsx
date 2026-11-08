import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, Keyboard, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Path, Stop } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { E, F } from '../lib/theme';
import { addFood, QUICK, recentFoods, removeFood } from '../lib/food';
import { foodName, itemFor, parseFoods, portionLabel, type ParsedItem } from '../lib/parseFood';
import { foodPhoto } from '../lib/foodPhotos';
import { FOOD_HD } from '../lib/hd';
import { picFor } from '../lib/foodMatch';
import { track } from '../lib/track';
import { FoodThumb } from './FoodTiles';
import { CountUp, reducedMotion, useInView, useTween } from './motion';
import { DayPlan } from './charts';

/**
 * Today's fuel: a calorie gauge and a protein bar that move the moment anything is logged, and a
 * box where you just type what you ate ("6 oz chicken and a cup of rice"). Every food it reads
 * shows with its photo and numbers; one tap adds the calories and protein everywhere.
 */

const native = Platform.OS !== 'web';
const fmt = (n: number) => Math.round(n).toLocaleString('en-US');
const clamp = (n: number, a: number, b: number) => Math.max(a, Math.min(b, n));
const buzz = () => { if (Platform.OS === 'ios') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {}); };
let gid = 0;

/* ================================================================
 * Calorie gauge
 * ================================================================ */

const SWEEP = 240;
const START = 150; // degrees, 0 = 3 o'clock, clockwise

function arc(cx: number, cy: number, r: number, from: number, to: number) {
  const rad = (d: number) => (d * Math.PI) / 180;
  const x0 = cx + r * Math.cos(rad(from)), y0 = cy + r * Math.sin(rad(from));
  const x1 = cx + r * Math.cos(rad(to)), y1 = cy + r * Math.sin(rad(to));
  return `M${x0.toFixed(2)},${y0.toFixed(2)} A${r},${r} 0 ${to - from > 180 ? 1 : 0} 1 ${x1.toFixed(2)},${y1.toFixed(2)}`;
}

export function CalorieGauge({ kcal, goal, size = 236 }: { kcal: number; goal: number; size?: number }) {
  const [ref, seen] = useInView();
  const pct = clamp(kcal / Math.max(1, goal), 0, 1);
  const p = useTween(seen ? pct : 0, { duration: 1300, delay: 150, run: seen });
  const over = kcal > goal;
  const left = Math.abs(goal - kcal);
  const id = useRef(`cg${++gid}`).current;

  // "+520" rises out of the gauge whenever calories go up.
  const [bump, setBump] = useState<number | null>(null);
  const prev = useRef<number | null>(null);
  const fly = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (prev.current != null && kcal > prev.current && !reducedMotion()) {
      setBump(kcal - prev.current);
      fly.setValue(0);
      Animated.timing(fly, { toValue: 1, duration: 1400, easing: Easing.out(Easing.cubic), useNativeDriver: native }).start(() => setBump(null));
    }
    prev.current = kcal;
  }, [kcal]);

  const stroke = 18, r = size / 2 - stroke / 2 - 2, cx = size / 2, cy = size / 2;
  const endY = cy + r * Math.sin((30 * Math.PI) / 180) + stroke / 2;
  const h = Math.round(endY + 40);
  const endX = r * Math.cos((30 * Math.PI) / 180);
  const end = START + SWEEP * Math.max(0.0015, p);
  const tip = { x: cx + r * Math.cos((end * Math.PI) / 180), y: cy + r * Math.sin((end * Math.PI) / 180) };
  const ticks = [0.25, 0.5, 0.75].map((t) => {
    const a = ((START + SWEEP * t) * Math.PI) / 180, r0 = r - stroke / 2 - 7, r1 = r - stroke / 2 - 3;
    return `M${(cx + r0 * Math.cos(a)).toFixed(1)},${(cy + r0 * Math.sin(a)).toFixed(1)} L${(cx + r1 * Math.cos(a)).toFixed(1)},${(cy + r1 * Math.sin(a)).toFixed(1)}`;
  });

  return (
    <View ref={ref} collapsable={false} style={{ width: size, height: h, alignSelf: 'center' }}
      accessibilityRole="progressbar" accessibilityLabel={`${fmt(kcal)} of ${fmt(goal)} calories. ${fmt(left)} ${over ? 'over' : 'left'}.`}>
      <Svg width={size} height={endY + 2}>
        <Defs>
          <LinearGradient id={id} x1="0" y1="1" x2="1" y2="0">
            <Stop offset="0" stopColor="#ff9a62" />
            <Stop offset="1" stopColor={E.red} />
          </LinearGradient>
        </Defs>
        <Path d={arc(cx, cy, r, START, START + SWEEP)} stroke={E.soft} strokeWidth={stroke} strokeLinecap="round" fill="none" />
        {ticks.map((d, k) => <Path key={k} d={d} stroke="#d6d2c8" strokeWidth={2} strokeLinecap="round" />)}
        <Path d={arc(cx, cy, r, START, end)} stroke={over ? E.red : `url(#${id})`} strokeWidth={stroke} strokeLinecap="round" fill="none" />
        {p > 0.004 && <Circle cx={tip.x} cy={tip.y} r={stroke / 2 - 4} fill="#fff" />}
      </Svg>
      <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, top: 0, height: size, alignItems: 'center', justifyContent: 'center' }}>
        <CountUp value={left} style={[g.big, over && { color: E.red }]} duration={1100} />
        <Text style={g.lbl}>{over ? 'CALORIES OVER' : 'CALORIES LEFT'}</Text>
        {bump != null && (
          <Animated.View style={[g.bump, { opacity: fly.interpolate({ inputRange: [0, 0.15, 0.75, 1], outputRange: [0, 1, 1, 0] }), transform: [{ translateY: fly.interpolate({ inputRange: [0, 1], outputRange: [10, -34] }) }] }]}>
            <Text style={g.bumpT}>+{fmt(bump)} cal</Text>
          </Animated.View>
        )}
      </View>
      <View style={[g.end, { left: cx - endX - 40, top: endY + 4 }]} pointerEvents="none"><Text style={g.endV}>{fmt(kcal)}</Text><Text style={g.endK}>EATEN</Text></View>
      <View style={[g.end, { left: cx + endX - 40, top: endY + 4 }]} pointerEvents="none"><Text style={g.endV}>{fmt(goal)}</Text><Text style={g.endK}>GOAL</Text></View>
    </View>
  );
}

const g = StyleSheet.create({
  big: { fontFamily: F.black, fontSize: 50, letterSpacing: -2.2, color: E.ink, fontVariant: ['tabular-nums'] },
  lbl: { fontFamily: F.bold, fontSize: 10.5, letterSpacing: 1.6, color: E.sub, marginTop: -2 },
  bump: { position: 'absolute', top: '18%', paddingHorizontal: 10, height: 24, borderRadius: 12, backgroundColor: E.green, justifyContent: 'center' },
  bumpT: { fontFamily: F.xbold, fontSize: 12.5, color: '#fff' },
  end: { position: 'absolute', width: 80, alignItems: 'center' },
  endV: { fontFamily: F.xbold, fontSize: 15, color: E.ink, fontVariant: ['tabular-nums'] },
  endK: { fontFamily: F.bold, fontSize: 9, letterSpacing: 1.2, color: E.faint, marginTop: 1 },
});

/* ================================================================
 * Protein bar
 * ================================================================ */

export function ProteinBar({ protein, goal, onAdd }: { protein: number; goal: number; onAdd?: () => void }) {
  const [ref, seen] = useInView();
  const p = useTween(seen ? clamp(protein / Math.max(1, goal), 0, 1) : 0, { duration: 1100, delay: 350, run: seen });
  const done = protein >= goal;
  return (
    <View ref={ref} collapsable={false} accessibilityLabel={`Protein ${fmt(protein)} of ${goal} grams`}>
      <View style={pb.head}>
        <Text style={pb.k}>PROTEIN</Text>
        <View style={{ flex: 1 }} />
        <CountUp value={protein} style={[pb.v, done && { color: E.green }]} />
        <Text style={pb.of}> / {goal} g</Text>
        {!!onAdd && !done && (
          <Pressable accessibilityRole="button" accessibilityLabel="Add 25 grams of protein" onPress={onAdd} hitSlop={8} style={pb.add}>
            <Text style={pb.addT}>+25 g</Text>
          </Pressable>
        )}
        {done && <Svg width={18} height={18} viewBox="0 0 24 24" style={{ marginLeft: 6 }}><Path d="M5 12.5l4.5 4.5L19 7.5" stroke={E.green} strokeWidth={3} fill="none" strokeLinecap="round" strokeLinejoin="round" /></Svg>}
      </View>
      <View style={pb.track}>
        <View style={[pb.fill, { width: `${p * 100}%`, backgroundColor: done ? E.green : E.ink }]} />
        {[0.25, 0.5, 0.75].map((t) => <View key={t} style={[pb.tick, { left: `${t * 100}%` }]} />)}
      </View>
    </View>
  );
}

const pb = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'baseline', marginBottom: 9 },
  k: { fontFamily: F.bold, fontSize: 10.5, letterSpacing: 1.4, color: E.sub },
  v: { fontFamily: F.black, fontSize: 20, letterSpacing: -0.6, color: E.ink, fontVariant: ['tabular-nums'] },
  of: { fontFamily: F.semi, fontSize: 13, color: E.sub },
  add: { marginLeft: 10, height: 26, paddingHorizontal: 10, borderRadius: 13, backgroundColor: E.ink, justifyContent: 'center', alignSelf: 'center' },
  addT: { fontFamily: F.bold, fontSize: 12, color: '#fff' },
  track: { height: 12, borderRadius: 6, backgroundColor: E.soft, overflow: 'hidden' },
  fill: { position: 'absolute', left: 0, top: 0, bottom: 0, borderRadius: 6 },
  tick: { position: 'absolute', top: 3, bottom: 3, width: 1.5, marginLeft: -0.75, backgroundColor: 'rgba(255,255,255,0.7)' },
});

/** The gauge and the protein bar together (Meals and Log food). */
export function FuelCard({ kcal, kGoal, protein, pGoal, onProtein, onLogged, where = 'fuel', parts, onParts, children, style }: {
  kcal: number; kGoal: number; protein: number; pGoal: number; onProtein?: () => void;
  /** Show the type-to-log box; called after anything is added or undone. */
  onLogged?: () => void; where?: string;
  /** Today's plan meals as slices of the day. */
  parts?: { label: string; kcal: number; done: boolean }[]; onParts?: () => void;
  children?: React.ReactNode; style?: StyleProp<ViewStyle>;
}) {
  const eaten = (parts || []).filter((p) => p.done).length;
  return (
    <View style={[fc.card, style]}>
      <View style={{ paddingTop: 20, paddingHorizontal: 18 }}><CalorieGauge kcal={kcal} goal={kGoal} /></View>
      <View style={{ paddingHorizontal: 18, paddingTop: 18, paddingBottom: 18 }}><ProteinBar protein={protein} goal={pGoal} onAdd={onProtein} /></View>
      {!!onLogged && <View style={fc.sec}><LogBox onLogged={onLogged} where={where} /></View>}
      {!!parts && parts.length > 1 && (
        <Pressable accessibilityRole="button" disabled={!onParts} onPress={onParts} style={fc.sec}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 9 }}>
            <Text style={[fc.k, { flex: 1 }]}>TODAY'S PLAN MEALS</Text>
            <Text style={fc.kr}>{eaten} of {parts.length} eaten</Text>
          </View>
          <DayPlan parts={parts} />
        </Pressable>
      )}
      {children}
    </View>
  );
}

const fc = StyleSheet.create({
  card: { borderRadius: 24, backgroundColor: E.surface, borderWidth: 1, borderColor: E.hair, overflow: 'hidden' },
  sec: { borderTopWidth: 1, borderTopColor: E.hair, paddingHorizontal: 18, paddingVertical: 16 },
  k: { fontFamily: F.bold, fontSize: 10.5, letterSpacing: 1.4, color: E.sub },
  kr: { fontFamily: F.semi, fontSize: 12, color: E.sub },
});

/* ================================================================
 * Type it, log it
 * ================================================================ */

type Chip = { name: string; kcal: number; protein: number; carbs?: number | null; fat?: number | null };

export function LogBox({ onLogged, where }: { onLogged: () => void; where: string }) {
  const router = useRouter();
  const [text, setText] = useState('');
  const [qty, setQty] = useState<Record<string, number>>({});
  const [recent, setRecent] = useState<Chip[]>([]);
  const [added, setAdded] = useState<{ ids: string[]; label: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [focus, setFocus] = useState(false);
  const hide = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadRecent = () => recentFoods(8).then((r) => setRecent(r.map((f) => ({ name: f.name, kcal: f.kcal, protein: f.protein, carbs: f.carbs, fat: f.fat })))).catch(() => {});
  useEffect(() => { loadRecent(); return () => { if (hide.current) clearTimeout(hide.current); }; }, []);

  const parsed = useMemo(() => parseFoods(text), [text]);
  const items: ParsedItem[] = parsed.items.map((it) => (qty[it.id] != null ? itemFor(it.food, qty[it.id]) : it));
  const tot = items.reduce((a, b) => ({ kcal: a.kcal + b.kcal, protein: a.protein + b.protein }), { kcal: 0, protein: 0 });
  const chips: Chip[] = recent.length >= 3 ? recent : [...recent, ...QUICK.filter((q) => !recent.some((r) => r.name.toLowerCase() === q.name.toLowerCase()))].slice(0, 8);

  const done = (ids: string[], label: string) => {
    buzz();
    setAdded({ ids, label });
    if (hide.current) clearTimeout(hide.current);
    hide.current = setTimeout(() => setAdded(null), 7000);
    onLogged();
    loadRecent();
  };

  const addTyped = async () => {
    if (!items.length || busy) return;
    setBusy(true);
    const ids: string[] = [];
    for (const it of items) {
      const e = await addFood({ name: `${foodName(it.food)}, ${portionLabel(it.food, it.qty)}`, kcal: it.kcal, protein: it.protein, carbs: it.carbs, fat: it.fat, source: 'quick' });
      ids.push(e.id);
    }
    track('food_typed', { where, n: items.length, kcal: tot.kcal });
    setText(''); setQty({}); Keyboard.dismiss(); setBusy(false);
    done(ids, `${fmt(tot.kcal)} cal · ${fmt(tot.protein)} g protein`);
  };

  const addChip = async (c: Chip) => {
    if (busy) return;
    setBusy(true);
    const e = await addFood({ name: c.name, kcal: c.kcal, protein: c.protein, carbs: c.carbs ?? null, fat: c.fat ?? null, source: 'quick' });
    track('food_chip', { where, kcal: c.kcal });
    setBusy(false);
    done([e.id], `${c.name} · ${fmt(c.kcal)} cal`);
  };

  const undo = async () => {
    if (!added) return;
    for (const id of added.ids) await removeFood(id);
    setAdded(null);
    onLogged();
    loadRecent();
    track('food_undo', { where });
  };

  const step = (it: ParsedItem, dir: 1 | -1) => {
    const s = it.food.step || 1;
    const next = Math.max(s, Math.round((it.qty + dir * s) * 100) / 100);
    setQty((q) => ({ ...q, [it.id]: next }));
  };

  return (
    <View style={lb.wrap}>
      <View style={[lb.box, !!text && { borderColor: E.ink }]}>
        <Svg width={18} height={18} viewBox="0 0 24 24"><Path d="M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14zM20 20l-4-4" stroke={E.sub} strokeWidth={2.2} fill="none" strokeLinecap="round" /></Svg>
        <TextInput value={text} onChangeText={(t) => { setText(t); setQty({}); }} placeholder="What did you eat?" onFocus={() => setFocus(true)} onBlur={() => setFocus(false)}
          placeholderTextColor={E.faint} style={lb.input} returnKeyType="done" onSubmitEditing={addTyped} autoCorrect={false}
          accessibilityLabel="Type what you ate" />
        {!!text && (
          <Pressable accessibilityRole="button" accessibilityLabel="Clear" onPress={() => { setText(''); setQty({}); }} hitSlop={8} style={lb.clear}>
            <Svg width={12} height={12} viewBox="0 0 24 24"><Path d="M6 6l12 12M18 6L6 18" stroke="#fff" strokeWidth={3} strokeLinecap="round" /></Svg>
          </Pressable>
        )}
        {!text && (
          <>
            <Pressable accessibilityRole="button" accessibilityLabel="Snap a photo of your meal" onPress={() => router.push('/log-food?go=meal')} hitSlop={6} style={lb.icon}>
              <Svg width={20} height={20} viewBox="0 0 24 24"><Path d="M3.5 8.5a2 2 0 0 1 2-2h2.2l1.6-2.5h5.4l1.6 2.5h2.2a2 2 0 0 1 2 2V18a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2z" stroke={E.ink} strokeWidth={1.9} fill="none" strokeLinejoin="round" /><Circle cx={12} cy={13} r={3.5} stroke={E.ink} strokeWidth={1.9} fill="none" /></Svg>
            </Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel="Scan a barcode" onPress={() => router.push('/scan')} hitSlop={6} style={lb.icon}>
              <Svg width={20} height={20} viewBox="0 0 24 24"><Path d="M4 6v12M7.5 6v12M10 6v12M13.5 6v12M16 6v12M20 6v12" stroke={E.ink} strokeWidth={1.9} strokeLinecap="round" /></Svg>
            </Pressable>
          </>
        )}
      </View>

      {focus && !text && <Text style={lb.hint}>Type it like you'd say it: “6 oz chicken, 1 cup rice, 2 eggs”. Calories and protein fill in for you.</Text>}

      {/* What it read */}
      {!!text && (
        <View style={lb.read}>
          {items.map((it) => {
            const pic = picFor(foodName(it.food));
            return (
              <View key={it.id} style={lb.item}>
                <FoodThumb source={foodPhoto(it.id) || pic.source} hd={FOOD_HD[it.id] || pic.hd} size={44} />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={lb.iName} numberOfLines={1}>{foodName(it.food)}</Text>
                  <Text style={lb.iSub} numberOfLines={1}>{portionLabel(it.food, it.qty)} · {fmt(it.kcal)} cal · {fmt(it.protein)} g</Text>
                </View>
                <View style={lb.step}>
                  <Pressable accessibilityRole="button" accessibilityLabel={`Less ${foodName(it.food)}`} onPress={() => step(it, -1)} hitSlop={6} style={lb.sBtn}><Text style={lb.sT}>−</Text></Pressable>
                  <Pressable accessibilityRole="button" accessibilityLabel={`More ${foodName(it.food)}`} onPress={() => step(it, 1)} hitSlop={6} style={lb.sBtn}><Text style={lb.sT}>+</Text></Pressable>
                </View>
              </View>
            );
          })}
          {parsed.missing.length > 0 && (
            <Pressable accessibilityRole="button" onPress={() => router.push('/log-food?go=meal')} style={lb.miss}>
              <Text style={lb.missT}>Couldn't place “{parsed.missing[0].trim()}”. <Text style={{ fontFamily: F.bold, color: E.ink }}>Snap it instead →</Text></Text>
            </Pressable>
          )}
          {!items.length && !parsed.missing.length && <Text style={lb.hint}>Keep typing. Try “6 oz chicken, 1 cup rice”.</Text>}
          {items.length > 0 && (
            <Pressable accessibilityRole="button" accessibilityLabel={`Add ${fmt(tot.kcal)} calories and ${fmt(tot.protein)} grams of protein`} onPress={addTyped} disabled={busy}
              style={({ pressed }) => [lb.addBtn, pressed && { opacity: 0.85 }]}>
              <Text style={lb.addT}>Add</Text>
              <Text style={lb.addS}>{fmt(tot.kcal)} cal · {fmt(tot.protein)} g protein</Text>
            </Pressable>
          )}
        </View>
      )}

      {/* One tap: what they had lately, or a few common ones */}
      {!text && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={lb.chips} style={{ marginHorizontal: -18 }}>
          <Text style={lb.chipsK}>{recent.length ? 'AGAIN' : 'QUICK'}</Text>
          {chips.map((c) => (
            <Pressable key={c.name} accessibilityRole="button" accessibilityLabel={`Add ${c.name}, ${c.kcal} calories`} onPress={() => addChip(c)} style={({ pressed }) => [lb.chip, pressed && { backgroundColor: E.soft }]}>
              <Text style={lb.chipT} numberOfLines={1}>{c.name}</Text>
              <Text style={lb.chipV}>{fmt(c.kcal)}</Text>
            </Pressable>
          ))}
        </ScrollView>
      )}

      {!!added && <Added label={added.label} onUndo={undo} />}
    </View>
  );
}

function Added({ label, onUndo }: { label: string; onUndo: () => void }) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => { Animated.spring(v, { toValue: 1, useNativeDriver: native, speed: 16, bounciness: 8 }).start(); }, [label]);
  return (
    <Animated.View style={[lb.added, { opacity: v, transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [8, 0] }) }] }]}>
      <View style={lb.okDot}><Svg width={12} height={12} viewBox="0 0 24 24"><Path d="M5 12.5l4.5 4.5L19 7.5" stroke="#fff" strokeWidth={3.6} fill="none" strokeLinecap="round" strokeLinejoin="round" /></Svg></View>
      <Text style={lb.addedT} numberOfLines={1}>Added {label}</Text>
      <Pressable accessibilityRole="button" accessibilityLabel="Undo" onPress={onUndo} hitSlop={8}><Text style={lb.undo}>Undo</Text></Pressable>
    </Animated.View>
  );
}

const lb = StyleSheet.create({
  wrap: { gap: 12 },
  box: { flexDirection: 'row', alignItems: 'center', gap: 10, height: 54, paddingLeft: 16, paddingRight: 8, borderRadius: 27, backgroundColor: E.paper, borderWidth: 1.5, borderColor: E.hair },
  input: { flex: 1, minWidth: 0, height: 52, fontFamily: F.semi, fontSize: 15.5, color: E.ink, ...(Platform.OS === 'web' ? { outlineStyle: 'none' } as any : null) },
  icon: { width: 40, height: 40, borderRadius: 20, backgroundColor: E.surface, borderWidth: 1, borderColor: E.hair, alignItems: 'center', justifyContent: 'center' },
  clear: { width: 24, height: 24, borderRadius: 12, backgroundColor: E.faint, alignItems: 'center', justifyContent: 'center', marginRight: 8 },
  read: { gap: 10 },
  item: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iName: { fontFamily: F.bold, fontSize: 15, color: E.ink },
  iSub: { fontFamily: F.medium, fontSize: 13, color: E.sub, marginTop: 1, fontVariant: ['tabular-nums'] },
  step: { flexDirection: 'row', gap: 6 },
  sBtn: { width: 34, height: 34, borderRadius: 17, borderWidth: 1, borderColor: E.hair, alignItems: 'center', justifyContent: 'center', backgroundColor: E.surface },
  sT: { fontFamily: F.bold, fontSize: 18, color: E.ink, marginTop: -2 },
  miss: { paddingVertical: 4 },
  missT: { fontFamily: F.medium, fontSize: 13.5, lineHeight: 19, color: E.sub },
  hint: { fontFamily: F.medium, fontSize: 13.5, lineHeight: 19, color: E.sub, paddingHorizontal: 4 },
  addBtn: { height: 54, borderRadius: 27, backgroundColor: E.ink, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, marginTop: 2 },
  addT: { fontFamily: F.xbold, fontSize: 16, color: '#fff' },
  addS: { fontFamily: F.semi, fontSize: 13.5, color: 'rgba(255,255,255,0.72)', fontVariant: ['tabular-nums'] },
  chips: { gap: 8, paddingHorizontal: 18, alignItems: 'center' },
  chipsK: { fontFamily: F.bold, fontSize: 9.5, letterSpacing: 1.3, color: E.faint, marginRight: 2 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 7, height: 36, paddingLeft: 13, paddingRight: 11, borderRadius: 18, borderWidth: 1, borderColor: E.hair, backgroundColor: E.surface, maxWidth: 220 },
  chipT: { fontFamily: F.semi, fontSize: 13.5, color: E.ink, flexShrink: 1 },
  chipV: { fontFamily: F.bold, fontSize: 12, color: E.sub, fontVariant: ['tabular-nums'] },
  added: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, height: 44, borderRadius: 14, backgroundColor: E.greenTint },
  okDot: { width: 22, height: 22, borderRadius: 11, backgroundColor: E.green, alignItems: 'center', justifyContent: 'center' },
  addedT: { flex: 1, fontFamily: F.semi, fontSize: 13.5, color: E.ink },
  undo: { fontFamily: F.bold, fontSize: 13.5, color: E.green, textDecorationLine: 'underline' },
});
