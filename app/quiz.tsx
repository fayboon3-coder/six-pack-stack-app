import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Linking from 'expo-linking';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Svg, { Circle, Path } from 'react-native-svg';
import { supabase } from '../src/lib/supabase';
import { C, F } from '../src/lib/theme';
import { GOALS, projection, Quiz, savePendingQuiz, targets } from '../src/lib/quiz';
import { LinearGradient } from 'expo-linear-gradient';
import { QUICK_START } from '../src/data/foods';
import { kitTag } from '../src/lib/kit';
import { PRIVACY_URL, TERMS_URL } from '../src/lib/access';
import { hasGoal, quizFromHandoff, readHandoff } from '../src/lib/handoff';
import { useAuth } from '../src/lib/auth';
import { readLead } from '../src/lib/lead';
import { track } from '../src/lib/track';
import { DEFAULT_DAYS, defaultCfg } from '../src/lib/training';
import { goBack } from '../src/lib/nav';

const LOGO = require('../assets/logo-b.png');

/* Same look as the Stack Score: navy-led, red only for the main button, one line icon per question. */
const N = { navy: '#141c33', tint: '#eef1f8', line: '#d7dbe6', mute: '#4a5470', soft: '#8a92a8', bg: '#f3f4f8', green: '#1f9d5f', greenBg: '#e9f7f0' };

const circ = (cx: number, cy: number, r: number) => `M${cx - r} ${cy}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0`;
const ICON = {
  target: `${circ(12, 12, 9)}${circ(12, 12, 5)}${circ(12, 12, 1)}`,
  flame: 'M12 21c-3.9 0-6.5-2.6-6.5-6.1 0-3.4 2.6-5.4 3.6-8.4.4 1.8 1.4 2.9 2.4 3.6.3-2.6 1.6-4.7 3.4-6.1-.1 2.6 3.6 5 3.6 10.1 0 3.6-2.6 6.9-6.5 6.9z',
  dumbbell: 'M6.5 6.5v11M17.5 6.5v11M3.5 9v6M20.5 9v6M6.5 12h11',
  recomp: 'M7 17V7M4 10l3-3 3 3M17 7v10M14 14l3 3 3-3',
  level: 'M6 19v-4M12 19v-9M18 19V5',
  body: `${circ(12, 6, 2.6)}M6 21v-1.5a6 6 0 0 1 12 0V21`,
  walk: `${circ(13.5, 4.5, 1.8)}M9 21l2.6-6.2 2.6 2.2v4M10.2 11.5l1.6-4 3 1.6 1.6 3M11.8 7.5L8.3 9.6v3`,
  chair: 'M7 3.5v9h10M7 12.5V20M17 12.5V20M7 16.5h10',
  steps: 'M8 3.5c1.6 0 2.4 1.6 2.4 3.6S9.6 11.5 8 11.5 5.6 10 5.6 8 6.4 3.5 8 3.5zM6 14.5h4M16 8.5c1.6 0 2.4 1.6 2.4 3.6s-.8 4.4-2.4 4.4-2.4-1.5-2.4-3.5.8-4.5 2.4-4.5zM14 19.5h4',
  hardhat: 'M3.5 17.5h17v2h-17zM5.5 17.5a6.5 6.5 0 0 1 13 0M10 11V6.5h4V11',
  home: 'M3.5 11l8.5-7 8.5 7M5.5 9.5V20h13V9.5M9.5 20v-5.5h5V20',
  calendar: 'M5 5h14a1.5 1.5 0 0 1 1.5 1.5v12A1.5 1.5 0 0 1 19 20H5a1.5 1.5 0 0 1-1.5-1.5v-12A1.5 1.5 0 0 1 5 5zM3.5 10h17M8 3v4M16 3v4',
  shield: 'M12 3l7.5 3v5.5c0 4.6-3.2 8.2-7.5 9.5-4.3-1.3-7.5-4.9-7.5-9.5V6zM12 9v6M9 12h6',
  scale: 'M5 4h14a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1zM8.5 9.5a4 4 0 0 1 7 0M12 9.5l1.4-1.8',
  check: 'M5 12.5l4.5 4.5L19 7.5',
};
type IconK = keyof typeof ICON;
const Ico = ({ k, size = 22, color = N.navy, w = 1.8 }: { k: IconK; size?: number; color?: string; w?: number }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24"><Path d={ICON[k]} stroke={color} strokeWidth={w} fill="none" strokeLinecap="round" strokeLinejoin="round" /></Svg>
);

