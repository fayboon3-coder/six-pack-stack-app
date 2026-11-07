import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Linking from 'expo-linking';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Svg, { Circle, Path } from 'react-native-svg';
import { supabase } from '../src/lib/supabase';
import { C, F } from '../src/lib/theme';
import { GOALS, projection, Quiz, savePendingQuiz } from '../src/lib/quiz';
import { SPOTS } from '../src/lib/menu';
import FoodPicker from '../src/components/FoodPicker';
import { whatsMissing } from '../src/lib/mealplan';
import { foodById, type Food } from '../src/data/foods';
import { kitTag } from '../src/lib/kit';
import { PRIVACY_URL, TERMS_URL } from '../src/lib/access';
import { hasGoal, quizFromHandoff, readHandoff } from '../src/lib/handoff';
import { useAuth } from '../src/lib/auth';
import { readLead } from '../src/lib/lead';
import { track } from '../src/lib/track';
import { DEFAULT_DAYS, defaultCfg } from '../src/lib/training';

const LOGO = require('../assets/logo-b.png');

type Opt = { v: string; t: string; s?: string; icon?: string };
const ICON = {
  flame: 'M12 3c3 4 6 7 6 11a6 6 0 0 1-12 0c0-2 1-4 2-5 0 2 1 3 2 3 0-4 1-6 2-9z',
  dumbbell: 'M6 7v10M18 7v10M3 10v4M21 10v4M6 12h12',
  trend: 'M4 17l5-5 4 4 7-8M15 8h5v5',
  home: 'M3 11l9-7 9 7M5 10v10h14V10M9 15h6',
  body: 'M12 5a2 2 0 1 0 0-.01M8 21l2-7-3-2 2-4h6l2 4-3 2 2 7',
};

const GOAL_OPTS: Opt[] = [
  { v: GOALS[1], t: 'Strip fat', s: 'Lose the fat covering your abs', icon: ICON.flame },
  { v: GOALS[2], t: 'Build muscle', s: 'Add size and strength', icon: ICON.dumbbell },
  { v: GOALS[0], t: 'Both at once', s: 'Lose fat and build muscle together', icon: ICON.trend },
];
const ACTIVITY: Opt[] = [
  { v: 'Mostly sitting', t: 'Mostly sitting', s: 'Desk job, under 5,000 steps' },
  { v: 'On my feet some', t: 'On my feet some', s: 'Walk around, 5,000 to 8,000 steps' },
  { v: 'On my feet most of the day', t: 'On my feet most of the day', s: 'Retail, nursing, teaching' },
  { v: 'Physical job', t: 'Physical job', s: 'Construction, warehouse, trades' },
];
const EXPERIENCE: Opt[] = [
  { v: 'Never lifted', t: 'Brand new', s: 'Never followed a real program' },
  { v: 'Under 1 year', t: 'Under a year', s: 'Know the basics, still learning form' },
  { v: '1–3 years', t: '1 to 3 years', s: 'Consistent, but progress has slowed' },
  { v: '3+ years', t: '3+ years', s: 'Solid strength, chasing the last few %' },
];
const PLACE: Opt[] = [
  { v: 'Gym', t: 'Gym', s: 'Machines, barbells, dumbbells', icon: ICON.dumbbell },
  { v: 'Home with dumbbells', t: 'Home with dumbbells', s: 'A set of dumbbells and a bench', icon: ICON.home },
  { v: 'Home, no equipment', t: 'Home, no equipment', s: 'Bodyweight only', icon: ICON.body },
];
const COACH_OPTS: Opt[] = [
  { v: 'Yes', t: 'Yes', s: "I'm ready to go all in" },
  { v: 'Yes, with a payment plan', t: 'Yes, with a payment plan', s: 'Spread it over a few months' },
  { v: 'Not right now', t: 'Not right now', s: "I'll start with the app" },
];
const INJURIES = ['Lower back', 'Knees', 'Shoulders', 'Wrists / elbows', 'Hips', 'Other'];
const STEPS_GOAL = ['6,000', '8,000', '10,000', '12,000'];
const STEP_IDS = ['goal', 'sex', 'height', 'weight', 'activity', 'experience', 'place', 'days', 'foods', 'spots', 'injuries', 'coaching', 'loading', 'account', 'email'] as const;
type StepId = typeof STEP_IDS[number];
const ASKED = 12;

type Q2 = Quiz & { activity?: string; injuries?: string[]; steps_goal?: string };
const EMPTY: Q2 = {
  goal: '', sex: '', age: '28', height_ft: '', height_in: '', weight: '', goal_weight: '', where_train: '', days: '4 days',
  experience: '', tried: [], likes: [], foods: [], custom_foods: [], spots: [], monthly_spend: '', eat_out: '', struggle: '', start_timing: '', ready_to_invest: '',
  first_name: '', email: '', activity: '', injuries: [], steps_goal: '8,000',
};

