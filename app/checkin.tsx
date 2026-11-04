import React, { useEffect, useState } from 'react';
import { Alert, Image, Pressable, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import Svg, { Path } from 'react-native-svg';
import { useAuth } from '../src/lib/auth';
import { supabase } from '../src/lib/supabase';
import { C, F } from '../src/lib/theme';
import { CheckIcon } from '../src/components/icons';
import { PHOTO_WEEKS, weekOf } from '../src/lib/program';
import { isCoached } from '../src/lib/access';
import { isPreviewing } from '../src/lib/preview';
import { autoReset, RESET_WEEKS } from '../src/lib/reset';
import { markCheckinDone } from '../src/lib/reminders';
import { track } from '../src/lib/track';
import { askForRatingAfterWin } from '../src/lib/rating';
import LoadingScreen from '../src/components/LoadingScreen';
import Page from '../src/components/Page';
import PageTitle from '../src/components/PageTitle';
import { isoDate, loggedDays } from '../src/lib/logs';
import { readDay } from '../src/lib/daily';

type Angle = 'front' | 'side' | 'back';

export default function CheckinScreen() {
  const { plan, session, profile, refresh } = useAuth();
  const router = useRouter();
  const week = weekOf(plan?.train.s);
  const photoWeek = PHOTO_WEEKS.includes(week);
  const nextPhoto = PHOTO_WEEKS.find((w) => w > week);
  const coached = isCoached(profile);
  const [weight, setWeight] = useState('');
  const [rating, setRating] = useState<number | null>(null);
  const [win, setWin] = useState('');
  const [questions, setQuestions] = useState('');
  const [shareWin, setShareWin] = useState(false);
  const [photos, setPhotos] = useState<Partial<Record<Angle, string>>>({});
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [newNums, setNewNums] = useState<{ kcal: string; protein: string; before: string } | null>(null);
  const [auto, setAuto] = useState<{ workouts: number | null; steps: number | null }>({ workouts: null, steps: null });

  // Workouts and steps fill in from what they logged this week, so the check-in stays 2 minutes.
  useEffect(() => {
    (async () => {
      const mon = new Date(); mon.setHours(12, 0, 0, 0); mon.setDate(mon.getDate() - ((mon.getDay() + 6) % 7));
      let steps: number[] = [];
      for (let k = 0; k < 7; k++) { const d = new Date(mon); d.setDate(mon.getDate() + k); const v = await readDay(isoDate(d)); if (v.steps > 0) steps.push(v.steps); }
      let workouts: number | null = null;
      if (session) {
        const rows = await Promise.race([loggedDays(session.user.id, isoDate(mon)).catch(() => null), new Promise<null>((r) => setTimeout(() => r(null), 4000))]);
        if (rows) workouts = new Set(rows.map((r: any) => String(r.logged_on))).size;
      }
      setAuto({ workouts, steps: steps.length ? Math.round(steps.reduce((a, b) => a + b, 0) / steps.length) : null });
    })();
  }, [session]);

  const pick = async (angle: Angle) => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    const res = perm.granted
      ? await ImagePicker.launchCameraAsync({ quality: 0.6 })
      : await ImagePicker.launchImageLibraryAsync({ quality: 0.6, mediaTypes: ['images'] });
    if (!res.canceled && res.assets[0]) setPhotos({ ...photos, [angle]: res.assets[0].uri });
  };

  const submit = async () => {
    if (!session) return;
    if (!weight) return Alert.alert('Add your weight first', 'Use your 7-day average. If you only weighed once, that works too.');
    if (isPreviewing()) { Alert.alert('Preview only', 'This is what they see. Nothing was saved.'); return router.back(); }
    setSaved(false);
    setBusy(true);
    const uid = session.user.id;
    const row: Record<string, any> = {
      user_id: uid, week, weight: Number(weight), steps: auto.steps, workouts: auto.workouts,
      adherence: rating, win: win || null, questions: questions || null, share_win: shareWin,
    };
    let res = await supabase.from('checkins').insert(row).select('id').single();
    // Older database without the adherence column: save everything else.
    if (res.error && /adherence/i.test(res.error.message || '')) { delete row.adherence; res = await supabase.from('checkins').insert(row).select('id').single(); }
    const { data, error } = res;
    if (error || !data) { setBusy(false); return Alert.alert('That didn\'t send', 'Check your signal and tap the button again. Nothing you typed is lost.'); }
    for (const [angle, uri] of Object.entries(photos) as [Angle, string][]) {
      const path = `${uid}/week${week}-${angle}-${Date.now()}.jpg`;
      const body = await (await fetch(uri)).arrayBuffer();
      const up = await supabase.storage.from('progress-photos').upload(path, body, { contentType: 'image/jpeg' });
      if (!up.error) await supabase.from('photos').insert({ user_id: uid, checkin_id: data.id, angle, path });
    }
    if (plan && profile) {
      const r = await autoReset(uid, profile, plan, week, Number(weight)).catch(() => null);
      if (r) { setNewNums(r); await refresh(); }
    }
    markCheckinDone(!coached).catch(() => {});
    track('checkin_done', { week });
    askForRatingAfterWin('checkin');
    setSaved(true);
  };
  const finish = () => {
    setBusy(false);
    Alert.alert('Got it. Nice work this week.', coached ? 'I\'ll go through everything and send your adjustments within 24 hours.'
      : newNums ? `Week ${week} re-set: your new numbers are ${newNums.kcal} calories and ${newNums.protein} g of protein a day (were ${newNums.before}). Your meals are updated.`
      : 'Your numbers are saved. Check the trend on your Progress tab.');
    router.back();
  };

  const footer = (
    <Pressable accessibilityRole="button" onPress={submit} disabled={busy} style={({ pressed }) => [st.cta, pressed && { opacity: 0.88 }]}>
      <Text style={st.ctaT}>{coached ? 'Send to Boon' : 'Save my check-in'}</Text>
    </Pressable>
  );

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <Page tabs={false} footer={footer} style={{ gap: 0 }}
        header={<PageTitle back title="Sunday check-in" sub={`Week ${week} · about 2 minutes`} size={26} />}>
        <Text style={st.label}>Weight (lbs)</Text>
        <TextInput accessibilityLabel="Weight in pounds" value={weight} onChangeText={(t) => setWeight(t.replace(/[^\d.]/g, ''))} keyboardType="decimal-pad"
          placeholder="7-day average" placeholderTextColor={C.muted} style={st.input} />

        {photoWeek ? (
          <>
            <Text style={[st.label, st.gap]}>Progress photos <Text style={{ fontFamily: F.medium }}>({coached ? 'only you and Boon see these' : 'only you see these'})</Text></Text>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              {(['front', 'side', 'back'] as Angle[]).map((a) => (
                <Pressable key={a} accessibilityRole="button" accessibilityLabel={`${photos[a] ? 'Retake' : 'Add'} ${a} photo`} onPress={() => pick(a)} style={st.photo}>
                  {photos[a]
                    ? <><Image source={{ uri: photos[a] }} style={StyleSheet.absoluteFill} /><View style={st.photoOk}><CheckIcon color="#fff" size={12} /></View></>
                    : <><Svg width={20} height={20} viewBox="0 0 24 24"><Path d="M12 5v14M5 12h14" stroke={C.red} strokeWidth={2.2} strokeLinecap="round" /></Svg><Text style={st.photoL}>{a[0].toUpperCase() + a.slice(1)}</Text></>}
                </Pressable>
              ))}
            </View>
          </>
        ) : (
          <Text style={[st.hint, st.gap]}>No photos this week. Next photo week: week {nextPhoto ?? 12}.</Text>
        )}

        <Text style={[st.label, st.gap]}>How closely did you follow the plan?</Text>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {[1, 2, 3, 4, 5].map((v) => (
            <Pressable key={v} accessibilityRole="radio" accessibilityState={{ selected: rating === v }} accessibilityLabel={`${v} of 5`} onPress={() => setRating(v)}
              style={[st.rate, rating === v && { backgroundColor: C.navy, borderColor: C.navy }]}>
              <Text style={[st.rateT, rating === v && { color: '#fff' }]}>{v}</Text>
            </Pressable>
          ))}
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 }}><Text style={st.end}>Barely</Text><Text style={st.end}>Nailed it</Text></View>

        <Text style={[st.label, st.gap]}>Biggest win this week</Text>
        <TextInput accessibilityLabel="Biggest win this week" value={win} onChangeText={setWin} placeholder="Ex. Hit my protein 6 of 7 days" placeholderTextColor={C.muted}
          style={st.input} multiline />
        {!!win && (
          <View style={st.share}>
            <Text style={[st.hint, { flex: 1 }]}>OK to share this win with your first name only?</Text>
            <Switch value={shareWin} onValueChange={setShareWin} trackColor={{ true: C.green, false: C.line }} accessibilityLabel="OK to share this win" />
          </View>
        )}

        {coached && (
          <>
            <Text style={[st.label, st.gap]}>Anything you want me to answer?</Text>
            <TextInput accessibilityLabel="Questions for Boon" value={questions} onChangeText={setQuestions} placeholder="Food swaps, a sore joint, a supplement you saw…"
              placeholderTextColor={C.muted} style={[st.input, { minHeight: 80 }]} multiline />
          </>
        )}
      </Page>
      {busy && (
        <LoadingScreen overlay
          title={coached ? 'Sending to| Boon' : 'Saving your| week'}
          sub={`Week ${week} check-in`}
          steps={[
            'Saving your numbers',
            ...(Object.keys(photos).length ? ['Uploading your progress photos'] : []),
            coached ? 'Sending it to Boon' : 'Updating your weight trend',
            ...(profile?.tier === 'self' && RESET_WEEKS.includes(week) ? [`Re-setting your calories for week ${week + 1}`] : []),
          ]}
          stepMs={550}
          done={saved}
          onFinish={finish}
        />
      )}
    </View>
  );
}