type Opt = { v: string; t: string; s?: string; icon?: IconK };
const GOAL_OPTS: Opt[] = [
  { v: GOALS[1], t: 'Lose fat', s: 'Lose the fat covering your abs', icon: 'flame' },
  { v: GOALS[2], t: 'Build muscle', s: 'Add size and strength', icon: 'dumbbell' },
  { v: GOALS[0], t: 'Both at once', s: 'Lose fat and build muscle together', icon: 'recomp' },
];
const ACTIVITY: Opt[] = [
  { v: 'Mostly sitting', t: 'Mostly sitting', s: 'Desk job, under 5,000 steps', icon: 'chair' },
  { v: 'On my feet some', t: 'On my feet some', s: 'Walk around, 5,000 to 8,000 steps', icon: 'walk' },
  { v: 'On my feet most of the day', t: 'On my feet all day', s: 'Retail, nursing, teaching', icon: 'steps' },
  { v: 'Physical job', t: 'Physical job', s: 'Construction, warehouse, trades', icon: 'hardhat' },
];
const EXPERIENCE: Opt[] = [
  { v: 'Never lifted', t: 'Brand new', s: 'Never followed a real program' },
  { v: 'Under 1 year', t: 'Under a year', s: 'Know the basics, still learning form' },
  { v: '1–3 years', t: '1 to 3 years', s: 'Consistent, but progress has slowed' },
  { v: '3+ years', t: '3+ years', s: 'Solid strength, chasing the last few %' },
];
const PLACE: Opt[] = [
  { v: 'Gym', t: 'Gym', s: 'Machines, barbells, dumbbells', icon: 'dumbbell' },
  { v: 'Home with dumbbells', t: 'Home with dumbbells', s: 'A set of dumbbells and a bench', icon: 'home' },
  { v: 'Home, no equipment', t: 'Home, no equipment', s: 'Bodyweight only', icon: 'body' },
];
const INJURIES = ['Lower back', 'Knees', 'Shoulders', 'Wrists / elbows', 'Hips', 'Other'];
// Only what changes the plan. Coming from the Stack Score: 4 screens (goal, training and experience are known).
// Food, restaurants and coaching interest are asked after the plan is saved (Plan tab → Edit foods).
const STEP_IDS = ['goal', 'experience', 'body', 'activity', 'training', 'injuries', 'loading', 'account'] as const;
type StepId = typeof STEP_IDS[number];
const ASKED = STEP_IDS.indexOf('loading');
const LABEL: Record<string, string> = { goal: 'Your goal', experience: 'Experience', body: 'Your body', activity: 'Your day', training: 'Your training', injuries: 'Train around' };

type Q2 = Quiz & { activity?: string; injuries?: string[]; steps_goal?: string };
const EMPTY: Q2 = {
  goal: '', sex: '', age: '28', height_ft: '', height_in: '', weight: '', goal_weight: '', where_train: '', days: '4 days',
  experience: '', tried: [], likes: [], foods: [...QUICK_START], custom_foods: [], spots: [], monthly_spend: '', eat_out: '', struggle: '', start_timing: '', ready_to_invest: '',
  first_name: '', email: '', activity: '', injuries: [], steps_goal: '8,000',
};

