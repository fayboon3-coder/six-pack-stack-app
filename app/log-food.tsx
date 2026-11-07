import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Linking, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import Svg, { Path, Rect } from 'react-native-svg';
import { C, F } from '../src/lib/theme';
import Page from '../src/components/Page';
import PageTitle from '../src/components/PageTitle';
import Panel from '../src/components/Panel';
import FoodResult from '../src/components/FoodResult';
import { useAuth } from '../src/lib/auth';
import { addFood, kcalToday, QUICK, readFood, removeFood, type FoodEntry, type FoodSource } from '../src/lib/food';
import { num, proteinGoal, readDay } from '../src/lib/daily';
import { scanLabel, scanMeal, type LabelRead, type MealGuess, type Nutrition } from '../src/lib/scan';
import { AI_CONSENT_KEY, AI_CONSENT_TEXT } from '../src/lib/askboon';
import { afterProtein } from '../src/lib/reminders';
import { PRIVACY_URL } from '../src/lib/access';
import { track } from '../src/lib/track';

const fmt = (n: number) => Math.round(n).toLocaleString('en-US');
type Found = { kind: 'meal'; photo: string; meal: MealGuess } | { kind: 'label'; photo: string; label: LabelRead };

/** Log food: snap a meal, scan a barcode or a label, or quick add. Calories and protein count toward today. */
export default function LogFood() {
  const { plan } = useAuth();
  const router = useRouter();
  const { go } = useLocalSearchParams<{ go?: string }>();
  const [list, setList] = useState<FoodEntry[]>([]);
  const [kcal, setKcal] = useState(0);
  const [protein, setProtein] = useState(0);
  const [busy, setBusy] = useState<'' | 'meal' | 'label'>('');
  const [found, setFound] = useState<Found | null>(null);
  const [err, setErr] = useState('');
  const [consent, setConsent] = useState<boolean | null>(null);
  const [pending, setPending] = useState<'meal' | 'label' | null>(null);
  const [name, setName] = useState(''); const [cal, setCal] = useState(''); const [pro, setPro] = useState('');

  const load = useCallback(async () => {
    setList(await readFood());
    setProtein((await readDay()).protein);
    if (plan) setKcal(await kcalToday(plan));
  }, [plan]);
  useFocusEffect(useCallback(() => { load(); }, [load]));
  useEffect(() => { AsyncStorage.getItem(AI_CONSENT_KEY).then((v) => setConsent(v === 'yes' || process.env.EXPO_PUBLIC_DEMO === '1')).catch(() => setConsent(false)); }, []);
  useEffect(() => { if (plan && consent !== null && (go === 'meal' || go === 'label')) setTimeout(() => snap(go), 300); }, [go, consent === null]);

  if (!plan) return null;
  const kGoal = num(plan.kcal) || 2000, pGoal = proteinGoal(plan);

  const snap = async (kind: 'meal' | 'label') => {
    if (consent === null) return;
    if (!consent) { setPending(kind); return; }
    setErr(''); setFound(null);
    let res: ImagePicker.ImagePickerResult;
    if (Platform.OS === 'web') res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8 });
    else {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      res = perm.granted ? await ImagePicker.launchCameraAsync({ quality: 0.8 }) : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8 });
    }
    if (res.canceled || !res.assets[0]) return;
    const uri = res.assets[0].uri;
    setBusy(kind);
    track(kind === 'meal' ? 'food_photo' : 'label_photo');
    if (kind === 'meal') {
      const r = await scanMeal(uri);
      setBusy('');
      if (r.ok) setFound({ kind: 'meal', photo: uri, meal: r.meal }); else setErr(r.msg);
    } else {
      const r = await scanLabel(uri);
      setBusy('');
      if (r.ok) setFound({ kind: 'label', photo: uri, label: r.label }); else setErr(r.msg);
    }
  };
  const agree = async () => {
    setConsent(true); track('ai_consent', { where: 'food' });
    try { await AsyncStorage.setItem(AI_CONSENT_KEY, 'yes'); } catch {}
    const k = pending; setPending(null); if (k) setTimeout(() => snap(k), 50);
  };

  const add = async (n: Nutrition, source: FoodSource) => {
    await addFood({ name: n.name, kcal: n.kcal, protein: n.protein, carbs: n.carbs, fat: n.fat, source });
    track('food_logged', { source });
    setFound(null); setName(''); setCal(''); setPro('');
    await load();
    const d = await readDay(); afterProtein(d.protein, pGoal).catch(() => {});
  };
  const quickAdd = () => {
    const k = Number(cal) || 0, p = Number(pro) || 0;
    if (!k && !p) return;
    add({ name: name.trim() || 'Quick add', kcal: k, protein: p }, 'quick');
  };

  return (
    <Page tabs={false} header={<PageTitle back title="Log food" sub="Counts toward today's calories and protein" size={26} />}>
      <View style={st.totals}>
        <Total label="Calories" v={fmt(kcal)} of={fmt(kGoal)} pct={kcal / kGoal} color="#ffb347" />
        <Total label="Protein" v={`${fmt(protein)} g`} of={`${fmt(pGoal)} g`} pct={protein / pGoal} color="#d22f26" />
      </View>

      {pending && (
        <View style={st.consent}>
          <Text style={st.consentT}>Before you snap</Text>
          <Text style={st.consentB}>{AI_CONSENT_TEXT}</Text>
          <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
            <Pressable accessibilityRole="button" onPress={agree} style={st.consentBtn}><Text style={st.consentBtnT}>OK, turn on photo logging</Text></Pressable>
            <Text accessibilityRole="link" onPress={() => Linking.openURL(PRIVACY_URL)} style={st.link}>Privacy</Text>
          </View>
        </View>
      )}

      {found ? (
        found.kind === 'meal'
          ? <FoodResult kicker="FROM YOUR PHOTO" photo={found.photo} base={found.meal.total} items={found.meal.items} note={found.meal.note} onCancel={() => setFound(null)} onAdd={(n) => add(n, 'photo')} />
          : <FoodResult kicker={found.label.kind === 'supplement' ? 'SUPPLEMENT LABEL' : 'FROM THE LABEL'} photo={found.photo}
              base={{ name: found.label.name, brand: found.label.brand, serving: found.label.serving, kcal: found.label.kcal || 0, protein: found.label.protein || 0, carbs: found.label.carbs, fat: found.label.fat }}
              note={found.label.kind === 'supplement' ? (found.label.ingredients?.length ? `Inside: ${found.label.ingredients.slice(0, 6).join(', ')}.` : found.label.note) : found.label.note}
              verdict={found.label.match} onCancel={() => setFound(null)} onAdd={(n) => add(n, 'label')} />
      ) : (
        <View style={{ gap: 10 }}>
          <Pressable accessibilityRole="button" onPress={() => snap('meal')} disabled={!!busy} style={st.hero}>
            <View style={st.heroIco}>{busy === 'meal' ? <ActivityIndicator color="#fff" /> : <Cam />}</View>
            <View style={{ flex: 1 }}>
              <Text style={st.heroT}>{busy === 'meal' ? 'Reading your plate…' : 'Snap a meal'}</Text>
              <Text style={st.heroS}>Take a photo. Stack estimates calories and protein in seconds.</Text>
            </View>
          </Pressable>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Tile title="Scan barcode" sub="Packaged food" onPress={() => router.push('/scan')} icon={<Barcode />} />
            <Tile title={busy === 'label' ? 'Reading…' : 'Scan a label'} sub="Nutrition or supplement" onPress={() => snap('label')} icon={busy === 'label' ? <ActivityIndicator color={C.red} /> : <Label />} />
          </View>
          {!!err && <Text style={st.err}>{err}</Text>}
        </View>
      )}

      <Panel title="Quick add">
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {QUICK.map((q) => (
            <Pressable key={q.name} accessibilityRole="button" accessibilityLabel={`Add ${q.name}`} onPress={() => add(q, 'quick')} style={st.chip}>
              <Text style={st.chipT}>{q.name}</Text><Text style={st.chipS}>{q.kcal} · {q.protein}g</Text>
            </Pressable>
          ))}
        </View>
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 14 }}>
          <TextInput value={name} onChangeText={setName} placeholder="Food" placeholderTextColor={C.muted} style={[st.in, { flex: 1.6 }]} accessibilityLabel="Food name" />
          <TextInput value={cal} onChangeText={(t) => setCal(t.replace(/\D/g, ''))} placeholder="Cal" placeholderTextColor={C.muted} keyboardType="number-pad" style={[st.in, { flex: 1 }]} accessibilityLabel="Calories" />
          <TextInput value={pro} onChangeText={(t) => setPro(t.replace(/\D/g, ''))} placeholder="Prot" placeholderTextColor={C.muted} keyboardType="number-pad" style={[st.in, { flex: 1 }]} accessibilityLabel="Protein grams" />
          <Pressable accessibilityRole="button" accessibilityLabel="Add" onPress={quickAdd} style={st.plus}><Svg width={16} height={16} viewBox="0 0 24 24"><Path d="M12 5v14M5 12h14" stroke="#fff" strokeWidth={3} strokeLinecap="round" /></Svg></Pressable>
        </View>
      </Panel>

      <Panel title="Logged today" right={list.length ? `${list.length} item${list.length > 1 ? 's' : ''}` : undefined} bodyStyle={{ paddingVertical: list.length ? 2 : 14 }}>
        {!list.length && <Text style={st.s}>Plan meals you tick on the Meals tab count too. Log anything else here.</Text>}
        {list.map((f, k) => (
          <View key={f.id} style={[st.row, k < list.length - 1 && st.line]}>
            <View style={st.src}><Text style={st.srcT}>{f.source === 'photo' ? 'PHOTO' : f.source === 'barcode' ? 'SCAN' : f.source === 'label' ? 'LABEL' : 'ADD'}</Text></View>
            <View style={{ flex: 1, minWidth: 0 }}><Text style={st.rowT} numberOfLines={1}>{f.name}</Text><Text style={st.s}>{f.kcal} cal · {f.protein} g protein</Text></View>
            <Pressable accessibilityRole="button" accessibilityLabel={`Remove ${f.name}`} hitSlop={8} onPress={async () => { await removeFood(f.id); load(); }} style={st.x}>
              <Svg width={10} height={10} viewBox="0 0 24 24"><Path d="M6 6l12 12M18 6L6 18" stroke={C.ink} strokeWidth={3} strokeLinecap="round" /></Svg>
            </Pressable>
          </View>
        ))}
      </Panel>
    </Page>
  );
}

