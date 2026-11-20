import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Svg, { Path } from 'react-native-svg';
import { useAuth } from '../src/lib/auth';
import { supabase } from '../src/lib/supabase';
import { F } from '../src/lib/theme';
import { CheckIcon, DumbbellIcon, ForkIcon } from '../src/components/icons';
import { exercises, toNum } from '../src/lib/program';
import { exName } from '../src/lib/workoutMeta';
import {
  addExtra, buildWeek, changeSplit, DAY_NAMES, DEFAULT_DAYS, MAX_EXTRAS_PER_DAY, movesByPattern, movesInWeek, removeExtra,
  SPLITS, SPLITS_FOR, weekLine, type Lift, type Pattern, type TrainCfg,
} from '../src/lib/training';
import { canEditTraining, cfgOf, withTraining } from '../src/lib/trainingSave';
import { mealPlanFor, type Quiz } from '../src/lib/quiz';
import { fitMeal, nameFromItems, newId, offReason, orderNote, SLOT_LABEL, type MyMeal, type MyOrder, type SlotName } from '../src/lib/customize';
import { readMeal } from '../src/lib/readMeal';
import { searchFoods, foodName } from '../src/lib/parseFood';
import { foodById, QUICK_START, type Food } from '../src/data/foods';
import { EAT_OUT } from '../src/lib/menu';
import { suggestFromLift } from '../src/lib/trend';
import { track } from '../src/lib/track';
import { goBack } from '../src/lib/nav';
import type { Plan } from '../src/lib/types';

/**
 * Advanced customization: "Want your plan tailored exactly to you?"
 * Training: their split and days, the moves they do and like, what they lift now.
 * Food: the meals they eat, the takeout they order, the foods they won't eat.
 * Everything goes into the plan itself (the generator uses it), inside their calories and protein.
 * Opened from "You're in" right after the trial offer (from=ready), and any time from Train and Meals.
 */

const L = {
  bg: '#f3f4f8', white: '#ffffff', navy: '#141c33', navy2: '#1c2542', navyLine: '#2a3456', ink: '#16203b', body: '#3b4664', muted: '#6d7894',
  line: '#e3e6ee', red: '#d0362f', soft: '#eef1f8', green: '#12804f', greenTint: '#e6f4ec', amber: '#9a5b00', amberTint: '#fdf3e1',
};
const LETTERS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const SLOT_NAMES: SlotName[] = ['Breakfast', 'Lunch', 'Afternoon', 'Dinner'];
/** The movements most people have a favorite for. The rest open with "Show every movement". */
const MAIN_PATTERNS: Pattern[] = ['h_press', 'incline', 'v_press', 'v_pull', 'h_pull', 'squat', 'hinge', 'biceps', 'triceps'];
const isDemo = process.env.EXPO_PUBLIC_DEMO === '1';

type Tab = 'train' | 'food';