export default function QuizScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ src?: string; name?: string; email?: string }>();
  // Came from the Stack Score on this browser: goal, training, stack and name are already known.
  const [fromScore] = useState(() => hasGoal(readHandoff()));
  const [a, setA] = useState<Q2>(() => { const { email, ...pre } = quizFromHandoff(readHandoff()); return { ...EMPTY, ...pre }; });
  const [known] = useState(() => ({ goal: fromScore, experience: fromScore && !!a.experience }));
  const asked = STEP_IDS.slice(0, ASKED).filter((s) => !(known as any)[s]) as StepId[];
  const [i, setI] = useState(() => STEP_IDS.indexOf(asked[0]));
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
    if (step === asked[0]) track('quiz_start', { src: a.src || null, from_score: fromScore }, { once: true });
    track('quiz_step', { step, n: asked.indexOf(step) + 1 }, { once: true });
  }, [i]);

  const set = (k: keyof Q2, v: any) => { setErr(''); setA((x) => ({ ...x, [k]: v })); };
  const go = (to: StepId) => { setErr(''); setI(STEP_IDS.indexOf(to)); };
  const next = () => { const k = asked.indexOf(step); go(k >= 0 && k < asked.length - 1 ? asked[k + 1] : 'loading'); };
  const back = () => {
    setErr('');
    if (step === 'account') return go(asked[asked.length - 1]);
    const k = asked.indexOf(step);
    if (k <= 0) goBack(router, '/welcome'); else go(asked[k - 1]);
  };

  if (step === 'loading') return <Loading onDone={() => go('account')} />;
  if (step === 'account') return <SaveYourPlan a={a} set={set} onBack={back} onDone={() => { track('quiz_done', { foods: (a.foods || []).length }); router.replace('/ready'); }} />;

  const n = asked.indexOf(step) + 1, total = asked.length;
  let body: React.ReactNode = null;
  let cta: React.ReactNode = <Cta title="Continue" onPress={next} />;
  const need = (ok: any) => () => (ok ? next() : setErr('Pick one to continue.'));

  if (step === 'goal') {
    body = <><QHead icon="target" q="What's your goal right now?" sub="Your calories, meals and training all change with this. You can switch later." />
      <Options opts={GOAL_OPTS} value={a.goal} onPick={(v) => set('goal', v)} /></>;
    cta = <Cta title="Continue" onPress={need(a.goal)} />;
  } else if (step === 'experience') {
    body = <><QHead icon="level" q="How long have you been lifting?" sub="Picks your exercises and how hard the first weeks hit." />
      <Options opts={EXPERIENCE} value={a.experience} onPick={(v) => set('experience', v)} /></>;
    cta = <Cta title="Continue" onPress={need(a.experience)} />;
  } else if (step === 'body') {
    body = <BodyStep a={a} set={set} intro={fromScore && n === 1 ? a.first_name : null} />;
    cta = <Cta title="Continue" onPress={() => {
      if (!a.sex) return setErr('Pick male or female.');
      const ft = Number(a.height_ft), inch = Number(a.height_in || 0);
      if (!ft || ft < 4 || ft > 7 || inch < 0 || inch > 11) return setErr('Enter your height.');
      const w = Number(a.weight), g = Number(a.goal_weight || a.weight);
      if (!w || w < 80 || w > 450) return setErr('Enter your weight.');
      if (a.goal !== GOALS[2] && g > w) return setErr('For losing fat, your goal weight should be at or below your weight now.');
      if (!a.goal_weight) set('goal_weight', a.weight);
      next();
    }} />;
  } else if (step === 'activity') {
    body = <><QHead icon="walk" q="How much do you move outside the gym?" sub="Your job and your steps burn more than your workouts do." />
      <Options opts={ACTIVITY} value={a.activity || ''} onPick={(v) => set('activity', v)} /></>;
    cta = <Cta title="Continue" onPress={need(a.activity)} />;
  } else if (step === 'training') {
    const d = parseInt(a.days, 10) || 4;
    body = <><QHead icon="dumbbell" q="Where and how often will you train?" sub="Every exercise uses only what you have, on days you can stick to." />
      <Sub icon="home" t="Where you train" />
      <Options opts={PLACE} value={a.where_train} onPick={(v) => set('where_train', v)} />
      <View style={st.divider} />
      <Sub icon="calendar" t="Workouts per week" />
      <Pills opts={['3', '4', '5', '6']} value={String(d)} onPick={(v) => set('days', `${v} days`)} />
      <Text style={st.hint}>{d} days, about 50 minutes each.{fromScore ? ' Filled in from your Stack Score.' : ''}</Text></>;
    cta = <Cta title="Continue" onPress={() => {
      if (!a.where_train) return setErr('Pick where you train.');
      const cfg = defaultCfg({ days: a.days, experience: a.experience });
      set('split', cfg.split); set('train_days', DEFAULT_DAYS[d]); next();
    }} />;
  } else if (step === 'injuries') {
    const cur = a.injuries || [];
    body = <><QHead icon="shield" q="Anything I should train around?" sub="Tap any that bug you. I'll swap the exercises that aggravate them." />
      <View style={st.grid2}>
        {INJURIES.map((o) => {
          const on = cur.includes(o);
          return (
            <Pressable key={o} accessibilityRole="checkbox" accessibilityState={{ checked: on }} onPress={() => set('injuries', on ? cur.filter((x) => x !== o) : [...cur, o])}
              style={[st.tile, on && st.on]}>
              <Text style={st.tileT}>{o}</Text>
              <View style={[st.dot, on && st.dotOn]}>{on && <Ico k="check" size={12} color="#fff" w={3.2} />}</View>
            </Pressable>
          );
        })}
      </View>
      <Pressable accessibilityRole="button" onPress={() => { set('injuries', []); next(); }} style={st.ghost}><Text style={st.ghostT}>Nothing, build my plan</Text></Pressable>
      <Text style={st.fine}>Have a medical condition or take prescription meds? Check with your doctor before starting.</Text></>;
    cta = <Cta title="Build my plan" onPress={next} />;
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: N.bg }}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <View style={st.top}>
          <BackBtn onPress={back} />
          <View style={{ flex: 1, gap: 8 }} accessibilityLabel={`Question ${n} of ${total}`}>
            <View style={st.meta}><Text style={st.metaT}><Text style={{ fontFamily: F.black, color: N.navy }}>Question {n} of {total}</Text> · {LABEL[step]}</Text></View>
            <View style={st.barBg}><View style={[st.barFg, { width: `${Math.round((n / total) * 100)}%` }]} /></View>
          </View>
        </View>
        <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 24, maxWidth: 620, width: '100%', alignSelf: 'center' }} keyboardShouldPersistTaps="handled">
          <View style={st.card}>
            {body}
            {!!err && <Text style={st.err} accessibilityLiveRegion="polite">{err}</Text>}
          </View>
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
      <Svg width={18} height={18} viewBox="0 0 24 24"><Path d="M15 5l-7 7 7 7" stroke={N.navy} strokeWidth={2.4} fill="none" strokeLinecap="round" strokeLinejoin="round" /></Svg>
    </Pressable>
  );
}

const Cta = ({ title, onPress }: { title: string; onPress: () => void }) => (
  <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [st.cta, { opacity: pressed ? 0.9 : 1 }]}>
    <Text style={st.ctaT}>{title}  →</Text>
  </Pressable>
);

