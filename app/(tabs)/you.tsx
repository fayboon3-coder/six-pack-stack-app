import React, { useCallback, useEffect, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle, Path } from 'react-native-svg';
import { useAuth } from '../../src/lib/auth';
import { C, F } from '../../src/lib/theme';
import NoPlan from '../../src/components/NoPlan';
import RemindersCard from '../../src/components/RemindersCard';
import { daysToSunday, PHOTO_WEEKS, weekOf } from '../../src/lib/program';
import { isoDate, loggedDays } from '../../src/lib/logs';
import { getStreak } from '../../src/lib/streak';
import { applyReminders, hasPermission, readPrefs } from '../../src/lib/reminders';
import { isFree } from '../../src/lib/access';

const LOGO = require('../../assets/logo-b.png');
const DOW = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

/** You: Days Stacked, upcoming check-in, nutrition targets, Stack Check, coaching and account. */
export default function You() {
  const { plan, profile, session, signOut, viewAs } = useAuth();
  const router = useRouter();
  const [weekDays, setWeekDays] = useState<string[]>([]);
  const [total, setTotal] = useState(0);

  const load = useCallback(async () => {
    if (!session || !plan) return;
    const sunday = new Date(); sunday.setDate(sunday.getDate() - sunday.getDay());
    const rows = await loggedDays(session.user.id, isoDate(sunday));
    setWeekDays([...new Set(rows.map((r: any) => String(r.logged_on || r.day_label)))]);
    getStreak(session.user.id, plan.train.d.length).then((s) => setTotal(s.workouts)).catch(() => {});
  }, [session, plan]);
  useFocusEffect(useCallback(() => { load(); }, [load]));
  useEffect(() => { if (plan && !viewAs) hasPermission().then((ok) => { if (ok) readPrefs().then((p) => applyReminders(plan, p, { free: isFree(profile) })); }); }, [plan?.train.s]);

  if (!plan) return <NoPlan name={profile?.first_name} />;
  const week = weekOf(plan.train.s);
  const toSun = daysToSunday();
  const sunday = new Date(); sunday.setDate(sunday.getDate() + toSun);
  const start = new Date(); start.setDate(start.getDate() - start.getDay() + 1);
  const days = Array.from({ length: 7 }, (_, k) => { const d = new Date(start); d.setDate(start.getDate() + k); return d; });
  const today = new Date().getDate();
  const range = `${days[0].toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${days[6].toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
  const stacked = weekDays.length;
  const photo = PHOTO_WEEKS.includes(week);

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <SafeAreaView edges={['top']} style={st.head}>
        <Text style={st.title} accessibilityRole="header">You</Text>
        <Pressable accessibilityRole="button" accessibilityLabel="Reminders and settings" onPress={() => router.push('/boon')} style={st.round}>
          <Svg width={20} height={20} viewBox="0 0 24 24"><Circle cx={12} cy={12} r={3} stroke={C.ink} strokeWidth={1.9} fill="none" /><Path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1L7 17M17 7l2.1-2.1" stroke={C.ink} strokeWidth={1.9} strokeLinecap="round" /></Svg>
        </Pressable>
      </SafeAreaView>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 130, gap: 12 }}>
        <Section title="Days Stacked">
          <View style={st.rowEnd}>
            <View><Text style={st.big2}>Current week</Text><Text style={st.small}>{range} · {total} stacked all-time</Text></View>
            <Text><Text style={st.score}>{stacked}</Text><Text style={st.of}>/{plan.train.d.length}</Text></Text>
          </View>
          <View style={st.tip}><Text style={st.tipI}>i</Text><Text style={st.tipT}>Hit {plan.steps || '8,000'} steps, today's workout and {plan.protein} g protein to stack today.</Text></View>
        </Section>

        <Section title="Upcoming check-ins">
          <View style={st.weekRow}>{days.map((d, k) => <Text key={k} style={st.dow}>{DOW[d.getDay()]}</Text>)}</View>
          <View style={st.weekRow}>{days.map((d, k) => {
            const isSun = d.getDay() === 0;
            return <View key={k} style={[st.dateBox, isSun && { backgroundColor: C.red }]}><Text style={[st.date, d.getDate() === today && !isSun && { color: C.red }, isSun && { color: C.onAccent }]}>{d.getDate()}</Text></View>;
          })}</View>
          <Pressable accessibilityRole="button" onPress={() => router.push('/checkin')} style={st.checkRow}>
            <View style={st.camera}><Svg width={20} height={20} viewBox="0 0 24 24"><Path d="M3 9a2 2 0 0 1 2-2h2l2-3h6l2 3h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" stroke={C.red} strokeWidth={2} fill="none" strokeLinejoin="round" /><Circle cx={12} cy={13.5} r={3.5} stroke={C.red} strokeWidth={2} fill="none" /></Svg></View>
            <View style={{ flex: 1 }}>
              <Text style={st.rowTitle}>{sunday.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}</Text>
              <Text style={st.small}>{toSun === 0 ? 'Today' : `In ${toSun} day${toSun > 1 ? 's' : ''}`}{photo ? ' · Photo week' : ''}</Text>
            </View>
            <Chevron />
          </Pressable>
        </Section>

        <Section title="Nutrition" onPress={() => router.push('/plan')}>
          <View style={{ flexDirection: 'row', gap: 18 }}>
            <View style={{ flex: 1 }}><Text style={st.small}>Calories target</Text><Text style={st.num}>{Number(plan.kcal).toLocaleString('en-US')}</Text></View>
            <View style={{ flex: 1 }}><Text style={st.small}>Protein target</Text><Text style={st.num}>{plan.protein} g</Text></View>
          </View>
        </Section>

        <Pressable accessibilityRole="button" onPress={() => router.push('/stack-check')} style={st.redCard}>
          <View style={{ flex: 1 }}>
            <Text style={[st.secT, { color: C.red }]}>STACK CHECK</Text>
            <Text style={st.rowTitle}>{plan.before && plan.after && plan.before > plan.after ? `You could save $${plan.before - plan.after} a month` : "Check what's worth buying"}</Text>
            <Text style={st.small}>See what's worth it and what's a waste</Text>
          </View>
          <Chevron />
        </Pressable>

        <Pressable accessibilityRole="button" onPress={() => router.push('/coaching')} style={st.card2}>
          <Image source={LOGO} style={{ width: 40, height: 40 }} />
          <View style={{ flex: 1 }}><Text style={st.rowTitle}>Want me in your corner?</Text><Text style={st.small}>See how 1:1 coaching works</Text></View>
          <Chevron />
        </Pressable>

        {profile?.role === 'coach' && (
          <Pressable accessibilityRole="button" onPress={() => router.push('/coach')} style={st.card2}>
            <View style={{ flex: 1 }}><Text style={st.rowTitle}>Coach dashboard</Text><Text style={st.small}>Your clients and check-ins</Text></View><Chevron />
          </Pressable>
        )}

        <RemindersCard compact />
        <Pressable accessibilityRole="button" onPress={signOut} style={st.ghost}><Text style={st.ghostT}>Sign out</Text></Pressable>
        {profile?.role !== 'coach' && <Text accessibilityRole="link" onPress={() => router.push('/delete-account')} style={st.legal}>Delete my account</Text>}
      </ScrollView>
    </View>
  );
}

const Chevron = () => <Svg width={16} height={16} viewBox="0 0 24 24"><Path d="M9 5l7 7-7 7" stroke={C.ink} strokeWidth={2.4} fill="none" strokeLinecap="round" strokeLinejoin="round" /></Svg>;

function Section({ title, children, onPress }: { title: string; children: React.ReactNode; onPress?: () => void }) {
  return (
    <View style={st.card}>
      <View style={st.secHead}>
        <Text style={st.secT}>{title.toUpperCase()}</Text>
        {!!onPress && <Pressable accessibilityRole="button" accessibilityLabel={`Open ${title}`} onPress={onPress} style={st.chev}><Svg width={13} height={13} viewBox="0 0 24 24"><Path d="M9 5l7 7-7 7" stroke={C.red} strokeWidth={2.8} fill="none" strokeLinecap="round" strokeLinejoin="round" /></Svg></Pressable>}
      </View>
      <View style={{ padding: 18, gap: 14 }}>{children}</View>
    </View>
  );
}

const st = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingBottom: 14, paddingTop: 8, borderBottomWidth: 1, borderBottomColor: C.line, backgroundColor: C.bg },
  title: { flex: 1, fontFamily: F.black, fontSize: 34, letterSpacing: -0.6, color: C.ink },
  round: { width: 44, height: 44, borderRadius: 22, borderWidth: 1.5, borderColor: '#d9dde7', alignItems: 'center', justifyContent: 'center' },
  card: { backgroundColor: C.card, borderWidth: 1, borderColor: C.line, borderRadius: 22, overflow: 'hidden' },
  secHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: C.line },
  secT: { fontFamily: F.bold, fontSize: 13, letterSpacing: 0.8, color: C.ink },
  chev: { width: 30, height: 30, borderRadius: 15, backgroundColor: '#e8eaf0', alignItems: 'center', justifyContent: 'center' },
  rowEnd: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
  big2: { fontFamily: F.xbold, fontSize: 22, color: C.ink },
  small: { fontFamily: F.medium, fontSize: 14, color: C.ink, marginTop: 2 },
  score: { fontFamily: F.black, fontSize: 42, color: C.ink },
  of: { fontFamily: F.semi, fontSize: 18, color: C.ink },
  tip: { flexDirection: 'row', gap: 10, alignItems: 'center', padding: 12, borderRadius: 12, backgroundColor: '#e7f6ee' },
  tipI: { width: 22, height: 22, borderRadius: 11, backgroundColor: '#1f9a63', color: C.onAccent, textAlign: 'center', lineHeight: 22, fontFamily: F.xbold, fontSize: 13, overflow: 'hidden' },
  tipT: { flex: 1, fontFamily: F.medium, fontSize: 14, lineHeight: 20, color: C.ink },
  weekRow: { flexDirection: 'row', justifyContent: 'space-between' },
  dow: { flex: 1, textAlign: 'center', fontFamily: F.semi, fontSize: 13, color: C.ink },
  dateBox: { flex: 1, maxWidth: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', marginHorizontal: 3 },
  date: { fontFamily: F.bold, fontSize: 17, color: C.ink },
  checkRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  camera: { width: 44, height: 44, borderRadius: 22, backgroundColor: C.redTint, alignItems: 'center', justifyContent: 'center' },
  rowTitle: { fontFamily: F.bold, fontSize: 17, color: C.ink },
  num: { fontFamily: F.xbold, fontSize: 26, color: C.ink, marginTop: 6 },
  redCard: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 18, borderRadius: 22, backgroundColor: C.redTint, borderWidth: 1, borderColor: '#f3c9c6' },
  card2: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 18, borderRadius: 22, backgroundColor: C.card, borderWidth: 1, borderColor: C.line },
  ghost: { height: 52, borderRadius: 26, borderWidth: 1.5, borderColor: '#d5d9e3', alignItems: 'center', justifyContent: 'center', marginTop: 8 },
  ghostT: { fontFamily: F.bold, fontSize: 17, color: C.ink },
  legal: { fontFamily: F.medium, fontSize: 13, color: C.ink, textAlign: 'center', textDecorationLine: 'underline', marginTop: 6 },
});