export default function QuizScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ src?: string; name?: string; email?: string }>();
  // Came from the Stack Score on this browser: their goal, training, stack and name are already
  // known, so skip the goal question and say so.
  const [fromScore] = useState(() => hasGoal(readHandoff()));
  const first = fromScore ? STEP_IDS.indexOf('sex') : 0;
  const [i, setI] = useState(first);
  const [a, setA] = useState<Q2>(() => { const { email, ...pre } = quizFromHandoff(readHandoff()); return { ...EMPTY, ...pre }; });
  const [err, setErr] = useState('');
  const step: StepId = STEP_IDS[i];

  useEffect(() => {
    if (params.name || params.email) { setA((x) => ({ ...x, first_name: params.name || x.first_name, email: params.email || x.email })); return; }
    readLead().then((l) => { if (l) setA((x) => ({ ...x, first_name: x.first_name || l.first_name, email: x.email || l.email })); });
  }, [params.name, params.email]);
  useEffect(() => {
    if (params.src) { setA((x) => ({ ...x, src: String(params.src).slice(0, 80) })); return; }
    Linking.getInitialURL().then((u) => {
      const src = u ? Linking.parse(u).queryParams?.src : undefined;
      if (src) setA((x) => ({ ...x, src: String(src).slice(0, 80) }));
    }).catch(() => {});
  }, [params.src]);
  useEffect(() => {
    if (i === first) track('quiz_start', { src: a.src || null, from_score: fromScore }, { once: true });
    track('quiz_step', { step: step, n: i + 1 }, { once: true });
  }, [i]);

  const set = (k: keyof Q2, v: any) => { setErr(''); setA((x) => ({ ...x, [k]: v })); };
  // From the Stack Score, how long they've lifted is already known from how they train: don't ask again.
  const skip = (k: number) => fromScore && STEP_IDS[k] === 'experience' && !!a.experience;
  const next = () => { setErr(''); setI((x) => { let n = x + 1; if (skip(n)) n++; return Math.min(STEP_IDS.length - 1, n); }); };
  const back = () => { setErr(''); if (i === first) router.back(); else if (step === 'account') setI(STEP_IDS.indexOf('coaching')); else setI(skip(i - 1) ? i - 2 : i - 1); };
  const go = (to: StepId) => { setErr(''); setI(STEP_IDS.indexOf(to)); };

  if (step === 'loading') return <Loading onDone={() => go('account')} />;

  const skipped = skip(STEP_IDS.indexOf('experience')) ? 1 : 0;
  const total = ASKED - first - skipped;
  const n = Math.min(i + 1 - first - (skipped && i > STEP_IDS.indexOf('experience') ? 1 : 0), total);
  const showBar = i < ASKED;
  let body: React.ReactNode = null;
  let cta: React.ReactNode = <Cta title="Continue" onPress={next} />;

  if (step === 'goal') {
    body = <><Q q="What's the goal right now?" sub="Your calories, meals and training all change with this. You can switch later." /><Label t="Goal" />
      <Options opts={GOAL_OPTS} value={a.goal} onPick={(v) => set('goal', v)} big /></>;
    cta = <Cta title="Continue" onPress={() => (a.goal ? next() : setErr('Pick one to continue.'))} />;
  } else if (step === 'sex') {
    body = <>{fromScore && i === first && (
        <View style={qs.fromScore}><Text style={qs.fromScoreT}>{a.first_name ? `${a.first_name}, your Stack Score is in.` : 'Your Stack Score is in.'}</Text>
          <Text style={qs.fromScoreS}>Your goal, training and stack are already filled in. A few quick questions about you and the food you like, then your plan is built.</Text></View>)}
      <Q q="Male or female?" sub="Sets your starting calorie and protein numbers." />
      <Options opts={[{ v: 'Male', t: 'Male' }, { v: 'Female', t: 'Female' }]} value={a.sex} onPick={(v) => set('sex', v)} /></>;
    cta = <Cta title="Continue" onPress={() => (a.sex ? next() : setErr('Pick one to continue.'))} />;
  } else if (step === 'height') {
    body = <HeightStep a={a} set={set} />;
    cta = <Cta title="Continue" onPress={() => {
      const ft = Number(a.height_ft), inch = Number(a.height_in || 0);
      if (!ft || ft < 4 || ft > 7 || inch < 0 || inch > 11) return setErr('Enter your height.');
      next();
    }} />;
  } else if (step === 'weight') {
    body = <WeightStep a={a} set={set} />;
    cta = <Cta title="Continue" onPress={() => {
      const w = Number(a.weight), g = Number(a.goal_weight || a.weight);
      if (!w || w < 80 || w > 450) return setErr('Enter your weight.');
      if (a.goal !== GOALS[2] && g > w) return setErr('For losing fat, your goal should be at or below your weight now.');
      if (!a.goal_weight) set('goal_weight', a.weight);
      next();
    }} />;
  } else if (step === 'activity') {
    body = <><Q q="How much do you move outside the gym?" sub="Your job and your steps burn more than your workouts do." />
      <Options opts={ACTIVITY} value={a.activity || ''} onPick={(v) => set('activity', v)} check /></>;
    cta = <Cta title="Continue" onPress={() => (a.activity ? next() : setErr('Pick one to continue.'))} />;
  } else if (step === 'experience') {
    body = <><Q q="How long have you been lifting?" sub="Picks your exercises and how hard the first weeks hit." />
      <Options opts={EXPERIENCE} value={a.experience} onPick={(v) => set('experience', v)} check /></>;
    cta = <Cta title="Continue" onPress={() => (a.experience ? next() : setErr('Pick one to continue.'))} />;
  } else if (step === 'place') {
    body = <><Q q="Where will you train?" sub="Every exercise in your plan uses only what you have." />
      <Options opts={PLACE} value={a.where_train} onPick={(v) => set('where_train', v)} check /></>;
    cta = <Cta title="Continue" onPress={() => (a.where_train ? next() : setErr('Pick one to continue.'))} />;
  } else if (step === 'days') {
    const d = parseInt(a.days, 10) || 4;
    body = <><Q q="What can you actually stick to?" sub="Pick what fits a busy week, not a perfect one." /><Label t="Workouts per week" />
      <Pills opts={['3', '4', '5', '6']} value={String(d)} onPick={(v) => set('days', `${v} days`)} />
      <Text style={st.hint}>{d} days, about 50 minutes each.</Text>
      <View style={{ height: 18 }} /><Label t="Daily steps goal" />
      <Pills opts={STEPS_GOAL} value={a.steps_goal || '8,000'} onPick={(v) => set('steps_goal', v)} short />
      <Text style={st.hint}>Hit it, plus your workout and protein, and that day is stacked.</Text></>;
    cta = <Cta title="Continue" onPress={() => {
      const cfg = defaultCfg({ days: a.days, experience: a.experience });
      set('split', cfg.split); set('train_days', DEFAULT_DAYS[d]); next();
    }} />;
  } else if (step === 'foods') {
    body = <><Q q="Pick the foods you actually eat" sub="Your meal plan is built only from these. No foods you hate." />
      <FoodPicker ids={a.foods || []} custom={a.custom_foods || []} onChange={(ids, custom) => { set('foods', ids); set('custom_foods', custom); }} /></>;
    cta = <Cta title="Continue" onPress={() => {
      const chosen = (a.foods || []).map((id) => (a.custom_foods || []).find((f: Food) => f.id === id) || foodById(id)).filter(Boolean) as Food[];
      const miss = whatsMissing(chosen);
      if (miss.length) return setErr(`Add ${miss.join(', ')} so every meal has options.`);
      next();
    }} />;
  } else if (step === 'spots') {
    body = <SpotsStep a={a} set={set} />;
  } else if (step === 'injuries') {
    const cur = a.injuries || [];
    body = <><Q q="Anything I should train around?" sub="Tap any that bug you. I'll swap the exercises that aggravate them." />
      <View style={st.grid2}>
        {INJURIES.map((o) => {
          const on = cur.includes(o);
          return (
            <Pressable key={o} accessibilityRole="checkbox" accessibilityState={{ checked: on }} onPress={() => set('injuries', on ? cur.filter((x) => x !== o) : [...cur, o])}
              style={[st.tile, on && st.on]}><Text style={[st.tileT, on && st.onT]}>{o}</Text></Pressable>
          );
        })}
      </View>
      <Or />
      <Pressable accessibilityRole="button" onPress={() => { set('injuries', []); next(); }} style={st.ghost}><Text style={st.ghostT}>Nothing to work around</Text></Pressable>
      <Text style={st.fine}>Have a medical condition or take prescription meds? Check with your doctor before starting.</Text></>;
    cta = <Cta title="Continue" onPress={next} />;
  } else if (step === 'coaching') {
    body = <><Q q="If I coached you 1:1, would you invest in yourself?" sub="Your free plan doesn't depend on this. It helps me know who to help first." />
      <Options opts={COACH_OPTS} value={a.ready_to_invest} onPick={(v) => set('ready_to_invest', v)} check /></>;
    cta = <Cta title="Build my plan" onPress={() => (a.ready_to_invest ? next() : setErr('Pick one to continue.'))} />;
  } else if (step === 'account') {
    return <CreateAccount onEmail={() => go('email')} onBack={back} />;
  } else if (step === 'email') {
    return <EmailSignup a={a} set={set} onBack={() => go('account')} onDone={() => { track('quiz_done', { foods: (a.foods || []).length }); router.replace('/ready'); }} />;
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <View style={st.top}>
          <BackBtn onPress={back} />
          {showBar && <View style={st.barBg} accessibilityLabel={`Question ${n} of ${total}`}><View style={[st.barFg, { width: `${Math.round((n / total) * 100)}%` }]} /></View>}
        </View>
        <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 22, paddingBottom: 24 }} keyboardShouldPersistTaps="handled">
          {body}
          {!!err && <Text style={st.err} accessibilityLiveRegion="polite">{err}</Text>}
        </ScrollView>
        <View style={st.bottom}>{cta}</View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