/** The question with its navy icon tile, like the Stack Score. */
const QHead = ({ icon, q, sub }: { icon: IconK; q: string; sub?: string }) => (
  <View style={st.qhead}>
    <View style={st.qico}><Ico k={icon} size={24} color="#fff" /></View>
    <View style={{ flex: 1, gap: 6, minWidth: 0 }}>
      <Text style={st.q} accessibilityRole="header">{q}</Text>
      {!!sub && <Text style={st.sub}>{sub}</Text>}
    </View>
  </View>
);
const Sub = ({ icon, t }: { icon: IconK; t: string }) => (
  <View style={st.subRow}><View style={st.subIco}><Ico k={icon} size={17} /></View><Text style={st.subT}>{t}</Text></View>
);

const Check = ({ on }: { on: boolean }) => (
  <View style={[st.dot, on && st.dotOn]}>{on && <Ico k="check" size={13} color="#fff" w={3.2} />}</View>
);

function Options({ opts, value, onPick }: { opts: Opt[]; value: string; onPick: (v: string) => void }) {
  return (
    <View style={{ gap: 10 }}>
      {opts.map((o) => {
        const on = value === o.v;
        return (
          <Pressable key={o.v} accessibilityRole="radio" accessibilityState={{ selected: on }} onPress={() => onPick(o.v)} style={[st.opt, on && st.on]}>
            {!!o.icon && <View style={[st.oico, on && { backgroundColor: N.navy }]}><Ico k={o.icon} size={21} color={on ? '#fff' : N.navy} /></View>}
            <View style={{ flex: 1, gap: 2, minWidth: 0 }}>
              <Text style={st.optT}>{o.t}</Text>
              {!!o.s && <Text style={st.optS}>{o.s}</Text>}
            </View>
            <Check on={on} />
          </Pressable>
        );
      })}
    </View>
  );
}