const st = StyleSheet.create({
  label: { fontFamily: F.bold, fontSize: 15, color: C.ink, marginBottom: 10 },
  gap: { marginTop: 22 },
  hint: { fontFamily: F.medium, fontSize: 13, lineHeight: 18, color: C.ink },
  input: { minHeight: 56, borderRadius: 14, backgroundColor: C.card, borderWidth: 1, borderColor: C.line, paddingHorizontal: 18, paddingVertical: 14, fontFamily: F.semi, fontSize: 18, color: C.ink, outlineWidth: 0 } as any,
  photo: { flex: 1, aspectRatio: 1, borderRadius: 14, borderWidth: 1.5, borderStyle: 'dashed', borderColor: '#cfd4de', backgroundColor: C.card, alignItems: 'center', justifyContent: 'center', gap: 10, overflow: 'hidden' },
  photoL: { fontFamily: F.semi, fontSize: 15, color: C.ink },
  photoOk: { position: 'absolute', top: 6, right: 6, width: 22, height: 22, borderRadius: 11, backgroundColor: C.green, alignItems: 'center', justifyContent: 'center' },
  rate: { flex: 1, height: 52, borderRadius: 14, borderWidth: 1.5, borderColor: '#d9dde7', backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center' },
  rateT: { fontFamily: F.bold, fontSize: 18, color: C.ink },
  end: { fontFamily: F.medium, fontSize: 12, color: C.ink },
  share: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 10 },
  cta: { flex: 1, height: 54, borderRadius: 27, backgroundColor: C.red, alignItems: 'center', justifyContent: 'center' },
  ctaT: { fontFamily: F.bold, fontSize: 18, color: C.onAccent },
});
