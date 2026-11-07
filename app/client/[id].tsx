import React, { useCallback, useState } from 'react';
import { Alert, Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { supabase } from '../../src/lib/supabase';
import { C, F } from '../../src/lib/theme';
import { Button } from '../../src/components/ui';
import { BackIcon, BoltIcon, DumbbellIcon, ForkIcon, ScaleIcon, TrophyIcon } from '../../src/components/icons';
import { plain } from '../../src/lib/program';
import Backdrop from '../../src/components/Backdrop';
import { sendPush } from '../../src/lib/push';
import { trendSeries, ratePerWeek } from '../../src/lib/trend';

type Checkin = {
  id: string; week: number; checkin_date: string; weight: number | null; waist: number | null; steps: number | null;
  workouts: number | null; nutrition_days: number | null; energy: number | null; hunger: number | null;
  win: string | null; hardest: string | null; questions: string | null; share_win: boolean | null; stronger?: string | null;
};
type Review = { id: string; week: number | null; body: string; created_at: string };

/** Coach view of one client: their numbers, every check-in with photos, and the weekly review box. */
export default function ClientDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [profile, setProfile] = useState<{ email: string | null; first_name: string | null; tier: string; push_token?: string | null } | null>(null);
  const [focus, setFocus] = useState('');
  const [trend, setTrend] = useState<{ t: number; rate: number | null; n: number } | null>(null);
  const [nudge, setNudge] = useState('');
  const [nudged, setNudged] = useState('');
  const [goal, setGoal] = useState('');
  const [checkins, setCheckins] = useState<Checkin[]>([]);
  const [photos, setPhotos] = useState<Record<string, { angle: string; url: string }[]>>({});
  const [reviews, setReviews] = useState<Review[]>([]);
  const [week, setWeek] = useState('');
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    const [{ data: p }, { data: pl }, { data: c }, { data: ph }, { data: r }] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', id).maybeSingle(),
      supabase.from('plans').select('data').eq('user_id', id).eq('active', true).limit(1).maybeSingle(),
      supabase.from('checkins').select('*').eq('user_id', id).order('checkin_date', { ascending: false }),
      supabase.from('photos').select('checkin_id,angle,path').eq('user_id', id),
      supabase.from('coach_reviews').select('id,week,body,created_at').eq('user_id', id).order('created_at', { ascending: false }),
    ]);
    setProfile(p as any); setGoal(plain((pl?.data as any)?.goal_short || ''));
    const cs = (c as Checkin[]) || []; setCheckins(cs); setReviews((r as Review[]) || []);
    if (cs[0] && !week) setWeek(String(cs[0].week));
    // Daily weigh-ins (needs 009): trend weight and weekly pace
    const { data: ds } = await supabase.from('daily_stats').select('day,weight').eq('user_id', id).not('weight', 'is', null).order('day', { ascending: true }).limit(200);
    const pts = [...cs.filter((c) => c.weight != null).map((c) => ({ date: c.checkin_date, w: Number(c.weight) })), ...((ds as any[]) || []).map((d) => ({ date: d.day, w: Number(d.weight) }))];
    const byDay: Record<string, number> = {}; pts.forEach((p) => { byDay[p.date] = p.w; });
    const series = trendSeries(Object.entries(byDay).map(([date, w]) => ({ date, w })));
    setTrend(series.length ? { t: series[series.length - 1].t, rate: ratePerWeek(series, 21), n: series.length } : null);
    const rows = (ph as { checkin_id: string; angle: string; path: string }[]) || [];
    if (rows.length) {
      const { data: signed } = await supabase.storage.from('progress-photos').createSignedUrls(rows.map((x) => x.path), 3600);
      const map: Record<string, { angle: string; url: string }[]> = {};
      rows.forEach((x, k) => { const u = signed?.[k]?.signedUrl; if (u) (map[x.checkin_id] ||= []).push({ angle: x.angle, url: u }); });
      setPhotos(map);
    }
  }, [id, week]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const send = async () => {
    if (!body.trim()) return Alert.alert('Write the review first');
    setBusy(true);
    const row: Record<string, any> = { user_id: id, week: week ? Number(week) : null, body: body.trim(), focus: focus.trim() || null };
    let { error } = await supabase.from('coach_reviews').insert(row);
    // Database without the focus column yet (009 not run): put the focus line in the review itself.
    if (error && /focus/i.test(error.message || '')) {
      delete row.focus; if (focus.trim()) row.body = `${row.body}\n\nOne thing this week: ${focus.trim()}`;
      ({ error } = await supabase.from('coach_reviews').insert(row));
    }
    setBusy(false);
    if (error) return Alert.alert('Didn\'t save', error.message);
    if (profile?.push_token) sendPush(profile.push_token, 'Boon reviewed your week', focus.trim() ? `Your one thing: ${focus.trim()}` : 'Open the app to read it.').catch(() => {});
    setBody(''); setFocus(''); load();
    Alert.alert('Sent', 'It shows on their Boon tab now.');
  };

  const weights = [...checkins].reverse().filter((c) => c.weight != null).map((c) => Number(c.weight));
  const change = weights.length > 1 ? weights[weights.length - 1] - weights[0] : null;
  const name = profile?.first_name || profile?.email || 'Client';

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }}>
      <Backdrop />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ padding: 20, gap: 14, paddingBottom: 48 }} keyboardShouldPersistTaps="handled">
          <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={() => router.back()} style={st.back}><BackIcon /></Pressable>
          <Text style={st.kicker}>{profile?.tier === 'coached' ? 'Coaching client' : profile?.tier || ''}</Text>
          <Text style={st.title}>{name}</Text>
          {!!profile?.email && <Text style={st.meta}>{profile.email}</Text>}
          {!!goal && <Text style={st.goal}>{goal}</Text>}
          <View style={st.stats}>
            <Stat label="Check-ins" value={String(checkins.length)} />
            <Stat label="Latest" value={weights.length ? `${weights[weights.length - 1]}` : '–'} />
            <Stat label="Change" value={change != null ? `${change > 0 ? '+' : ''}${change.toFixed(1)}` : '–'} tone={change != null && change < 0 ? C.green : undefined} />
          </View>

          {!!trend && (
            <View style={st.card}>
              <Text style={st.label}>Trend weight (daily weigh-ins)</Text>
              <Text style={st.cardTitle}>{trend.t.toFixed(1)} lbs{trend.rate != null ? `  ·  ${trend.rate > 0 ? '+' : ''}${trend.rate.toFixed(1)} lbs/week` : ''}</Text>
              <Text style={st.meta}>{trend.n} weigh-ins. Smoothed, so one salty dinner doesn't fool you.</Text>
            </View>
          )}

          <View style={st.card}>
            <Text style={st.cardTitle}>Write this week's review</Text>
            <Text style={st.meta}>Shows on their coach home. What's working, the one thing to change, and their focus for next week.</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Text style={st.label}>Week</Text>
              <TextInput value={week} onChangeText={(t) => setWeek(t.replace(/\D/g, ''))} keyboardType="number-pad" style={[st.input, { width: 70, textAlign: 'center' }]} accessibilityLabel="Review week" />
            </View>
            <TextInput value={body} onChangeText={setBody} multiline placeholder={`${name.split(' ')[0]}, big week…`} placeholderTextColor="#1b244066"
              style={[st.input, { minHeight: 140, textAlignVertical: 'top', paddingTop: 12 }]} accessibilityLabel="Review text" />
            <Text style={st.label}>Their one thing this week</Text>
            <TextInput value={focus} onChangeText={setFocus} placeholder="Ex. Protein at breakfast, every day" placeholderTextColor="#1b244066"
              style={st.input} accessibilityLabel="Focus for this week" />
            <Text style={st.meta}>Shows big on their coach home and in their next check-in.{profile?.push_token ? ' They get a notification when you send.' : ''}</Text>
            <Button title={busy ? 'Sending…' : 'Send review'} onPress={send} loading={busy} />
          </View>

          {!!profile?.push_token && (
            <View style={st.card}>
              <Text style={st.cardTitle}>Send a nudge</Text>
              <Text style={st.meta}>Goes straight to their phone as a notification from the app.</Text>
              <TextInput value={nudge} onChangeText={setNudge} placeholder="Big day today. Hit your protein and send me a pic of dinner." placeholderTextColor="#1b244066"
                style={[st.input, { height: 70, textAlignVertical: 'top', paddingTop: 10 }]} multiline accessibilityLabel="Nudge text" />
              <Button title={nudged || 'Send nudge'} onPress={async () => {
                if (!nudge.trim()) return;
                const ok = await sendPush(profile.push_token!, 'Boon', nudge.trim());
                setNudged(ok ? 'Sent' : "Didn't send"); if (ok) setNudge(''); setTimeout(() => setNudged(''), 2500);
              }} />
            </View>
          )}

          <Text style={st.section}>Check-ins</Text>
          {checkins.length === 0 && <Text style={st.meta}>No check-ins yet.</Text>}
          {checkins.map((c) => {
            const reviewed = reviews.some((r) => r.week === c.week);
            return (
              <View key={c.id} style={[st.card, !reviewed && { borderColor: C.red }]}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={st.cardTitle}>Week {c.week}</Text>
                  <Text style={[st.meta, { color: reviewed ? C.green : C.red }]}>{reviewed ? 'Reviewed' : 'Needs review'} · {c.checkin_date}</Text>
                </View>
                <View style={st.iconRow}>
                  <Item icon={<ScaleIcon color={C.red} size={15} />} text={`${c.weight ?? '–'} lbs`} />
                  <Item icon={<DumbbellIcon color={C.red} size={15} />} text={`${c.workouts ?? '–'} workouts`} />
                  <Item icon={<ForkIcon color={C.red} size={15} />} text={`${c.nutrition_days ?? '–'}/7 food`} />
                  <Item icon={<BoltIcon color={C.red} size={15} />} text={`${c.energy ?? '–'}/10`} />
                </View>
                <Text style={st.meta}>Waist {c.waist ?? '–'} in · Steps {c.steps ?? '–'} · Hunger {c.hunger ?? '–'}/10</Text>
                {!!c.win && <View style={st.win}><TrophyIcon color={C.green} size={15} /><Text style={st.body}>{c.win}{c.share_win ? '  (OK to share)' : ''}</Text></View>}
                {!!c.stronger && <Text style={st.body}><Text style={st.bold}>Last week's focus: </Text>{c.stronger}</Text>}
                {!!c.hardest && <Text style={st.body}><Text style={st.bold}>Hardest: </Text>{c.hardest}</Text>}
                {!!c.questions && <Text style={st.body}><Text style={st.bold}>Asks: </Text>{c.questions}</Text>}
                {!!photos[c.id]?.length && (
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    {photos[c.id].map((p) => <Image key={p.url} source={{ uri: p.url }} style={st.photo} accessibilityLabel={`${p.angle} photo`} />)}
                  </View>
                )}
              </View>
            );
          })}

          {reviews.length > 0 && <Text style={st.section}>Reviews sent</Text>}
          {reviews.map((r) => (
            <View key={r.id} style={st.card}>
              <Text style={st.label}>Week {r.week ?? '–'} · {new Date(r.created_at).toLocaleDateString()}</Text>
              <Text style={st.body}>{r.body}</Text>
            </View>
          ))}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const Stat = ({ label, value, tone }: { label: string; value: string; tone?: string }) => (
  <View style={st.stat}><Text style={st.label}>{label}</Text><Text style={[st.statValue, tone ? { color: tone } : null]}>{value}</Text></View>
);
const Item = ({ icon, text }: { icon: React.ReactNode; text: string }) => (
  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>{icon}<Text style={st.itemText}>{text}</Text></View>
);

const st = StyleSheet.create({
  back: { width: 44, height: 44, borderRadius: 22, backgroundColor: C.card, alignItems: 'center', justifyContent: 'center' },
  kicker: { fontFamily: F.xbold, fontSize: 12, letterSpacing: 1.6, textTransform: 'uppercase', color: C.red },
  title: { fontFamily: F.black, fontSize: 30, lineHeight: 34, color: C.ink },
  goal: { fontFamily: F.black, fontSize: 15, color: C.green, textTransform: 'uppercase' },
  stats: { flexDirection: 'row', gap: 10 },
  stat: { flex: 1, backgroundColor: C.card, borderWidth: 1, borderColor: C.line, borderRadius: 16, padding: 12, gap: 4 },
  statValue: { fontFamily: F.black, fontSize: 22, color: C.ink },
  card: { backgroundColor: C.card, borderWidth: 1, borderColor: C.line, borderRadius: 20, padding: 16, gap: 10 },
  cardTitle: { fontFamily: F.black, fontSize: 18, color: C.ink },
  section: { fontFamily: F.black, fontSize: 20, color: C.ink, marginTop: 6 },
  label: { fontFamily: F.xbold, fontSize: 11, letterSpacing: 1.2, textTransform: 'uppercase', color: C.ink },
  meta: { fontFamily: F.semi, fontSize: 12, lineHeight: 17, color: C.ink },
  body: { fontFamily: F.semi, fontSize: 14, lineHeight: 20, color: C.ink, flex: 1 },
  bold: { fontFamily: F.black },
  input: { borderRadius: 12, borderWidth: 1, borderColor: C.line, backgroundColor: C.bg, color: C.ink, fontFamily: F.semi, fontSize: 15, paddingHorizontal: 12, height: 46 },
  iconRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
  itemText: { fontFamily: F.xbold, fontSize: 13, color: C.ink },
  win: { flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
  photo: { flex: 1, aspectRatio: 3 / 4, borderRadius: 10, backgroundColor: C.bg },
});