const Total = ({ label, v, of, pct, color }: { label: string; v: string; of: string; pct: number; color: string }) => (
  <View style={{ flex: 1 }}>
    <Text style={st.tL}>{label}</Text>
    <Text style={st.tV}>{v} <Text style={st.tOf}>/ {of}</Text></Text>
    <View style={st.track}><View style={[st.fill, { width: `${Math.min(100, Math.max(0, pct * 100))}%`, backgroundColor: color }]} /></View>
  </View>
);
const Tile = ({ title, sub, onPress, icon }: { title: string; sub: string; onPress: () => void; icon: React.ReactNode }) => (
  <Pressable accessibilityRole="button" onPress={onPress} style={st.tile}>
    <View style={st.tileIco}>{icon}</View>
    <Text style={st.tileT}>{title}</Text>
    <Text style={st.s}>{sub}</Text>
  </Pressable>
);
const Cam = () => <Svg width={26} height={26} viewBox="0 0 24 24"><Path d="M3 9a2 2 0 0 1 2-2h2l2-3h6l2 3h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" stroke="#fff" strokeWidth={2} fill="none" strokeLinejoin="round" /><Path d="M12 10a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7z" stroke="#fff" strokeWidth={2} fill="none" /></Svg>;
const Barcode = () => <Svg width={24} height={24} viewBox="0 0 24 24"><Path d="M4 6v12M7 6v12M10 6v12M14 6v12M16 6v12M20 6v12" stroke={C.red} strokeWidth={2} strokeLinecap="round" /></Svg>;
const Label = () => <Svg width={24} height={24} viewBox="0 0 24 24"><Rect x={5} y={3} width={14} height={18} rx={2} stroke={C.red} strokeWidth={2} fill="none" /><Path d="M8 8h8M8 12h8M8 16h5" stroke={C.red} strokeWidth={2} strokeLinecap="round" /></Svg>;

