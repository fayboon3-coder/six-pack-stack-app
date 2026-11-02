import React, { useEffect, useMemo, useState } from 'react';
import { Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Linking from 'expo-linking';
import Svg, { Circle, Line, Path, Text as SvgText } from 'react-native-svg';
import { supabase } from '../src/lib/supabase';
import { C, F } from '../src/lib/theme';
import { Button } from '../src/components/ui';
import { BackIcon, CheckIcon } from '../src/components/icons';
import { GOALS, projection, Quiz, savePendingQuiz, SPEND_MID, targets } from '../src/lib/quiz';
import { kitTag } from '../src/lib/kit';
import { useAuth } from '../src/lib/auth';
import { readLead } from '../src/lib/lead';
import Backdrop from '../src/components/Backdrop';

const BOON = require('../assets/hero/boon_jacked.jpg');

type Step =
  | { id: keyof Quiz; kind: 'one'; q: string; sub?: string; opts: string[] }
  | { id: 'tried'; kind: 'multi'; q: string; sub?: string; opts: string[] }
  | { id: keyof Quiz; kind: 'num'; q: string; sub?: string; unit: string; min: number; max: number; ph: string }
  | { id: 'height'; kind: 'height'; q: string }
  | { id: string; kind: 'spend' | 'story' | 'chart' | 'account' };

const STEPS: Step[] = [
  { id: 'goal', kind: 'one', q: "What's your main goal?", opts: GOALS },
  { id: 'sex', kind: 'one', q: 'Are you a man or a woman?', sub: 'Your calories depend on it.', opts: ['Male', 'Female'] },
  { id: 'age', kind: 'num', q: 'How old are you?', unit: 'years', min: 16, max: 80, ph: '28' },
  { id: 'height', kind: 'height', q: 'How tall are you?' },
  { id: 'weight', kind: 'num', q: 'What do you weigh right now?', sub: 'Morning weight is best. A rough number is fine.', unit: 'lbs', min: 80, max: 450, ph: '200' },
  { id: 'goal_weight', kind: 'num', q: "What's your goal weight?", sub: 'The number you want to see on the scale.', unit: 'lbs', min: 80, max: 450, ph: '180' },
  { id: 'where_train', kind: 'one', q: 'Where will you train?', opts: ['Gym', 'Home with dumbbells'] },
  { id: 'days', kind: 'one', q: 'How many days a week can you train?', sub: '45–60 minutes each.', opts: ['3 days', '4 days'] },
  { id: 'experience', kind: 'one', q: 'How long have you been lifting?', opts: ['Never lifted', 'Under 1 year', '1–3 years', '3+ years'] },
  { id: 'tried', kind: 'multi', q: 'Which of these have you bought?', sub: 'Tick all that apply.', opts: ['Fat burners', 'Pre-workout', 'Test boosters', 'Greens powder', 'Protein powder', 'Creatine', 'None of these'] },
  { id: 'monthly_spend', kind: 'one', q: 'About how much do you spend on supplements a month?', opts: ['Under $50', '$50–$100', '$100–$200', '$200+'] },
  { id: 'spend', kind: 'spend' },
  { id: 'eat_out', kind: 'one', q: 'How often do you eat out or order in?', opts: ['Rarely', '1–3 times a week', '4+ times a week'] },
  { id: 'struggle', kind: 'one', q: "What's been the hardest part so far?", opts: ['Cravings and snacking', 'Weekends', 'No time', "Not knowing what to eat", 'Staying consistent'] },
  { id: 'story', kind: 'story' },
  { id: 'start_timing', kind: 'one', q: 'When do you want to start?', opts: ['Today', 'This week', 'Within a month', 'Just looking'] },
  { id: 'ready_to_invest', kind: 'one', q: 'If I coached you 1:1, would you invest in yourself?', sub: "The Free Stack doesn't depend on this. It helps me know who to help first.", opts: ['Yes', 'Yes, with a payment plan', 'Not right now'] },
  { id: 'chart', kind: 'chart' },
  { id: 'account', kind: 'account' },
];

const EMPTY: Quiz = {
  goal: '', sex: '', age: '', height_ft: '', height_in: '', weight: '', goal_weight: '', where_train: '', days: '',
  experience: '', tried: [], monthly_spend: '', eat_out: '', struggle: '', start_timing: '', ready_to_invest: '',
  first_name: '', email: '',
};

export default function QuizScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ src?: string; name?: string; email?: string }>();
  const [i, setI] = useState(0);
  const [a, setA] = useState<Quiz>(EMPTY);
  const [err, setErr] = useState('');
  const step = STEPS[i];
  const asked = STEPS.filter((s) => !['spend', 'story', 'chart'].includes(s.kind)).length;
  const n = STEPS.slice(0, i + 1).filter((s) => !['spend', 'story', 'chart'].includes(s.kind)).length;

  // Name and email from the welcome screen (or a saved lead)
  useEffect(() => {
    if (params.name || params.email) { setA((x) => ({ ...x, first_name: params.name || x.first_name, email: params.email || x.email })); return; }
    readLead().then((l) => { if (l) setA((x) => ({ ...x, first_name: x.first_name || l.first_name, email: x.email || l.email })); });
  }, [params.name, params.email]);

  // Which video sent them: ?src=<video> on the app link (kept for Kit)
  useEffect(() => {
    if (params.src) { setA((x) => ({ ...x, src: String(params.src).slice(0, 80) })); return; }
    Linking.getInitialURL().then((u) => {
      const src = u ? Linking.parse(u).queryParams?.src : undefined;
      if (src) setA((x) => ({ ...x, src: String(src).slice(0, 80) }));
    }).catch(() => {});
  }, [params.src]);

  const set = (k: keyof Quiz, v: any) => { setErr(''); setA((x) => ({ ...x, [k]: v })); };
  const next = () => { setErr(''); setI((x) => Math.min(STEPS.length - 1, x + 1)); };
  const back = () => { setErr(''); if (i === 0) router.back(); else setI(i - 1); };

  // The goal weight step makes no sense for "build muscle": default it to their weight.
  useEffect(() => {
    if (step.id === 'goal_weight' && a.goal === GOALS[2] && !a.goal_weight) set('goal_weight', a.weight);
  }, [step.id]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.navy }}>
      <Backdrop />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <View style={st.top}>
          <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={back} hitSlop={10} style={st.back}><BackIcon /></Pressable>
          <View style={st.barBg} accessibilityLabel={`Question ${n} of ${asked}`}>
            <View style={[st.barFg, { width: `${Math.round((n / asked) * 100)}%` }]} />
          </View>
          <Text style={st.count}>{n}/{asked}</Text>
        </View>
        <ScrollView contentContainerStyle={{ padding: 22, paddingBottom: 48, gap: 18 }} keyboardShouldPersistTaps="handled">
          {step.kind === 'one' && (
            <>
              <Q q={step.q} sub={step.sub} />
              <View style={{ gap: 10 }}>
                {step.opts.map((o) => {
                  const on = a[step.id] === o;
                  return (
                    <Pressable key={o} accessibilityRole="radio" accessibilityState={{ selected: on }}
                      onPress={() => { set(step.id, o); setTimeout(next, 160); }} style={[st.opt, on && st.optOn]}>
                      <Text style={st.optText}>{o}</Text>
                      <View style={[st.radio, on && st.radioOn]}>{on && <CheckIcon size={12} />}</View>
                    </Pressable>
                  );
                })}
              </View>
            </>
          )}

          {step.kind === 'multi' && (
            <>
              <Q q={step.q} sub={step.sub} />
              <View style={{ gap: 10 }}>
                {step.opts.map((o) => {
                  const on = a.tried.includes(o);
                  const toggle = () => {
                    if (o === 'None of these') return set('tried', on ? [] : [o]);
                    const rest = a.tried.filter((x) => x !== 'None of these');
                    set('tried', on ? rest.filter((x) => x !== o) : [...rest, o]);
                  };
                  return (
                    <Pressable key={o} accessibilityRole="checkbox" accessibilityState={{ checked: on }} onPress={toggle} style={[st.opt, on && st.optOn]}>
                      <Text style={st.optText}>{o}</Text>
                      <View style={[st.box, on && st.radioOn]}>{on && <CheckIcon size={12} />}</View>
                    </Pressable>
                  );
                })}
              </View>
              {!!err && <Text style={st.err}>{err}</Text>}
              <Button title="Next" onPress={() => (a.tried.length ? next() : setErr('Tick at least one, or "None of these".'))} />
            </>
          )}

          {step.kind === 'num' && (
            <NumStep step={step} value={String(a[step.id] || '')} onChange={(v) => set(step.id, v)} err={err}
              onNext={() => {
                const v = Number(a[step.id]);
                if (!v || v < step.min || v > step.max) return setErr(`Enter a number between ${step.min} and ${step.max}.`);
                if (step.id === 'goal_weight' && a.goal !== GOALS[2] && v > Number(a.weight)) return setErr('For losing fat, your goal should be at or below your weight now.');
                next();
              }} />
          )}

          {step.kind === 'height' && (
            <>
              <Q q={step.q} />
              <View style={{ flexDirection: 'row', gap: 12 }}>
                <Field value={a.height_ft} onChange={(v) => set('height_ft', v)} unit="ft" ph="5" label="Feet" />
                <Field value={a.height_in} onChange={(v) => set('height_in', v)} unit="in" ph="10" label="Inches" />
              </View>
              {!!err && <Text style={st.err}>{err}</Text>}
              <Button title="Next" onPress={() => {
                const ft = Number(a.height_ft), inch = Number(a.height_in || 0);
                if (!ft || ft < 4 || ft > 7 || inch < 0 || inch > 11) return setErr('Enter feet (4–7) and inches (0–11).');
                next();
              }} />
            </>
          )}

          {step.kind === 'spend' && <SpendStep spend={a.monthly_spend} tried={a.tried} onNext={next} />}
          {step.kind === 'story' && <StoryStep onNext={next} />}
          {step.kind === 'chart' && <ChartStep a={a} onNext={next} />}
          {step.kind === 'account' && <AccountStep a={a} set={set} onDone={() => router.replace('/ready')} />}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const Q = ({ q, sub }: { q: string; sub?: string }) => (
  <View style={{ gap: 8 }}>
    <Text style={st.q} accessibilityRole="header">{q}</Text>
    {!!sub && <Text style={st.sub}>{sub}</Text>}
  </View>
);

