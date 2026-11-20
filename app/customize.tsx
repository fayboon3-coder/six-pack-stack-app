import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Svg, { Path } from 'react-native-svg';
import { useAuth } from '../src/lib/auth';
import { supabase } from '../src/lib/supabase';
import { F } from '../src/lib/theme';
import { exercises, toNum } from '../src/lib/program';
import { exName } from '../src/lib/workoutMeta';
import { buildWeek, DAY_NAMES, EQUIP_LABEL, FOCUS_LABEL, MAX_FOCUS, optionsFor, patternOf, SPLITS, SPLITS_FOR, type Equip, type Focus, type TrainCfg } from '../src/lib/training';
import { canEditTraining, cfgOf, withTraining } from '../src/lib/trainingSave';
import { mealPlanFor, type Quiz } from '../src/lib/quiz';
import { fitMeal, offReason, orderNote, SLOT_LABEL, type SlotName } from '../src/lib/customize';
import { readTraining, searchMoves, type TrainAnswers, type TrainEdits } from '../src/lib/understand';
import { readFood, readSituation, type FoodAnswers, type FoodEdits, type ReadMealPart } from '../src/lib/understandFood';
import { foodById, QUICK_START, type Food } from '../src/data/foods';
import { foodName, searchFoods } from '../src/lib/parseFood';
import { suggestFromLift } from '../src/lib/trend';
import { track } from '../src/lib/track';
import { goBack } from '../src/lib/nav';
import type { Plan } from '../src/lib/types';

/**
 * Advanced customization, as a short guided conversation: one question at a time, answered in
 * their own words. Every answer is read into the plan's real settings (split, days, favorite moves,
 * current lifts, moves to keep out, their meals, their takeout, foods they skip) and shown back
 * as "Here's what I got" so they can remove anything. A quick follow-up appears only when a detail
 * is missing. Nothing is required. The last screen shows the rebuilt plan before it's saved.
 */

const L = {
  bg: '#f3f4f8', white: '#ffffff', navy: '#141c33', navy2: '#1c2542', navyLine: '#2a3456', ink: '#16203b', body: '#3b4664', muted: '#6d7894',
  line: '#e3e6ee', red: '#d0362f', soft: '#eef1f8', green: '#12804f', greenTint: '#e6f4ec', amber: '#9a5b00', amberTint: '#fdf3e1',
};
const LETTERS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const isDemo = process.env.EXPO_PUBLIC_DEMO === '1';
const LOWER = /squat|deadlift|rdl|leg_press|lunge|hip_thrust|split/;
const SLOTS: SlotName[] = ['Breakfast', 'Lunch', 'Afternoon', 'Dinner'];

type Q = { key: string; area: 'train' | 'food'; q: string; sub: string; ph: string };
const QUESTIONS: Q[] = [
  { key: 'week', area: 'train', q: 'Walk me through your week in the gym.', sub: 'How many days and which ones, your split, where you train, how long you have, and what you want to bring up. A sport or running too.', ph: 'e.g. I lift 4 days, push pull legs at LA Fitness, about an hour. Want bigger arms. Jiu-jitsu Wednesday nights.' },
  { key: 'moves', area: 'train', q: 'What exercises do you do and actually like?', sub: "List them the way you'd say them. They go into your plan wherever they fit.", ph: 'e.g. bench, incline dumbbell press, lat pulldowns, RDLs, hack squat, hammer curls' },
  { key: 'lifts', area: 'train', q: 'What do you lift right now?', sub: 'Weight and reps for any you know. Week 1 starts from your real numbers, not a guess.', ph: 'e.g. bench 185x5, squat 225 for 8, curls with 30s for 12, pulldown 140 for 10' },
  { key: 'pain', area: 'train', q: 'Anything that hurts, or moves you avoid?', sub: "An old injury, a joint that bugs you, an exercise you hate. I'll keep those out.", ph: "e.g. my shoulder bugs me on flat bench, and I can't stand lunges" },
  { key: 'day', area: 'food', q: 'What does a normal day of eating look like?', sub: "Breakfast to dinner, the way you'd tell a friend. Rough amounts help, but don't stress them.", ph: 'e.g. Breakfast is 3 eggs and 2 toast. Lunch I get Chipotle. Protein shake after the gym, then chicken and rice for dinner.' },
  { key: 'out', area: 'food', q: 'What do you order when you eat out?', sub: "The places you go and exactly what you get. Calories if you know them, but you don't need to.", ph: "e.g. Chipotle double chicken bowl. Starbucks egg bites and a latte. Pizza from Domino's on Fridays." },
  { key: 'no', area: 'food', q: "Anything you don't eat?", sub: 'Foods you hate, allergies, or a way you eat (vegetarian, no pork, dairy-free).', ph: "e.g. I don't eat pork, hate mushrooms, and dairy messes with my stomach" },
  { key: 'extra', area: 'food', q: 'Anything else I should know?', sub: 'Your schedule, cooking, budget, weekends, cravings. Whatever would make this plan easier to stick to.', ph: "e.g. I work nights, don't love cooking during the week, and weekends are where I fall off" },
];

type Saved = { answers?: Record<string, string>; tEdits?: TrainEdits; fEdits?: FoodEdits; added?: { avoid?: string[]; extras?: string[]; rules?: string[] } };

