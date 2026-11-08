import React, { useEffect, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import Svg, { Path } from 'react-native-svg';
import { C, F } from '../src/lib/theme';
import Page from '../src/components/Page';
import PageTitle from '../src/components/PageTitle';
import Panel from '../src/components/Panel';
import { useAuth } from '../src/lib/auth';
import { allWeighIns, logWeight, removeWeight } from '../src/lib/body';
import { trendSeries, type TrendPoint } from '../src/lib/trend';
import { isoDate } from '../src/lib/logs';
import { health } from '../src/lib/health';
import { track } from '../src/lib/track';
import HealthCard from '../src/components/HealthCard';
import { applyReminders, askPermission, readPrefs, type ReminderPrefs } from '../src/lib/reminders';
import { isFree } from '../src/lib/access';
import { GoalPath } from '../src/components/charts';
import { pathWeights } from '../src/lib/program';

const DEMO = process.env.EXPO_PUBLIC_DEMO === '1';
const label = (iso: string) => iso === isoDate() ? 'Today' : new Date(iso + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

/** Morning weigh-in: one number, and the trend does the rest. */
export default function WeighIn() {
  const { session, plan, profile } = useAuth();
  const [prefs, setPrefs] = useState<ReminderPrefs | null>(null);
  useEffect(() => { if (Platform.OS !== 'web') readPrefs().then(setPrefs); }, []);
  const remindMe = async () => {
    if (!prefs || !(await askPermission())) return;
    const next = { ...prefs, weigh: true, weighHour: prefs.weighHour ?? 7 };
    setPrefs(next); await applyReminders(plan, next, { free: isFree(profile) }); track('reminder_on', { kind: 'weigh', where: 'weigh_in' });
  };
  const router = useRouter();
  const [series, setSeries] = useState<TrendPoint[]>([]);
  const [txt, setTxt] = useState('');
  const [saved, setSaved] = useState<{ t: number; prev: number | null } | null>(null);
  const [toHealth, setToHealth] = useState(false);

  const load = async () => {
    const s = trendSeries(await allWeighIns(DEMO ? undefined : session?.user.id));
    setSeries(s);
    const today = s.find((p) => p.date === isoDate());
    if (!txt) setTxt(today ? today.w.toFixed(1) : s.length ? s[s.length - 1].w.toFixed(1) : '');
  };
  useEffect(() => { load(); health.isOn().then(setToHealth); }, []);

  const w = Number(txt) || 0;
  const bump = (d: number) => setTxt((Math.max(0, (Number(txt) || 0) + d)).toFixed(1));
  const save = async () => {
    if (w < 60 || w > 700) return;
    const before = series.filter((p) => p.date < isoDate());
    const prev = before.length ? before[before.length - 1].t : null;
    await logWeight(w);
    track('weigh_in');
    const s = trendSeries(await allWeighIns(DEMO ? undefined : session?.user.id));
    setSeries(s);
    setSaved({ t: s.length ? s[s.length - 1].t : w, prev });
  };

  const recent = [...series].reverse().slice(0, 10);
  const footer = saved
    ? <Pressable accessibilityRole="button" onPress={() => (router.canGoBack() ? router.back() : router.replace('/progress'))} style={[st.cta, { backgroundColor: C.navy }]}><Text style={st.ctaT}>Done</Text></Pressable>
    : <Pressable accessibilityRole="button" disabled={w < 60} onPress={save} style={[st.cta, w < 60 && { opacity: 0.5 }]}><Text style={st.ctaT}>Save {w >= 60 ? `${w.toFixed(1)} lbs` : 'weight'}</Text></Pressable>;

  return (
    <Page tabs={false} footer={footer} header={<PageTitle close title="Weigh-in" sub="Before breakfast, after the bathroom" size={26} />}>
      <View style={st.card}>
        <Text style={st.k}>{label(isoDate()).toUpperCase()}</Text>
        <View style={st.row}>
          <Pressable accessibilityRole="button" accessibilityLabel="Minus 0.2" onPress={() => bump(-0.2)} style={st.step}><Svg width={18} height={18} viewBox="0 0 24 24"><Path d="M5 12h14" stroke={C.ink} strokeWidth={3} strokeLinecap="round" /></Svg></Pressable>
          <View style={{ alignItems: 'center', flex: 1, minWidth: 0 }}>
            <TextInput value={txt} onChangeText={(t) => { setSaved(null); setTxt(t.replace(/[^\d.]/g, '')); }} keyboardType="decimal-pad" style={st.big} accessibilityLabel="Weight in pounds" selectTextOnFocus placeholder="000.0" placeholderTextColor="#c3c8d4" maxLength={5} />
            <Text style={st.unit}>lbs</Text>
          </View>
          <Pressable accessibilityRole="button" accessibilityLabel="Plus 0.2" onPress={() => bump(0.2)} style={st.step}><Svg width={18} height={18} viewBox="0 0 24 24"><Path d="M12 5v14M5 12h14" stroke={C.ink} strokeWidth={3} strokeLinecap="round" /></Svg></Pressable>
        </View>
        {saved ? (
          <View style={st.result} accessibilityLiveRegion="polite">
            <Text style={st.resK}>SAVED · YOUR TREND</Text>
            <Text style={st.resV}>{saved.t.toFixed(1)} lbs</Text>
            <Text style={st.resS}>{saved.prev == null ? 'Your trend starts today. Keep weighing in and it gets sharper every day.'
              : saved.t < saved.prev - 0.05 ? `Down ${(saved.prev - saved.t).toFixed(1)} from yesterday's trend. The scale bounces; this line is the truth.`
              : saved.t > saved.prev + 0.05 ? `Up ${(saved.t - saved.prev).toFixed(1)} on the trend. Salt, carbs and sleep do that. Look at the week, not the day.`
              : 'Holding steady. One day never tells the story.'}</Text>
          </View>
        ) : (
          <Text style={st.hint}>The scale jumps 1–3 lbs from water and salt. Your trend smooths that out, so weigh in most mornings and don't sweat any one number.</Text>
        )}
        {toHealth && <Text style={st.hint}>Also saves to Apple Health.</Text>}
        {!!saved && !!prefs && !prefs.weigh && (
          <Pressable accessibilityRole="button" onPress={remindMe} style={st.remind}><Text style={st.remindT}>Remind me every morning at 7:00</Text></Pressable>
        )}
        {!!saved && !!prefs?.weigh && <Text style={st.hint}>Morning reminder is on.</Text>}
      </View>

      {!!plan && (() => {
        const { startW, goalW } = pathWeights(plan, profile?.quiz, series[0]?.w);
        if (!startW || !goalW) return null;
        return (
          <Panel title="Your 12-week path" right={`${Math.round(startW)} → ${Math.round(goalW)} lbs`}>
            <GoalPath startW={startW} goalW={goalW} startDate={plan.train.s} series={series} height={168} />
            <Text style={[st.hint, { marginTop: 10 }]}>{series.length ? 'Red is your trend. The dotted line is the plan. Stay close to it and you land on your goal.' : 'Every morning you weigh in adds a dot. Stay close to this line and you land on your goal.'}</Text>
          </Panel>
        );
      })()}

      <HealthCard />

      {!!recent.length && (
        <Panel title="Recent weigh-ins" right="Scale · Trend" bodyStyle={{ paddingVertical: 2 }}>
          {recent.map((p, k) => (
            <View key={p.date} style={[st.r, k < recent.length - 1 && st.line]}>
              <Text style={st.rD}>{label(p.date)}</Text>
              <Text style={st.rW}>{p.w.toFixed(1)}</Text>
              <Text style={st.rT}>{p.t.toFixed(1)}</Text>
              <Pressable accessibilityRole="button" accessibilityLabel={`Remove ${label(p.date)}`} hitSlop={8} onPress={async () => { await removeWeight(p.date); load(); }} style={st.x}>
                <Svg width={10} height={10} viewBox="0 0 24 24"><Path d="M6 6l12 12M18 6L6 18" stroke={C.ink} strokeWidth={3} strokeLinecap="round" /></Svg>
              </Pressable>
            </View>
          ))}
        </Panel>
      )}
    </Page>
  );
}

const st = StyleSheet.create({
  card: { backgroundColor: C.card, borderRadius: 22, borderWidth: 1, borderColor: C.line, padding: 20, gap: 12 },
  k: { fontFamily: F.bold, fontSize: 12, letterSpacing: 1, color: C.ink, textAlign: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  step: { width: 52, height: 52, borderRadius: 26, borderWidth: 1.5, borderColor: '#d5d9e3', backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center' },
  big: { fontFamily: F.black, fontSize: 64, letterSpacing: -2, color: C.ink, textAlign: 'center', width: '100%', padding: 0, outlineWidth: 0 } as any,
  unit: { fontFamily: F.bold, fontSize: 15, color: C.muted, marginTop: -4 },
  hint: { fontFamily: F.medium, fontSize: 13, lineHeight: 19, color: C.ink, textAlign: 'center' },
  result: { borderRadius: 16, backgroundColor: '#e7f6ee', padding: 14, alignItems: 'center', gap: 2 },
  resK: { fontFamily: F.bold, fontSize: 11, letterSpacing: 1, color: C.green },
  resV: { fontFamily: F.black, fontSize: 28, color: C.ink },
  resS: { fontFamily: F.medium, fontSize: 14, lineHeight: 20, color: C.ink, textAlign: 'center' },
  remind: { height: 46, borderRadius: 23, borderWidth: 1.5, borderColor: '#d5d9e3', alignItems: 'center', justifyContent: 'center', backgroundColor: C.bg },
  remindT: { fontFamily: F.bold, fontSize: 15, color: C.ink },
  cta: { flex: 1, height: 54, borderRadius: 27, backgroundColor: C.red, alignItems: 'center', justifyContent: 'center' },
  ctaT: { fontFamily: F.bold, fontSize: 18, color: '#fff' },
  r: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 11 },
  line: { borderBottomWidth: 1, borderBottomColor: '#e9ebf1' },
  rD: { flex: 1, fontFamily: F.medium, fontSize: 15, color: C.ink },
  rW: { width: 56, textAlign: 'right', fontFamily: F.medium, fontSize: 15, color: C.muted },
  rT: { width: 56, textAlign: 'right', fontFamily: F.bold, fontSize: 15, color: C.ink },
  x: { width: 26, height: 26, borderRadius: 13, backgroundColor: '#e8eaf0', alignItems: 'center', justifyContent: 'center', marginLeft: 4 },
});