/* ---------- pieces ---------- */

export function BackBtn({ onPress }: { onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={onPress} hitSlop={8} style={st.back}>
      <Svg width={18} height={18} viewBox="0 0 24 24"><Path d="M15 5l-7 7 7 7" stroke={C.ink} strokeWidth={2.4} fill="none" strokeLinecap="round" strokeLinejoin="round" /></Svg>
    </Pressable>
  );
}

const Cta = ({ title, onPress, variant = 'red' }: { title: string; onPress: () => void; variant?: 'red' | 'navy' }) => (
  <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [st.cta, { backgroundColor: variant === 'red' ? C.red : C.navy, opacity: pressed ? 0.88 : 1 }]}>
    <Text style={st.ctaT}>{title}</Text>
  </Pressable>
);

const Q = ({ q, sub }: { q: string; sub?: string }) => (
  <View style={{ gap: 10, marginBottom: 24 }}>
    <Text style={st.q} accessibilityRole="header">{q}</Text>
    {!!sub && <Text style={st.sub}>{sub}</Text>}
  </View>
);
const Label = ({ t }: { t: string }) => <Text style={st.label}>{t}</Text>;
const Or = () => (
  <View style={st.or}><View style={st.orLine} /><Text style={st.orT}>OR</Text><View style={st.orLine} /></View>
);