function Field({ value, onChange, unit, ph, label, kb = 'number-pad' }: { value: string; onChange: (v: string) => void; unit: string; ph: string; label: string; kb?: 'number-pad' | 'decimal-pad' }) {
  return (
    <View style={st.field}>
      <TextInput accessibilityLabel={label} value={value} onChangeText={(t) => onChange(t.replace(/[^\d.]/g, ''))} keyboardType={kb}
        placeholder={ph} placeholderTextColor="#ffffff55" style={st.fieldInput} maxLength={5} />
      <Text style={st.unit}>{unit}</Text>
    </View>
  );
}

function NumStep({ step, value, onChange, onNext, err }: { step: Extract<Step, { kind: 'num' }>; value: string; onChange: (v: string) => void; onNext: () => void; err: string }) {
  return (
    <>
      <Q q={step.q} sub={step.sub} />
      <Field value={value} onChange={onChange} unit={step.unit} ph={step.ph} label={step.q} kb="decimal-pad" />
      {!!err && <Text style={st.err}>{err}</Text>}
      <Button title="Next" onPress={onNext} />
    </>
  );
}

function SpendStep({ spend, tried, onNext }: { spend: string; tried: string[]; onNext: () => void }) {
  const year = (SPEND_MID[spend] || 0) * 12;
  const junk = tried.filter((t) => ['Fat burners', 'Test boosters', 'Greens powder', 'Pre-workout'].includes(t));
  return (
    <>
      <Text style={st.kicker}>Quick reality check</Text>
      <Text style={st.big}>${year.toLocaleString('en-US')}</Text>
      <Text style={st.q}>That's roughly what you spend on supplements in a year.</Text>
      <Text style={st.sub}>
        {junk.length
          ? `I've spent years investigating ${junk.map((j) => j.toLowerCase()).join(junk.length > 2 ? ', ' : ' and ').replace(/, ([^,]*)$/, ' and $1')}. Most of what you're paying for is marketing, not results. Your plan keeps only what's proven to work, for about $12 a month.`
          : "Your plan keeps only what's proven to work: about $12 a month. Everything else is optional."}
      </Text>
      <Button title="Next" onPress={onNext} />
    </>
  );
}

