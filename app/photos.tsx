import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Image, PanResponder, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import Svg, { Path } from 'react-native-svg';
import { C, F } from '../src/lib/theme';
import Page from '../src/components/Page';
import PageTitle from '../src/components/PageTitle';
import { useAuth } from '../src/lib/auth';
import { addPhoto, listPhotos, type Angle, type ProgressPhoto } from '../src/lib/photos';
import { allWeighIns } from '../src/lib/body';
import { trendSeries, type TrendPoint } from '../src/lib/trend';
import { weekOf } from '../src/lib/program';
import { isCoached } from '../src/lib/access';
import { track } from '../src/lib/track';

const ANGLES: Angle[] = ['front', 'side', 'back'];
const DEMO = process.env.EXPO_PUBLIC_DEMO === '1';
const nice = (iso: string) => new Date(iso + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

/** Photo compare: before and after side by side or with a slider, a timeline, and add a photo any day. */
export default function Photos() {
  const { session, plan, profile } = useAuth();
  const [all, setAll] = useState<ProgressPhoto[]>([]);
  const [angle, setAngle] = useState<Angle>('front');
  const [mode, setMode] = useState<'side' | 'slider'>('side');
  const [a, setA] = useState<string | null>(null);
  const [b, setB] = useState<string | null>(null);
  const [slot, setSlot] = useState<'a' | 'b'>('b');
  const [series, setSeries] = useState<TrendPoint[]>([]);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState('');
  const uid = session?.user.id;

  const load = async () => {
    if (!uid) return;
    const p = await listPhotos(uid, plan?.train.s);
    setAll(p);
  };
  useEffect(() => { load(); allWeighIns(DEMO ? undefined : uid).then((w) => setSeries(trendSeries(w))); }, [uid]);

  const list = useMemo(() => all.filter((p) => p.angle === angle), [all, angle]);
  useEffect(() => { setA(list[0]?.id || null); setB(list.length > 1 ? list[list.length - 1].id : null); }, [angle, all.length]);
  const pa = list.find((p) => p.id === a) || null, pb = list.find((p) => p.id === b) || null;
  const tAt = (iso?: string) => { if (!iso) return null; const s = series.filter((x) => x.date <= iso); return s.length ? s[s.length - 1].t : null; };
  const wa = tAt(pa?.date), wb = tAt(pb?.date);
  const diff = wa != null && wb != null ? Math.round((wb - wa) * 10) / 10 : null;
  const days = pa && pb ? Math.round((new Date(pb.date).getTime() - new Date(pa.date).getTime()) / 864e5) : 0;

  const take = async () => {
    if (!uid) return;
    setNote('');
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    const res = perm.granted ? await ImagePicker.launchCameraAsync({ quality: 0.6 }) : await ImagePicker.launchImageLibraryAsync({ quality: 0.6, mediaTypes: ['images'] });
    if (res.canceled || !res.assets[0]) return;
    setBusy(true);
    const ok = await addPhoto(uid, angle, res.assets[0].uri, weekOf(plan?.train.s));
    setBusy(false);
    track('photo_add', { angle, ok });
    if (!ok) setNote(DEMO ? 'Preview: nothing saved.' : "That didn't upload. Check your signal and try again.");
    await load();
  };

  return (
    <Page tabs={false} header={<PageTitle back title="Photos" sub={isCoached(profile) ? 'Only you and Boon see these' : 'Only you see these'} size={26} />}
      footer={<Pressable accessibilityRole="button" onPress={take} disabled={busy} style={st.cta}>{busy ? <ActivityIndicator color="#fff" /> : <Text style={st.ctaT}>Add today's {angle} photo</Text>}</Pressable>}>
      <View style={st.seg} accessibilityRole="tablist">
        {ANGLES.map((x) => (
          <Pressable key={x} accessibilityRole="tab" accessibilityState={{ selected: angle === x }} onPress={() => setAngle(x)} style={[st.segB, angle === x && { backgroundColor: C.navy }]}>
            <Text style={[st.segT, angle === x && { color: '#fff' }]}>{x[0].toUpperCase() + x.slice(1)}</Text>
          </Pressable>
        ))}
      </View>

      {!list.length ? (
        <View style={st.empty}>
          <Svg width={36} height={36} viewBox="0 0 24 24"><Path d="M3 9a2 2 0 0 1 2-2h2l2-3h6l2 3h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" stroke={C.red} strokeWidth={1.8} fill="none" strokeLinejoin="round" /><Path d="M12 10a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7z" stroke={C.red} strokeWidth={1.8} fill="none" /></Svg>
          <Text style={st.emptyT}>No {angle} photos yet</Text>
          <Text style={st.emptyS}>Same spot, same light, same time of day. Phone at chest height. That's what makes the comparison honest.</Text>
        </View>
      ) : (
        <>
          {mode === 'side' || !pa || !pb ? (
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {[pa, pb].map((p, k) => (
                <Pressable key={k} onPress={() => setSlot(k ? 'b' : 'a')} style={[st.big, slot === (k ? 'b' : 'a') && st.bigOn]} accessibilityLabel={k ? 'After photo' : 'Before photo'}>
                  {p ? <Image source={p.src} style={FILL} resizeMode="cover" /> : <Text style={st.emptyS}>Pick a photo below</Text>}
                  {!!p && <Text style={st.tag}>{k ? 'AFTER' : 'BEFORE'} · WK {p.week} · {nice(p.date)}</Text>}
                </Pressable>
              ))}
            </View>
          ) : <Slider before={pa} after={pb} />}

          <View style={st.stats}>
            <View style={{ flex: 1 }}><Text style={st.sv}>{diff == null ? '–' : `${diff > 0 ? '+' : diff < 0 ? '−' : ''}${Math.abs(diff).toFixed(1)}`}</Text><Text style={st.sk}>lbs on the trend</Text></View>
            <View style={{ flex: 1 }}><Text style={st.sv}>{days ? `${days}` : '–'}</Text><Text style={st.sk}>days apart</Text></View>
            <View style={st.modeSeg}>
              {(['side', 'slider'] as const).map((m) => (
                <Pressable key={m} onPress={() => setMode(m)} accessibilityRole="tab" accessibilityState={{ selected: mode === m }} style={[st.modeB, mode === m && { backgroundColor: C.navy }]}>
                  <Text style={[st.modeT, mode === m && { color: '#fff' }]}>{m === 'side' ? 'Side by side' : 'Slider'}</Text>
                </Pressable>
              ))}
            </View>
          </View>

          <View style={{ flexDirection: 'row', gap: 8 }}>
            {(['a', 'b'] as const).map((s) => (
              <Pressable key={s} onPress={() => setSlot(s)} accessibilityRole="radio" accessibilityState={{ selected: slot === s }} style={[st.slot, slot === s && st.slotOn]}>
                <Text style={[st.slotT, slot === s && { color: '#fff' }]}>{s === 'a' ? `Before: ${pa ? `wk ${pa.week}` : '–'}` : `After: ${pb ? `wk ${pb.week}` : '–'}`}</Text>
              </Pressable>
            ))}
          </View>
          <Text style={st.hint}>Tap a photo in your timeline to set the {slot === 'a' ? 'before' : 'after'}.</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingVertical: 4 }}>
            {list.map((p) => {
              const sel = p.id === a || p.id === b;
              return (
                <Pressable key={p.id} accessibilityRole="button" accessibilityLabel={`Week ${p.week}, ${nice(p.date)}`} onPress={() => (slot === 'a' ? setA(p.id) : setB(p.id))} style={[st.thumb, sel && st.thumbOn]}>
                  <Image source={p.src} style={FILL} resizeMode="cover" />
                  <Text style={st.thumbT}>WK {p.week}</Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </>
      )}
      {!!note && <Text style={[st.hint, { color: C.red }]}>{note}</Text>}
    </Page>
  );
}

/** Drag the line to wipe between before and after. */
function Slider({ before, after }: { before: ProgressPhoto; after: ProgressPhoto }) {
  const [w, setW] = useState(300);
  const [pos, setPos] = useState(0.5);
  const wRef = useRef(300); wRef.current = w;
  const pan = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: (e) => setPos(Math.max(0, Math.min(1, e.nativeEvent.locationX / wRef.current))),
    onPanResponderMove: (e) => setPos(Math.max(0, Math.min(1, e.nativeEvent.locationX / wRef.current))),
    onPanResponderTerminationRequest: () => false,
  })).current;
  return (
    <View onLayout={(e) => setW(e.nativeEvent.layout.width)} style={st.slider} {...pan.panHandlers} accessibilityLabel="Before and after slider">
      <Image source={after.src} style={FILL} resizeMode="cover" />
      <View pointerEvents="none" style={[StyleSheet.absoluteFill, { width: pos * w, overflow: 'hidden' }]}>
        <Image source={before.src} style={{ width: w, height: '100%' }} resizeMode="cover" />
      </View>
      <View pointerEvents="none" style={[st.handle, { left: pos * w - 1.5 }]}>
        <View style={st.knob}><Svg width={18} height={18} viewBox="0 0 24 24"><Path d="M9 6l-6 6 6 6M15 6l6 6-6 6" stroke={C.ink} strokeWidth={2.4} fill="none" strokeLinecap="round" strokeLinejoin="round" /></Svg></View>
      </View>
      <Text pointerEvents="none" style={[st.tag, { left: 8, right: undefined }]}>WK {before.week}</Text>
      <Text pointerEvents="none" style={[st.tag, { right: 8, left: undefined }]}>WK {after.week}</Text>
    </View>
  );
}

const FILL = { position: 'absolute' as const, top: 0, left: 0, width: '100%' as const, height: '100%' as const };

const st = StyleSheet.create({
  seg: { flexDirection: 'row', padding: 4, borderRadius: 14, borderWidth: 1, borderColor: C.line, backgroundColor: C.bg },
  segB: { flex: 1, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  segT: { fontFamily: F.semi, fontSize: 15, color: C.ink },
  empty: { alignItems: 'center', gap: 8, padding: 28, borderRadius: 22, backgroundColor: C.card, borderWidth: 1, borderColor: C.line },
  emptyT: { fontFamily: F.xbold, fontSize: 18, color: C.ink },
  emptyS: { fontFamily: F.medium, fontSize: 14, lineHeight: 20, color: C.ink, textAlign: 'center' },
  big: { flex: 1, aspectRatio: 3 / 4, borderRadius: 18, overflow: 'hidden', backgroundColor: '#e8eaf0', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: 'transparent' },
  bigOn: { borderColor: C.red },
  tag: { position: 'absolute', left: 8, bottom: 8, fontFamily: F.bold, fontSize: 11, letterSpacing: 0.4, color: '#fff', backgroundColor: 'rgba(20,28,51,0.82)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, overflow: 'hidden' },
  slider: { width: '100%', aspectRatio: 3 / 4, borderRadius: 18, overflow: 'hidden', backgroundColor: '#e8eaf0' },
  handle: { position: 'absolute', top: 0, bottom: 0, width: 3, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  knob: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 8, elevation: 4 },
  stats: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, borderRadius: 18, backgroundColor: C.card, borderWidth: 1, borderColor: C.line },
  sv: { fontFamily: F.black, fontSize: 22, color: C.ink },
  sk: { fontFamily: F.medium, fontSize: 12, color: C.ink },
  modeSeg: { flexDirection: 'row', backgroundColor: '#e8eaf0', borderRadius: 10, padding: 3 },
  modeB: { paddingHorizontal: 9, height: 30, borderRadius: 8, justifyContent: 'center' },
  modeT: { fontFamily: F.bold, fontSize: 12, color: C.ink },
  slot: { flex: 1, height: 40, borderRadius: 20, borderWidth: 1.5, borderColor: '#d5d9e3', alignItems: 'center', justifyContent: 'center' },
  slotOn: { backgroundColor: C.red, borderColor: C.red },
  slotT: { fontFamily: F.bold, fontSize: 14, color: C.ink },
  hint: { fontFamily: F.medium, fontSize: 13, color: C.ink, textAlign: 'center' },
  thumb: { width: 72, height: 96, borderRadius: 12, overflow: 'hidden', backgroundColor: '#e8eaf0', borderWidth: 2, borderColor: 'transparent' },
  thumbOn: { borderColor: C.red },
  thumbT: { position: 'absolute', left: 4, bottom: 4, fontFamily: F.bold, fontSize: 10, color: '#fff', backgroundColor: 'rgba(20,28,51,0.8)', paddingHorizontal: 5, paddingVertical: 2, borderRadius: 5, overflow: 'hidden' },
  cta: { flex: 1, height: 54, borderRadius: 27, backgroundColor: C.red, alignItems: 'center', justifyContent: 'center' },
  ctaT: { fontFamily: F.bold, fontSize: 17, color: '#fff' },
});