const Check = () => (
  <View style={st.check}><Svg width={13} height={13} viewBox="0 0 24 24"><Path d="M5 12.5l4.5 4.5L19 7.5" stroke={C.red} strokeWidth={3.4} fill="none" strokeLinecap="round" strokeLinejoin="round" /></Svg></View>
);

function Options({ opts, value, onPick, big, check }: { opts: Opt[]; value: string; onPick: (v: string) => void; big?: boolean; check?: boolean }) {
  return (
    <View style={{ gap: big ? 14 : 12 }}>
      {opts.map((o) => {
        const on = value === o.v;
        return (
          <Pressable key={o.v} accessibilityRole="radio" accessibilityState={{ selected: on }} onPress={() => onPick(o.v)}
            style={[st.opt, big && { paddingVertical: 20 }, !o.s && { minHeight: 58 }, on && st.on]}>
            {!!o.icon && (
              <Svg width={26} height={26} viewBox="0 0 24 24"><Path d={o.icon} stroke={on ? C.onAccent : C.ink} strokeWidth={1.8} fill="none" strokeLinecap="round" strokeLinejoin="round" /></Svg>
            )}
            <View style={{ flex: 1, gap: 3 }}>
              <Text style={[st.optT, big && { fontSize: 19 }, on && st.onT]}>{o.t}</Text>
              {!!o.s && <Text style={[st.optS, on && { color: C.onAccent, opacity: 0.9 }]}>{o.s}</Text>}
            </View>
            {on && (check || !o.s) && <Check />}
          </Pressable>
        );
      })}
    </View>
  );
}

