import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { readLead } from '../src/lib/lead';
import { useAuth } from '../src/lib/auth';
import { C, F } from '../src/lib/theme';
import { Button } from '../src/components/ui';
import { BackIcon, CheckIcon } from '../src/components/icons';
import { KIT_FORMS, kitForm } from '../src/lib/kit';
import Backdrop from '../src/components/Backdrop';

const START = ['This week', 'Within 2 weeks', 'Within a month', 'Just looking'];
const INVEST = ['Yes', 'Yes, with a payment plan', 'Not right now'];
const SPEND = ['Under $50', '$50–$100', '$100–$200', '$200+'];
const DAYS = ['0', '1–2', '3–4', '5+'];

/**
 * The coaching application, inside the app. It goes to the SAME Kit form as the
 * website (Six-Pack Stack Application), so Boon's alert, video and approval flow run unchanged.
 * Anything the quiz already asked is filled in.
 */
export default function Apply() {
  const { profile, session } = useAuth();
  const router = useRouter();
  const params = useLocalSearchParams<{ name?: string; email?: string; src?: string }>();
  const q = profile?.quiz || (params.src ? { src: params.src } : {});
  const quizStart = q.start_timing === 'Today' ? 'This week' : q.start_timing;
  const quizDays = q.days === '3 days' || q.days === '4 days' ? '3–4' : q.days === '5 days' || q.days === '6 days' ? '5+' : '';
  const [f, setF] = useState({
    name: profile?.first_name || q.first_name || params.name || '',
    email: profile?.email || session?.user.email || params.email || '',
    phone: '',
    age: q.age || '', height: q.height_ft ? `${q.height_ft}'${q.height_in || 0}"` : '', current_weight: q.weight || '',
    goal_12_weeks: '', cost_of_staying: '',
    monthly_spend: q.monthly_spend || '', train_days: quizDays,
    start_timing: START.includes(quizStart) ? quizStart : '', ready_to_invest: INVEST.includes(q.ready_to_invest) ? q.ready_to_invest : '',
    medical: '' as '' | 'No' | 'Yes', medicalText: '',
  });
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  // Came from the welcome screen without params (e.g. reopened): use the saved lead
  React.useEffect(() => {
    if (f.email) return;
    readLead().then((l) => { if (l) setF((x) => ({ ...x, name: x.name || l.first_name, email: x.email || l.email })); });
  }, []);
  const set = (k: keyof typeof f, v: string) => { setErr(''); setF((x) => ({ ...x, [k]: v })); };

  const submit = async () => {
    const need: [keyof typeof f, string][] = [['name', 'your first name'], ['email', 'your email'], ['phone', 'your phone number'], ['age', 'your age'],
      ['height', 'your height'], ['current_weight', 'your weight'], ['goal_12_weeks', 'your 12-week goal'], ['cost_of_staying', "what it's costing you"],
      ['monthly_spend', 'your monthly supplement spend'], ['train_days', 'how often you train'], ['start_timing', 'when you want to start'],
      ['ready_to_invest', 'whether you are ready to invest'], ['medical', 'the medical question']];
    const miss = need.find(([k]) => !String(f[k]).trim());
    if (miss) return setErr(`Add ${miss[1]}.`);
    if (f.medical === 'Yes' && f.medicalText.trim().length < 2) return setErr('Add a quick note about your condition, injury or medication.');
    setBusy(true);
    const ok = await kitForm(KIT_FORMS.application, f.email.trim().toLowerCase(), f.name.trim(), {
      phone: f.phone, age: f.age, height: f.height, current_weight: f.current_weight, goal_12_weeks: f.goal_12_weeks,
      cost_of_staying: f.cost_of_staying, tried_before: (q.tried || []).join(', '), monthly_spend: f.monthly_spend,
      train_days: f.train_days, start_timing: f.start_timing, ready_to_invest: f.ready_to_invest,
      medical: f.medical === 'Yes' ? `Yes: ${f.medicalText.trim()}` : 'No', lead_source: q.src ? `app:${q.src}` : 'app',
    });
    setBusy(false);
    if (!ok) return setErr("That didn't send. Check your connection and try again.");
    setDone(true);
  };

  if (done) {
    return (
      <SafeAreaView style={[st.wrap, { justifyContent: 'center', gap: 16 }]}>
        <View style={st.doneIcon}><CheckIcon size={30} /></View>
        <Text style={st.h}>Got it, {f.name.trim()}. Your application is in.</Text>
        <Text style={st.body}>I read every application myself, within 24 hours. Watch your inbox at {f.email.trim()}. If we're a fit, you'll get a short video I recorded for you and a link to claim your spot.</Text>
        <Text style={st.body}>Check your spam or promotions folder and move my email to your main inbox so you don't miss it.</Text>
        {session ? <Button title="Back to my plan" onPress={() => router.back()} />
          : <Button title="Get The Free Stack while you wait" onPress={() => router.replace('/quiz')} />}
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }}>
      <Backdrop />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ padding: 20, gap: 18, paddingBottom: 60 }} keyboardShouldPersistTaps="handled">
          <Pressable accessibilityRole="button" accessibilityLabel="Close" onPress={() => (router.canGoBack() ? router.back() : router.replace('/welcome'))} hitSlop={10} style={{ width: 40, height: 40, justifyContent: 'center' }}>
            <BackIcon />
          </Pressable>
          <Text style={st.k}>1:1 coaching application</Text>
          <Text style={st.h}>Let's see if we're a fit.</Text>
          <Text style={st.body}>About 2 minutes. I've filled in what you already told me.</Text>

          <In label="First name" v={f.name} on={(t) => set('name', t)} />
          <In label="Email" v={f.email} on={(t) => set('email', t)} kb="email-address" />
          <In label="Phone (for WhatsApp if we work together)" v={f.phone} on={(t) => set('phone', t)} kb="phone-pad" />
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <View style={{ flex: 1 }}><In label="Age" v={f.age} on={(t) => set('age', t)} kb="number-pad" /></View>
            <View style={{ flex: 1 }}><In label="Height" v={f.height} on={(t) => set('height', t)} ph={`5'10"`} /></View>
            <View style={{ flex: 1 }}><In label="Weight (lbs)" v={f.current_weight} on={(t) => set('current_weight', t)} kb="decimal-pad" /></View>
          </View>
          <In label="What do you want your body to look like in 12 weeks?" v={f.goal_12_weeks} on={(t) => set('goal_12_weeks', t)} multi ph="e.g. Lose my gut, see my top abs, fit into my old jeans" />
          <In label="What's it costing you to stay where you are?" v={f.cost_of_staying} on={(t) => set('cost_of_staying', t)} multi ph="Confidence, dating, energy, money… only I read this" />
          <Pick label="Monthly supplement spend" opts={SPEND} v={f.monthly_spend} on={(t) => set('monthly_spend', t)} />
          <Pick label="Days a week you train right now" opts={DAYS} v={f.train_days} on={(t) => set('train_days', t)} />
          <Pick label="How soon do you want to start?" opts={START} v={f.start_timing} on={(t) => set('start_timing', t)} />
          <Pick label="This is a premium 1:1 program. If we're a fit, are you ready to invest in yourself?" opts={INVEST} v={f.ready_to_invest} on={(t) => set('ready_to_invest', t)} />
          <Pick label="Any medical conditions, injuries or medications?" opts={['No', 'Yes']} v={f.medical} on={(t) => set('medical', t)} />
          {f.medical === 'Yes' && (
            <>
              <In label="Briefly, what is it?" v={f.medicalText} on={(t) => set('medicalText', t)} multi />
              <Text style={st.hint}>You'll need your doctor's OK before starting. I'll build your plan around their advice.</Text>
            </>
          )}
          {!!err && <Text style={st.err} accessibilityLiveRegion="polite">{err}</Text>}
          <Button title="Send my application" onPress={submit} loading={busy} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function In({ label, v, on, kb = 'default', multi, ph }: { label: string; v: string; on: (t: string) => void; kb?: any; multi?: boolean; ph?: string }) {
  return (
    <View style={{ gap: 8 }}>
      <Text style={st.label}>{label}</Text>
      <TextInput accessibilityLabel={label} value={v} onChangeText={on} keyboardType={kb} multiline={multi} placeholder={ph}
        placeholderTextColor="#ffffff66" autoCapitalize={kb === 'email-address' ? 'none' : 'sentences'}
        style={[st.input, multi && { height: 96, paddingTop: 14, textAlignVertical: 'top' }]} />
    </View>
  );
}