function StoryStep({ onNext }: { onNext: () => void }) {
  const { width } = useWindowDimensions();
  const w = Math.min(width, 520) - 44;
  return (
    <>
      <Image source={BOON} style={{ width: w, height: w * 9 / 16, borderRadius: 22 }} resizeMode="cover" accessibilityLabel="Boon at 175 lbs" />
      <Text style={st.kicker}>Who built your plan</Text>
      <Text style={st.q}>I went from 225 to 175 lbs.</Text>
      <Text style={st.sub}>And I wasted years on supplements that did nothing before I got there.</Text>
      <Text style={st.sub}>What actually works is boring: the right calories, enough protein, lifting hard and walking. That's exactly what your plan is.</Text>
      <Text style={[st.sub, { fontFamily: F.black }]}>– Boon</Text>
      <Button title="Next" onPress={onNext} />
    </>
  );
}

function ChartStep({ a, onNext }: { a: Quiz; onNext: () => void }) {
  const p = projection(a);
  const t = targets(a);
  const { width } = useWindowDimensions();
  const W = Math.min(width, 520) - 44, H = 190, pad = 30;
  const weeks = p.build ? 12 : Math.min(p.weeks, 24);
  const end = p.build ? p.w : Math.max(p.g, p.w - p.rate * weeks);
  const lo = Math.min(end, p.w) - 4, hi = Math.max(end, p.w) + 4;
  const x = (k: number) => pad + (k / weeks) * (W - pad * 2);
  const y = (v: number) => 20 + (1 - (v - lo) / (hi - lo)) * (H - 50);
  // A gentle curve: faster at the start, steadier later (how real weight loss looks)
  const pts = Array.from({ length: weeks + 1 }, (_, k) => {
    const f = 1 - Math.pow(1 - k / weeks, 1.25);
    return [x(k), y(p.w + (end - p.w) * f)] as const;
  });
  const d = pts.map(([px, py], k) => `${k ? 'L' : 'M'}${px.toFixed(1)},${py.toFixed(1)}`).join(' ');
  return (
    <>
      <Text style={st.kicker}>Your plan is ready to build</Text>
      <Text style={st.q}>
        {p.build ? `Stronger and leaner by ${p.end12}.` : p.weeks <= 12 ? `You can hit ${p.g} lbs by ${p.goalDate}.` : `${p.at12} lbs by ${p.end12}, and ${p.g} lbs by ${p.goalDate}.`}
      </Text>
      <View style={st.chart}>
        <Svg width={W} height={H}>
          <Line x1={pad} x2={W - pad} y1={y(end)} y2={y(end)} stroke={C.green} strokeDasharray="5,5" strokeWidth={1.5} />
          <Path d={d} stroke={C.red} strokeWidth={4} fill="none" strokeLinecap="round" />
          <Circle cx={pts[0][0]} cy={pts[0][1]} r={6} fill={C.white} />
          <Circle cx={pts[weeks][0]} cy={pts[weeks][1]} r={8} fill={C.green} />
          <SvgText x={pts[0][0]} y={pts[0][1] - 12} fill={C.white} fontSize={13} fontWeight="900" fontFamily={F.black} textAnchor="start">{`${p.w} lbs`}</SvgText>
          <SvgText x={pts[weeks][0]} y={pts[weeks][1] - 14} fill={C.green} fontSize={13} fontWeight="900" fontFamily={F.black} textAnchor="end">{`${Math.round(end)} lbs`}</SvgText>
          <SvgText x={pad} y={H - 6} fill={C.white} fontSize={11} fontWeight="700" fontFamily={F.bold}>Today</SvgText>
          <SvgText x={W - pad} y={H - 6} fill={C.white} fontSize={11} fontWeight="700" fontFamily={F.bold} textAnchor="end">{`Week ${weeks}`}</SvgText>
        </Svg>
      </View>
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <Tile v={t.kcal.toLocaleString('en-US')} l="Calories" />
        <Tile v={`${t.protein}g`} l="Protein" />
        <Tile v={a.days === '3 days' ? '3x' : '4x'} l="Training" />
      </View>
      <Text style={st.sub}>
        {p.build ? 'Eat a little above maintenance, lift hard, and let the scale move slowly.' : `About ${p.rate} lbs a week: fast enough to see, slow enough to keep your muscle.`} Results depend on following the plan.
      </Text>
      <Button title="Build my plan" onPress={onNext} />
    </>
  );
}