function Pills({ opts, value, onPick, short }: { opts: string[]; value: string; onPick: (v: string) => void; short?: boolean }) {
  return (
    <View style={{ flexDirection: 'row', gap: 10 }}>
      {opts.map((o) => {
        const on = o === value;
        return (
          <Pressable key={o} accessibilityRole="radio" accessibilityState={{ selected: on }} onPress={() => onPick(o)} style={[st.pill, on && st.on]}>
            <Text style={[st.pillT, short && { fontSize: 16 }, on && st.onT]}>{short ? o.replace(',000', 'k') : o}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function Toggle({ opts, value, onPick }: { opts: string[]; value: string; onPick: (v: string) => void }) {
  return (
    <View style={st.toggle}>
      {opts.map((o) => {
        const on = o === value;
        return (
          <Pressable key={o} accessibilityRole="radio" accessibilityState={{ selected: on }} onPress={() => onPick(o)} style={[st.togBtn, on && { backgroundColor: C.red }]}>
            <Text style={[st.togT, on && { color: C.onAccent }]}>{o}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function Field({ value, onChange, unit, ph, label }: { value: string; onChange: (v: string) => void; unit: string; ph: string; label: string }) {
  return (
    <View style={st.field}>
      <TextInput accessibilityLabel={label} value={value} onChangeText={(t) => onChange(t.replace(/[^\d.]/g, ''))} keyboardType="decimal-pad"
        placeholder={ph} placeholderTextColor={C.muted} style={st.fieldIn} maxLength={5} />
      <Text style={st.unit}>{unit}</Text>
    </View>
  );
}

function HeightStep({ a, set }: { a: Q2; set: (k: keyof Q2, v: any) => void }) {
  const [unit, setUnit] = useState('ft / in');
  const [cm, setCm] = useState(() => (a.height_ft ? String(Math.round((Number(a.height_ft) * 12 + Number(a.height_in || 0)) * 2.54)) : ''));
  const fromCm = (v: string) => {
    setCm(v);
    const inches = Number(v) / 2.54;
    if (inches > 0) { set('height_ft', String(Math.floor(inches / 12))); set('height_in', String(Math.round(inches % 12) % 12)); }
  };
  return (
    <>
      <Q q="How tall are you?" sub="Height and weight set your daily calorie number." />
      <Toggle opts={['ft / in', 'cm']} value={unit} onPick={setUnit} />
      <View style={{ height: 16 }} />
      {unit === 'cm'
        ? <Field value={cm} onChange={fromCm} unit="cm" ph="178" label="Centimeters" />
        : <View style={{ flexDirection: 'row', gap: 12 }}>
            <View style={{ flex: 1 }}><Field value={a.height_ft} onChange={(v) => set('height_ft', v)} unit="ft" ph="5" label="Feet" /></View>
            <View style={{ flex: 1 }}><Field value={a.height_in} onChange={(v) => set('height_in', v)} unit="in" ph="10" label="Inches" /></View>
          </View>}
    </>
  );
}

function WeightStep({ a, set }: { a: Q2; set: (k: keyof Q2, v: any) => void }) {
  const [unit, setUnit] = useState('lbs');
  const show = (lbs: string) => (unit === 'kg' && lbs ? String(Math.round(Number(lbs) / 2.2046)) : lbs);
  const store = (v: string) => (unit === 'kg' && v ? String(Math.round(Number(v) * 2.2046)) : v);
  const p = a.weight ? projection({ weight: a.weight, goal_weight: a.goal_weight || a.weight, goal: a.goal }) : null;
  const diff = p ? Math.round(p.w - p.g) : 0;
  return (
    <>
      <Q q="Where are you now, and where do you want to be?" sub="I'll tell you honestly how far 12 weeks gets you." />
      <Toggle opts={['lbs', 'kg']} value={unit} onPick={setUnit} />
      <View style={{ gap: 18, marginTop: 20 }}>
        <View style={{ gap: 8 }}><Label t="Current weight" /><Field value={show(a.weight)} onChange={(v) => set('weight', store(v))} unit={unit} ph="Ex. 190" label="Current weight" /></View>
        <View style={{ gap: 8 }}><Label t="Goal weight" /><Field value={show(a.goal_weight)} onChange={(v) => set('goal_weight', store(v))} unit={unit} ph="Ex. 175" label="Goal weight" /></View>
      </View>
      {!!p && !p.build && diff > 0 && (
        <View style={st.goodNote}>
          <Svg width={20} height={20} viewBox="0 0 24 24"><Circle cx={12} cy={12} r={9} stroke={C.green} strokeWidth={2.2} fill="none" /><Path d="M8 12.5l2.8 2.8L16 10" stroke={C.green} strokeWidth={2.2} fill="none" strokeLinecap="round" /></Svg>
          <Text style={st.goodT}>{p.weeks <= 12 ? `${diff} lbs in ${p.weeks} weeks is realistic. That's about ${p.rate} lbs a week.` : `About ${Math.round(p.w - p.at12)} lbs in 12 weeks is realistic, and ${p.g} lbs by ${p.goalDate}.`}</Text>
        </View>
      )}
    </>
  );
}

function SpotsStep({ a, set }: { a: Q2; set: (k: keyof Q2, v: any) => void }) {
  const cur = a.spots || [];
  const [adding, setAdding] = useState(false);
  const [txt, setTxt] = useState('');
  const list = [...SPOTS.filter((s) => !['None of these'].includes(s)), ...cur.filter((s) => !SPOTS.includes(s as any))];
  return (
    <>
      <Q q="Where do you eat out?" sub="You'll get the exact order to get at each spot that still fits your numbers." />
      <View style={{ gap: 10 }}>
        {list.map((o) => {
          const on = cur.includes(o);
          return (
            <Pressable key={o} accessibilityRole="checkbox" accessibilityState={{ checked: on }} onPress={() => set('spots', on ? cur.filter((x) => x !== o) : [...cur, o])}
              style={[st.row, on && st.on]}>
              <Text style={[st.rowT, on && st.onT]}>{o}</Text>
              <View style={[st.box, on && { backgroundColor: C.onAccent, borderColor: C.onAccent }]}>
                {on && <Svg width={13} height={13} viewBox="0 0 24 24"><Path d="M5 12.5l4.5 4.5L19 7.5" stroke={C.red} strokeWidth={3.4} fill="none" strokeLinecap="round" strokeLinejoin="round" /></Svg>}
              </View>
            </Pressable>
          );
        })}
        {adding ? (
          <View style={[st.row, { borderStyle: 'dashed' }]}>
            <TextInput autoFocus value={txt} onChangeText={setTxt} placeholder="Restaurant name" placeholderTextColor={C.muted} style={[st.rowT, { flex: 1 }]}
              onSubmitEditing={() => { const t = txt.trim(); if (t) set('spots', [...cur, t]); setTxt(''); setAdding(false); }} returnKeyType="done" accessibilityLabel="Restaurant name" />
          </View>
        ) : (
          <Pressable accessibilityRole="button" onPress={() => setAdding(true)} style={[st.row, st.dashed]}>
            <Text style={[st.rowT, { color: C.ink }]}>+  Add a restaurant</Text>
          </Pressable>
        )}
      </View>
    </>
  );
}

/** Creating your plan: a ring fills while each part ticks off, then it moves on by itself. */
function Loading({ onDone }: { onDone: () => void }) {
  const [pct, setPct] = useState(0);
  const pulse = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(Animated.timing(pulse, { toValue: 1, duration: 1800, easing: Easing.out(Easing.quad), useNativeDriver: true })).start();
    const t = setInterval(() => setPct((p) => Math.min(100, p + 2)), 70);
    return () => clearInterval(t);
  }, []);
  useEffect(() => { if (pct >= 100) { const t = setTimeout(onDone, 500); return () => clearTimeout(t); } }, [pct]);
  const labels = ['Setting your calories and protein', 'Building meals from your foods', 'Picking workouts for your gym', 'Planning your eat-out orders'];
  const R = 86, L = 2 * Math.PI * R;
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg, alignItems: 'center', paddingHorizontal: 24, paddingTop: 70 }}>
      <View style={{ width: 200, height: 200, alignItems: 'center', justifyContent: 'center' }}>
        <Animated.View style={[StyleSheet.absoluteFill, { borderRadius: 100, borderWidth: 2, borderColor: C.navy,
          opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.5, 0] }), transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.18] }) }] }]} />
        <Svg width={200} height={200} style={StyleSheet.absoluteFill}>
          <Circle cx={100} cy={100} r={R} stroke="#e8eaf0" strokeWidth={10} fill="none" />
          <Circle cx={100} cy={100} r={R} stroke={C.navy} strokeWidth={10} fill="none" strokeLinecap="round" strokeDasharray={`${L}`} strokeDashoffset={L - (L * pct) / 100} transform="rotate(-90 100 100)" />
        </Svg>
        <Animated.Image source={LOGO} style={{ width: 58, height: 58, marginBottom: 6 }} accessibilityIgnoresInvertColors />
        <Text style={{ fontFamily: F.black, fontSize: 24, color: C.ink }}>{pct}%</Text>
      </View>
      <Text style={[st.q, { textAlign: 'center', marginTop: 40, fontSize: 28 }]}>Creating your plan</Text>
      <Text style={[st.sub, { textAlign: 'center', marginTop: 8, marginBottom: 28 }]}>Built around your body, your foods and your week.</Text>
      <View style={{ alignSelf: 'stretch', gap: 14 }}>
        {labels.map((l, k) => {
          const done = pct >= (k + 1) * 25, active = !done && pct >= k * 25;
          return (
            <View key={l} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View style={[st.stepDot, done && { backgroundColor: C.red, borderColor: C.red }, active && { borderColor: C.red }]}>
                {done && <Svg width={13} height={13} viewBox="0 0 24 24"><Path d="M5 12.5l4.5 4.5L19 7.5" stroke={C.onAccent} strokeWidth={3.4} fill="none" strokeLinecap="round" strokeLinejoin="round" /></Svg>}
              </View>
              <Text style={{ fontFamily: F.semi, fontSize: 16, color: done || active ? C.ink : C.muted }}>{l}</Text>
            </View>
          );
        })}
      </View>
    </SafeAreaView>
  );
}