const st = StyleSheet.create({
  totals: { flexDirection: 'row', gap: 16, paddingVertical: 14, paddingHorizontal: 18, backgroundColor: C.card, borderWidth: 1, borderColor: C.line, borderRadius: 22 },
  tL: { fontFamily: F.semi, fontSize: 13, color: C.ink },
  tV: { fontFamily: F.xbold, fontSize: 20, color: C.ink, marginTop: 3 },
  tOf: { fontFamily: F.semi, fontSize: 14, color: C.ink },
  track: { height: 6, borderRadius: 3, backgroundColor: '#e8eaf0', marginTop: 8, overflow: 'hidden' },
  fill: { height: 6, borderRadius: 3 },
  hero: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 18, borderRadius: 22, backgroundColor: C.navy },
  heroIco: { width: 54, height: 54, borderRadius: 27, backgroundColor: C.red, alignItems: 'center', justifyContent: 'center' },
  heroT: { fontFamily: F.xbold, fontSize: 19, color: '#fff' },
  heroS: { fontFamily: F.medium, fontSize: 14, lineHeight: 19, color: 'rgba(255,255,255,0.85)', marginTop: 2 },
  tile: { flex: 1, padding: 16, borderRadius: 22, backgroundColor: C.card, borderWidth: 1, borderColor: C.line, gap: 2 },
  tileIco: { width: 44, height: 44, borderRadius: 12, backgroundColor: C.redTint, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  tileT: { fontFamily: F.xbold, fontSize: 16, color: C.ink },
  err: { fontFamily: F.semi, fontSize: 14, lineHeight: 20, color: C.red, textAlign: 'center' },
  chip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 14, borderWidth: 1, borderColor: '#d5d9e3', backgroundColor: C.bg },
  chipT: { fontFamily: F.bold, fontSize: 14, color: C.ink },
  chipS: { fontFamily: F.medium, fontSize: 12, color: C.muted },
  in: { height: 46, borderRadius: 12, borderWidth: 1, borderColor: C.line, backgroundColor: C.bg, paddingHorizontal: 12, fontFamily: F.semi, fontSize: 15, color: C.ink, outlineWidth: 0, minWidth: 0 } as any,
  plus: { width: 46, height: 46, borderRadius: 23, backgroundColor: C.navy, alignItems: 'center', justifyContent: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 11 },
  line: { borderBottomWidth: 1, borderBottomColor: '#e9ebf1' },
  rowT: { fontFamily: F.semi, fontSize: 15, color: C.ink },
  s: { fontFamily: F.medium, fontSize: 13, lineHeight: 18, color: C.ink },
  src: { paddingHorizontal: 6, paddingVertical: 3, borderRadius: 6, backgroundColor: '#e8eaf0' },
  srcT: { fontFamily: F.bold, fontSize: 9, letterSpacing: 0.6, color: C.ink },
  x: { width: 26, height: 26, borderRadius: 13, backgroundColor: '#e8eaf0', alignItems: 'center', justifyContent: 'center' },
  consent: { padding: 16, borderRadius: 18, backgroundColor: C.card, borderWidth: 1.5, borderColor: C.navy, gap: 10 },
  consentT: { fontFamily: F.xbold, fontSize: 16, color: C.ink },
  consentB: { fontFamily: F.medium, fontSize: 14, lineHeight: 20, color: C.ink },
  consentBtn: { height: 44, paddingHorizontal: 18, borderRadius: 22, backgroundColor: C.navy, alignItems: 'center', justifyContent: 'center' },
  consentBtnT: { fontFamily: F.bold, fontSize: 15, color: '#fff' },
  link: { fontFamily: F.semi, fontSize: 14, color: C.ink, textDecorationLine: 'underline' },
});