function Pick({ label, opts, v, on }: { label: string; opts: string[]; v: string; on: (t: string) => void }) {
  return (
    <View style={{ gap: 8 }}>
      <Text style={st.label}>{label}</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {opts.map((o) => (
          <Pressable key={o} accessibilityRole="radio" accessibilityState={{ selected: v === o }} onPress={() => on(o)} style={[st.chip, v === o && st.chipOn]}>
            <Text style={st.chipText}>{o}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: C.bg, padding: 24 },
  k: { fontFamily: F.xbold, fontSize: 12, letterSpacing: 1.6, textTransform: 'uppercase', color: C.red },
  h: { fontFamily: F.black, fontSize: 30, lineHeight: 34, color: C.ink, letterSpacing: -0.4 },
  body: { fontFamily: F.semi, fontSize: 15, lineHeight: 22, color: C.ink },
  label: { fontFamily: F.xbold, fontSize: 13, lineHeight: 18, color: C.ink },
  hint: { fontFamily: F.semi, fontSize: 13, lineHeight: 18, color: C.ink },
  input: { minHeight: 52, borderRadius: 14, backgroundColor: C.card, borderWidth: 1, borderColor: C.line, color: C.ink, fontFamily: F.semi, fontSize: 16, paddingHorizontal: 14 },
  chip: { minHeight: 44, borderRadius: 999, borderWidth: 1.5, borderColor: C.line, backgroundColor: C.card, paddingHorizontal: 16, justifyContent: 'center' },
  chipOn: { borderColor: C.red, backgroundColor: 'rgba(226,67,59,0.18)' },
  chipText: { fontFamily: F.bold, fontSize: 14, color: C.onAccent },
  err: { fontFamily: F.bold, fontSize: 14, color: C.red },
  doneIcon: { width: 64, height: 64, borderRadius: 32, backgroundColor: C.green, alignItems: 'center', justifyContent: 'center' },
});