/** Apple and Google sign-in show only once they're switched on in Supabase and wired for iPhone (EXPO_PUBLIC_OAUTH=1). */
const OAUTH = process.env.EXPO_PUBLIC_OAUTH === '1';

function CreateAccount({ onEmail, onBack }: { onEmail: () => void; onBack: () => void }) {
  const [note, setNote] = useState('');
  const oauth = async (provider: 'apple' | 'google') => {
    setNote('');
    const redirectTo = Platform.OS === 'web' ? `${window.location.origin}/app/` : Linking.createURL('/');
    const { error } = await supabase.auth.signInWithOAuth({ provider, options: { redirectTo } });
    if (error) setNote(`${provider === 'apple' ? 'Apple' : 'Google'} sign-in isn't switched on yet. Use email for now.`);
  };
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg, paddingHorizontal: 16 }}>
      <View style={{ paddingTop: 8 }}><BackBtn onPress={onBack} /></View>
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', gap: 16 }}>
        <Animated.Image source={LOGO} style={{ width: 64, height: 64 }} />
        <View style={st.badge}><Text style={st.badgeT}>YOUR PLAN IS READY</Text></View>
        <Text style={[st.q, { textAlign: 'center' }]}>Get your plan{'\n'}free for 2 weeks</Text>
        <Text style={[st.sub, { textAlign: 'center', maxWidth: 300 }]}>Create your account and start your first workout today. No card needed.</Text>
      </View>
      <View style={{ gap: 12 }}>
        {OAUTH ? (
          <>
            <Cta title="Continue with Apple" onPress={() => oauth('apple')} />
            <Pressable accessibilityRole="button" onPress={() => oauth('google')} style={st.ghostBig}><Text style={st.ghostT}>Continue with Google</Text></Pressable>
            <Pressable accessibilityRole="button" onPress={onEmail} style={st.ghostBig}><Text style={st.ghostT}>Continue with email</Text></Pressable>
          </>
        ) : <Cta title="Continue with email" onPress={onEmail} />}
        {!!note && <Text style={[st.err, { textAlign: 'center' }]}>{note}</Text>}
      </View>
      <Text style={[st.fine, { textAlign: 'center', marginTop: 18, marginBottom: 20 }]}>By continuing you agree to the{' '}
        <Text accessibilityRole="link" onPress={() => Linking.openURL(TERMS_URL)} style={{ textDecorationLine: 'underline' }}>Terms</Text> and{' '}
        <Text accessibilityRole="link" onPress={() => Linking.openURL(PRIVACY_URL)} style={{ textDecorationLine: 'underline' }}>Privacy Policy</Text>.</Text>
    </SafeAreaView>
  );
}

