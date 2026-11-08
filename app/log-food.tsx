import { FuelCard } from '../src/components/charts';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Linking, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import Svg, { Path, Rect } from 'react-native-svg';
import { C, E, F } from '../src/lib/theme';
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
import { picFor } from '../src/lib/foodMatch';
import { mealImage } from '../src/lib/meals';
import { FoodThumb } from '../src/components/FoodTiles';
import { Bar, CountUp, Drift, Press, Reveal } from '../src/components/motion';
import { LinearGradient } from 'expo-linear-gradient';

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

  const add = async (n: Nutrition, source: FoodSource, img?: string | null) => {
    await addFood({ name: n.name, kcal: n.kcal, protein: n.protein, carbs: n.carbs, fat: n.fat, source, img: img || null });
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
    <Page tabs={false} paper header={<PageTitle paper back title="Log food" sub="Counts toward today's calories and protein" size={28} />}>
      <Reveal>
        <FuelCard kcal={kcal} kGoal={kGoal} protein={protein} pGoal={pGoal} />
      </Reveal>

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
          ? <FoodResult kicker="FROM YOUR PHOTO" photo={found.photo} base={found.meal.total} items={found.meal.items} note={found.meal.note} onCancel={() => setFound(null)} onAdd={(n) => add(n, 'photo', found.photo)} />
          : <FoodResult kicker={found.label.kind === 'supplement' ? 'SUPPLEMENT LABEL' : 'FROM THE LABEL'} photo={found.photo}
              base={{ name: found.label.name, brand: found.label.brand, serving: found.label.serving, kcal: found.label.kcal || 0, protein: found.label.protein || 0, carbs: found.label.carbs, fat: found.label.fat }}
              note={found.label.kind === 'supplement' ? (found.label.ingredients?.length ? `Inside: ${found.label.ingredients.slice(0, 6).join(', ')}.` : found.label.note) : found.label.note}
              verdict={found.label.match} onCancel={() => setFound(null)} onAdd={(n) => add(n, 'label', found.photo)} />
      ) : (
        <View style={{ gap: 10 }}>
          <Reveal delay={60}>
          <Press accessibilityRole="button" onPress={() => snap('meal')} disabled={!!busy} scale={0.985} style={st.hero}>
            <Drift source={mealImage('chicken rice bowl')!} style={StyleSheet.absoluteFill} />
            <LinearGradient colors={['rgba(16,23,42,0.05)', 'rgba(16,23,42,0.9)']} style={StyleSheet.absoluteFill} />
            <View style={st.heroIn}>
              <View style={{ flex: 1 }}>
                <Text style={st.heroK}>SNAP A MEAL</Text>
                <Text style={st.heroT}>{busy === 'meal' ? 'Reading your plate…' : 'Point. Snap. Logged.'}</Text>
                <Text style={st.heroS}>Stack reads your plate and adds up the calories and protein in seconds.</Text>
              </View>
              <View style={st.heroIco}>{busy === 'meal' ? <ActivityIndicator color={E.ink} /> : <Cam />}</View>
            </View>
          </Press>
          </Reveal>
          <Reveal delay={120} style={{ flexDirection: 'row', gap: 10 }}>
            <Tile title="Scan barcode" sub="Packaged food" onPress={() => router.push('/scan')} icon={<Barcode />} />
            <Tile title={busy === 'label' ? 'Reading…' : 'Scan a label'} sub="Nutrition or supplement" onPress={() => snap('label')} icon={busy === 'label' ? <ActivityIndicator color={C.red} /> : <Label />} />
          </Reveal>
          {!!err && <Text style={st.err}>{err}</Text>}
        </View>
      )}

      <Reveal>
      <Text style={st.sec}>Quick add</Text>
      <View style={st.card}>
        <View style={st.quick}>
          {QUICK.map((q) => (
            <Press key={q.name} accessibilityRole="button" accessibilityLabel={`Add ${q.name}`} onPress={() => add(q, 'quick')} style={st.qItem}>
              <FoodThumb {...picFor(q.name)} size={64} />
              <Text style={st.chipT} numberOfLines={1}>{q.name}</Text>
              <Text style={st.chipS}>{q.kcal} cal · {q.protein} g</Text>
            </Press>
          ))}
        </View>
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 14 }}>
          <TextInput value={name} onChangeText={setName} placeholder="Food" placeholderTextColor={C.muted} style={[st.in, { flex: 1.6 }]} accessibilityLabel="Food name" />
          <TextInput value={cal} onChangeText={(t) => setCal(t.replace(/\D/g, ''))} placeholder="Cal" placeholderTextColor={C.muted} keyboardType="number-pad" style={[st.in, { flex: 1 }]} accessibilityLabel="Calories" />
          <TextInput value={pro} onChangeText={(t) => setPro(t.replace(/\D/g, ''))} placeholder="Prot" placeholderTextColor={C.muted} keyboardType="number-pad" style={[st.in, { flex: 1 }]} accessibilityLabel="Protein grams" />
          <Pressable accessibilityRole="button" accessibilityLabel="Add" onPress={quickAdd} style={st.plus}><Svg width={16} height={16} viewBox="0 0 24 24"><Path d="M12 5v14M5 12h14" stroke="#fff" strokeWidth={3} strokeLinecap="round" /></Svg></Pressable>
        </View>
      </View>
      </Reveal>

      <Reveal>
      <View style={st.secRow}><Text style={st.sec}>Logged today</Text>{!!list.length && <Text style={st.secR}>{list.length} item{list.length > 1 ? 's' : ''}</Text>}</View>
      <View style={[st.card, { paddingVertical: list.length ? 4 : 16 }]}>
        {!list.length && <Text style={st.s}>Plan meals you tick on the Meals tab count too. Log anything else here.</Text>}
        {list.map((f, k) => (
          <View key={f.id} style={[st.row, k < list.length - 1 && st.line]}>
            <View>
              <FoodThumb uri={f.img} {...picFor(f.name)} size={52} />
              <View style={st.src}><Text style={st.srcT}>{f.source === 'photo' ? 'PHOTO' : f.source === 'barcode' ? 'SCAN' : f.source === 'label' ? 'LABEL' : 'ADD'}</Text></View>
            </View>
            <View style={{ flex: 1, minWidth: 0 }}><Text style={st.rowT} numberOfLines={1}>{f.name}</Text><Text style={st.s}>{f.kcal} cal · {f.protein} g protein</Text></View>
            <Pressable accessibilityRole="button" accessibilityLabel={`Remove ${f.name}`} hitSlop={8} onPress={async () => { await removeFood(f.id); load(); }} style={st.x}>
              <Svg width={10} height={10} viewBox="0 0 24 24"><Path d="M6 6l12 12M18 6L6 18" stroke={C.ink} strokeWidth={3} strokeLinecap="round" /></Svg>
            </Pressable>
          </View>
        ))}
      </View>
      </Reveal>
    </Page>
  );
}

