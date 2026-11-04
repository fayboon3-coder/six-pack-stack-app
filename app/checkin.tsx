import React, { useState } from 'react';
import { Alert, Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../src/lib/auth';
import { supabase } from '../src/lib/supabase';
import { C, F } from '../src/lib/theme';
import { Button } from '../src/components/ui';
import {
  BackIcon, BoltIcon, CameraIcon, CheckIcon, DumbbellIcon, ForkIcon, HungerIcon, MountainIcon,
  QuestionIcon, RulerIcon, ScaleIcon, ShieldIcon, StepsIcon, TrophyIcon,
} from '../src/components/icons';
import { PHOTO_WEEKS, weekOf } from '../src/lib/program';
import { isCoached } from '../src/lib/access';
import { isPreviewing } from '../src/lib/preview';
import { autoReset, RESET_WEEKS } from '../src/lib/reset';
import { markCheckinDone } from '../src/lib/reminders';
import { track } from '../src/lib/track';
import { askForRatingAfterWin } from '../src/lib/rating';
import Backdrop from '../src/components/Backdrop';
import LoadingScreen from '../src/components/LoadingScreen';
import { twoTone } from '../src/components/TwoTone';

const HERO = require('../assets/hero/checkin.jpg');
type Angle = 'front' | 'side' | 'back';

/** Icon in a soft red circle, used for every row so the page scans at a glance. */
const Badge = ({ children, done }: { children: React.ReactNode; done?: boolean }) => (
  <View style={[st.badge, done && { backgroundColor: 'rgba(63,191,127,0.18)', borderColor: C.green }]}>{children}</View>
);

function Section({ n, title, sub, done, children }: { n: number; title: string; sub: string; done: boolean; children: React.ReactNode }) {
  return (
    <View style={st.section}>
      <View style={st.sectionHead}>
        <View style={[st.step, done && { backgroundColor: C.green, borderColor: C.green }]}>
          {done ? <CheckIcon size={14} /> : <Text style={st.stepText}>{n}</Text>}
        </View>
        <View style={{ flex: 1 }}>
          <Text style={st.sectionTitle} accessibilityRole="header">{title}</Text>
          <Text style={st.sectionSub}>{sub}</Text>
        </View>
      </View>
      <View style={{ gap: 16 }}>{children}</View>
    </View>
  );
}

function NumberRow({ icon, label, hint, unit, value, onChange, kb = 'decimal-pad', placeholder }: {
  icon: React.ReactNode; label: string; hint: string; unit: string; value: string; onChange: (t: string) => void;
  kb?: 'decimal-pad' | 'number-pad'; placeholder: string;
}) {
  return (
    <View style={st.row}>
      <Badge done={!!value}>{icon}</Badge>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={st.rowLabel}>{label}</Text>
        <Text style={st.rowHint}>{hint}</Text>
      </View>
      <View style={st.numBox}>
        <TextInput accessibilityLabel={`${label} in ${unit}`} value={value} onChangeText={onChange} keyboardType={kb}
          placeholder={placeholder} placeholderTextColor="#ffffff66" style={st.numInput} />
        <Text style={st.unit}>{unit}</Text>
      </View>
    </View>
  );
}

function Scale({ icon, label, n, from = 0, value, onChange, low, high }: {
  icon: React.ReactNode; label: string; n: number; from?: number; value: number | null; onChange: (v: number) => void; low?: string; high?: string;
}) {
  return (
    <View style={{ gap: 10 }}>
      <View style={[st.row, { alignItems: 'center' }]}>
        <Badge done={value !== null}>{icon}</Badge>
        <Text style={[st.rowLabel, { flex: 1 }]}>{label}</Text>
        {value !== null && <Text style={st.picked}>{value}{from === 1 ? '/10' : ''}</Text>}
      </View>
      <View style={st.chips}>
        {Array.from({ length: n - from + 1 }, (_, k) => k + from).map((v) => (
          <Pressable key={v} accessibilityRole="radio" accessibilityState={{ selected: value === v }} accessibilityLabel={`${label}: ${v}`}
            onPress={() => onChange(v)} style={[st.chip, value === v && st.chipOn]}>
            <Text style={st.chipText}>{v}</Text>
          </Pressable>
        ))}
      </View>
      {!!low && <View style={st.ends}><Text style={st.endText}>{low}</Text><Text style={st.endText}>{high}</Text></View>}
    </View>
  );
}

function Note({ icon, label, value, onChange, placeholder }: {
  icon: React.ReactNode; label: string; value: string; onChange: (t: string) => void; placeholder: string;
}) {
  return (
    <View style={{ gap: 10 }}>
      <View style={[st.row, { alignItems: 'center' }]}>
        <Badge done={!!value}>{icon}</Badge>
        <Text style={st.rowLabel}>{label}</Text>
      </View>
      <TextInput accessibilityLabel={label} value={value} onChangeText={onChange} placeholder={placeholder}
        placeholderTextColor="#ffffff66" multiline style={st.note} />
    </View>
  );
}

export default function CheckinScreen() {
  const { plan, session, profile, refresh } = useAuth();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const week = weekOf(plan?.train.s);
  const photoWeek = PHOTO_WEEKS.includes(week);
  const nextPhoto = PHOTO_WEEKS.find((w) => w > week);
  const nDays = plan?.train.d.length || 4;
  const name = plan?.name || profile?.first_name || '';
  const [weight, setWeight] = useState('');
  const [waist, setWaist] = useState('');
  const [steps, setSteps] = useState('');
  const [workouts, setWorkouts] = useState<number | null>(null);
  const [nutrition, setNutrition] = useState<number | null>(null);
  const [energy, setEnergy] = useState<number | null>(null);
  const [hunger, setHunger] = useState<number | null>(null);
  const [win, setWin] = useState('');
  const [hardest, setHardest] = useState('');
  const [questions, setQuestions] = useState('');
  const [shareWin, setShareWin] = useState(false);
  const [photos, setPhotos] = useState<Partial<Record<Angle, string>>>({});
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [newNums, setNewNums] = useState<{ kcal: string; protein: string; before: string } | null>(null);

  const done = {
    numbers: !!weight,
    photos: !photoWeek || Object.keys(photos).length === 3,
    week: workouts !== null && nutrition !== null && energy !== null && hunger !== null,
    talk: !!win,
  };
  const doneCount = Object.values(done).filter(Boolean).length;

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
    const { data, error } = await supabase.from('checkins').insert({
      user_id: uid, week, weight: Number(weight), waist: waist ? Number(waist) : null, steps: steps ? Number(steps) : null,
      workouts, nutrition_days: nutrition, energy, hunger, win: win || null, hardest: hardest || null,
      questions: questions || null, share_win: shareWin,
    }).select('id').single();
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
    markCheckinDone(!isCoached(profile)).catch(() => {});
    track('checkin_done', { week });
    askForRatingAfterWin('checkin');
    setSaved(true);
  };
  const finish = () => {
    setBusy(false);
    Alert.alert('Got it. Nice work this week.', isCoached(profile) ? 'I\'ll go through everything and send your adjustments within 24 hours.'
      : newNums ? `Week ${week} re-set: your new numbers are ${newNums.kcal} calories and ${newNums.protein} g of protein a day (were ${newNums.before}). Your meals are updated.`
      : 'Your numbers are saved. Check the trend on your Progress tab.');
    router.back();
  };

  const hw = Math.min(width, 640);
  const hh = Math.round(hw * 0.92);

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <Backdrop />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ paddingBottom: 48 }} keyboardShouldPersistTaps="handled">
          {/* Hero photo */}
          <View style={{ width: hw, height: hh, alignSelf: 'center' }}>
            <Image source={HERO} style={{ width: hw, height: hh }} resizeMode="cover" accessibilityIgnoresInvertColors />
            <LinearGradient colors={['rgba(13,27,51,0.5)', 'rgba(13,27,51,0)', 'rgba(13,27,51,0.55)', C.bg]} locations={[0, 0.25, 0.62, 1]}
              style={{ position: 'absolute', left: 0, top: 0, width: hw, height: hh }} />
            <SafeAreaView edges={['top']} style={{ position: 'absolute', left: 12, top: 4 }}>
              <Pressable accessibilityRole="button" accessibilityLabel="Close" onPress={() => router.back()} style={st.close}><BackIcon /></Pressable>
            </SafeAreaView>
            <View style={st.heroText}>
              <View style={st.pills}>
                <View style={st.pill}><Text style={st.pillText}>Week {week} of 12</Text></View>
                {photoWeek && <View style={[st.pill, { backgroundColor: C.green }]}><CameraIcon size={12} color={C.bg} /><Text style={[st.pillText, { color: C.bg }]}>Photo week</Text></View>}
              </View>
              <Text style={st.title} accessibilityRole="header">{twoTone('Sunday| Check-in')}</Text>
              <Text style={st.lede}>{name ? `${name}, this` : 'This'} takes 2 minutes. {!isCoached(profile) ? 'Your numbers build your trend on the Progress tab, so you can see exactly what is working.' : 'I read every answer myself and send your adjustments within 24 hours.'}</Text>
            </View>
          </View>

          {/* Progress through the 4 parts */}
          <View style={st.progress}>
            <View style={st.track}><View style={[st.fill, { width: `${(doneCount / 4) * 100}%` }]} /></View>
            <Text style={st.progressText}>{doneCount} of 4 done</Text>
          </View>

          <View style={{ paddingHorizontal: 20, gap: 16 }}>
            <Section n={1} title="Your numbers" sub="Weigh in each morning after the bathroom. Send the average." done={done.numbers}>
              <NumberRow icon={<ScaleIcon color={C.red} />} label="Weight" hint="7-day average" unit="lbs" placeholder="196.4"
                value={weight} onChange={(t) => setWeight(t.replace(/[^\d.]/g, ''))} />
              <NumberRow icon={<RulerIcon color={C.red} />} label="Waist" hint="At the belly button" unit="in" placeholder="34.5"
                value={waist} onChange={(t) => setWaist(t.replace(/[^\d.]/g, ''))} />
              <NumberRow icon={<StepsIcon color={C.red} />} label="Steps" hint="Daily average" unit="/day" placeholder="8,000" kb="number-pad"
                value={steps} onChange={(t) => setSteps(t.replace(/\D/g, ''))} />
            </Section>

            {photoWeek ? (
              <Section n={2} title="Progress photos" sub="Front, side and back. Same spot, same light, same time of day." done={done.photos}>
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  {(['front', 'side', 'back'] as Angle[]).map((a) => (
                    <Pressable key={a} accessibilityRole="button" accessibilityLabel={`${photos[a] ? 'Retake' : 'Add'} ${a} photo`} onPress={() => pick(a)} style={st.photo}>
                      {photos[a]
                        ? <><Image source={{ uri: photos[a] }} style={{ position: 'absolute', left: 0, top: 0, right: 0, bottom: 0 }} /><View style={st.photoOk}><CheckIcon size={12} /></View></>
                        : <><View style={st.camera}><CameraIcon color={C.ink} size={20} /></View><Text style={st.photoLabel}>{a[0].toUpperCase() + a.slice(1)}</Text></>}
                    </Pressable>
                  ))}
                </View>
                <View style={st.private}><ShieldIcon color={C.green} /><Text style={st.privateText}>{!isCoached(profile) ? 'Private. Only you can see these.' : 'Private. Only you and Boon can see these.'}</Text></View>
              </Section>
            ) : (
              <View style={st.nextPhoto}>
                <Badge><CameraIcon color={C.red} /></Badge>
                <Text style={[st.rowHint, { flex: 1 }]}>No photos this week. Next photo week: <Text style={{ fontFamily: F.black }}>week {nextPhoto ?? 12}</Text>.</Text>
              </View>
            )}

            <Section n={photoWeek ? 3 : 2} title="Your week" sub={isCoached(profile) ? 'Be honest. A rough week tells me exactly what to fix.' : 'Be honest. A rough week shows you exactly what to fix.'} done={done.week}>
              <Scale icon={<DumbbellIcon color={C.red} size={18} />} label="Workouts done" n={nDays} value={workouts} onChange={setWorkouts} />
              <Scale icon={<ForkIcon color={C.red} />} label="Days you hit your food" n={7} value={nutrition} onChange={setNutrition} />
              <Scale icon={<BoltIcon color={C.red} />} label="Energy" n={10} from={1} value={energy} onChange={setEnergy} low="Drained" high="Fired up" />
              <Scale icon={<HungerIcon color={C.red} />} label="Hunger" n={10} from={1} value={hunger} onChange={setHunger} low="Full all week" high="Starving" />
            </Section>

            <Section n={photoWeek ? 4 : 3} title={!isCoached(profile) ? "Your notes" : "Talk to me"} sub={!isCoached(profile) ? "Writing it down is how you spot what works." : "This is where I learn what to change for you."} done={done.talk}>
              <Note icon={<TrophyIcon color={C.red} />} label="Your win this week" value={win} onChange={setWin}
                placeholder="Big or small. Hit every workout, skipped the drive-thru, slept 8 hours…" />
              <View style={st.shareRow}>
                <Text style={[st.rowHint, { flex: 1 }]}>OK to share this win with your first name only?</Text>
                <Switch value={shareWin} onValueChange={setShareWin} trackColor={{ true: C.green, false: C.line }} accessibilityLabel="OK to share this win" />
              </View>
              <Note icon={<MountainIcon color={C.red} />} label="What was hardest?" value={hardest} onChange={setHardest}
                placeholder="Weekends, late-night snacking, getting to the gym…" />
              {!!isCoached(profile) && <Note icon={<QuestionIcon color={C.red} />} label="Anything you want me to answer?" value={questions} onChange={setQuestions}
                placeholder="Food swaps, a sore joint, a supplement you saw online…" />}
            </Section>

            <Button title={busy ? 'Saving…' : !isCoached(profile) ? 'Save my check-in' : 'Send to Boon'} onPress={submit} loading={busy} />
            {!!isCoached(profile) && <Text style={st.footer}>Questions before Sunday? Text me on WhatsApp anytime: (323) 229-0609</Text>}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
      {busy && (
        <LoadingScreen overlay
          title={isCoached(profile) ? 'Sending to| Boon' : 'Saving your| week'}
          sub={`Week ${week} check-in`}
          steps={[
            'Saving your numbers',
            ...(Object.keys(photos).length ? ['Uploading your progress photos'] : []),
            isCoached(profile) ? 'Sending it to Boon' : 'Updating your weight trend',
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
  close: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(13,27,51,0.75)', alignItems: 'center', justifyContent: 'center' },
  heroText: { position: 'absolute', left: 20, right: 20, bottom: 6, gap: 8 },
  pills: { flexDirection: 'row', gap: 8 },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: C.red, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 },
  pillText: { fontFamily: F.black, fontSize: 11, letterSpacing: 1.2, textTransform: 'uppercase', color: C.onAccent },
  title: { fontFamily: F.black, fontSize: 30, lineHeight: 34, color: C.ink, letterSpacing: -0.8, textTransform: 'uppercase' },
  lede: { fontFamily: F.semi, fontSize: 15, lineHeight: 21, color: C.ink },
  progress: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingVertical: 16 },
  track: { flex: 1, height: 8, borderRadius: 4, backgroundColor: C.card, overflow: 'hidden' },
  fill: { height: 8, borderRadius: 4, backgroundColor: C.green },
  progressText: { fontFamily: F.xbold, fontSize: 12, color: C.ink },
  section: { backgroundColor: C.card, borderWidth: 1, borderColor: C.line, borderRadius: 22, padding: 16, gap: 18 },
  sectionHead: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  step: { width: 30, height: 30, borderRadius: 15, borderWidth: 2, borderColor: C.red, alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  stepText: { fontFamily: F.black, fontSize: 13, color: C.ink },
  sectionTitle: { fontFamily: F.black, fontSize: 20, color: C.ink },
  sectionSub: { fontFamily: F.semi, fontSize: 13, lineHeight: 18, color: C.ink, marginTop: 2 },
  badge: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(226,67,59,0.14)', borderWidth: 1, borderColor: 'rgba(226,67,59,0.45)', alignItems: 'center', justifyContent: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  rowLabel: { fontFamily: F.xbold, fontSize: 15, color: C.ink },
  rowHint: { fontFamily: F.semi, fontSize: 12, lineHeight: 17, color: C.ink },
  numBox: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: C.bg, borderWidth: 1, borderColor: C.line, borderRadius: 12, paddingHorizontal: 12, height: 50, width: 132 },
  numInput: { flex: 1, minWidth: 0, color: C.ink, fontFamily: F.black, fontSize: 18, textAlign: 'right' },
  unit: { fontFamily: F.bold, fontSize: 12, color: C.ink },
  chips: { flexDirection: 'row', gap: 5 },
  chip: { flex: 1, minWidth: 0, maxWidth: 52, height: 42, borderRadius: 11, borderWidth: 1, borderColor: C.line, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center' },
  chipOn: { backgroundColor: C.red, borderColor: C.red },
  chipText: { fontFamily: F.xbold, fontSize: 13, color: C.onAccent },
  picked: { fontFamily: F.black, fontSize: 15, color: C.green },
  ends: { flexDirection: 'row', justifyContent: 'space-between' },
  endText: { fontFamily: F.semi, fontSize: 11, color: C.ink },
  note: { minHeight: 76, borderRadius: 12, borderWidth: 1, borderColor: C.line, backgroundColor: C.bg, color: C.ink, fontFamily: F.semi, fontSize: 15, padding: 12, textAlignVertical: 'top' },
  shareRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: -6 },
  photo: { flex: 1, aspectRatio: 3 / 4, borderRadius: 14, borderWidth: 1.5, borderStyle: 'dashed', borderColor: C.line, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center', gap: 8, overflow: 'hidden' },
  camera: { width: 44, height: 44, borderRadius: 22, backgroundColor: C.red, alignItems: 'center', justifyContent: 'center' },
  photoLabel: { fontFamily: F.xbold, fontSize: 13, color: C.ink },
  photoOk: { position: 'absolute', top: 6, right: 6, width: 22, height: 22, borderRadius: 11, backgroundColor: C.green, alignItems: 'center', justifyContent: 'center' },
  private: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  privateText: { fontFamily: F.semi, fontSize: 12, color: C.ink },
  nextPhoto: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: C.card, borderWidth: 1, borderColor: C.line, borderRadius: 18, padding: 14 },
  footer: { fontFamily: F.semi, fontSize: 12, color: C.ink, textAlign: 'center', marginTop: 4 },
});