const Tile = ({ v, l }: { v: string; l: string }) => (
  <View style={st.tile}><Text style={st.tileV}>{v}</Text><Text style={st.tileL}>{l}</Text></View>
);

function AccountStep({ a, set, onDone }: { a: Quiz; set: (k: keyof Quiz, v: any) => void; onDone: () => void }) {
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [note, setNote] = useState('');
  const { profile } = useAuth();
  const router = useRouter();
  const submit = async () => {
    setErr(''); setNote('');
    // Boon previewing from the Coach tab: show what's next without creating anything.
    if (profile?.role === 'coach') return router.replace('/unlock');
    const email = a.email.trim().toLowerCase();
    if (a.first_name.trim().length < 2) return setErr('Add your first name.');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return setErr('Enter a valid email.');
    if (password.length < 8) return setErr('Use at least 8 characters for your password.');
    setBusy(true);
    const q: Quiz = { ...a, email, first_name: a.first_name.trim(), done_at: new Date().toISOString() };
    await savePendingQuiz(q); // the plan is built from this as soon as the account exists
    const res = await supabase.auth.signUp({ email, password, options: { data: { first_name: q.first_name } } });
    if (res.error) {
      setBusy(false);
      const m = res.error.message.toLowerCase();
      if (m.includes('already')) return setErr('You already have an account with this email. Go back and tap "Sign in".');
      return setErr(res.error.message);
    }
    // Into Boon's Kit list, tagged and with their answers (same account the website uses)
    kitTag(email, q.first_name, ['app-quiz-done', 'app-free', 'src-app'], {
      quiz_goal: q.goal, quiz_start: q.start_timing, quiz_budget: q.ready_to_invest, quiz_where_train: q.where_train,
      app_tier: 'free', current_weight: q.weight, lead_source: q.src ? `app:${q.src}` : 'app',
    });
    setBusy(false);
    if (!res.data.session) return setNote('Check your email to confirm your account, then sign in. Your plan will be waiting.');
    onDone();
  };
  return (
    <>
      <Text style={st.kicker}>Last step</Text>
      <Text style={st.q}>Where should I save your plan?</Text>
      <Text style={st.sub}>Your plan lives in your account, so it's here every time you open the app.</Text>
      <View style={{ gap: 10 }}>
        <TextInput accessibilityLabel="First name" value={a.first_name} onChangeText={(t) => set('first_name', t)} placeholder="First name"
          placeholderTextColor="#ffffff77" style={st.input} autoComplete="given-name" textContentType="givenName" />
        <TextInput accessibilityLabel="Email" value={a.email} onChangeText={(t) => set('email', t)} placeholder="Email" autoCapitalize="none"
          keyboardType="email-address" placeholderTextColor="#ffffff77" style={st.input} autoComplete="email" textContentType="emailAddress" />
        <TextInput accessibilityLabel="Password" value={password} onChangeText={setPassword} placeholder="Password (8+ characters)" secureTextEntry
          placeholderTextColor="#ffffff77" style={st.input} autoComplete="new-password" textContentType="newPassword" onSubmitEditing={submit} />
      </View>
      {!!err && <Text style={st.err} accessibilityLiveRegion="polite">{err}</Text>}
      {!!note && <Text style={st.note} accessibilityLiveRegion="polite">{note}</Text>}
      <Button title="Show me my plan" onPress={submit} loading={busy} />
      <Text style={st.fine}>By continuing you agree to the Terms and Privacy Policy. I'll email you your plan and tips. Unsubscribe anytime.</Text>
    </>
  );
}