const Total = ({ label, v, unit, of, pct, color }: { label: string; v: number; unit?: string; of: string; pct: number; color: string }) => (
  <View style={{ flex: 1 }}>
    <Text style={st.tL}>{label}</Text>
    <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4, marginTop: 6, marginBottom: 12 }}>
      <CountUp value={v} style={st.tV} />{!!unit && <Text style={st.tU}>{unit}</Text>}<Text style={st.tOf}>/ {of}</Text>
    </View>
    <Bar pct={pct} color={color} track={E.soft} />
  </View>
);
const Tile = ({ title, sub, onPress, icon }: { title: string; sub: string; onPress: () => void; icon: React.ReactNode }) => (
  <Press accessibilityRole="button" onPress={onPress} style={st.tile}>
    <View style={st.tileIco}>{icon}</View>
    <Text style={st.tileT}>{title}</Text>
    <Text style={st.s}>{sub}</Text>
  </Press>
);
const Cam = () => <Svg width={24} height={24} viewBox="0 0 24 24"><Path d="M3 9a2 2 0 0 1 2-2h2l2-3h6l2 3h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" stroke={E.ink} strokeWidth={2} fill="none" strokeLinejoin="round" /><Path d="M12 10a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7z" stroke={E.ink} strokeWidth={2} fill="none" /></Svg>;
const Barcode = () => <Svg width={24} height={24} viewBox="0 0 24 24"><Path d="M4 6v12M7 6v12M10 6v12M14 6v12M16 6v12M20 6v12" stroke={E.ink} strokeWidth={2} strokeLinecap="round" /></Svg>;
const Label = () => <Svg width={24} height={24} viewBox="0 0 24 24"><Rect x={5} y={3} width={14} height={18} rx={2} stroke={E.ink} strokeWidth={2} fill="none" /><Path d="M8 8h8M8 12h8M8 16h5" stroke={E.ink} strokeWidth={2} strokeLinecap="round" /></Svg>;