export default function Customize() {
  const { from, tab: tab0 } = useLocalSearchParams<{ from?: string; tab?: Tab }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { plan, profile, session, refresh, updatePlan } = useAuth();
  const fromReady = from === 'ready';
  const quiz = (profile?.quiz || {}) as Partial<Quiz>;
  const canTrain = canEditTraining(profile) && !!plan;
  const [tab, setTab] = useState<Tab>(tab0 === 'food' || !canTrain ? 'food' : 'train');

  // Training
  const start = useMemo(() => (plan ? cfgOf(plan, profile) : null), []);
  const [cfg, setCfg] = useState<TrainCfg | null>(start);
  // Food
  const [meals, setMeals] = useState<MyMeal[]>(quiz.my_meals || []);
  const [orders, setOrders] = useState<MyOrder[]>(quiz.my_orders || []);
  const [noFoods, setNoFoods] = useState<string[]>(quiz.no_foods || []);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => { track('customize_open', { from: from || 'app', tab }, { once: true }); }, []);

  if (!plan) return <View style={{ flex: 1, backgroundColor: L.bg }} />;
  const kcal = toNum(plan.kcal), protein = toNum(plan.protein);
  const done = () => (fromReady ? router.replace('/') : goBack(router, tab === 'food' ? '/plan' : '/train'));

  const skip = () => { track('customize_skip', { from: from || 'app', tab }); done(); };

  const trainChanged = !!cfg && JSON.stringify(cfg) !== JSON.stringify(start);
  const foodChanged = JSON.stringify([meals, orders, noFoods]) !== JSON.stringify([quiz.my_meals || [], quiz.my_orders || [], quiz.no_foods || []]);

  const save = async () => {
    if (!cfg) return;
    if (cfg.days.length !== SPLITS[cfg.split].days) { setTab('train'); return setMsg(`Pick ${SPLITS[cfg.split].days} training days.`); }
    if (!trainChanged && !foodChanged) return done();
    setBusy(true); setMsg('');
    const qNext: Partial<Quiz> = {
      ...quiz,
      ...(trainChanged ? { train_cfg: cfg, split: cfg.split, train_days: cfg.days, days: `${cfg.days.length} days` } : {}),
      my_meals: meals, my_orders: orders, no_foods: noFoods,
    };
    let next: Plan = trainChanged && canTrain ? withTraining(plan, cfg) : plan;
    if (foodChanged) {
      const mp = mealPlanFor(qNext, kcal, protein);
      next = { ...next, meals: mp.meals, grocery: mp.grocery, eat_out: mp.eat_out, ...(mp.picked ? { food: 'picked' as const } : {}) };
    }
    track('customize_saved', {
      from: from || 'app', favorites: cfg.prefer?.length || 0, lifts: Object.keys(cfg.lifts || {}).length, extras: cfg.extras.length,
      meals: meals.length, orders: orders.length, no_foods: noFoods.length,
    });
    if (isDemo || !session) { updatePlan(next); setBusy(false); return done(); }
    const [{ error }] = await Promise.all([
      supabase.from('plans').update({ data: next }).eq('user_id', session.user.id).eq('active', true),
      supabase.from('profiles').update({ quiz: qNext }).eq('id', session.user.id),
    ]);
    setBusy(false);
    if (error) return setMsg("That didn't save. Check your connection and try again.");
    await refresh();
    done();
  };

  const wide = width >= 760;
  return (
    <View style={{ flex: 1, backgroundColor: L.bg }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 140 + insets.bottom }} keyboardShouldPersistTaps="handled" stickyHeaderIndices={[1]}>
        {/* Header */}
        <View style={[st.hero, { paddingTop: insets.top + (fromReady ? 26 : 14) }]}>
          <View style={st.wrap}>
            {!fromReady && (
              <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={done} hitSlop={10} style={st.back}>
                <Svg width={22} height={22} viewBox="0 0 24 24"><Path d="M15 5.5L8.5 12l6.5 6.5" stroke="#fff" strokeWidth={2.4} fill="none" strokeLinecap="round" strokeLinejoin="round" /></Svg>
              </Pressable>
            )}
            <View style={st.pill}><View style={st.dot} /><Text style={st.pillT}>{fromReady ? "YOU'RE IN · ONE LAST STEP" : 'ADVANCED CUSTOMIZATION'}</Text></View>
            <Text style={[st.h1, wide && { fontSize: 44, lineHeight: 48 }]}>
              {fromReady ? `You're in, ${plan.name}. Now make it your exact routine.` : 'Your plan, tailored exactly to you.'}
            </Text>
            <Text style={st.lede}>
              Tell me what you already do. The workouts you like, the weights you lift, the meals you eat and the orders you get. Your plan gets rebuilt around it, inside your {plan.kcal} calories and {plan.protein} g of protein.
            </Text>
            {fromReady && (
              <Pressable accessibilityRole="button" onPress={skip} hitSlop={8} style={{ alignSelf: 'flex-start' }}>
                <Text style={st.skipTop}>Skip, set this up later in the app</Text>
              </Pressable>
            )}
          </View>
        </View>

        {/* Toggle (sticks under the top while scrolling) */}
        <View style={st.toggleBar}>
          <View style={[st.wrap, { paddingVertical: 10 }]}>
            <View style={st.toggle} accessibilityRole="tablist">
              {canTrain && (
                <Pressable accessibilityRole="tab" accessibilityState={{ selected: tab === 'train' }} onPress={() => setTab('train')} style={[st.toggleB, tab === 'train' && st.toggleOn]}>
                  <DumbbellIcon color={tab === 'train' ? '#fff' : L.ink} size={17} />
                  <Text style={[st.toggleT, tab === 'train' && { color: '#fff' }]}>Training</Text>
                </Pressable>
              )}
              <Pressable accessibilityRole="tab" accessibilityState={{ selected: tab === 'food' }} onPress={() => setTab('food')} style={[st.toggleB, tab === 'food' && st.toggleOn]}>
                <ForkIcon color={tab === 'food' ? '#fff' : L.ink} size={17} />
                <Text style={[st.toggleT, tab === 'food' && { color: '#fff' }]}>Food</Text>
              </Pressable>
            </View>
          </View>
        </View>

        <View style={[st.wrap, { gap: 16, paddingTop: 6 }]}>
          {tab === 'train' && cfg && <TrainingPanel cfg={cfg} setCfg={(c) => { setMsg(''); setCfg(c); }} plan={plan} />}
          {tab === 'food' && (
            <FoodPanel kcal={kcal} protein={protein} quiz={quiz} meals={meals} setMeals={setMeals} orders={orders} setOrders={setOrders}
              noFoods={noFoods} setNoFoods={setNoFoods} openFoods={() => router.push('/foods')} />
          )}
          {!!msg && <Text style={st.err}>{msg}</Text>}
        </View>
      </ScrollView>

      {/* Bottom bar */}
      <View style={[st.sticky, { paddingBottom: 12 + insets.bottom }]}>
        <View style={[st.wrap, { gap: 8 }]}>
          <Pressable accessibilityRole="button" disabled={busy} onPress={save} style={[st.cta, busy && { opacity: 0.7 }]}>
            <Text style={st.ctaT}>{busy ? 'Rebuilding your plan…' : trainChanged || foodChanged ? (fromReady ? 'Build my plan and start week 1' : 'Rebuild my plan') : fromReady ? 'Start week 1' : 'Done'}</Text>
          </Pressable>
          <Text style={st.ctaSub}>
            {trainChanged || foodChanged ? 'Sets, reps, calories and protein stay locked in, so it keeps working.' : 'Change anything above and your plan rebuilds around it.'}
          </Text>
        </View>
      </View>
    </View>
  );
}

/* ---------------------------------------------------------------- Training */