function EmailSignup({ a, set, onBack, onDone }: { a: Q2; set: (k: keyof Q2, v: any) => void; onBack: () => void; onDone: () => void }) {
  const [password, setPassword] = useState('');
  const [savePw, setSavePw] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [note, setNote] = useState('');
  const { profile } = useAuth();
  const router = useRouter();
  const submit = async () => {
    setErr(''); setNote('');
    if (profile?.role === 'coach') return router.replace('/');
    const email = a.email.trim().toLowerCase();
    if (a.first_name.trim().length < 2) return setErr('Add your first name.');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return setErr('Enter a valid email.');
    if (password.length < 8) return setErr('Use at least 8 characters for your password.');
    setBusy(true);
    const q: Q2 = { ...a, email, first_name: a.first_name.trim(), done_at: new Date().toISOString() };
    await savePendingQuiz(q);
    AsyncStorage.setItem('sps:save-password', savePw ? '1' : '0').catch(() => {});
    const res = await supabase.auth.signUp({ email, password, options: { data: { first_name: q.first_name } } });
    if (res.error) {
      setBusy(false);
      const m = res.error.message.toLowerCase();
      if (m.includes('already')) return setErr('You already have an account with this email. Log in instead.');
      return setErr(res.error.message);
    }
    kitTag(email, q.first_name, ['app-quiz-done', 'app-free', 'src-app'], {
      quiz_goal: q.goal, quiz_budget: q.ready_to_invest, quiz_where_train: q.where_train, app_tier: 'free', current_weight: q.weight, lead_source: q.src ? `app:${q.src}` : 'app',
    });
    setBusy(false);
    if (!res.data.session) return setNote('Check your email to confirm your account, then log in. Your plan will be waiting.');
    onDone();
  };
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <View style={st.top}><BackBtn onPress={onBack} /></View>
        <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 22, gap: 18 }} keyboardShouldPersistTaps="handled">
          <Q q="Sign up with email" sub="Your 2 free weeks start now. Use the email you want your Sunday check-ins sent to." />
          <View style={{ gap: 8 }}><Label t="First name" />
            <TextInput accessibilityLabel="First name" value={a.first_name} onChangeText={(t) => set('first_name', t)} placeholder="Your first name" placeholderTextColor={C.muted} style={st.input} autoComplete="given-name" textContentType="givenName" /></View>
          <View style={{ gap: 8 }}><Label t="Email" />
            <TextInput accessibilityLabel="Email" value={a.email} onChangeText={(t) => set('email', t)} placeholder="you@email.com" autoCapitalize="none" keyboardType="email-address" placeholderTextColor={C.muted} style={st.input} autoComplete="email" textContentType="emailAddress" /></View>
          <View style={{ gap: 8 }}><Label t="Password" />
            <TextInput accessibilityLabel="Password" value={password} onChangeText={setPassword} placeholder="8+ characters" secureTextEntry placeholderTextColor={C.muted} style={st.input}
              autoComplete={savePw ? 'new-password' : 'off'} textContentType={savePw ? 'newPassword' : 'none'} onSubmitEditing={submit} /></View>
          <View style={st.saveRow}>
            <View style={{ flex: 1 }}><Text style={st.optT}>Save password on this phone</Text><Text style={st.optS}>Log in with Face ID next time</Text></View>
            <Switch value={savePw} onValueChange={setSavePw} trackColor={{ true: C.red, false: '#c3c8d4' }} thumbColor="#ffffff" accessibilityLabel="Save password on this phone" />
          </View>
          {!!err && <Text style={st.err} accessibilityLiveRegion="polite">{err}</Text>}
          {!!note && <Text style={[st.err, { color: C.green }]} accessibilityLiveRegion="polite">{note}</Text>}
        </ScrollView>
        <View style={st.bottom}>
          <Pressable accessibilityRole="button" onPress={submit} disabled={busy} style={[st.cta, { backgroundColor: C.red, opacity: busy ? 0.6 : 1 }]}>
            <Text style={st.ctaT}>{busy ? 'Creating your account…' : 'Create account and start'}</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