function Pills({ opts, value, onPick }: { opts: string[]; value: string; onPick: (v: string) => void }) {
  return (
    <View style={{ flexDirection: 'row', gap: 8 }}>
      {opts.map((o) => {
        const on = o === value;
        return (
          <Pressable key={o} accessibilityRole="radio" accessibilityState={{ selected: on }} onPress={() => onPick(o)} style={[st.pill, on && st.pillOn]}>
            <Text style={[st.pillT, on && { color: '#fff' }]}>{o}</Text>
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
          <Pressable key={o} accessibilityRole="radio" accessibilityState={{ selected: on }} onPress={() => onPick(o)} style={[st.togBtn, on && { backgroundColor: N.navy }]}>
            <Text style={[st.togT, on && { color: '#fff' }]}>{o}</Text>
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
        placeholder={ph} placeholderTextColor={N.soft} style={st.fieldIn} maxLength={5} />
      <Text style={st.unit}>{unit}</Text>
    </View>
  );
}

/** Sex, height, weight and goal weight on one screen: everything the calorie number needs. */
function BodyStep({ a, set, intro }: { a: Q2; set: (k: keyof Q2, v: any) => void; intro: string | null }) {
  const [units, setUnits] = useState('US');
  const metric = units === 'Metric';
  const [cm, setCm] = useState(() => (a.height_ft ? String(Math.round((Number(a.height_ft) * 12 + Number(a.height_in || 0)) * 2.54)) : ''));
  const fromCm = (v: string) => {
    setCm(v);
    const inches = Number(v) / 2.54;
    if (inches > 0) { set('height_ft', String(Math.floor(inches / 12))); set('height_in', String(Math.round(inches % 12) % 12)); }
  };
  const show = (lbs: string) => (metric && lbs ? String(Math.round(Number(lbs) / 2.2046)) : lbs);
  const store = (v: string) => (metric && v ? String(Math.round(Number(v) * 2.2046)) : v);
  const wu = metric ? 'kg' : 'lbs';
  const p = a.weight ? projection({ weight: a.weight, goal_weight: a.goal_weight || a.weight, goal: a.goal }) : null;
  const diff = p ? Math.round(p.w - p.g) : 0;
  return (
    <>
      {intro !== null && (
        <View style={st.fromScore}>
          <View style={st.fsIco}><Ico k="check" size={16} color="#fff" w={3} /></View>
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={st.fromScoreT}>{intro ? `${intro}, your Stack Score is in.` : 'Your Stack Score is in.'}</Text>
            <Text style={st.fromScoreS}>Your goal, training and stack are filled in. 4 quick questions and your plan is built.</Text>
          </View>
        </View>
      )}
      <QHead icon="body" q="Tell me about your body" sub="Sets your calories, protein and an honest timeline." />
      <View style={st.unitsRow}><Toggle opts={['US', 'Metric']} value={units} onPick={setUnits} /></View>
      <Sub icon="body" t="Sex" />
      <Pills opts={['Male', 'Female']} value={a.sex} onPick={(v) => set('sex', v)} />
      <View style={st.divider} />
      <Sub icon="level" t="Height" />
      {metric
        ? <Field value={cm} onChange={fromCm} unit="cm" ph="178" label="Centimeters" />
        : <View style={{ flexDirection: 'row', gap: 10 }}>
            <View style={{ flex: 1 }}><Field value={a.height_ft} onChange={(v) => set('height_ft', v)} unit="ft" ph="5" label="Feet" /></View>
            <View style={{ flex: 1 }}><Field value={a.height_in} onChange={(v) => set('height_in', v)} unit="in" ph="10" label="Inches" /></View>
          </View>}
      <View style={st.divider} />
      <Sub icon="scale" t="Weight" />
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <View style={{ flex: 1, gap: 6 }}><Text style={st.small}>Now</Text><Field value={show(a.weight)} onChange={(v) => set('weight', store(v))} unit={wu} ph={metric ? '86' : '190'} label="Current weight" /></View>
        <View style={{ flex: 1, gap: 6 }}><Text style={st.small}>Goal</Text><Field value={show(a.goal_weight)} onChange={(v) => set('goal_weight', store(v))} unit={wu} ph={metric ? '79' : '175'} label="Goal weight" /></View>
      </View>
      {!!p && !p.build && diff > 0 && (
        <View style={st.goodNote}>
          <Ico k="check" size={18} color={N.green} w={2.6} />
          <Text style={st.goodT}>{p.weeks <= 12 ? `${diff} lbs in ${p.weeks} weeks is realistic. That's about ${p.rate} lbs a week.` : `About ${Math.round(p.w - p.at12)} lbs in 12 weeks is realistic, and ${p.g} lbs by ${p.goalDate}.`}</Text>
        </View>
      )}
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
  const labels = ['Setting your calories and protein', 'Building your meals', 'Picking workouts for your gym', 'Planning your eat-out orders'];
  const R = 86, L = 2 * Math.PI * R;
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: N.bg, alignItems: 'center', paddingHorizontal: 24, paddingTop: 70 }}>
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
              <View style={[st.stepDot, done && { backgroundColor: N.green, borderColor: N.green }, active && { borderColor: N.navy }]}>
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


/**
 * One screen after the plan is built: their real numbers up top, then a password to save it.
 * Name and email are usually known already (Stack Score or the email screen), so it's often just one field.
 */
function SaveYourPlan({ a, set, onBack, onDone }: { a: Q2; set: (k: keyof Q2, v: any) => void; onBack: () => void; onDone: () => void }) {
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [savePw, setSavePw] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [note, setNote] = useState('');
  const known = useRef(a.first_name.trim().length >= 2 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(a.email.trim())).current;
  const [editing, setEditing] = useState(!known);
  const { profile } = useAuth();
  const router = useRouter();
  const t = targets(a);
  const p = projection(a);
  const days = parseInt(a.days, 10) || 4;
  const name = a.first_name.trim().split(' ')[0];
  const line = p.build ? `12 weeks of training built to add muscle` : p.w > p.g ? `On pace for ${p.at12} lbs by ${p.end12}` : `12 weeks built to lean out and show your abs`;
  useEffect(() => { track('account_view', { known }, { once: true }); }, []);
  const oauth = async (provider: 'apple' | 'google') => {
    setNote('');
    const redirectTo = Platform.OS === 'web' ? `${window.location.origin}/app/` : Linking.createURL('/');
    const { error } = await supabase.auth.signInWithOAuth({ provider, options: { redirectTo } });
    if (error) setNote(`${provider === 'apple' ? 'Apple' : 'Google'} sign-in isn't switched on yet. Use a password for now.`);
  };
  const submit = async () => {
    setErr(''); setNote('');
    if (profile?.role === 'coach') return router.replace('/');
    const email = a.email.trim().toLowerCase();
    if (a.first_name.trim().length < 2) { setEditing(true); return setErr('Add your first name.'); }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setEditing(true); return setErr('Enter a valid email.'); }
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
    <View style={{ flex: 1, backgroundColor: N.bg }}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ paddingBottom: 24 }} keyboardShouldPersistTaps="handled">
          <LinearGradient colors={[N.navy, N.navy]} style={sp.hero}>
            <SafeAreaView edges={['top']}>
              <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={onBack} hitSlop={10} style={sp.back}>
                <Svg width={20} height={20} viewBox="0 0 24 24"><Path d="M15 5l-7 7 7 7" stroke="#fff" strokeWidth={2.6} fill="none" strokeLinecap="round" strokeLinejoin="round" /></Svg>
              </Pressable>
              <View style={sp.pill}><View style={sp.dot} /><Text style={sp.pillT}>YOUR PLAN IS READY</Text></View>
              <Text style={sp.h}>{name ? `${name}, your 12-week plan is built.` : 'Your 12-week plan is built.'}</Text>
              <Text style={sp.line}>{line}</Text>
              <View style={sp.stats}>
                <View style={sp.stat}><Text style={sp.statV}>{t.kcal.toLocaleString('en-US')}</Text><Text style={sp.statL}>CALORIES</Text></View>
                <View style={sp.stat}><Text style={sp.statV}>{t.protein}g</Text><Text style={sp.statL}>PROTEIN</Text></View>
                <View style={sp.stat}><Text style={sp.statV}>{days}x</Text><Text style={sp.statL}>WORKOUTS</Text></View>
              </View>
            </SafeAreaView>
          </LinearGradient>

          <View style={sp.sheet}>
            <Text style={sp.title}>Create a password to save it</Text>
            <Text style={sp.sub}>Your first 2 weeks are free. No card needed.</Text>

            {OAUTH && (
              <View style={{ gap: 10 }}>
                <Pressable accessibilityRole="button" onPress={() => oauth('apple')} style={[sp.social, { backgroundColor: '#000' }]}><Text style={[sp.socialT, { color: '#fff' }]}> Continue with Apple</Text></Pressable>
                <Pressable accessibilityRole="button" onPress={() => oauth('google')} style={sp.social}><Text style={sp.socialT}>Continue with Google</Text></Pressable>
                <View style={st.or}><View style={st.orLine} /><Text style={st.orT}>or</Text><View style={st.orLine} /></View>
              </View>
            )}

            {editing ? (
              <>
                <TextInput accessibilityLabel="First name" value={a.first_name} onChangeText={(v) => set('first_name', v)} placeholder="First name" placeholderTextColor={C.muted} style={sp.input} autoComplete="given-name" textContentType="givenName" />
                <TextInput accessibilityLabel="Email" value={a.email} onChangeText={(v) => set('email', v)} placeholder="Email" autoCapitalize="none" keyboardType="email-address" placeholderTextColor={C.muted} style={sp.input} autoComplete="email" textContentType="emailAddress" />
              </>
            ) : (
              <View style={sp.who}>
                <View style={sp.whoAv}><Text style={sp.whoAvT}>{(name || '?').charAt(0).toUpperCase()}</Text></View>
                <View style={{ flex: 1, minWidth: 0 }}><Text style={sp.whoN} numberOfLines={1}>{a.first_name}</Text><Text style={sp.whoE} numberOfLines={1}>{a.email}</Text></View>
                <Pressable accessibilityRole="button" onPress={() => setEditing(true)} hitSlop={8}><Text style={sp.change}>Change</Text></Pressable>
              </View>
            )}

            <View style={sp.pwWrap}>
              <TextInput accessibilityLabel="Password" value={password} onChangeText={setPassword} placeholder="Create a password" secureTextEntry={!show} placeholderTextColor={C.muted}
                style={[sp.input, { flex: 1, minWidth: 0, borderWidth: 0, borderRadius: 0, backgroundColor: 'transparent', paddingRight: 70 }]} autoComplete={savePw ? 'new-password' : 'off'} textContentType={savePw ? 'newPassword' : 'none'} onSubmitEditing={submit} autoFocus={known && Platform.OS !== 'web'} />
              <Pressable accessibilityRole="button" accessibilityLabel={show ? 'Hide password' : 'Show password'} onPress={() => setShow(!show)} style={sp.showBtn} hitSlop={8}><Text style={sp.showT}>{show ? 'Hide' : 'Show'}</Text></Pressable>
            </View>
            <View style={sp.meter}>
              <View style={[sp.meterBar, password.length >= 8 && { backgroundColor: C.green, width: '100%' }, password.length > 0 && password.length < 8 && { width: `${(password.length / 8) * 100}%` as any }]} />
            </View>
            <Text style={[sp.hint, password.length >= 8 && { color: C.green }]}>{password.length >= 8 ? '✓ Good to go' : '8 or more characters'}</Text>

            <View style={sp.saveRow}>
              <View style={{ flex: 1 }}><Text style={sp.saveT}>Save password on this phone</Text><Text style={sp.saveS}>Log in with Face ID next time</Text></View>
              <Switch value={savePw} onValueChange={setSavePw} trackColor={{ true: N.navy, false: '#c3c8d4' }} thumbColor="#ffffff" accessibilityLabel="Save password on this phone" />
            </View>
            {!!err && <Text style={st.err} accessibilityLiveRegion="polite">{err}</Text>}
            {!!note && <Text style={[st.err, { color: C.green }]} accessibilityLiveRegion="polite">{note}</Text>}
          </View>
        </ScrollView>
        <View style={sp.bottom}>
          <Pressable accessibilityRole="button" onPress={submit} disabled={busy} style={[sp.cta, { opacity: busy ? 0.6 : 1 }]}>
            <Text style={sp.ctaT}>{busy ? 'Saving your plan…' : 'Save my plan and start  →'}</Text>
          </Pressable>
          <Text style={sp.fine}>By continuing you agree to the{' '}
            <Text accessibilityRole="link" onPress={() => Linking.openURL(TERMS_URL)} style={{ textDecorationLine: 'underline' }}>Terms</Text> and{' '}
            <Text accessibilityRole="link" onPress={() => Linking.openURL(PRIVACY_URL)} style={{ textDecorationLine: 'underline' }}>Privacy Policy</Text>.</Text>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const sp = StyleSheet.create({
  hero: { paddingHorizontal: 20, paddingBottom: 46, borderBottomLeftRadius: 28, borderBottomRightRadius: 28 },
  back: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#1c2542', alignItems: 'center', justifyContent: 'center', marginTop: 8, marginBottom: 18 },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 8, alignSelf: 'flex-start', backgroundColor: '#1c2542', borderWidth: 1, borderColor: '#2a3456', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#2fd17f' },
  pillT: { fontFamily: F.xbold, fontSize: 12, letterSpacing: 1.4, color: '#7ff0b5' },
  h: { fontFamily: F.black, fontSize: 30, lineHeight: 34, color: '#fff', letterSpacing: -0.5, marginTop: 14 },
  line: { fontFamily: F.semi, fontSize: 15, color: '#c7cde0', marginTop: 8 },
  stats: { flexDirection: 'row', gap: 10, marginTop: 20 },
  stat: { flex: 1, backgroundColor: '#1c2542', borderWidth: 1, borderColor: '#2a3456', borderRadius: 16, paddingVertical: 12, alignItems: 'center', gap: 2 },
  statV: { fontFamily: F.black, fontSize: 22, color: '#fff' },
  statL: { fontFamily: F.xbold, fontSize: 10, letterSpacing: 1.2, color: '#9aa3bd' },
  sheet: { marginTop: -26, marginHorizontal: 12, backgroundColor: '#fff', borderRadius: 24, padding: 18, gap: 12, borderWidth: 1, borderColor: C.line, shadowColor: '#141c33', shadowOpacity: 0.12, shadowRadius: 24, shadowOffset: { width: 0, height: 10 }, elevation: 6 },
  title: { fontFamily: F.black, fontSize: 22, color: C.ink },
  sub: { fontFamily: F.medium, fontSize: 14, color: C.muted, marginTop: -6, marginBottom: 2 },
  social: { height: 54, borderRadius: 27, borderWidth: 1.5, borderColor: '#d5d9e3', alignItems: 'center', justifyContent: 'center' },
  socialT: { fontFamily: F.bold, fontSize: 17, color: C.ink },
  input: { height: 56, borderRadius: 14, backgroundColor: C.card, borderWidth: 1.5, borderColor: C.line, color: C.ink, fontFamily: F.semi, fontSize: 17, paddingHorizontal: 16, outlineWidth: 0 } as any,
  who: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 14, backgroundColor: C.card, borderWidth: 1.5, borderColor: C.line },
  whoAv: { width: 36, height: 36, borderRadius: 18, backgroundColor: C.navy, alignItems: 'center', justifyContent: 'center' },
  whoAvT: { fontFamily: F.black, fontSize: 16, color: '#fff' },
  whoN: { fontFamily: F.bold, fontSize: 15, color: C.ink },
  whoE: { fontFamily: F.medium, fontSize: 13, color: C.muted },
  change: { fontFamily: F.bold, fontSize: 14, color: N.navy },
  pwWrap: { flexDirection: 'row', alignItems: 'center', borderRadius: 14, backgroundColor: C.card, borderWidth: 1.5, borderColor: C.navy, overflow: 'hidden' },
  showBtn: { position: 'absolute', right: 14, height: 56, justifyContent: 'center' },
  showT: { fontFamily: F.bold, fontSize: 14, color: C.navy },
  meter: { height: 4, borderRadius: 2, backgroundColor: '#e8eaf0', overflow: 'hidden', marginTop: -4 },
  meterBar: { height: 4, width: '0%', backgroundColor: C.red },
  hint: { fontFamily: F.semi, fontSize: 13, color: C.muted, marginTop: -6 },
  saveRow: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 4 },
  saveT: { fontFamily: F.bold, fontSize: 15, color: C.ink },
  saveS: { fontFamily: F.medium, fontSize: 13, color: C.muted },
  bottom: { paddingHorizontal: 16, paddingTop: 10, paddingBottom: 18, backgroundColor: N.bg, borderTopWidth: 1, borderTopColor: C.line },
  cta: { height: 58, borderRadius: 14, backgroundColor: C.red, alignItems: 'center', justifyContent: 'center', shadowColor: C.red, shadowOpacity: 0.35, shadowRadius: 16, shadowOffset: { width: 0, height: 8 } },
  ctaT: { fontFamily: F.black, fontSize: 18, color: '#fff' },
  fine: { fontFamily: F.medium, fontSize: 12, lineHeight: 17, color: C.muted, textAlign: 'center', marginTop: 10 },
});


export const st = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingTop: 8, maxWidth: 620, width: '100%', alignSelf: 'center' },
  back: { width: 42, height: 42, borderRadius: 12, borderWidth: 1.5, borderColor: N.line, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  meta: { flexDirection: 'row' },
  metaT: { fontFamily: F.semi, fontSize: 13, color: N.mute },
  barBg: { height: 6, borderRadius: 3, backgroundColor: '#e6e8ef', overflow: 'hidden' },
  barFg: { height: 6, borderRadius: 3, backgroundColor: N.navy },
  card: { backgroundColor: '#fff', borderRadius: 22, borderWidth: 1, borderColor: '#e6e8ef', padding: 18, shadowColor: N.navy, shadowOpacity: 0.06, shadowRadius: 16, shadowOffset: { width: 0, height: 6 }, elevation: 2 },
  qhead: { flexDirection: 'row', gap: 14, alignItems: 'flex-start', marginBottom: 20 },
  qico: { width: 48, height: 48, borderRadius: 14, backgroundColor: N.navy, alignItems: 'center', justifyContent: 'center' },
  q: { fontFamily: F.black, fontSize: 26, lineHeight: 30, color: N.navy, letterSpacing: -0.5 },
  sub: { fontFamily: F.medium, fontSize: 15, lineHeight: 21, color: N.mute },
  subRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  subIco: { width: 30, height: 30, borderRadius: 9, backgroundColor: N.tint, alignItems: 'center', justifyContent: 'center' },
  subT: { fontFamily: F.xbold, fontSize: 16, color: N.navy },
  small: { fontFamily: F.semi, fontSize: 13, color: N.mute },
  divider: { height: 1, backgroundColor: '#e6e8ef', marginVertical: 18 },
  hint: { fontFamily: F.medium, fontSize: 14, color: N.mute, marginTop: 10 },
  opt: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 14, paddingVertical: 14, borderRadius: 14, borderWidth: 1.5, borderColor: N.line, backgroundColor: '#fff' },
  on: { backgroundColor: N.tint, borderColor: N.navy },
  oico: { width: 40, height: 40, borderRadius: 12, backgroundColor: N.tint, alignItems: 'center', justifyContent: 'center' },
  optT: { fontFamily: F.bold, fontSize: 17, color: N.navy },
  optS: { fontFamily: F.medium, fontSize: 13.5, color: N.mute },
  dot: { width: 24, height: 24, borderRadius: 12, borderWidth: 1.5, borderColor: N.line, alignItems: 'center', justifyContent: 'center' },
  dotOn: { backgroundColor: N.navy, borderColor: N.navy },
  pill: { flex: 1, height: 52, borderRadius: 999, borderWidth: 1.5, borderColor: N.line, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  pillOn: { backgroundColor: N.navy, borderColor: N.navy },
  pillT: { fontFamily: F.bold, fontSize: 17, color: N.navy },
  unitsRow: { alignItems: 'flex-end', marginTop: -6, marginBottom: 14 },
  toggle: { flexDirection: 'row', padding: 3, borderRadius: 12, borderWidth: 1, borderColor: N.line, backgroundColor: N.bg, width: 170 },
  togBtn: { flex: 1, height: 34, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  togT: { fontFamily: F.bold, fontSize: 14, color: N.navy },
  field: { height: 54, borderRadius: 12, borderWidth: 1.5, borderColor: N.line, backgroundColor: '#fff', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16 },
  fieldIn: { flex: 1, fontFamily: F.semi, fontSize: 19, color: N.navy, minWidth: 0, outlineWidth: 0 } as any,
  unit: { fontFamily: F.semi, fontSize: 15, color: N.mute },
  goodNote: { marginTop: 16, padding: 12, borderRadius: 12, backgroundColor: N.greenBg, flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  goodT: { flex: 1, fontFamily: F.medium, fontSize: 14.5, lineHeight: 20, color: N.navy },
  fromScore: { flexDirection: 'row', gap: 12, backgroundColor: N.greenBg, borderRadius: 14, padding: 12, marginBottom: 18, alignItems: 'flex-start' },
  fsIco: { width: 28, height: 28, borderRadius: 14, backgroundColor: N.green, alignItems: 'center', justifyContent: 'center' },
  fromScoreT: { fontFamily: F.black, fontSize: 15, color: '#13633d' },
  fromScoreS: { fontFamily: F.medium, fontSize: 13.5, lineHeight: 19, color: N.navy },
  grid2: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  tile: { width: '48%', flexGrow: 1, height: 54, borderRadius: 14, borderWidth: 1.5, borderColor: N.line, backgroundColor: '#fff', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14 },
  tileT: { fontFamily: F.bold, fontSize: 15.5, color: N.navy },
  or: { flexDirection: 'row', alignItems: 'center', gap: 14, marginVertical: 22 },
  orLine: { flex: 1, height: 1, backgroundColor: C.line },
  orT: { fontFamily: F.bold, fontSize: 14, color: C.ink },
  ghost: { height: 52, borderRadius: 14, borderWidth: 1.5, borderStyle: 'dashed', borderColor: N.line, backgroundColor: N.bg, alignItems: 'center', justifyContent: 'center', marginTop: 14 },
  ghostT: { fontFamily: F.bold, fontSize: 16, color: N.navy },
  fine: { fontFamily: F.medium, fontSize: 12.5, lineHeight: 18, color: N.mute, marginTop: 14 },
  err: { fontFamily: F.bold, fontSize: 14, color: C.red, marginTop: 14 },
  bottom: { paddingHorizontal: 16, paddingTop: 10, paddingBottom: 16, maxWidth: 620, width: '100%', alignSelf: 'center' },
  cta: { height: 56, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: C.red, shadowColor: C.red, shadowOpacity: 0.28, shadowRadius: 14, shadowOffset: { width: 0, height: 8 } },
  ctaT: { fontFamily: F.black, fontSize: 18, color: '#fff' },
  stepDot: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: '#d5d9e3', alignItems: 'center', justifyContent: 'center' },
});