const st = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingTop: 8, paddingBottom: 4 },
  back: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  barBg: { flex: 1, height: 8, borderRadius: 4, backgroundColor: C.navy2, overflow: 'hidden' },
  barFg: { height: 8, borderRadius: 4, backgroundColor: C.red },
  count: { fontFamily: F.xbold, fontSize: 12, color: C.white, minWidth: 34, textAlign: 'right' },
  q: { fontFamily: F.black, fontSize: 28, lineHeight: 33, color: C.white, letterSpacing: -0.4 },
  sub: { fontFamily: F.semi, fontSize: 15, lineHeight: 22, color: C.white },
  kicker: { fontFamily: F.xbold, fontSize: 12, letterSpacing: 1.6, textTransform: 'uppercase', color: C.red2 },
  big: { fontFamily: F.black, fontSize: 64, lineHeight: 70, color: C.red2, letterSpacing: -1 },
  opt: { minHeight: 60, borderRadius: 16, borderWidth: 1.5, borderColor: C.line, backgroundColor: C.navy2, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  optOn: { borderColor: C.red, backgroundColor: 'rgba(226,67,59,0.12)' },
  optText: { fontFamily: F.xbold, fontSize: 16, color: C.white, flex: 1 },
  radio: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: C.line, alignItems: 'center', justifyContent: 'center' },
  box: { width: 24, height: 24, borderRadius: 7, borderWidth: 2, borderColor: C.line, alignItems: 'center', justifyContent: 'center' },
  radioOn: { backgroundColor: C.green, borderColor: C.green },
  field: { flex: 1, height: 72, borderRadius: 16, borderWidth: 1.5, borderColor: C.line, backgroundColor: C.navy2, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18 },
  fieldInput: { flex: 1, fontFamily: F.black, fontSize: 30, color: C.white, minWidth: 0 },
  unit: { fontFamily: F.xbold, fontSize: 16, color: C.white },
  input: { height: 56, borderRadius: 14, backgroundColor: C.navy2, borderWidth: 1, borderColor: C.line, color: C.white, fontFamily: F.semi, fontSize: 17, paddingHorizontal: 16 },
  err: { fontFamily: F.bold, fontSize: 14, color: C.red2 },
  note: { fontFamily: F.bold, fontSize: 14, color: C.green },
  fine: { fontFamily: F.medium, fontSize: 12, lineHeight: 17, color: C.white, textAlign: 'center' },
  chart: { backgroundColor: C.navy2, borderRadius: 20, borderWidth: 1, borderColor: C.line, paddingVertical: 8, alignItems: 'center' },
  tile: { flex: 1, backgroundColor: C.navy2, borderRadius: 16, borderWidth: 1, borderColor: C.line, padding: 12, gap: 2 },
  tileV: { fontFamily: F.black, fontSize: 20, color: C.white },
  tileL: { fontFamily: F.xbold, fontSize: 10, letterSpacing: 1.2, textTransform: 'uppercase', color: C.white },
});