export const st = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingTop: 8 },
  back: { width: 42, height: 42, borderRadius: 21, borderWidth: 1.5, borderColor: '#d9dde7', alignItems: 'center', justifyContent: 'center' },
  barBg: { flex: 1, height: 6, borderRadius: 3, backgroundColor: '#e8eaf0', overflow: 'hidden', marginRight: 30 },
  barFg: { height: 6, borderRadius: 3, backgroundColor: C.red },
  q: { fontFamily: F.xbold, fontSize: 31, lineHeight: 37, color: C.ink, letterSpacing: -0.5 },
  sub: { fontFamily: F.medium, fontSize: 16, lineHeight: 23, color: C.ink },
  label: { fontFamily: F.bold, fontSize: 16, color: C.ink, marginBottom: 12 },
  hint: { fontFamily: F.medium, fontSize: 14, color: C.ink, marginTop: 12 },
  opt: { flexDirection: 'row', alignItems: 'center', gap: 16, paddingHorizontal: 18, paddingVertical: 16, borderRadius: 16, borderWidth: 1.5, borderColor: C.line, backgroundColor: C.bg },
  on: { backgroundColor: C.red, borderColor: C.red },
  onT: { color: C.onAccent },
  optT: { fontFamily: F.bold, fontSize: 18, color: C.ink },
  optS: { fontFamily: F.medium, fontSize: 14, color: C.ink },
  check: { width: 26, height: 26, borderRadius: 13, backgroundColor: C.onAccent, alignItems: 'center', justifyContent: 'center' },
  pill: { flex: 1, height: 58, borderRadius: 14, borderWidth: 1.5, borderColor: C.line, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center' },
  pillT: { fontFamily: F.bold, fontSize: 19, color: C.ink },
  toggle: { flexDirection: 'row', padding: 4, borderRadius: 14, borderWidth: 1, borderColor: C.line, backgroundColor: C.bg },
  togBtn: { flex: 1, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  togT: { fontFamily: F.bold, fontSize: 16, color: C.ink },
  field: { height: 58, borderRadius: 14, borderWidth: 1.5, borderColor: C.line, backgroundColor: C.card, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18 },
  fieldIn: { flex: 1, fontFamily: F.semi, fontSize: 20, color: C.ink, minWidth: 0, outlineWidth: 0 },
  unit: { fontFamily: F.medium, fontSize: 17, color: C.ink },
  goodNote: { marginTop: 20, padding: 14, borderRadius: 14, backgroundColor: '#e7f6ee', borderWidth: 1, borderColor: '#b9e3cc', flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  goodT: { flex: 1, fontFamily: F.medium, fontSize: 15, lineHeight: 21, color: C.ink },
  grid2: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  tile: { width: '48%', flexGrow: 1, height: 54, borderRadius: 14, borderWidth: 1.5, borderColor: C.line, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center' },
  tileT: { fontFamily: F.semi, fontSize: 17, color: C.ink },
  row: { flexDirection: 'row', alignItems: 'center', height: 50, paddingHorizontal: 16, borderRadius: 14, borderWidth: 1.5, borderColor: C.line, backgroundColor: C.bg },
  rowT: { flex: 1, fontFamily: F.semi, fontSize: 17, color: C.ink, outlineWidth: 0 },
  dashed: { borderStyle: 'dashed', borderColor: '#c3c8d4' },
  box: { width: 24, height: 24, borderRadius: 7, borderWidth: 1.5, borderColor: '#c3c8d4', alignItems: 'center', justifyContent: 'center' },
  or: { flexDirection: 'row', alignItems: 'center', gap: 14, marginVertical: 22 },
  orLine: { flex: 1, height: 1, backgroundColor: C.line },
  orT: { fontFamily: F.bold, fontSize: 14, color: C.ink },
  ghost: { height: 52, borderRadius: 26, borderWidth: 1.5, borderColor: '#d5d9e3', backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center' },
  ghostBig: { height: 54, borderRadius: 27, borderWidth: 1.5, borderColor: '#d5d9e3', backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center' },
  ghostT: { fontFamily: F.bold, fontSize: 17, color: C.ink },
  fine: { fontFamily: F.medium, fontSize: 13, lineHeight: 19, color: C.ink, marginTop: 16 },
  err: { fontFamily: F.bold, fontSize: 14, color: C.red, marginTop: 14 },
  bottom: { paddingHorizontal: 16, paddingTop: 10, paddingBottom: 16 },
  cta: { height: 54, borderRadius: 27, alignItems: 'center', justifyContent: 'center' },
  ctaT: { fontFamily: F.bold, fontSize: 18, color: C.onAccent },
  badge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 14, backgroundColor: C.red },
  badgeT: { fontFamily: F.xbold, fontSize: 13, letterSpacing: 0.6, color: C.onAccent },
  stepDot: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: '#d5d9e3', alignItems: 'center', justifyContent: 'center' },
  input: { height: 56, borderRadius: 14, backgroundColor: C.card, borderWidth: 1.5, borderColor: C.line, color: C.ink, fontFamily: F.medium, fontSize: 17, paddingHorizontal: 18, outlineWidth: 0 },
  saveRow: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16, borderRadius: 14, borderWidth: 1.5, borderColor: C.line },
});

const qs = StyleSheet.create({
  fromScore: { backgroundColor: '#e6f4ec', borderRadius: 16, padding: 14, gap: 4, marginBottom: 18, borderWidth: 1, borderColor: '#bfe3cf' },
  fromScoreT: { fontFamily: F.black, fontSize: 15, color: C.green },
  fromScoreS: { fontFamily: F.semi, fontSize: 13.5, lineHeight: 19, color: C.ink },
});