const st = StyleSheet.create({
  totals: { flexDirection: 'row', gap: 16, padding: 18, backgroundColor: E.surface, borderWidth: 1, borderColor: E.hair, borderRadius: 22 },
  tL: { fontFamily: F.bold, fontSize: 10.5, letterSpacing: 1.4, color: E.sub },
  tV: { fontFamily: F.black, fontSize: 30, letterSpacing: -1.1, color: E.ink, fontVariant: ['tabular-nums'] },
  tU: { fontFamily: F.bold, fontSize: 14, color: E.ink },
  tOf: { fontFamily: F.semi, fontSize: 13, color: E.sub },
  hero: { height: 210, borderRadius: 24, overflow: 'hidden', backgroundColor: E.ink, justifyContent: 'flex-end' },
  heroIn: { flexDirection: 'row', alignItems: 'flex-end', gap: 14, padding: 18 },
  heroK: { fontFamily: F.bold, fontSize: 10.5, letterSpacing: 1.4, color: '#ff8a80' },
  heroIco: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  heroT: { fontFamily: F.black, fontSize: 26, letterSpacing: -0.7, color: '#fff', marginTop: 4 },
  heroS: { fontFamily: F.medium, fontSize: 14, lineHeight: 19, color: 'rgba(255,255,255,0.88)', marginTop: 4 },
  tile: { flex: 1, padding: 16, borderRadius: 22, backgroundColor: E.surface, borderWidth: 1, borderColor: E.hair, gap: 2 },
  tileIco: { width: 44, height: 44, borderRadius: 14, backgroundColor: E.paper, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  tileT: { fontFamily: F.xbold, fontSize: 16, color: E.ink },
  err: { fontFamily: F.semi, fontSize: 14, lineHeight: 20, color: E.red, textAlign: 'center' },
  sec: { fontFamily: F.xbold, fontSize: 22, letterSpacing: -0.6, color: E.ink, marginTop: 14, marginBottom: 12 },
  secRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
  secR: { fontFamily: F.semi, fontSize: 13, color: E.sub, marginBottom: 14 },
  card: { padding: 16, borderRadius: 22, backgroundColor: E.surface, borderWidth: 1, borderColor: E.hair },
  quick: { flexDirection: 'row', flexWrap: 'wrap', rowGap: 16 },
  qItem: { width: '33.33%', alignItems: 'center', gap: 6 },
  chipT: { fontFamily: F.bold, fontSize: 13, color: E.ink, textAlign: 'center' },
  chipS: { fontFamily: F.medium, fontSize: 11.5, color: E.sub },
  in: { height: 46, borderRadius: 14, borderWidth: 1, borderColor: E.hair, backgroundColor: E.paper, paddingHorizontal: 12, fontFamily: F.semi, fontSize: 15, color: E.ink, outlineWidth: 0, minWidth: 0 } as any,
  plus: { width: 46, height: 46, borderRadius: 23, backgroundColor: E.ink, alignItems: 'center', justifyContent: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  line: { borderBottomWidth: 1, borderBottomColor: E.hair },
  rowT: { fontFamily: F.bold, fontSize: 15, color: E.ink },
  s: { fontFamily: F.medium, fontSize: 13, lineHeight: 18, color: E.sub },
  src: { position: 'absolute', left: -4, bottom: -4, paddingHorizontal: 5, paddingVertical: 2, borderRadius: 6, backgroundColor: E.ink },
  srcT: { fontFamily: F.bold, fontSize: 8.5, letterSpacing: 0.6, color: '#fff' },
  x: { width: 28, height: 28, borderRadius: 14, backgroundColor: E.paper, alignItems: 'center', justifyContent: 'center' },
  consent: { padding: 16, borderRadius: 18, backgroundColor: E.surface, borderWidth: 1.5, borderColor: E.ink, gap: 10 },
  consentT: { fontFamily: F.xbold, fontSize: 16, color: E.ink },
  consentB: { fontFamily: F.medium, fontSize: 14, lineHeight: 20, color: E.ink },
  consentBtn: { height: 44, paddingHorizontal: 18, borderRadius: 22, backgroundColor: E.ink, alignItems: 'center', justifyContent: 'center' },
  consentBtnT: { fontFamily: F.bold, fontSize: 15, color: '#fff' },
  link: { fontFamily: F.semi, fontSize: 14, color: E.ink, textDecorationLine: 'underline' },
});