export default function Customize() {
  const { from, tab } = useLocalSearchParams<{ from?: string; tab?: 'train' | 'food' }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { plan, profile, session, refresh, updatePlan } = useAuth();
  const fromReady = from === 'ready';
  const quiz = (profile?.quiz || {}) as Partial<Quiz> & { custom?: Saved };
  const saved: Saved = quiz.custom || {};
  const canTrain = canEditTraining(profile) && !!plan;
  const steps = useMemo(() => QUESTIONS.filter((q) => (q.area === 'train' ? canTrain && tab !== 'food' : tab !== 'train')), [canTrain, tab]);
  const [i, setI] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>(saved.answers || {});
  const [tEdits, setTEdits] = useState<TrainEdits>(saved.tEdits || {});
  const [fEdits, setFEdits] = useState<FoodEdits>(saved.fEdits || {});
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const scroll = useRef<any>(null);

  useEffect(() => { track('customize_open', { from: from || 'app', tab: tab || 'all' }, { once: true }); }, []);
  useEffect(() => { scroll.current?.scrollTo({ y: 0, animated: false }); }, [i]);

  // The plan's settings before any customization (what they added last time comes off, then their words go back on).
  const saved0 = useMemo(() => (plan ? cfgOf(plan, profile) : null), []);
  const base = useMemo<TrainCfg | null>(() => saved0 && {
    ...saved0,
    avoid: saved0.avoid.filter((x) => !(saved.added?.avoid || []).includes(x)),
    extras: saved0.extras.filter((x) => !(saved.added?.extras || []).includes(x.name)),
    prefer: [], lifts: {},
  }, [saved0]);
  const tA: TrainAnswers = { week: answers.week, moves: answers.moves, lifts: answers.lifts, pain: answers.pain };
  const fA: FoodAnswers = { day: answers.day, out: answers.out, no: answers.no, extra: answers.extra };
  const tRead = useMemo(() => (base ? readTraining(base, tA, tEdits) : null), [base, answers.week, answers.moves, answers.lifts, answers.pain, tEdits]);
  const fRead = useMemo(() => readFood(fA, fEdits), [answers.day, answers.out, answers.no, fEdits]);

  if (!plan || !tRead || !base) return <View style={{ flex: 1, backgroundColor: L.bg }} />;
  const kcal = toNum(plan.kcal), protein = toNum(plan.protein);
  const review = i >= steps.length;
  const step = steps[Math.min(i, steps.length - 1)];
  const text = answers[step?.key] || '';

  const exit = () => (fromReady ? router.replace('/') : goBack(router, tab === 'food' ? '/plan' : '/train'));
  const skipAll = () => { track('customize_skip', { from: from || 'app', step: review ? 'review' : step.key }); exit(); };
  const next = () => { track('customize_step', { step: step.key, answered: text.trim() ? 1 : 0 }); setI(i + 1); };
  const back = () => (i === 0 ? exit() : setI(i - 1));

  const anyTrain = steps.some((s) => s.area === 'train') && !!(answers.week || answers.moves || answers.lifts || answers.pain || saved.answers || Object.keys(tEdits).length);
  const anyFood = steps.some((s) => s.area === 'food') && !!(answers.day || answers.out || answers.no || answers.extra || saved.answers || Object.keys(fEdits).length);

  const save = async () => {
    setBusy(true); setMsg('');
    const cfg = tRead.cfg;
    const trainChanged = canTrain && anyTrain && JSON.stringify(cfg) !== JSON.stringify(saved0);
    const qNext: any = {
      ...quiz,
      custom: { answers, tEdits, fEdits, added: { avoid: tRead.avoid, extras: cfg.extras.map((x) => x.name).filter((n) => (tEdits.extras || []).includes(n)), rules: fRead.rules } } as Saved,
      ...(trainChanged ? { train_cfg: cfg, split: cfg.split, train_days: cfg.days, days: `${cfg.days.length} days` } : {}),
      ...(anyFood ? { my_meals: fRead.meals, my_orders: fRead.myOrders, no_foods: fRead.noFoods } : {}),
    };
    let nextPlan: Plan = trainChanged ? withTraining(plan, cfg) : plan;
    // Their situation rules first (replacing last time's), the injury note, and how it was tailored.
    const oldRules = (plan.rules || []).filter((r) => !(saved.added?.rules || []).includes(r));
    nextPlan = {
      ...nextPlan,
      personal,
      ...(showFood && anyFood ? { rules: [...fRead.rules, ...oldRules] } : {}),
      ...(showTrain && anyTrain ? { injury_note: tRead.areas.length ? `Your ${tRead.areas.join(' and ')}: these stay out of your plan: ${tRead.avoid.map(nameOf).join(', ')}. If anything else hurts, swap it inside the workout (tap the swap button) and mark that it hurts.` : undefined } : {}),
    };
    if (anyFood) {
      const mp = mealPlanFor(qNext, kcal, protein);
      nextPlan = { ...nextPlan, meals: mp.meals, grocery: mp.grocery, eat_out: mp.eat_out, ...(mp.picked ? { food: 'picked' as const } : {}) };
    }
    track('customize_saved', {
      from: from || 'app', answered: Object.values(answers).filter((x) => x?.trim()).length, favorites: cfg.prefer?.length || 0,
      lifts: Object.keys(cfg.lifts || {}).length, meals: fRead.meals.length, orders: fRead.orders.length, no_foods: fRead.noFoods.length,
    });
    if (isDemo || !session) { updatePlan(nextPlan); setBusy(false); return exit(); }
    const [{ error }] = await Promise.all([
      supabase.from('plans').update({ data: nextPlan }).eq('user_id', session.user.id).eq('active', true),
      supabase.from('profiles').update({ quiz: qNext }).eq('id', session.user.id),
    ]);
    setBusy(false);
    if (error) return setMsg("That didn't save. Check your connection and try again.");
    await refresh();
    exit();
  };

  const tDrop = (k: string) => setTEdits({ ...tEdits, drop: [...(tEdits.drop || []), k] });
  const fDrop = (k: string) => setFEdits({ ...fEdits, drop: [...(fEdits.drop || []), k] });
  const pantry = (() => {
    const ids = (quiz.foods?.length ? quiz.foods : QUICK_START).filter((id) => !fRead.noFoods.includes(id));
    return ids.map((id) => (quiz.custom_foods || []).find((f) => f.id === id) || foodById(id)).filter(Boolean) as Food[];
  })();
  const names = { ...(plan.train.c || {}), ...Object.fromEntries(tRead.cfg.extras.map((e) => [e.id, e.name])) };
  const nameOf = (id: string) => exName(id, { train: { ...plan.train, c: names } });
  const liftRows = [...new Set([...tRead.lifts.map((l) => l.id), ...Object.keys(tEdits.lifts || {})])].filter((id) => !(tEdits.drop || []).includes('lift:' + id));
  const outOrders = fRead.orders.filter((o) => /^(o|a)/.test(o.id));
  // Plain-words summary of how the food side was tailored.
  const foodPersonal = [
    fRead.meals.length ? `${fRead.meals.length === 1 ? 'Your own meal is' : `${fRead.meals.length} of your own meals are`} in your plan, sized to your numbers.` : '',
    fRead.orders.length ? `Your ${fRead.orders.length === 1 ? 'takeout order is' : `${fRead.orders.length} takeout orders are`} in your plan, with how each fits your day.` : '',
    fRead.diets.length || fRead.noFoods.length ? `${fRead.diets.length ? fRead.diets.join(', ') + '. ' : ''}${fRead.noFoods.length} food${fRead.noFoods.length === 1 ? '' : 's'} you don't eat never show up in your meals or groceries.` : '',
    fRead.rules.length ? `${fRead.rules.length} rule${fRead.rules.length === 1 ? '' : 's'} written for your situation.` : '',
  ].filter(Boolean);
  const showTrain = steps.some((x) => x.area === 'train');
  const showFood = steps.some((x) => x.area === 'food');
  const personal = [...(showTrain && anyTrain ? tRead.personal : []), ...(showFood ? foodPersonal : [])];
  const jump = (key: string) => setI(Math.max(0, steps.findIndex((x) => x.key === key)));

  return (
    <View style={{ flex: 1, backgroundColor: L.bg }}>
      {/* Top: back, progress, skip */}
      <View style={[st.top, { paddingTop: insets.top + 10 }]}>
        <View style={[st.wrap, st.topRow]}>
          <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={back} hitSlop={10} style={st.backBtn}>
            <Svg width={22} height={22} viewBox="0 0 24 24"><Path d="M15 5.5L8.5 12l6.5 6.5" stroke="#fff" strokeWidth={2.4} fill="none" strokeLinecap="round" strokeLinejoin="round" /></Svg>
          </Pressable>
          <View style={st.bars}>
            {[...steps, null].map((_, k) => <View key={k} style={[st.bar, k <= i && st.barOn]} />)}
          </View>
          <Pressable accessibilityRole="button" onPress={skipAll} hitSlop={10}><Text style={st.skipTop}>{fromReady ? 'Skip for now' : 'Close'}</Text></Pressable>
        </View>
      </View>

      <ScrollView ref={scroll} contentContainerStyle={{ paddingBottom: 150 + insets.bottom }} keyboardShouldPersistTaps="handled">
        <View style={[st.wrap, { gap: 16, paddingTop: 22 }]}>
          {i === 0 && !review && (
            <View style={{ gap: 6, marginBottom: 2 }}>
              <Text style={st.intro}>{fromReady ? `You're in, ${plan.name}. Now let's make it your exact routine.` : "Let's tailor your plan exactly to you."}</Text>
              <Text style={st.introSub}>A few quick questions. Answer in your own words, skip anything you want, and I'll rebuild your plan around what you already do, inside your {plan.kcal} calories and {plan.protein} g of protein.</Text>
            </View>
          )}

          {!review && (
            <View style={st.card}>
              <Text style={st.kicker}>{step.area === 'train' ? 'TRAINING' : 'FOOD'} · {i + 1} OF {steps.length}</Text>
              <Text style={st.q}>{step.q}</Text>
              <Text style={st.sub}>{step.sub}</Text>
              <TextInput
                value={text} onChangeText={(v) => setAnswers({ ...answers, [step.key]: v })}
                multiline placeholder={step.ph} placeholderTextColor="#8a92a8" style={st.answer} maxLength={600}
                accessibilityLabel={step.q} textAlignVertical="top"
              />
              <Text style={st.optional}>Optional. Write as much or as little as you want.</Text>
            </View>
          )}

          {/* What we understood, plus a quick follow-up only when something's missing */}
          {/* ---------- Training: the week ---------- */}
          {!review && step.key === 'week' && (
            <>
              {!!text.trim() && (
                <Got>
                  <View style={st.wrapRow}>
                    {(!!tRead.week.count || !!tEdits.count) && <Chip t={`${tRead.cfg.days.length} days a week`} />}
                    {(!!tRead.week.split || !!tEdits.split) && <Chip t={SPLITS[tRead.cfg.split].label} />}
                    {(!!tRead.week.equip || !!tEdits.equip) && <Chip t={EQUIP_LABEL[tRead.cfg.equip]} />}
                    {tRead.week.sports.map((s) => <Chip key={s} t={`Also: ${s}${tRead.week.sportDays.length ? ` (${tRead.week.sportDays.map((d) => DAY_NAMES[d].slice(0, 3)).join(', ')})` : ''}`} info />)}
                    {tRead.focus.map((f) => <Chip key={f} t={`Bring up: ${FOCUS_LABEL[f]}`} onX={() => tDrop('focus:' + f)} />)}
                    {!!tRead.minutes && tRead.cfg.cap && <Chip t={`About ${tRead.minutes} min a workout`} onX={() => tDrop('time')} />}
                  </View>
                  {tRead.week.notes.map((n) => <Text key={n} style={st.note}>{n}</Text>)}
                  {!tRead.week.count && !tRead.week.split && !tRead.week.equip && !tEdits.count && <Text style={st.note}>I didn't catch a number of days or a split, so your plan keeps {tRead.cfg.days.length} days ({SPLITS[tRead.cfg.split].label}). Change it below if you want.</Text>}
                  {!!tRead.ask.days && <Text style={st.ask}>Which {tRead.ask.days} days do you usually go? Tap them below. Optional.</Text>}
                </Got>
              )}
              <Edit title="Your week" sub="Set or change anything here. It always wins over what I read.">
                <Text style={st.label}>Days a week</Text>
                <View style={st.row}>
                  {[3, 4, 5, 6].map((k) => {
                    const on = tRead.cfg.days.length === k;
                    return <Pressable key={k} accessibilityRole="radio" accessibilityState={{ selected: on }} onPress={() => setTEdits({ ...tEdits, count: k, split: undefined, days: undefined })} style={[st.seg, on && st.segOn]}><Text style={[st.segT, on && { color: '#fff' }]}>{k}</Text></Pressable>;
                  })}
                </View>
                <Text style={st.label}>Which days</Text>
                <View style={st.dayRow}>
                  {LETTERS.map((l, d) => {
                    const n = tRead.cfg.days.length;
                    const cur = tEdits.days?.length ? tEdits.days : tRead.cfg.days;
                    const on = cur.includes(d);
                    return (
                      <Pressable key={d} accessibilityRole="checkbox" accessibilityState={{ checked: on }} accessibilityLabel={DAY_NAMES[d]}
                        onPress={() => setTEdits({ ...tEdits, count: tEdits.count || n, days: on ? cur.filter((x) => x !== d) : [...cur, d].slice(-n) })}
                        style={[st.dayDot, on && st.dayDotOn]}>
                        <Text style={[st.dayDotT, on && { color: '#fff' }]}>{l}</Text>
                      </Pressable>
                    );
                  })}
                </View>
                {!!tEdits.days?.length && tEdits.days.length !== tRead.cfg.days.length && <Text style={st.ask}>Pick {tRead.cfg.days.length - tEdits.days.length} more.</Text>}
                <Text style={st.label}>Split</Text>
                {SPLITS_FOR[tRead.cfg.days.length].map((id) => {
                  const on = tRead.cfg.split === id;
                  return (
                    <Pressable key={id} accessibilityRole="radio" accessibilityState={{ selected: on }} onPress={() => setTEdits({ ...tEdits, split: id, count: SPLITS[id].days })} style={[st.opt, on && st.optOn]}>
                      <View style={{ flex: 1 }}><Text style={st.optT}>{SPLITS[id].label}</Text><Text style={st.small}>{SPLITS[id].blurb}</Text></View>
                    </Pressable>
                  );
                })}
                <Text style={st.label}>Where you train</Text>
                <View style={st.wrapRow}>
                  {(['gym', 'db', 'bw'] as Equip[]).map((q) => {
                    const on = tRead.cfg.equip === q;
                    return <Pressable key={q} onPress={() => setTEdits({ ...tEdits, equip: q })} style={[st.pick, on && st.pickOn]}><Text style={[st.pickT, on && { color: '#fff' }]}>{EQUIP_LABEL[q]}</Text></Pressable>;
                  })}
                </View>
                <Text style={st.label}>Areas to bring up · up to {MAX_FOCUS}</Text>
                <View style={st.wrapRow}>
                  {(Object.keys(FOCUS_LABEL) as Focus[]).map((f) => {
                    const cur = tRead.focus;
                    const on = cur.includes(f);
                    return <Pressable key={f} onPress={() => setTEdits({ ...tEdits, focus: on ? cur.filter((x) => x !== f) : [...cur, f].slice(-MAX_FOCUS) })} style={[st.pick, on && st.pickOn]}><Text style={[st.pickT, on && { color: '#fff' }]}>{FOCUS_LABEL[f]}</Text></Pressable>;
                  })}
                </View>
              </Edit>
            </>
          )}

          {/* ---------- Training: moves they like ---------- */}
          {!review && step.key === 'moves' && (
            <>
              {(!!text.trim() || !!tRead.prefer.length) && (
                <Got empty={!tRead.prefer.length && !tRead.unknown.length}>
                  <View style={st.wrapRow}>
                    {tRead.prefer.map((id) => {
                      const p = patternOf(id);
                      const fits = !p || optionsFor(p, tRead.cfg.equip).some((c) => c[0] === id);
                      return <Chip key={id} t={exercises[id]?.name || id} sub={fits ? undefined : `needs ${tRead.cfg.equip === 'bw' ? 'equipment' : 'a gym'}`} onX={() => tDrop('move:' + id)} />;
                    })}
                  </View>
                  {tRead.prefer.length > 0 && <Text style={st.note}>These go into every workout where that movement shows up. Same sets and reps, your exercise.</Text>}
                  {tRead.unknown.length > 0 && (
                    <FollowUp q="I don't have these in the library yet. Add them as your own moves?">
                      <View style={st.wrapRow}>
                        {tRead.unknown.map((u) => {
                          const on = (tEdits.extras || []).includes(u);
                          return (
                            <Pressable key={u} onPress={() => setTEdits({ ...tEdits, extras: on ? (tEdits.extras || []).filter((x) => x !== u) : [...(tEdits.extras || []), u] })} style={[st.pick, on && st.pickOn]}>
                              <Text style={[st.pickT, on && { color: '#fff' }]}>{on ? '✓ ' : '+ '}{u}</Text>
                            </Pressable>
                          );
                        })}
                      </View>
                    </FollowUp>
                  )}
                </Got>
              )}
              <Edit title="Add a move">
                <Adder placeholder="Search, e.g. cable row, leg press" search={(q) => searchMoves(q).filter((id) => !tRead.prefer.includes(id)).map((id) => ({ id, label: exercises[id]?.name || id }))}
                  onAdd={(id) => setTEdits({ ...tEdits, addMoves: [...(tEdits.addMoves || []), id], drop: (tEdits.drop || []).filter((x) => x !== 'move:' + id) })} />
                <OwnMove onAdd={(name) => setTEdits({ ...tEdits, extras: [...(tEdits.extras || []), name] })} />
                <Removed keys={(tEdits.drop || []).filter((k) => k.startsWith('move:'))} label={(k) => nameOf(k.slice(5))} onUndo={(k) => setTEdits({ ...tEdits, drop: (tEdits.drop || []).filter((x) => x !== k) })} />
              </Edit>
            </>
          )}

          {/* ---------- Training: lifts ---------- */}
          {!review && step.key === 'lifts' && (
            <>
              <Got empty={!liftRows.length} emptyText={text.trim() ? undefined : 'Type them above, or add them one at a time below.'}>
                {liftRows.map((id) => {
                  const cur = tEdits.lifts?.[id] || tRead.cfg.lifts?.[id] || { w: 0, r: 0 };
                  const target = buildWeek(tRead.cfg).flatMap((d) => d.x).find((x) => x[0] === id)?.[1] || '3 × 8–12';
                  const sug = cur.w && cur.r ? suggestFromLift(target, cur, LOWER.test(id)) : null;
                  const set = (k: 'w' | 'r', v: string) => setTEdits({ ...tEdits, lifts: { ...(tEdits.lifts || {}), [id]: { ...cur, [k]: Math.min(k === 'w' ? 1500 : 50, Number(v.replace(/[^\d.]/g, '')) || 0) } } });
                  return (
                    <View key={id} style={st.liftRow}>
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <Text style={st.liftT} numberOfLines={1}>{nameOf(id)}</Text>
                        {sug ? <Text style={st.liftS}>Week 1: {sug.weight} lbs × {sug.reps}</Text> : <Text style={st.small}>{cur.w ? `How many reps at ${cur.w}?` : 'Weight and reps'}</Text>}
                      </View>
                      <TextInput value={cur.w ? String(cur.w) : ''} onChangeText={(v) => set('w', v)} keyboardType="decimal-pad" maxLength={5} placeholder="lbs" placeholderTextColor="#8a92a8" style={st.num} accessibilityLabel={`Weight for ${nameOf(id)}`} />
                      <Text style={st.times}>×</Text>
                      <TextInput value={cur.r ? String(cur.r) : ''} onChangeText={(v) => set('r', v)} keyboardType="number-pad" maxLength={2} placeholder="reps" placeholderTextColor="#8a92a8" style={[st.num, { width: 56 }]} accessibilityLabel={`Reps for ${nameOf(id)}`} />
                      <X onPress={() => tDrop('lift:' + id)} label={`Remove ${nameOf(id)}`} />
                    </View>
                  );
                })}
              </Got>
              <Edit title="Add a lift">
                <Adder placeholder="Search, e.g. squat, pulldown" search={(q) => searchMoves(q).filter((id) => !liftRows.includes(id)).map((id) => ({ id, label: exercises[id]?.name || id }))}
                  onAdd={(id) => setTEdits({ ...tEdits, lifts: { ...(tEdits.lifts || {}), [id]: { w: 0, r: 0 } }, drop: (tEdits.drop || []).filter((x) => x !== 'lift:' + id) })} />
                <Removed keys={(tEdits.drop || []).filter((k) => k.startsWith('lift:'))} label={(k) => nameOf(k.slice(5))} onUndo={(k) => setTEdits({ ...tEdits, drop: (tEdits.drop || []).filter((x) => x !== k) })} />
              </Edit>
            </>
          )}

          {/* ---------- Training: pain ---------- */}
          {!review && step.key === 'pain' && (
            <>
              {(!!text.trim() || !!tRead.avoid.length) && (
                <Got empty={!tRead.avoid.length} emptyText="Nothing to keep out. Noted.">
                  {tRead.areas.length > 0 && <Text style={st.note}>Because of your {tRead.areas.join(' and ')}, I'll keep these out and use joint-friendlier versions. Tap ✕ on any you're fine with.</Text>}
                  <View style={st.wrapRow}>{tRead.avoid.map((id) => <Chip key={id} t={nameOf(id)} onX={() => tDrop('avoid:' + id)} red />)}</View>
                </Got>
              )}
              <Edit title="Keep another move out">
                <Adder placeholder="Search, e.g. deadlift, dips" search={(q) => searchMoves(q).filter((id) => !tRead.avoid.includes(id)).map((id) => ({ id, label: exercises[id]?.name || id }))}
                  onAdd={(id) => setTEdits({ ...tEdits, addAvoid: [...(tEdits.addAvoid || []), id], drop: (tEdits.drop || []).filter((x) => x !== 'avoid:' + id) })} />
                <Removed keys={(tEdits.drop || []).filter((k) => k.startsWith('avoid:'))} label={(k) => nameOf(k.slice(6))} onUndo={(k) => setTEdits({ ...tEdits, drop: (tEdits.drop || []).filter((x) => x !== k) })} prefix="Allowed again" />
              </Edit>
            </>
          )}

          {/* ---------- Food: a normal day ---------- */}
          {!review && step.key === 'day' && (
            <>
              {(!!text.trim() || fRead.parts.length > 0) && (
                <Got empty={!fRead.parts.length} emptyText="I couldn't split that into meals yet. Try naming them, like 'Breakfast: … Lunch: …', or add them below.">
                  {fRead.parts.map((p) => (
                    <View key={p.key} style={{ gap: 6 }}>
                      {p.order ? <OrderCard o={p.order} slot={p.slot} kcal={kcal} protein={protein} edits={fEdits} setEdits={setFEdits} onX={() => fDrop(p.key)} />
                        : !p.meal ? <View style={st.mine}><Text style={st.mineSlot}>{SLOT_LABEL[p.slot].toUpperCase()}</Text><Text style={st.offT}>I couldn't read the foods in "{p.text}". Try amounts and plain names, like "6 oz chicken and a cup of rice".</Text></View>
                          : <MealCard part={p} kcal={kcal} protein={protein} pantry={pantry} onX={() => fDrop(p.key)} />}
                      {!p.order && (
                        <View style={st.slotRow}>
                          <Text style={st.small}>This is my</Text>
                          {SLOTS.map((s) => (
                            <Pressable key={s} onPress={() => setFEdits({ ...fEdits, slot: { ...(fEdits.slot || {}), [p.key]: s } })} style={[st.slotChip, p.slot === s && st.pickOn]}>
                              <Text style={[st.slotChipT, p.slot === s && { color: '#fff' }]}>{SLOT_LABEL[s]}</Text>
                            </Pressable>
                          ))}
                        </View>
                      )}
                    </View>
                  ))}
                </Got>
              )}
              <Edit title="Add a meal">
                <AddMeal onAdd={(slot, t) => setFEdits({ ...fEdits, addMeals: [...(fEdits.addMeals || []), { key: 'm' + Date.now().toString(36), slot, text: t }] })} />
                <Removed keys={(fEdits.drop || []).filter((k) => /^(d|m)/.test(k))} label={() => 'a meal'} onUndo={(k) => setFEdits({ ...fEdits, drop: (fEdits.drop || []).filter((x) => x !== k) })} />
              </Edit>
            </>
          )}

          {/* ---------- Food: takeout ---------- */}
          {!review && step.key === 'out' && (
            <>
              {(!!text.trim() || outOrders.length > 0) && (
                <Got empty={!outOrders.length}>
                  {outOrders.map((o) => <OrderCard key={o.id} o={o} kcal={kcal} protein={protein} edits={fEdits} setEdits={setFEdits} onX={() => fDrop(o.id)} />)}
                </Got>
              )}
              <Edit title="Add an order">
                <AddOrder onAdd={(o) => {
                  const key = 'a' + Date.now().toString(36);
                  setFEdits({ ...fEdits, addOrders: [...(fEdits.addOrders || []), { key, where: o.where, order: o.order }], ...(o.kcal ? { nums: { ...(fEdits.nums || {}), [key]: { kcal: o.kcal, protein: o.protein } } } : {}) });
                }} />
                <Removed keys={(fEdits.drop || []).filter((k) => /^(o|a)/.test(k))} label={() => 'an order'} onUndo={(k) => setFEdits({ ...fEdits, drop: (fEdits.drop || []).filter((x) => x !== k) })} />
              </Edit>
            </>
          )}

          {/* ---------- Food: what they skip ---------- */}
          {!review && step.key === 'no' && (
            <>
              {(!!text.trim() || fRead.noFoods.length > 0) && (
                <Got empty={!fRead.noFoods.length && !fRead.diets.length} emptyText="Nothing to keep out. Noted.">
                  {fRead.diets.length > 0 && <View style={st.wrapRow}>{fRead.diets.map((d) => <Chip key={d} t={d} info />)}</View>}
                  <View style={st.wrapRow}>{fRead.noFoods.map((id) => <Chip key={id} t={foodById(id) ? foodName(foodById(id)!) : id} onX={() => fDrop('no:' + id)} red />)}</View>
                  {fRead.unknownNo.length > 0 && <Text style={st.miss}>Not in my food list, so it won't show up anyway: {fRead.unknownNo.join(', ')}</Text>}
                </Got>
              )}
              <Edit title="Keep another food out">
                <Adder placeholder="Search, e.g. salmon, cottage cheese" search={(q) => searchFoods(q, 6).filter((f) => !fRead.noFoods.includes(f.id)).map((f) => ({ id: f.id, label: foodName(f) }))}
                  onAdd={(id) => setFEdits({ ...fEdits, addNo: [...(fEdits.addNo || []), id], drop: (fEdits.drop || []).filter((x) => x !== 'no:' + id) })} />
                <Removed keys={(fEdits.drop || []).filter((k) => k.startsWith('no:'))} label={(k) => { const f = foodById(k.slice(3)); return f ? foodName(f) : k.slice(3); }} onUndo={(k) => setFEdits({ ...fEdits, drop: (fEdits.drop || []).filter((x) => x !== k) })} prefix="Back in" />
              </Edit>
            </>
          )}

          {/* ---------- Food: anything else ---------- */}
          {!review && step.key === 'extra' && !!text.trim() && (
            <Got empty={!fRead.rules.length} emptyText="Got it. This stays on your plan, so anyone coaching you sees it too.">
              <Text style={st.note}>Here's how your plan handles that. These go on your plan as your rules.</Text>
              {readSituation(answers.extra || '').map((r, k) => (fEdits.drop || []).includes('rule:' + k) ? null : (
                <View key={k} style={st.rule}>
                  <Text style={st.ruleT}>{r}</Text>
                  <X onPress={() => fDrop('rule:' + k)} label="Remove this rule" />
                </View>
              ))}
              <Removed keys={(fEdits.drop || []).filter((k) => k.startsWith('rule:'))} label={() => 'a rule'} onUndo={(k) => setFEdits({ ...fEdits, drop: (fEdits.drop || []).filter((x) => x !== k) })} />
            </Got>
          )}
          {review && (
            <Review plan={plan} cfg={tRead.cfg} showTrain={steps.some((s) => s.area === 'train')} showFood={steps.some((s) => s.area === 'food')}
              quiz={{ ...quiz, my_meals: fRead.meals, my_orders: fRead.myOrders, no_foods: fRead.noFoods }} kcal={kcal} protein={protein} nameOf={nameOf}
              lifts={tRead.cfg.lifts || {}} prefer={tRead.prefer} anyAnswer={Object.values(answers).some((x) => x?.trim()) || !!personal.length} personal={personal} jump={jump} />
          )}
          {!!msg && <Text style={st.err}>{msg}</Text>}
        </View>
      </ScrollView>

      {/* Bottom */}
      <View style={[st.sticky, { paddingBottom: 12 + insets.bottom }]}>
        <View style={[st.wrap, { gap: 8 }]}>
          {review ? (
            <Pressable accessibilityRole="button" disabled={busy} onPress={save} style={[st.cta, busy && { opacity: 0.7 }]}>
              <Text style={st.ctaT}>{busy ? 'Rebuilding your plan…' : fromReady ? 'Build my plan and start week 1' : 'Rebuild my plan'}</Text>
            </Pressable>
          ) : (
            <Pressable accessibilityRole="button" onPress={next} style={[st.cta, !text.trim() && st.ctaQuiet]}>
              <Text style={[st.ctaT, !text.trim() && { color: L.ink }]}>{!text.trim() ? 'Skip this one' : i === steps.length - 1 ? 'See my plan' : 'Next'}</Text>
            </Pressable>
          )}
          {review && <Pressable onPress={() => setI(0)} style={{ alignSelf: 'center' }} hitSlop={6}><Text style={st.ctaSub}>Change an answer</Text></Pressable>}
        </View>
      </View>
    </View>
  );
}

/* ---------------------------------------------------------------- pieces */

function Got({ children, empty, emptyText }: { children?: React.ReactNode; empty?: boolean; emptyText?: string }) {
  return (
    <View style={st.got}>
      <Text style={st.gotK}>HERE'S WHAT I GOT</Text>
      {empty ? <Text style={st.note}>{emptyText || "I didn't catch anything specific there. That's fine, your plan keeps what it has."}</Text> : <View style={{ gap: 10 }}>{children}</View>}
    </View>
  );
}

function FollowUp({ q, children }: { q: string; children: React.ReactNode }) {
  return (
    <View style={st.follow}>
      <Text style={st.followK}>QUICK QUESTION · OPTIONAL</Text>
      <Text style={st.followQ}>{q}</Text>
      {children}
    </View>
  );
}

function Chip({ t, sub, onX, info, red }: { t: string; sub?: string; onX?: () => void; info?: boolean; red?: boolean }) {
  return (
    <View style={[st.chip, info && st.chipInfo, red && st.chipRed, !!sub && { opacity: 0.6 }]}>
      {!info && !red && <Svg width={13} height={13} viewBox="0 0 24 24"><Path d="M5 12.5l4.5 4.5L19 7.5" stroke={L.green} strokeWidth={3.2} fill="none" strokeLinecap="round" strokeLinejoin="round" /></Svg>}
      <Text style={[st.chipT, red && { color: L.red }]}>{t}{sub ? ` · ${sub}` : ''}</Text>
      {onX && <X onPress={onX} label={`Remove ${t}`} small />}
    </View>
  );
}

const X = ({ onPress, label, small }: { onPress: () => void; label: string; small?: boolean }) => (
  <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} hitSlop={10} style={small ? st.xSmall : st.x}>
    <Svg width={small ? 10 : 12} height={small ? 10 : 12} viewBox="0 0 24 24"><Path d="M6 6l12 12M18 6L6 18" stroke={L.muted} strokeWidth={3} strokeLinecap="round" /></Svg>
  </Pressable>
);

function OrderCard({ o, slot, kcal, protein, edits, setEdits, onX }: {
  o: { id: string; where: string; order: string; kcal: number; protein: number; est?: boolean }; slot?: SlotName;
  kcal: number; protein: number; edits: FoodEdits; setEdits: (e: FoodEdits) => void; onX: () => void;
}) {
  const n = edits.nums?.[o.id] || {};
  const setN = (k: 'kcal' | 'protein', v: string) => setEdits({ ...edits, nums: { ...(edits.nums || {}), [o.id]: { ...n, [k]: Number(v.replace(/\D/g, '')) || 0 } } });
  const k = n.kcal || o.kcal, p = n.protein || o.protein;
  return (
    <View style={st.mine}>
      <View style={st.mineHead}>
        <Text style={st.mineSlot}>{slot ? `${SLOT_LABEL[slot].toUpperCase()} · ` : ''}{o.where.toUpperCase()}</Text>
        <Text style={[st.badge, st.badgeOk]}>YOUR ORDER</Text>
        <View style={{ flex: 1 }} />
        <X onPress={onX} label={`Remove ${o.where}`} />
      </View>
      <Text style={st.mineT}>{o.order}</Text>
      <Text style={st.mineK}>{o.est && !n.kcal ? 'Estimated ' : 'About '}{k.toLocaleString('en-US')} cal · {p} g protein</Text>
      <Text style={st.tweak}>{orderNote({ kcal: k, protein: p }, kcal, protein)}</Text>
      {o.est && (
        <View style={{ gap: 6, marginTop: 4 }}>
          <Text style={st.small}>Know the real numbers? Most chains list them in their app. Optional.</Text>
          <View style={st.row}>
            <TextInput value={n.kcal ? String(n.kcal) : ''} onChangeText={(v) => setN('kcal', v)} keyboardType="number-pad" placeholder="Calories" placeholderTextColor="#8a92a8" style={[st.input, st.half]} maxLength={4} />
            <TextInput value={n.protein ? String(n.protein) : ''} onChangeText={(v) => setN('protein', v)} keyboardType="number-pad" placeholder="Protein (g)" placeholderTextColor="#8a92a8" style={[st.input, st.half]} maxLength={3} />
          </View>
        </View>
      )}
    </View>
  );
}

function Edit({ title, sub, children }: { title: string; sub?: string; children: React.ReactNode }) {
  return (
    <View style={st.edit}>
      <Text style={st.editH}>{title}</Text>
      {!!sub && <Text style={st.small}>{sub}</Text>}
      <View style={{ gap: 10 }}>{children}</View>
    </View>
  );
}

/** Type to search, tap a result to add it. */
function Adder({ placeholder, search, onAdd }: { placeholder: string; search: (q: string) => { id: string; label: string }[]; onAdd: (id: string) => void }) {
  const [q, setQ] = useState('');
  const hits = q.trim().length >= 2 ? search(q) : [];
  return (
    <View style={{ gap: 8 }}>
      <TextInput value={q} onChangeText={setQ} placeholder={placeholder} placeholderTextColor="#8a92a8" style={st.input} maxLength={40} />
      {hits.length > 0 && (
        <View style={st.wrapRow}>
          {hits.map((h) => <Pressable key={h.id} onPress={() => { onAdd(h.id); setQ(''); }} style={st.pick}><Text style={st.pickT}>+ {h.label}</Text></Pressable>)}
        </View>
      )}
      {q.trim().length >= 2 && !hits.length && <Text style={st.small}>Nothing by that name yet.</Text>}
    </View>
  );
}

function OwnMove({ onAdd }: { onAdd: (name: string) => void }) {
  const [v, setV] = useState('');
  return (
    <View style={st.row}>
      <TextInput value={v} onChangeText={setV} placeholder="Not on the list? Type your own move" placeholderTextColor="#8a92a8" style={[st.input, st.half]} maxLength={40} />
      <Pressable disabled={!v.trim()} onPress={() => { onAdd(v.trim()); setV(''); }} style={[st.smallBtn, !v.trim() && { opacity: 0.4 }]}><Text style={st.smallBtnT}>Add</Text></Pressable>
    </View>
  );
}

/** What they took out, with a one-tap undo. */
function Removed({ keys, label, onUndo, prefix = 'Removed' }: { keys: string[]; label: (k: string) => string; onUndo: (k: string) => void; prefix?: string }) {
  if (!keys.length) return null;
  return (
    <View style={{ gap: 6 }}>
      <Text style={st.label}>{prefix}</Text>
      <View style={st.wrapRow}>
        {keys.map((k) => <Pressable key={k} onPress={() => onUndo(k)} style={st.undo}><Text style={st.undoT}>↺ {label(k)}</Text></Pressable>)}
      </View>
    </View>
  );
}

function MealCard({ part: p, kcal, protein, pantry, onX }: { part: ReadMealPart; kcal: number; protein: number; pantry: Food[]; onX: () => void }) {
  const f = fitMeal(p.meal!, kcal, protein, pantry);
  const ok = f.fit !== 'off';
  return (
    <View style={st.mine}>
      <View style={st.mineHead}>
        <Text style={st.mineSlot}>{SLOT_LABEL[p.slot].toUpperCase()}</Text>
        <Text style={[st.badge, ok ? st.badgeOk : st.badgeOff]}>{ok ? 'IN YOUR PLAN' : "DOESN'T FIT YET"}</Text>
        <View style={{ flex: 1 }} />
        <X onPress={onX} label={`Remove ${p.meal!.name}`} />
      </View>
      <Text style={st.mineT}>{p.meal!.name}</Text>
      <Text style={st.mineD}>{ok ? 'Sized for you: ' : ''}{f.detail}</Text>
      <Text style={st.mineK}>{f.kcal} cal · {f.protein} protein</Text>
      {ok && !!f.tweak && <Text style={st.tweak}>{f.tweak}</Text>}
      {!ok && <Text style={st.offT}>{offReason(f, p.meal!, kcal, protein)}</Text>}
      {p.missing.length > 0 && <Text style={st.miss}>Didn't count: {p.missing.join(', ')}</Text>}
    </View>
  );
}

function AddMeal({ onAdd }: { onAdd: (slot: SlotName, text: string) => void }) {
  const [slot, setSlot] = useState<SlotName>('Breakfast');
  const [v, setV] = useState('');
  return (
    <View style={{ gap: 8 }}>
      <View style={st.wrapRow}>
        {SLOTS.map((x) => <Pressable key={x} onPress={() => setSlot(x)} style={[st.slotChip, slot === x && st.pickOn]}><Text style={[st.slotChipT, slot === x && { color: '#fff' }]}>{SLOT_LABEL[x]}</Text></Pressable>)}
      </View>
      <TextInput value={v} onChangeText={setV} multiline placeholder="What's in it? e.g. Greek yogurt, berries and granola" placeholderTextColor="#8a92a8" style={[st.input, { minHeight: 56 }]} maxLength={200} textAlignVertical="top" />
      <Pressable disabled={!v.trim()} onPress={() => { onAdd(slot, v.trim()); setV(''); }} style={[st.smallBtn, { alignSelf: 'flex-start' }, !v.trim() && { opacity: 0.4 }]}><Text style={st.smallBtnT}>Add to my {SLOT_LABEL[slot].toLowerCase()}</Text></Pressable>
    </View>
  );
}

function AddOrder({ onAdd }: { onAdd: (o: { where: string; order: string; kcal: number; protein: number }) => void }) {
  const [where, setWhere] = useState('');
  const [order, setOrder] = useState('');
  const [k, setK] = useState('');
  const [p, setP] = useState('');
  const can = !!where.trim() || !!order.trim();
  return (
    <View style={{ gap: 8 }}>
      <TextInput value={where} onChangeText={setWhere} placeholder="Where? e.g. Cava, the taco spot" placeholderTextColor="#8a92a8" style={st.input} maxLength={40} />
      <TextInput value={order} onChangeText={setOrder} placeholder="What you get" placeholderTextColor="#8a92a8" style={st.input} maxLength={160} />
      <View style={st.row}>
        <TextInput value={k} onChangeText={(v) => setK(v.replace(/\D/g, ''))} keyboardType="number-pad" placeholder="Calories (optional)" placeholderTextColor="#8a92a8" style={[st.input, st.half]} maxLength={4} />
        <TextInput value={p} onChangeText={(v) => setP(v.replace(/\D/g, ''))} keyboardType="number-pad" placeholder="Protein g (optional)" placeholderTextColor="#8a92a8" style={[st.input, st.half]} maxLength={3} />
      </View>
      <Pressable disabled={!can} onPress={() => { onAdd({ where: where.trim(), order: order.trim(), kcal: Number(k) || 0, protein: Number(p) || 0 }); setWhere(''); setOrder(''); setK(''); setP(''); }} style={[st.smallBtn, { alignSelf: 'flex-start' }, !can && { opacity: 0.4 }]}><Text style={st.smallBtnT}>Add this order</Text></Pressable>
    </View>
  );
}

function Review({ plan, cfg, showTrain, showFood, quiz, kcal, protein, nameOf, lifts, prefer, anyAnswer, personal, jump }: {
  plan: Plan; cfg: TrainCfg; showTrain: boolean; showFood: boolean; quiz: Partial<Quiz>; kcal: number; protein: number;
  nameOf: (id: string) => string; lifts: Record<string, { w: number; r: number }>; prefer: string[]; anyAnswer: boolean;
  personal: string[]; jump: (key: string) => void;
}) {
  const week = useMemo(() => buildWeek(cfg), [cfg]);
  const food = useMemo(() => mealPlanFor(quiz, kcal, protein), [quiz, kcal, protein]);
  const mineOrders = (food.eat_out || []).filter((e: any) => e.mine);
  return (
    <>
      <View style={{ gap: 6 }}>
        <Text style={st.kicker}>{anyAnswer ? 'BUILT FROM YOUR ANSWERS' : 'YOUR PLAN'}</Text>
        <Text style={st.reviewH}>{anyAnswer ? "Here's your plan, rebuilt around you." : "No changes yet. Here's your plan as it is."}</Text>
        <Text style={st.introSub}>Same {plan.kcal} calories and {plan.protein} g of protein. Sets, reps and your 12-week progression stay locked in, so it keeps working.</Text>
      </View>
      {personal.length > 0 && (
        <View style={st.got}>
          <Text style={st.gotK}>HOW I TAILORED IT</Text>
          {personal.map((p, k) => (
            <View key={k} style={{ flexDirection: 'row', gap: 10 }}>
              <Svg width={16} height={16} viewBox="0 0 24 24" style={{ marginTop: 2 }}><Path d="M5 12.5l4.5 4.5L19 7.5" stroke={L.green} strokeWidth={3.2} fill="none" strokeLinecap="round" strokeLinejoin="round" /></Svg>
              <Text style={[st.note, { flex: 1 }]}>{p}</Text>
            </View>
          ))}
        </View>
      )}
      {showTrain && (
        <View style={st.preview}>
          <View style={st.pvHead}><Text style={st.pvK}>YOUR WEEK · {SPLITS[cfg.split].label.toUpperCase()}</Text><Pressable onPress={() => jump('week')} hitSlop={8}><Text style={st.pvEdit}>Edit</Text></Pressable></View>
          {week.map((d, k) => (
            <View key={k} style={st.pvDay}>
              <Text style={st.pvDayT}>{d.t}</Text>
              {d.x.map(([id, target]) => {
                const mine = prefer.includes(id) || id.startsWith('my_');
                const sug = suggestFromLift(target, lifts[id], LOWER.test(id));
                return (
                  <View key={id} style={st.pvRow}>
                    <Text style={st.pvName} numberOfLines={1}>{nameOf(id)}</Text>
                    {mine && <Text style={st.yours}>YOURS</Text>}
                    <Text style={st.pvMeta}>{sug ? `${sug.weight} × ${sug.reps}` : target}</Text>
                  </View>
                );
              })}
            </View>
          ))}
        </View>
      )}
      {showFood && (
        <View style={st.preview}>
          <View style={st.pvHead}><Text style={st.pvK}>YOUR DAY OF EATING</Text><Pressable onPress={() => jump('day')} hitSlop={8}><Text style={st.pvEdit}>Edit</Text></Pressable></View>
          {food.meals.map((m) => {
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
          {mineOrders.length > 0 && <View style={[st.pvHead, { marginTop: 6 }]}><Text style={st.pvK}>YOUR ORDERS</Text><Pressable onPress={() => jump('out')} hitSlop={8}><Text style={st.pvEdit}>Edit</Text></Pressable></View>}
          {mineOrders.map((e: any, k: number) => (
            <View key={k} style={st.pvRowFood}>
              <Text style={st.pvSlot}>{e.where}</Text>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={st.pvName} numberOfLines={1}>{e.order}</Text>
                <Text style={st.pvDetail} numberOfLines={2}>{e.note}</Text>
              </View>
              <Text style={st.pvKcal}>{e.kcal.replace('about ', '')}</Text>
            </View>
          ))}
          <Text style={st.pvFoot}>Every meal keeps 3 options. Any pick per meal lands close to {kcal.toLocaleString('en-US')} calories and {protein} g of protein.</Text>
        </View>
      )}
    </>
  );
}

const st = StyleSheet.create({
  wrap: { width: '100%', maxWidth: 680, alignSelf: 'center', paddingHorizontal: 18 },
  top: { backgroundColor: L.navy, paddingBottom: 14 },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  backBtn: { width: 32, height: 32, justifyContent: 'center' },
  bars: { flex: 1, flexDirection: 'row', gap: 4 },
  bar: { flex: 1, height: 5, borderRadius: 3, backgroundColor: L.navyLine },
  barOn: { backgroundColor: '#2fd17f' },
  skipTop: { fontFamily: F.bold, fontSize: 14, color: '#fff', textDecorationLine: 'underline' },
  intro: { fontFamily: F.black, fontSize: 26, lineHeight: 30, color: L.ink, letterSpacing: -0.6 },
  introSub: { fontFamily: F.medium, fontSize: 15, lineHeight: 22, color: L.body },
  card: { backgroundColor: L.white, borderRadius: 22, borderWidth: 1, borderColor: L.line, padding: 18, gap: 8, shadowColor: L.ink, shadowOpacity: 0.06, shadowRadius: 18, shadowOffset: { width: 0, height: 8 }, elevation: 2 },
  kicker: { fontFamily: F.xbold, fontSize: 11.5, letterSpacing: 1.4, color: L.red },
  q: { fontFamily: F.black, fontSize: 25, lineHeight: 29, color: L.ink, letterSpacing: -0.5 },
  sub: { fontFamily: F.medium, fontSize: 14.5, lineHeight: 21, color: L.body },
  answer: { minHeight: 132, borderWidth: 1.5, borderColor: L.line, borderRadius: 16, padding: 14, marginTop: 6, fontFamily: F.semi, fontSize: 16.5, lineHeight: 23, color: L.ink, backgroundColor: L.bg },
  optional: { fontFamily: F.medium, fontSize: 12.5, color: L.muted },
  got: { backgroundColor: L.white, borderRadius: 22, borderWidth: 1.5, borderColor: '#cfe9db', padding: 16, gap: 10 },
  gotK: { fontFamily: F.xbold, fontSize: 11, letterSpacing: 1.4, color: L.green },
  note: { fontFamily: F.medium, fontSize: 14, lineHeight: 20, color: L.body },
  follow: { backgroundColor: L.soft, borderRadius: 16, padding: 14, gap: 8, marginTop: 2 },
  followK: { fontFamily: F.xbold, fontSize: 10.5, letterSpacing: 1.3, color: L.muted },
  followQ: { fontFamily: F.bold, fontSize: 15.5, color: L.ink },
  chip: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: 7, paddingLeft: 12, paddingRight: 6, minHeight: 36, borderRadius: 18, backgroundColor: L.greenTint },
  chipInfo: { backgroundColor: L.soft, paddingRight: 12 },
  chipRed: { backgroundColor: '#fdf1f0', paddingLeft: 14 },
  chipT: { fontFamily: F.bold, fontSize: 14, color: L.ink, paddingVertical: 7 },
  x: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: L.soft },
  xSmall: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  row: { flexDirection: 'row', gap: 8 },
  wrapRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pick: { paddingHorizontal: 13, height: 38, borderRadius: 19, borderWidth: 1.5, borderColor: L.line, backgroundColor: L.white, justifyContent: 'center' },
  pickOn: { backgroundColor: L.navy, borderColor: L.navy },
  pickT: { fontFamily: F.semi, fontSize: 14, color: L.ink },
  dayRow: { flexDirection: 'row', justifyContent: 'space-between' },
  dayDot: { width: 40, height: 40, borderRadius: 20, borderWidth: 1.5, borderColor: L.line, backgroundColor: L.white, alignItems: 'center', justifyContent: 'center' },
  dayDotOn: { backgroundColor: L.navy, borderColor: L.navy },
  dayDotT: { fontFamily: F.xbold, fontSize: 14, color: L.ink },
  liftRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: L.line },
  liftT: { fontFamily: F.bold, fontSize: 15, color: L.ink },
  liftS: { fontFamily: F.semi, fontSize: 13, color: L.green, marginTop: 2 },
  num: { width: 70, height: 42, borderWidth: 1.5, borderColor: L.line, borderRadius: 12, textAlign: 'center', fontFamily: F.bold, fontSize: 15, color: L.ink },
  input: { borderWidth: 1.5, borderColor: L.line, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, fontFamily: F.semi, fontSize: 15, color: L.ink, backgroundColor: L.white },
  half: { flex: 1, minWidth: 0, width: 0 },
  small: { fontFamily: F.medium, fontSize: 12.5, lineHeight: 17, color: L.muted },
  mine: { borderRadius: 16, borderWidth: 1, borderColor: L.line, padding: 14, gap: 4 },
  mineHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  mineSlot: { fontFamily: F.xbold, fontSize: 11, letterSpacing: 1.1, color: L.muted, flexShrink: 1 },
  mineT: { fontFamily: F.black, fontSize: 17, color: L.ink },
  mineD: { fontFamily: F.medium, fontSize: 14, lineHeight: 20, color: L.body },
  mineK: { fontFamily: F.bold, fontSize: 13.5, color: L.ink },
  badge: { fontFamily: F.xbold, fontSize: 9.5, letterSpacing: 1, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 7, overflow: 'hidden' },
  badgeOk: { color: L.green, backgroundColor: L.greenTint },
  badgeOff: { color: L.amber, backgroundColor: L.amberTint },
  tweak: { fontFamily: F.semi, fontSize: 13, lineHeight: 18, color: L.green, marginTop: 2 },
  offT: { fontFamily: F.semi, fontSize: 13, lineHeight: 18, color: L.amber, marginTop: 2 },
  miss: { fontFamily: F.medium, fontSize: 12.5, color: L.muted },
  reviewH: { fontFamily: F.black, fontSize: 27, lineHeight: 31, color: L.ink, letterSpacing: -0.6 },
  preview: { backgroundColor: L.navy, borderRadius: 22, padding: 18, gap: 12 },
  pvK: { fontFamily: F.xbold, fontSize: 11, letterSpacing: 1.4, color: '#ff8a82' },
  pvDay: { gap: 6, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: L.navyLine },
  pvDayT: { fontFamily: F.xbold, fontSize: 14, color: '#fff' },
  pvRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  pvRowFood: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: L.navyLine },
  pvSlot: { width: 80, fontFamily: F.xbold, fontSize: 10.5, letterSpacing: 0.8, color: '#9aa3bd', textTransform: 'uppercase', marginTop: 3 },
  pvName: { flexShrink: 1, fontFamily: F.semi, fontSize: 14.5, color: '#e6e9f2' },
  pvMeta: { marginLeft: 'auto', fontFamily: F.medium, fontSize: 12.5, color: '#9aa3bd' },
  pvDetail: { fontFamily: F.medium, fontSize: 12.5, lineHeight: 17, color: '#9aa3bd' },
  pvKcal: { fontFamily: F.bold, fontSize: 13, color: '#fff', marginTop: 2 },
  pvFoot: { fontFamily: F.medium, fontSize: 12.5, lineHeight: 18, color: '#c7cde0' },
  yours: { flexShrink: 0, fontFamily: F.xbold, fontSize: 9.5, letterSpacing: 1, color: '#7ff0b5', borderWidth: 1, borderColor: '#2b7a57', borderRadius: 6, paddingHorizontal: 5, paddingVertical: 1, overflow: 'hidden' },
  err: { fontFamily: F.bold, fontSize: 14, color: L.red },
  ask: { fontFamily: F.bold, fontSize: 14, color: L.ink },
  label: { fontFamily: F.xbold, fontSize: 11, letterSpacing: 1.3, textTransform: 'uppercase', color: L.muted, marginTop: 4 },
  edit: { backgroundColor: L.white, borderRadius: 22, borderWidth: 1, borderStyle: 'dashed', borderColor: '#c9cedb', padding: 16, gap: 8 },
  editH: { fontFamily: F.black, fontSize: 17, color: L.ink },
  seg: { flex: 1, height: 42, borderRadius: 12, borderWidth: 1.5, borderColor: L.line, alignItems: 'center', justifyContent: 'center', backgroundColor: L.white },
  segOn: { backgroundColor: L.navy, borderColor: L.navy },
  segT: { fontFamily: F.xbold, fontSize: 15, color: L.ink },
  opt: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 14, borderWidth: 1.5, borderColor: L.line },
  optOn: { borderColor: L.navy, backgroundColor: L.soft },
  optT: { fontFamily: F.bold, fontSize: 15, color: L.ink },
  times: { fontFamily: F.bold, fontSize: 14, color: L.muted },
  slotRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6, paddingLeft: 4 },
  slotChip: { paddingHorizontal: 11, height: 30, borderRadius: 15, borderWidth: 1.5, borderColor: L.line, backgroundColor: L.white, justifyContent: 'center' },
  slotChipT: { fontFamily: F.semi, fontSize: 12.5, color: L.ink },
  undo: { paddingHorizontal: 12, height: 32, borderRadius: 16, backgroundColor: L.soft, justifyContent: 'center' },
  undoT: { fontFamily: F.semi, fontSize: 13, color: L.body },
  rule: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, padding: 12, borderRadius: 14, backgroundColor: L.soft },
  ruleT: { flex: 1, fontFamily: F.semi, fontSize: 14, lineHeight: 20, color: L.ink },
  smallBtn: { height: 44, borderRadius: 22, paddingHorizontal: 18, backgroundColor: L.navy, alignItems: 'center', justifyContent: 'center' },
  smallBtnT: { fontFamily: F.bold, fontSize: 14.5, color: '#fff' },
  pvHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  pvEdit: { fontFamily: F.bold, fontSize: 13, color: '#fff', textDecorationLine: 'underline' },
  sticky: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingTop: 12, backgroundColor: 'rgba(243,244,248,0.97)', borderTopWidth: 1, borderTopColor: L.line },
  cta: { height: 58, borderRadius: 29, backgroundColor: L.red, alignItems: 'center', justifyContent: 'center', shadowColor: L.red, shadowOpacity: 0.3, shadowRadius: 14, shadowOffset: { width: 0, height: 8 }, elevation: 5 },
  ctaQuiet: { backgroundColor: L.white, borderWidth: 1.5, borderColor: L.line, shadowOpacity: 0, elevation: 0 },
  ctaT: { fontFamily: F.black, fontSize: 17.5, color: '#fff' },
  ctaSub: { fontFamily: F.bold, fontSize: 13.5, color: L.ink, textDecorationLine: 'underline' },
});