function TrainingPanel({ cfg, setCfg, plan }: { cfg: TrainCfg; setCfg: (c: TrainCfg) => void; plan: Plan }) {
  const [all, setAll] = useState(false);
  const [allLifts, setAllLifts] = useState(false);
  const [adding, setAdding] = useState<{ day: number; name: string } | null>(null);
  const n = SPLITS[cfg.split].days;
  const week = useMemo(() => buildWeek(cfg), [cfg]);
  const groups = useMemo(() => movesByPattern(cfg.equip, cfg.avoid), [cfg.equip, cfg.avoid]);
  const shown = all ? groups : groups.filter((g) => MAIN_PATTERNS.includes(g.pattern));
  const moves = useMemo(() => movesInWeek(cfg), [cfg]);
  // The big lifts (first 3 of every workout), their favorites and anything they've filled in come first.
  const keyMoves = useMemo(() => {
    const main = new Set(week.flatMap((d) => d.x.slice(0, 3).map((x) => x[0])));
    return moves.filter((m) => main.has(m.id) || (cfg.prefer || []).includes(m.id) || cfg.lifts?.[m.id]);
  }, [moves, week, cfg.prefer, cfg.lifts]);
  const liftList = allLifts ? moves : keyMoves;
  const prefer = cfg.prefer || [];
  const lifts = cfg.lifts || {};
  const names = { ...(plan.train.c || {}), ...Object.fromEntries(cfg.extras.map((e) => [e.id, e.name])) };

  const togglePrefer = (id: string) =>
    setCfg({ ...cfg, prefer: prefer.includes(id) ? prefer.filter((x) => x !== id) : [...prefer, id] });
  const toggleDay = (d: number) => {
    const has = cfg.days.includes(d);
    if (!has && cfg.days.length >= n) return setCfg({ ...cfg, days: [...cfg.days.slice(1), d].sort() });
    setCfg({ ...cfg, days: has ? cfg.days.filter((x) => x !== d) : [...cfg.days, d].sort() });
  };
  const setLift = (id: string, k: 'w' | 'r', v: string) => {
    const val = Math.min(k === 'w' ? 1500 : 50, Math.max(0, Number(v.replace(/[^\d.]/g, '')) || 0));
    const cur: Lift = lifts[id] || { w: 0, r: 0 };
    const nextL = { ...cur, [k]: val };
    const out = { ...lifts };
    if (!nextL.w && !nextL.r) delete out[id]; else out[id] = nextL;
    setCfg({ ...cfg, lifts: out });
  };

  return (
    <>
      <Step n={1} title="Your workouts" sub="How many days you train, the split you like and the days you go.">
        <View style={st.row}>
          {[3, 4, 5, 6].map((k) => (
            <Pressable key={k} accessibilityRole="radio" accessibilityState={{ selected: n === k }} onPress={() => setCfg(changeSplit(cfg, SPLITS_FOR[k][0]))} style={[st.seg, n === k && st.segOn]}>
              <Text style={[st.segT, n === k && { color: '#fff' }]}>{k} days</Text>
            </Pressable>
          ))}
        </View>
        {SPLITS_FOR[n].map((id) => {
          const on = cfg.split === id;
          return (
            <Pressable key={id} accessibilityRole="radio" accessibilityState={{ selected: on }} onPress={() => setCfg(changeSplit(cfg, id))} style={[st.opt, on && st.optOn]}>
              <View style={{ flex: 1, gap: 3 }}>
                <Text style={st.optT}>{SPLITS[id].label}</Text>
                <Text style={st.optS}>{weekLine(id)}</Text>
              </View>
              <Radio on={on} />
            </Pressable>
          );
        })}
        <Text style={st.label}>Days you train · pick {n}</Text>
        <View style={st.dayRow}>
          {LETTERS.map((l, d) => {
            const on = cfg.days.includes(d);
            return (
              <Pressable key={d} accessibilityRole="checkbox" accessibilityState={{ checked: on }} accessibilityLabel={DAY_NAMES[d]} onPress={() => toggleDay(d)} style={[st.dayDot, on && st.dayDotOn]}>
                <Text style={[st.dayDotT, on && { color: '#fff' }]}>{l}</Text>
              </Pressable>
            );
          })}
        </View>
        {cfg.days.length !== n && <Text style={st.err}>Pick {n - cfg.days.length} more.</Text>}
        {cfg.days.length === n && JSON.stringify(cfg.days) !== JSON.stringify(DEFAULT_DAYS[n]) && (
          <Pressable onPress={() => setCfg({ ...cfg, days: DEFAULT_DAYS[n] })}><Text style={st.link}>Use the recommended days</Text></Pressable>
        )}
      </Step>

      <Step n={2} title="Moves you do and like" sub="Tap the ones you enjoy. They go into every workout where that movement shows up. Same sets and reps, your exercise.">
        {shown.map((g) => (
          <View key={g.pattern} style={{ gap: 8 }}>
            <Text style={st.label}>{g.label}</Text>
            <View style={st.wrapRow}>
              {g.ids.map((id) => {
                const on = prefer.includes(id);
                return (
                  <Pressable key={id} accessibilityRole="checkbox" accessibilityState={{ checked: on }} onPress={() => togglePrefer(id)} style={[st.chip, on && st.chipOn]}>
                    {on && <CheckIcon color="#fff" size={11} />}
                    <Text style={[st.chipT, on && { color: '#fff' }]}>{exercises[id]?.name || id}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        ))}
        <Pressable onPress={() => setAll(!all)} style={st.more}>
          <Text style={st.moreT}>{all ? 'Show fewer' : `Show every movement (${groups.length - shown.length} more)`}</Text>
        </Pressable>

        <View style={st.divider} />
        <Text style={st.label}>A move that's not on the list</Text>
        {cfg.extras.map((e) => (
          <View key={e.id + e.day} style={st.extra}>
            <View style={{ flex: 1 }}><Text style={st.optT}>{e.name}</Text><Text style={st.optS}>{week[e.day]?.t.split('·')[1]?.trim() || DAY_NAMES[cfg.days[e.day]]} · {e.target}</Text></View>
            <Pressable accessibilityLabel={`Remove ${e.name}`} onPress={() => setCfg(removeExtra(cfg, e.day, e.id))} hitSlop={8}><Text style={st.remove}>Remove</Text></Pressable>
          </View>
        ))}
        {adding ? (
          <View style={{ gap: 10 }}>
            <TextInput value={adding.name} onChangeText={(t) => setAdding({ ...adding, name: t })} placeholder="e.g. Sled push, farmer carry" placeholderTextColor="#8a92a8" style={st.input} maxLength={40} autoFocus />
            <Text style={st.small}>Which workout?</Text>
            <View style={st.wrapRow}>
              {week.map((d, i) => {
                const full = cfg.extras.filter((e) => e.day === i).length >= MAX_EXTRAS_PER_DAY;
                return (
                  <Pressable key={i} disabled={full} onPress={() => setAdding({ ...adding, day: i })} style={[st.chip, adding.day === i && st.chipOn, full && { opacity: 0.4 }]}>
                    <Text style={[st.chipT, adding.day === i && { color: '#fff' }]}>{d.t.replace(' · ', ' ')}</Text>
                  </Pressable>
                );
              })}
            </View>
            <View style={st.row}>
              <Pressable onPress={() => { setCfg(addExtra(cfg, adding.day, adding.name)); setAdding(null); }} disabled={!adding.name.trim()} style={[st.smallBtn, !adding.name.trim() && { opacity: 0.4 }]}><Text style={st.smallBtnT}>Add it</Text></Pressable>
              <Pressable onPress={() => setAdding(null)} style={[st.smallBtn, st.smallBtnGhost]}><Text style={[st.smallBtnT, { color: L.ink }]}>Cancel</Text></Pressable>
            </View>
          </View>
        ) : (
          <Pressable onPress={() => setAdding({ day: 0, name: '' })} style={st.dashed}><Text style={st.dashedT}>+ Add your own move</Text></Pressable>
        )}
        <Text style={st.small}>Your own moves go at the end of a workout, up to {MAX_EXTRAS_PER_DAY} a day, so the main lifts stay first.</Text>
      </Step>

      <Step n={3} title="What you lift now" sub="Your weight and reps for any move you know. Week 1 starts from your real numbers, then goes up as you beat them. Leave any blank and you'll find it in your first workout.">
        {liftList.map((m) => {
          const l = lifts[m.id];
          const sug = suggestFromLift(m.target, l, /squat|deadlift|rdl|leg_press|lunge|hip_thrust|split/.test(m.id));
          return (
            <View key={m.id} style={st.liftRow}>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={st.optT} numberOfLines={1}>{exName(m.id, { train: { ...plan.train, c: names } })}</Text>
                <Text style={st.optS} numberOfLines={1}>{sug ? `Week 1: ${sug.weight} lbs × ${sug.reps}` : `${m.day.split('·')[1]?.trim()} · ${m.target}`}</Text>
              </View>
              <TextInput value={l?.w ? String(l.w) : ''} onChangeText={(v) => setLift(m.id, 'w', v)} keyboardType="decimal-pad" placeholder="lbs" placeholderTextColor="#8a92a8" style={st.num} maxLength={5} accessibilityLabel={`${m.id} weight`} />
              <Text style={st.times}>×</Text>
              <TextInput value={l?.r ? String(l.r) : ''} onChangeText={(v) => setLift(m.id, 'r', v)} keyboardType="number-pad" placeholder="reps" placeholderTextColor="#8a92a8" style={[st.num, { width: 58 }]} maxLength={2} accessibilityLabel={`${m.id} reps`} />
            </View>
          );
        })}
        {moves.length > keyMoves.length && (
          <Pressable onPress={() => setAllLifts(!allLifts)} style={st.more}>
            <Text style={st.moreT}>{allLifts ? 'Just the main lifts' : `Show every move (${moves.length - keyMoves.length} more)`}</Text>
          </Pressable>
        )}
      </Step>

      <Preview title="Your week, rebuilt">
        {week.map((d, i) => (
          <View key={i} style={st.pvDay}>
            <Text style={st.pvDayT}>{d.t}</Text>
            {d.x.map(([id, target]) => {
              const mine = prefer.includes(id) || id.startsWith('my_') || cfg.extras.some((e) => e.id === id);
              const sug = suggestFromLift(target, lifts[id]);
              return (
                <View key={id} style={st.pvRow}>
                  <Text style={st.pvName} numberOfLines={1}>{exName(id, { train: { ...plan.train, c: names } })}</Text>
                  {mine && <Text style={st.yours}>YOURS</Text>}
                  <Text style={st.pvMeta}>{sug ? `${sug.weight} × ${sug.reps}` : target}</Text>
                </View>
              );
            })}
          </View>
        ))}
      </Preview>
    </>
  );
}

/* ---------------------------------------------------------------- Food */

function FoodPanel({ kcal, protein, quiz, meals, setMeals, orders, setOrders, noFoods, setNoFoods, openFoods }: {
  kcal: number; protein: number; quiz: Partial<Quiz>;
  meals: MyMeal[]; setMeals: (m: MyMeal[]) => void; orders: MyOrder[]; setOrders: (o: MyOrder[]) => void;
  noFoods: string[]; setNoFoods: (n: string[]) => void; openFoods: () => void;
}) {
  const pantry = useMemo(() => {
    const ids = (quiz.foods?.length ? quiz.foods : QUICK_START).filter((id) => !noFoods.includes(id));
    return ids.map((id) => (quiz.custom_foods || []).find((f) => f.id === id) || foodById(id)).filter(Boolean) as Food[];
  }, [quiz, noFoods]);
  const preview = useMemo(() => mealPlanFor({ ...quiz, my_meals: meals, my_orders: orders, no_foods: noFoods }, kcal, protein), [quiz, meals, orders, noFoods, kcal, protein]);

  return (
    <>
      <Step n={1} title="Meals you eat" sub="Type a meal the way you'd say it. I size it to your numbers with the same foods, so your go-to meals become your plan.">
        <AddMeal onAdd={(m) => setMeals([...meals, m])} />
        {meals.length > 0 && <View style={st.divider} />}
        {SLOT_NAMES.map((slot) => meals.filter((m) => m.slot === slot).map((m) => {
          const f = fitMeal(m, kcal, protein, pantry);
          const ok = f.fit !== 'off';
          return (
            <View key={m.id} style={st.mine}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={st.mineSlot}>{SLOT_LABEL[slot].toUpperCase()}</Text>
                <Text style={[st.badge, ok ? st.badgeOk : st.badgeOff]}>{ok ? 'IN YOUR PLAN' : "DOESN'T FIT YET"}</Text>
                <View style={{ flex: 1 }} />
                <Pressable accessibilityLabel={`Remove ${m.name}`} onPress={() => setMeals(meals.filter((x) => x.id !== m.id))} hitSlop={8}><Text style={st.remove}>Remove</Text></Pressable>
              </View>
              <Text style={st.mineT}>{m.name}</Text>
              <Text style={st.mineD}>{f.detail}</Text>
              <Text style={st.mineK}>{f.kcal} cal · {f.protein} protein</Text>
              {ok && !!f.tweak && <Text style={st.tweak}>{f.tweak}</Text>}
              {!ok && <Text style={st.offT}>{offReason(f, m, kcal, protein)}</Text>}
            </View>
          );
        }))}
      </Step>

      <Step n={2} title="Takeout and eating out" sub="The exact orders you get. They go in your plan with how each one fits your day.">
        <AddOrder onAdd={(o) => setOrders([...orders, o])} />
        {orders.map((o) => (
          <View key={o.id} style={st.mine}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={st.mineSlot}>{o.where.toUpperCase()}</Text>
              <View style={{ flex: 1 }} />
              <Pressable accessibilityLabel={`Remove ${o.where}`} onPress={() => setOrders(orders.filter((x) => x.id !== o.id))} hitSlop={8}><Text style={st.remove}>Remove</Text></Pressable>
            </View>
            <Text style={st.mineT}>{o.order}</Text>
            <Text style={st.mineK}>about {o.kcal.toLocaleString('en-US')} cal · {o.protein} g protein</Text>
            <Text style={st.tweak}>{orderNote(o, kcal, protein)}</Text>
          </View>
        ))}
      </Step>

      <Step n={3} title="Foods you won't eat" sub="Anything here never shows up in your meals or your grocery list.">
        <NoFoods ids={noFoods} onChange={setNoFoods} />
        <Pressable onPress={openFoods} style={{ alignSelf: 'flex-start' }}><Text style={st.link}>Edit every food your plan uses →</Text></Pressable>
      </Step>

      <Preview title="Your day, rebuilt">
        {preview.meals.map((m) => {
          const o = m.options[0];
          if (!o) return null;
          return (
            <View key={m.slot} style={st.pvRowFood}>
              <Text style={st.pvSlot}>{SLOT_LABEL[m.slot as SlotName] || m.slot}</Text>
              <View style={{ flex: 1, minWidth: 0 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={st.pvName} numberOfLines={1}>{o.name}</Text>
                  {o.mine && <Text style={st.yours}>YOURS</Text>}
                </View>
                <Text style={st.pvDetail} numberOfLines={2}>{o.detail}</Text>
              </View>
              <Text style={st.pvKcal}>{o.kcal.replace('about ', '')}</Text>
            </View>
          );
        })}
        <Text style={[st.small, { color: '#c7cde0' }]}>Every meal has {Math.max(...preview.meals.map((m) => m.options.length))} options. Any pick per meal lands close to {kcal.toLocaleString('en-US')} calories and {protein} g of protein.</Text>
      </Preview>
    </>
  );
}

function AddMeal({ onAdd }: { onAdd: (m: MyMeal) => void }) {
  const [slot, setSlot] = useState<SlotName>('Breakfast');
  const [text, setText] = useState('');
  const [name, setName] = useState('');
  const [byNumbers, setByNumbers] = useState(false);
  const [k, setK] = useState('');
  const [p, setP] = useState('');
  const read = useMemo(() => (text.trim().length > 2 ? readMeal(text) : null), [text]);
  const can = byNumbers ? !!name.trim() && Number(k) > 0 : !!read?.items.length;
  const add = () => {
    if (!can) return;
    const m: MyMeal = byNumbers
      ? { id: newId(), slot, name: name.trim(), text: text.trim() || name.trim(), kcal: Number(k), protein: Number(p) || 0 }
      : { id: newId(), slot, name: name.trim() || nameFromItems(read!.items), text: text.trim(), items: read!.items };
    onAdd(m); setText(''); setName(''); setK(''); setP('');
  };
  return (
    <View style={{ gap: 10 }}>
      <View style={st.wrapRow}>
        {SLOT_NAMES.map((s) => (
          <Pressable key={s} accessibilityRole="radio" accessibilityState={{ selected: slot === s }} onPress={() => setSlot(s)} style={[st.chip, slot === s && st.chipOn]}>
            <Text style={[st.chipT, slot === s && { color: '#fff' }]}>{SLOT_LABEL[s]}</Text>
          </Pressable>
        ))}
      </View>
      <TextInput value={text} onChangeText={setText} multiline placeholder={byNumbers ? 'What is it? (optional)' : 'e.g. 3 eggs, 2 slices toast and a cup of Greek yogurt'} placeholderTextColor="#8a92a8" style={[st.input, { minHeight: 64, textAlignVertical: 'top' }]} maxLength={200} />
      <TextInput value={name} onChangeText={setName} placeholder={byNumbers ? 'Name, e.g. Mom\'s lasagna' : 'Name it (optional), e.g. My usual breakfast'} placeholderTextColor="#8a92a8" style={st.input} maxLength={40} />
      {byNumbers ? (
        <View style={st.row}>
          <TextInput value={k} onChangeText={(v) => setK(v.replace(/[^\d]/g, ''))} keyboardType="number-pad" placeholder="Calories" placeholderTextColor="#8a92a8" style={[st.input, st.half]} maxLength={4} />
          <TextInput value={p} onChangeText={(v) => setP(v.replace(/[^\d]/g, ''))} keyboardType="number-pad" placeholder="Protein (g)" placeholderTextColor="#8a92a8" style={[st.input, st.half]} maxLength={3} />
        </View>
      ) : read && (
        <View style={st.read}>
          {read.parsed.length > 0 ? (
            <>
              <View style={st.wrapRow}>
                {read.parsed.map((x, i) => <Text key={x.id + i} style={st.readChip}>{foodName(x.food)} · {Math.round(x.kcal)}</Text>)}
              </View>
              <Text style={st.readT}>About {read.kcal.toLocaleString('en-US')} calories · {read.protein} g protein as you wrote it</Text>
            </>
          ) : <Text style={st.readT}>I couldn't read any foods yet. Try amounts and plain names, like "6 oz chicken, 1 cup rice".</Text>}
          {read.missing.length > 0 && <Text style={st.readMiss}>Didn't catch: {read.missing.join(', ')}. Leave it out, or add this meal by its numbers instead.</Text>}
        </View>
      )}
      <View style={st.row}>
        <Pressable onPress={add} disabled={!can} style={[st.smallBtn, !can && { opacity: 0.4 }]}><Text style={st.smallBtnT}>Add to my {SLOT_LABEL[slot].toLowerCase()}s</Text></Pressable>
        <Pressable onPress={() => setByNumbers(!byNumbers)} style={[st.smallBtn, st.smallBtnGhost]}>
          <Text style={[st.smallBtnT, { color: L.ink }]}>{byNumbers ? 'Type the foods' : 'Use calories instead'}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const KNOWN = Object.values(EAT_OUT);

function AddOrder({ onAdd }: { onAdd: (o: MyOrder) => void }) {
  const [where, setWhere] = useState('');
  const [order, setOrder] = useState('');
  const [k, setK] = useState('');
  const [p, setP] = useState('');
  const can = !!where.trim() && !!order.trim() && Number(k) > 0;
  const pick = (e: (typeof KNOWN)[number]) => { setWhere(e.where); setOrder(e.order); setK(String(toNum(e.kcal))); setP(String(toNum(e.protein))); };
  const add = () => {
    if (!can) return;
    onAdd({ id: newId(), where: where.trim(), order: order.trim(), kcal: Number(k), protein: Number(p) || 0 });
    setWhere(''); setOrder(''); setK(''); setP('');
  };
  return (
    <View style={{ gap: 10 }}>
      <Text style={st.small}>Start from a usual order, then change it to yours:</Text>
      <View style={st.wrapRow}>
        {KNOWN.map((e) => (
          <Pressable key={e.where} onPress={() => pick(e)} style={[st.chip, where === e.where && st.chipOn]}>
            <Text style={[st.chipT, where === e.where && { color: '#fff' }]}>{e.where}</Text>
          </Pressable>
        ))}
      </View>
      <TextInput value={where} onChangeText={setWhere} placeholder="Where, e.g. Cava, Sweetgreen, the taco spot" placeholderTextColor="#8a92a8" style={st.input} maxLength={40} />
      <TextInput value={order} onChangeText={setOrder} multiline placeholder="What you order, exactly" placeholderTextColor="#8a92a8" style={[st.input, { minHeight: 56, textAlignVertical: 'top' }]} maxLength={160} />
      <View style={st.row}>
        <TextInput value={k} onChangeText={(v) => setK(v.replace(/[^\d]/g, ''))} keyboardType="number-pad" placeholder="Calories" placeholderTextColor="#8a92a8" style={[st.input, st.half]} maxLength={4} />
        <TextInput value={p} onChangeText={(v) => setP(v.replace(/[^\d]/g, ''))} keyboardType="number-pad" placeholder="Protein (g)" placeholderTextColor="#8a92a8" style={[st.input, st.half]} maxLength={3} />
      </View>
      <Text style={st.small}>Most chains list calories and protein in their app or on the online menu.</Text>
      <Pressable onPress={add} disabled={!can} style={[st.smallBtn, { alignSelf: 'flex-start' }, !can && { opacity: 0.4 }]}><Text style={st.smallBtnT}>Add this order</Text></Pressable>
    </View>
  );
}

function NoFoods({ ids, onChange }: { ids: string[]; onChange: (ids: string[]) => void }) {
  const [q, setQ] = useState('');
  const hits = useMemo(() => searchFoods(q, 6).filter((f) => !ids.includes(f.id)), [q, ids]);
  return (
    <View style={{ gap: 10 }}>
      <TextInput value={q} onChangeText={setQ} placeholder="Search, e.g. salmon, eggs, cottage cheese" placeholderTextColor="#8a92a8" style={st.input} maxLength={30} />
      {hits.length > 0 && (
        <View style={st.wrapRow}>
          {hits.map((f) => (
            <Pressable key={f.id} onPress={() => { onChange([...ids, f.id]); setQ(''); }} style={st.chip}><Text style={st.chipT}>+ {foodName(f)}</Text></Pressable>
          ))}
        </View>
      )}
      {ids.length > 0 && (
        <View style={st.wrapRow}>
          {ids.map((id) => (
            <Pressable key={id} accessibilityLabel={`Allow ${id} again`} onPress={() => onChange(ids.filter((x) => x !== id))} style={[st.chip, st.chipNo]}>
              <Text style={[st.chipT, { color: L.red }]}>{foodById(id) ? foodName(foodById(id)!) : id}  ✕</Text>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}

/* ---------------------------------------------------------------- Bits */

function Step({ n, title, sub, children }: { n: number; title: string; sub?: string; children: React.ReactNode }) {
  return (
    <View style={st.card}>
      <View style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-start' }}>
        <View style={st.stepN}><Text style={st.stepNT}>{n}</Text></View>
        <View style={{ flex: 1, gap: 4 }}>
          <Text style={st.h2}>{title}</Text>
          {!!sub && <Text style={st.sub}>{sub}</Text>}
        </View>
      </View>
      <View style={{ gap: 12, marginTop: 4 }}>{children}</View>
    </View>
  );
}

function Preview({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={st.preview}>
      <Text style={st.pvK}>LIVE PREVIEW</Text>
      <Text style={st.pvH}>{title}</Text>
      <View style={{ gap: 12, marginTop: 6 }}>{children}</View>
    </View>
  );
}

const Radio = ({ on }: { on: boolean }) => <View style={[st.radio, on && st.radioOn]}>{on && <CheckIcon color="#fff" size={11} />}</View>;

const st = StyleSheet.create({
  wrap: { width: '100%', maxWidth: 760, alignSelf: 'center', paddingHorizontal: 18 },
  hero: { backgroundColor: L.navy, paddingBottom: 26 },
  back: { width: 40, height: 40, justifyContent: 'center', marginBottom: 6 },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 8, alignSelf: 'flex-start', backgroundColor: L.navy2, borderWidth: 1, borderColor: L.navyLine, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6, marginBottom: 14 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#2fd17f' },
  pillT: { fontFamily: F.xbold, fontSize: 11.5, letterSpacing: 1.2, color: '#7ff0b5' },
  h1: { fontFamily: F.black, fontSize: 32, lineHeight: 36, color: '#fff', letterSpacing: -0.8 },
  lede: { fontFamily: F.medium, fontSize: 15.5, lineHeight: 23, color: '#c7cde0', marginTop: 12 },
  skipTop: { fontFamily: F.bold, fontSize: 14.5, color: '#fff', textDecorationLine: 'underline', marginTop: 16 },
  toggleBar: { backgroundColor: L.bg },
  toggle: { flexDirection: 'row', backgroundColor: L.white, borderRadius: 999, padding: 5, borderWidth: 1, borderColor: L.line, gap: 4 },
  toggleB: { flex: 1, height: 46, borderRadius: 999, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  toggleOn: { backgroundColor: L.navy },
  toggleT: { fontFamily: F.xbold, fontSize: 15.5, color: L.ink },
  card: { backgroundColor: L.white, borderRadius: 22, borderWidth: 1, borderColor: L.line, padding: 18, gap: 8, shadowColor: L.ink, shadowOpacity: 0.06, shadowRadius: 18, shadowOffset: { width: 0, height: 8 }, elevation: 2 },
  stepN: { width: 30, height: 30, borderRadius: 15, backgroundColor: L.navy, alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  stepNT: { fontFamily: F.black, fontSize: 14, color: '#fff' },
  h2: { fontFamily: F.black, fontSize: 21, lineHeight: 25, color: L.ink, letterSpacing: -0.3 },
  sub: { fontFamily: F.medium, fontSize: 14, lineHeight: 20, color: L.body },
  label: { fontFamily: F.xbold, fontSize: 11.5, letterSpacing: 1.3, textTransform: 'uppercase', color: L.muted },
  small: { fontFamily: F.medium, fontSize: 13, lineHeight: 18, color: L.muted },
  row: { flexDirection: 'row', gap: 8 },
  wrapRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  seg: { flex: 1, height: 44, borderRadius: 14, borderWidth: 1.5, borderColor: L.line, alignItems: 'center', justifyContent: 'center', backgroundColor: L.white },
  segOn: { backgroundColor: L.navy, borderColor: L.navy },
  segT: { fontFamily: F.xbold, fontSize: 14.5, color: L.ink },
  opt: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 16, borderWidth: 1.5, borderColor: L.line },
  optOn: { borderColor: L.navy, backgroundColor: L.soft },
  optT: { fontFamily: F.bold, fontSize: 15.5, color: L.ink },
  optS: { fontFamily: F.medium, fontSize: 13, color: L.muted },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: '#c9cedb', alignItems: 'center', justifyContent: 'center' },
  radioOn: { backgroundColor: L.navy, borderColor: L.navy },
  dayRow: { flexDirection: 'row', justifyContent: 'space-between' },
  dayDot: { width: 40, height: 40, borderRadius: 20, borderWidth: 1.5, borderColor: L.line, alignItems: 'center', justifyContent: 'center' },
  dayDotOn: { backgroundColor: L.navy, borderColor: L.navy },
  dayDotT: { fontFamily: F.xbold, fontSize: 14, color: L.ink },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 13, height: 38, borderRadius: 19, borderWidth: 1.5, borderColor: L.line, backgroundColor: L.white },
  chipOn: { backgroundColor: L.navy, borderColor: L.navy },
  chipNo: { borderColor: '#f1c9c6', backgroundColor: '#fdf1f0' },
  chipT: { fontFamily: F.semi, fontSize: 14, color: L.ink },
  more: { alignSelf: 'flex-start', paddingVertical: 4 },
  moreT: { fontFamily: F.bold, fontSize: 14, color: L.navy, textDecorationLine: 'underline' },
  link: { fontFamily: F.bold, fontSize: 14, color: L.red },
  divider: { height: 1, backgroundColor: L.line, marginVertical: 4 },
  extra: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 14, backgroundColor: L.soft },
  remove: { fontFamily: F.bold, fontSize: 13, color: L.red },
  input: { borderWidth: 1.5, borderColor: L.line, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, fontFamily: F.semi, fontSize: 16, color: L.ink, backgroundColor: L.white },
  dashed: { height: 48, borderRadius: 14, borderWidth: 1.5, borderStyle: 'dashed', borderColor: '#c9cedb', alignItems: 'center', justifyContent: 'center' },
  dashedT: { fontFamily: F.bold, fontSize: 15, color: L.ink },
  smallBtn: { height: 44, borderRadius: 22, paddingHorizontal: 18, backgroundColor: L.navy, alignItems: 'center', justifyContent: 'center' },
  smallBtnGhost: { backgroundColor: L.white, borderWidth: 1.5, borderColor: L.line },
  smallBtnT: { fontFamily: F.bold, fontSize: 14.5, color: '#fff' },
  liftRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: L.line },
  half: { flex: 1, minWidth: 0, width: 0 },
  num: { width: 70, height: 44, borderWidth: 1.5, borderColor: L.line, borderRadius: 12, textAlign: 'center', fontFamily: F.bold, fontSize: 16, color: L.ink },
  times: { fontFamily: F.bold, fontSize: 15, color: L.muted },
  read: { backgroundColor: L.soft, borderRadius: 14, padding: 12, gap: 8 },
  readChip: { fontFamily: F.semi, fontSize: 13, color: L.ink, backgroundColor: L.white, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 5, overflow: 'hidden' },
  readT: { fontFamily: F.semi, fontSize: 13.5, color: L.body },
  readMiss: { fontFamily: F.semi, fontSize: 13, color: L.amber },
  mine: { borderRadius: 16, borderWidth: 1, borderColor: L.line, padding: 14, gap: 4 },
  mineSlot: { fontFamily: F.xbold, fontSize: 11, letterSpacing: 1.2, color: L.muted },
  mineT: { fontFamily: F.black, fontSize: 17, color: L.ink },
  mineD: { fontFamily: F.medium, fontSize: 14, lineHeight: 20, color: L.body },
  mineK: { fontFamily: F.bold, fontSize: 13.5, color: L.ink },
  badge: { fontFamily: F.xbold, fontSize: 10, letterSpacing: 1, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, overflow: 'hidden' },
  badgeOk: { color: L.green, backgroundColor: L.greenTint },
  badgeOff: { color: L.amber, backgroundColor: L.amberTint },
  tweak: { fontFamily: F.semi, fontSize: 13, lineHeight: 18, color: L.green, marginTop: 2 },
  offT: { fontFamily: F.semi, fontSize: 13, lineHeight: 18, color: L.amber, marginTop: 2 },
  preview: { backgroundColor: L.navy, borderRadius: 22, padding: 18, gap: 4 },
  pvK: { fontFamily: F.xbold, fontSize: 11, letterSpacing: 1.4, color: '#ff8a82' },
  pvH: { fontFamily: F.black, fontSize: 21, color: '#fff', letterSpacing: -0.3 },
  pvDay: { gap: 6, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: L.navyLine },
  pvDayT: { fontFamily: F.xbold, fontSize: 14, color: '#fff' },
  pvRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  pvRowFood: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: L.navyLine },
  pvDetail: { fontFamily: F.medium, fontSize: 12.5, lineHeight: 17, color: '#9aa3bd' },
  pvSlot: { width: 80, fontFamily: F.xbold, fontSize: 10.5, letterSpacing: 0.8, color: '#9aa3bd', textTransform: 'uppercase', marginTop: 3 },
  pvName: { flexShrink: 1, fontFamily: F.semi, fontSize: 14.5, color: '#e6e9f2' },
  pvMeta: { marginLeft: 'auto', fontFamily: F.medium, fontSize: 12.5, color: '#9aa3bd' },
  pvKcal: { fontFamily: F.bold, fontSize: 13, color: '#fff', marginTop: 2 },
  yours: { flexShrink: 0, fontFamily: F.xbold, fontSize: 9.5, letterSpacing: 1, color: '#7ff0b5', borderWidth: 1, borderColor: '#2b7a57', borderRadius: 6, paddingHorizontal: 5, paddingVertical: 1, overflow: 'hidden' },
  err: { fontFamily: F.bold, fontSize: 14, color: L.red },
  sticky: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingTop: 12, backgroundColor: 'rgba(243,244,248,0.97)', borderTopWidth: 1, borderTopColor: L.line },
  cta: { height: 58, borderRadius: 29, backgroundColor: L.red, alignItems: 'center', justifyContent: 'center', shadowColor: L.red, shadowOpacity: 0.35, shadowRadius: 16, shadowOffset: { width: 0, height: 8 }, elevation: 5 },
  ctaT: { fontFamily: F.black, fontSize: 17.5, color: '#fff' },
  ctaSub: { fontFamily: F.medium, fontSize: 12.5, color: L.muted, textAlign: 'center' },
});
