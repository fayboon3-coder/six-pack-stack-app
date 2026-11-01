import React, { useState } from 'react';
import { Alert, Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../src/lib/auth';
import { supabase } from '../src/lib/supabase';
import { C, F } from '../src/lib/theme';
import { Button, Eyebrow, H1, s as ui } from '../src/components/ui';
import { BackIcon, PlusIcon } from '../src/components/icons';
import { PHOTO_WEEKS, weekOf } from '../src/lib/program';
import Banner from '../src/components/Banner';
import { PHOTO } from '../src/lib/photos';

type Angle = 'front' | 'side' | 'back';

function Chips({ n, from = 0, value, onChange, label }: { n: number; from?: number; value: number | null; onChange: (v: number) => void; label: string }) {
  return (
    <View style={{ gap: 8 }}>
      <Text style={ui.label}>{label}</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
        {Array.from({ length: n - from + 1 }, (_, k) => k + from).map((v) => (
          <Pressable key={v} accessibilityRole="radio" accessibilityState={{ selected: value === v }} accessibilityLabel={`${label}: ${v}`}
            onPress={() => onChange(v)} style={[st.chip, value === v && { backgroundColor: C.red, borderColor: C.red }]}>
            <Text style={st.chipText}>{v}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

function Field({ label, value, onChange, kb = 'default', placeholder, multiline }: {
  label: string; value: string; onChange: (t: string) => void; kb?: 'default' | 'decimal-pad' | 'number-pad'; placeholder?: string; multiline?: boolean;
}) {
  return (
    <View style={{ gap: 8 }}>
      <Text style={ui.label}>{label}</Text>
      <TextInput accessibilityLabel={label} value={value} onChangeText={onChange} keyboardType={kb} placeholder={placeholder}
        placeholderTextColor="#ffffff80" multiline={multiline}
        style={[st.input, multiline && { height: 84, paddingTop: 12, textAlignVertical: 'top' }]} />
    </View>
  );
}

export default function CheckinScreen() {
  const { plan, session } = useAuth();
  const router = useRouter();
  const week = weekOf(plan?.train.s);
  const photoWeek = PHOTO_WEEKS.includes(week);
  const nDays = plan?.train.d.length || 4;
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

  const pick = async (angle: Angle) => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    const res = perm.granted
      ? await ImagePicker.launchCameraAsync({ quality: 0.6 })
      : await ImagePicker.launchImageLibraryAsync({ quality: 0.6, mediaTypes: ['images'] });
    if (!res.canceled && res.assets[0]) setPhotos({ ...photos, [angle]: res.assets[0].uri });
  };

  const submit = async () => {
    if (!session) return;
    if (!weight) return Alert.alert('Add your weight', 'Your 7-day average, or this morning\'s weight.');
    setBusy(true);
    const uid = session.user.id;
    const { data, error } = await supabase.from('checkins').insert({
      user_id: uid, week, weight: Number(weight), waist: waist ? Number(waist) : null, steps: steps ? Number(steps) : null,
      workouts, nutrition_days: nutrition, energy, hunger, win: win || null, hardest: hardest || null,
      questions: questions || null, share_win: shareWin,
    }).select('id').single();
    if (error || !data) { setBusy(false); return Alert.alert('Couldn\'t send', 'Check your connection and try again.'); }
    for (const [angle, uri] of Object.entries(photos) as [Angle, string][]) {
      const path = `${uid}/week${week}-${angle}-${Date.now()}.jpg`;
      const body = await (await fetch(uri)).arrayBuffer();
      const up = await supabase.storage.from('progress-photos').upload(path, body, { contentType: 'image/jpeg' });
      if (!up.error) await supabase.from('photos').insert({ user_id: uid, checkin_id: data.id, angle, path });
    }
    setBusy(false);
    Alert.alert('Check-in sent', 'Boon reviews it and gets back to you within 24 hours.');
    router.back();
  };

  return (
    <SafeAreaView edges={['bottom']} style={{ flex: 1, backgroundColor: C.navy }}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
          <Banner uri={PHOTO.checkin} eyebrow={`Week ${week}${photoWeek ? ' · Photo week' : ''}`} title="Sunday check-in" height={260}>
            <Text style={st.hint}>Two minutes. Boon reviews every answer.</Text>
          </Banner>
          <Pressable accessibilityRole="button" accessibilityLabel="Close" onPress={() => router.back()} style={st.close}>
            <BackIcon />
          </Pressable>
          <View style={{ padding: 20, paddingTop: 4, gap: 18 }}>

          <Field label="Weight (7-day average, lbs)" value={weight} onChange={(t) => setWeight(t.replace(/[^\d.]/g, ''))} kb="decimal-pad" placeholder="e.g. 196.4" />
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <View style={{ flex: 1 }}><Field label="Waist (in)" value={waist} onChange={(t) => setWaist(t.replace(/[^\d.]/g, ''))} kb="decimal-pad" placeholder="optional" /></View>
            <View style={{ flex: 1 }}><Field label="Avg steps" value={steps} onChange={(t) => setSteps(t.replace(/\D/g, ''))} kb="number-pad" placeholder="optional" /></View>
          </View>

          {photoWeek && (
            <View style={{ gap: 8 }}>
              <Text style={ui.label}>Progress photos</Text>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {(['front', 'side', 'back'] as Angle[]).map((a) => (
                  <Pressable key={a} accessibilityRole="button" accessibilityLabel={`Add ${a} photo`} onPress={() => pick(a)} style={st.photo}>
                    {photos[a] ? <Image source={{ uri: photos[a] }} style={StyleSheet.absoluteFill} /> : <><PlusIcon /><Text style={st.chipText}>{a[0].toUpperCase() + a.slice(1)}</Text></>}
                  </Pressable>
                ))}
              </View>
              <Text style={st.hint}>Same spot, same light, same time each photo week. Only you and Boon can see them.</Text>
            </View>
          )}

          <Chips label="Workouts done" n={nDays} value={workouts} onChange={setWorkouts} />
          <Chips label="Days on plan" n={7} value={nutrition} onChange={setNutrition} />
          <Chips label="Energy (1–10)" n={10} from={1} value={energy} onChange={setEnergy} />
          <Chips label="Hunger (1–10)" n={10} from={1} value={hunger} onChange={setHunger} />

          <Field label="Your win this week" value={win} onChange={setWin} placeholder="Big or small" />
          <View style={st.switchRow}>
            <Text style={[st.hint, { flex: 1 }]}>OK for Boon to share this win (first name only)</Text>
            <Switch value={shareWin} onValueChange={setShareWin} trackColor={{ true: C.green, false: C.line }} accessibilityLabel="OK to share this win" />
          </View>
          <Field label="Hardest part" value={hardest} onChange={setHardest} placeholder="Optional" multiline />
          <Field label="Questions for Boon" value={questions} onChange={setQuestions} placeholder="Optional" multiline />

          <Button title="Send check-in" onPress={submit} loading={busy} />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const st = StyleSheet.create({
  chip: { minWidth: 40, height: 40, paddingHorizontal: 10, borderRadius: 10, borderWidth: 1, borderColor: C.line, backgroundColor: C.navy2, alignItems: 'center', justifyContent: 'center' },
  chipText: { fontFamily: F.xbold, fontSize: 14, color: C.white },
  input: { height: 52, borderRadius: 12, borderWidth: 1, borderColor: C.line, backgroundColor: C.navy2, color: C.white, fontFamily: F.semi, fontSize: 16, paddingHorizontal: 14 },
  photo: { flex: 1, height: 110, borderRadius: 14, borderWidth: 1, borderStyle: 'dashed', borderColor: C.line, backgroundColor: C.navy2, alignItems: 'center', justifyContent: 'center', gap: 6, overflow: 'hidden' },
  hint: { fontFamily: F.semi, fontSize: 12, color: C.white, lineHeight: 17 },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  close: { position: 'absolute', top: 12, left: 12, width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(13,27,51,0.7)', alignItems: 'center', justifyContent: 'center' },
});
