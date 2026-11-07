import React, { useState } from 'react';
import { Image, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import Svg, { Path } from 'react-native-svg';
import { C, F } from '../lib/theme';
import { KIND, type Verdict } from '../lib/stackcheck';
import type { Nutrition } from '../lib/scan';

const MULTS = [0.5, 1, 1.5, 2];
const r = (n: number | null | undefined) => Math.round(Number(n) || 0);

/** What we found (photo, barcode or label): check it, pick the portion, fix a number if needed, add it. */
export default function FoodResult({ kicker, base, items, photo, note, verdict, onAdd, onCancel, adding }: {
  kicker: string; base: Nutrition; items?: (Nutrition & { portion?: string })[]; photo?: string; note?: string; verdict?: Verdict | null;
  onAdd: (n: Nutrition) => void; onCancel: () => void; adding?: boolean;
}) {
  const router = useRouter();
  const [mult, setMult] = useState(1);
  const [off, setOff] = useState<Record<number, boolean>>({});
  const [kTxt, setKTxt] = useState<string | null>(null);
  const [pTxt, setPTxt] = useState<string | null>(null);
  const live = items?.length ? items.filter((_, k) => !off[k]) : null;
  const sum = (k: 'kcal' | 'protein' | 'carbs' | 'fat') => (live ? live.reduce((n, x) => n + r(x[k]), 0) : r(base[k]));
  const kcal = kTxt != null ? r(Number(kTxt)) : Math.round(sum('kcal') * mult);
  const protein = pTxt != null ? r(Number(pTxt)) : Math.round(sum('protein') * mult);
  const nutrition: Nutrition = { ...base, kcal, protein, carbs: Math.round(sum('carbs') * mult), fat: Math.round(sum('fat') * mult), name: live && live.length ? live.map((x) => x.name).slice(0, 3).join(', ') : base.name };

  return (
    <View style={st.card}>
      <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
        {!!photo && <Image source={{ uri: photo }} style={st.img} />}
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={st.k}>{kicker}</Text>
          <Text style={st.t} numberOfLines={2}>{base.name}</Text>
          {!!(base.brand || base.serving) && <Text style={st.s}>{[base.brand, base.serving && `per ${base.serving}`].filter(Boolean).join(' · ')}</Text>}
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel="Close" onPress={onCancel} hitSlop={8} style={st.x}>
          <Svg width={12} height={12} viewBox="0 0 24 24"><Path d="M6 6l12 12M18 6L6 18" stroke={C.ink} strokeWidth={3} strokeLinecap="round" /></Svg>
        </Pressable>
      </View>

      {!!verdict && (
        <Pressable accessibilityRole="button" onPress={() => router.push({ pathname: '/verdict/[id]', params: { id: verdict.id } })} style={[st.verdict, { borderColor: KIND[verdict.kind].color }]}>
          <View style={[st.vMark, { backgroundColor: KIND[verdict.kind].color }]}><Text style={st.vMarkT}>{KIND[verdict.kind].mark}</Text></View>
          <View style={{ flex: 1 }}>
            <Text style={st.vK}>BOON'S VERDICT · {verdict.name.toUpperCase()}</Text>
            <Text style={st.vT}>{KIND[verdict.kind].label}. {verdict.headline}</Text>
            {!!verdict.swap_short && <Text style={st.s}>Cheaper swap: {verdict.swap_short}</Text>}
          </View>
        </Pressable>
      )}

      {!!items?.length && (
        <View style={{ gap: 2 }}>
          {items.map((x, k) => (
            <Pressable key={k} accessibilityRole="checkbox" accessibilityState={{ checked: !off[k] }} onPress={() => { setKTxt(null); setPTxt(null); setOff({ ...off, [k]: !off[k] }); }} style={[st.item, off[k] && { opacity: 0.4 }]}>
              <View style={[st.chk, !off[k] && { backgroundColor: C.red, borderWidth: 0 }]}>
                {!off[k] && <Svg width={11} height={11} viewBox="0 0 24 24"><Path d="M5 12.5l4.5 4.5L19 7.5" stroke="#fff" strokeWidth={3.4} fill="none" strokeLinecap="round" strokeLinejoin="round" /></Svg>}
              </View>
              <View style={{ flex: 1 }}><Text style={st.itemT}>{x.name}</Text>{!!x.portion && <Text style={st.s}>{x.portion}</Text>}</View>
              <Text style={st.itemV}>{r(x.kcal)} cal · {r(x.protein)} g</Text>
            </Pressable>
          ))}
        </View>
      )}
      {!!note && <Text style={st.note}>{note}</Text>}

      {(base.kcal > 0 || base.protein > 0 || !!items?.length) && (
        <>
          <View style={st.mults}>
            <Text style={[st.s, { marginRight: 4 }]}>{items?.length ? 'Portion' : 'Servings'}</Text>
            {MULTS.map((m) => (
              <Pressable key={m} accessibilityRole="radio" accessibilityState={{ selected: mult === m }} onPress={() => { setKTxt(null); setPTxt(null); setMult(m); }} style={[st.mult, mult === m && st.multOn]}>
                <Text style={[st.multT, mult === m && { color: '#fff' }]}>{m === 0.5 ? '½' : m}×</Text>
              </Pressable>
            ))}
          </View>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Field label="Calories" value={kTxt ?? String(kcal)} onChange={setKTxt} />
            <Field label="Protein (g)" value={pTxt ?? String(protein)} onChange={setPTxt} />
          </View>
          <Pressable accessibilityRole="button" disabled={adding} onPress={() => onAdd(nutrition)} style={[st.add, adding && { opacity: 0.6 }]}>
            <Text style={st.addT}>Add to today · {kcal} cal · {protein} g</Text>
          </Pressable>
        </>
      )}
    </View>
  );
}

const Field = ({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) => (
  <View style={{ flex: 1 }}>
    <Text style={st.fl}>{label}</Text>
    <TextInput value={value} onChangeText={(t) => onChange(t.replace(/[^\d]/g, ''))} keyboardType="number-pad" style={st.fi} accessibilityLabel={label} selectTextOnFocus />
  </View>
);

const st = StyleSheet.create({
  card: { backgroundColor: C.bg, borderRadius: 22, borderWidth: 1, borderColor: C.line, padding: 16, gap: 14, shadowColor: '#141c33', shadowOpacity: 0.08, shadowRadius: 16, shadowOffset: { width: 0, height: 6 } },
  img: { width: 58, height: 58, borderRadius: 14, backgroundColor: C.card },
  k: { fontFamily: F.bold, fontSize: 11, letterSpacing: 1, color: C.red },
  t: { fontFamily: F.xbold, fontSize: 18, color: C.ink },
  s: { fontFamily: F.medium, fontSize: 13, color: C.ink },
  x: { width: 30, height: 30, borderRadius: 15, backgroundColor: '#e8eaf0', alignItems: 'center', justifyContent: 'center' },
  verdict: { flexDirection: 'row', gap: 12, alignItems: 'center', padding: 12, borderRadius: 16, borderWidth: 1.5, backgroundColor: C.card },
  vMark: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  vMarkT: { fontFamily: F.black, fontSize: 16, color: '#fff' },
  vK: { fontFamily: F.bold, fontSize: 10, letterSpacing: 0.8, color: C.ink },
  vT: { fontFamily: F.bold, fontSize: 14, lineHeight: 19, color: C.ink, marginTop: 1 },
  item: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 },
  chk: { width: 22, height: 22, borderRadius: 11, borderWidth: 1.5, borderColor: '#c3c8d4', alignItems: 'center', justifyContent: 'center' },
  itemT: { fontFamily: F.semi, fontSize: 15, color: C.ink },
  itemV: { fontFamily: F.medium, fontSize: 13, color: C.ink },
  note: { fontFamily: F.medium, fontSize: 13, lineHeight: 18, color: C.ink, backgroundColor: C.card, padding: 10, borderRadius: 12, overflow: 'hidden' },
  mults: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  mult: { minWidth: 44, height: 36, borderRadius: 18, borderWidth: 1.5, borderColor: '#d5d9e3', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 10 },
  multOn: { backgroundColor: C.navy, borderColor: C.navy },
  multT: { fontFamily: F.bold, fontSize: 14, color: C.ink },
  fl: { fontFamily: F.semi, fontSize: 12, color: C.ink, marginBottom: 4 },
  fi: { height: 48, borderRadius: 12, borderWidth: 1, borderColor: C.line, backgroundColor: C.card, paddingHorizontal: 14, fontFamily: F.bold, fontSize: 18, color: C.ink, outlineWidth: 0 } as any,
  add: { height: 52, borderRadius: 26, backgroundColor: C.red, alignItems: 'center', justifyContent: 'center' },
  addT: { fontFamily: F.bold, fontSize: 16, color: '#fff' },
});
