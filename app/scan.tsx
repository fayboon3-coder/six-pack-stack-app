import React, { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { C, F } from '../src/lib/theme';
import Page from '../src/components/Page';
import PageTitle from '../src/components/PageTitle';
import BarcodeCamera from '../src/components/BarcodeCamera';
import FoodResult from '../src/components/FoodResult';
import { lookupBarcode, supplementMatch, type Nutrition } from '../src/lib/scan';
import { addFood } from '../src/lib/food';
import { proteinGoal, readDay } from '../src/lib/daily';
import { afterProtein } from '../src/lib/reminders';
import { useAuth } from '../src/lib/auth';
import { track } from '../src/lib/track';
import type { Verdict } from '../src/lib/stackcheck';

/** Barcode scanner: food → calories and protein (Open Food Facts); supplements → Boon's verdict. */
export default function Scan() {
  const { plan } = useAuth();
  const router = useRouter();
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [found, setFound] = useState<(Nutrition & { image?: string }) | null>(null);
  const [verdict, setVerdict] = useState<Verdict | null>(null);
  const [miss, setMiss] = useState('');
  const [done, setDone] = useState('');

  const look = async (c: string) => {
    setBusy(true); setMiss(''); setFound(null); setVerdict(null); setDone(''); setCode(c);
    const p = process.env.EXPO_PUBLIC_DEMO === '1'
      ? { name: 'Greek Nonfat Yogurt, Plain', brand: 'Fage', serving: '1 container (170 g)', per: 'serving' as const, kcal: 90, protein: 18, carbs: 5, fat: 0 }
      : await lookupBarcode(c);
    setBusy(false);
    track('barcode_scan', { found: !!p });
    if (!p) { setMiss("Couldn't find that one. Snap the label instead and Stack will read it."); return; }
    setFound(p);
    const cats = String((p as any).categories || '').toLowerCase();
    const sup = /supplement|vitamin|protein powder|creatine|pre-workout|sport/.test(cats) || p.kcal === 0;
    setVerdict(sup ? supplementMatch(p.name, `${p.name} ${p.brand || ''}`) : null);
  };

  const add = async (n: Nutrition) => {
    await addFood({ name: n.brand ? `${n.name} (${n.brand})` : n.name, kcal: n.kcal, protein: n.protein, carbs: n.carbs, fat: n.fat, source: 'barcode' });
    track('food_logged', { source: 'barcode' });
    if (plan) { const d = await readDay(); afterProtein(d.protein, proteinGoal(plan)).catch(() => {}); }
    setDone(`${n.name} added. ${n.kcal} cal · ${n.protein} g protein.`);
    setFound(null); setCode('');
  };

  return (
    <Page tabs={false} header={<PageTitle back title="Scan" sub="Point at the barcode. It reads on its own." size={26} />}>
      <BarcodeCamera onCode={look} paused={busy || !!found} />
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <TextInput value={code} onChangeText={(t) => setCode(t.replace(/\D/g, ''))} placeholder="Or type the barcode number" placeholderTextColor={C.muted}
          keyboardType="number-pad" style={st.in} accessibilityLabel="Barcode number" onSubmitEditing={() => code && look(code)} />
        <Pressable accessibilityRole="button" disabled={code.length < 6 || busy} onPress={() => look(code)} style={[st.go, (code.length < 6 || busy) && { opacity: 0.5 }]}>
          {busy ? <ActivityIndicator color="#fff" /> : <Text style={st.goT}>Look up</Text>}
        </Pressable>
      </View>
      {!!miss && (
        <View style={st.miss}>
          <Text style={st.missT}>{miss}</Text>
          <Pressable accessibilityRole="button" onPress={() => router.replace({ pathname: '/log-food', params: { go: 'label' } })} style={st.missB}><Text style={st.missBT}>Snap the label</Text></Pressable>
        </View>
      )}
      {!!done && <Text style={st.done}>{done}</Text>}
      {found && <FoodResult kicker={verdict ? 'SUPPLEMENT' : 'BARCODE'} photo={found.image} base={found} verdict={verdict}
        note={found.per === '100g' ? 'Numbers are per 100 g (no serving size on file). Adjust if you had more or less.' : undefined}
        onCancel={() => { setFound(null); setCode(''); }} onAdd={add} />}
      <Text style={st.fine}>Food data from Open Food Facts, a free public database. Check the label if something looks off.</Text>
    </Page>
  );
}

const st = StyleSheet.create({
  in: { flex: 1, minWidth: 0, height: 50, borderRadius: 14, borderWidth: 1, borderColor: C.line, backgroundColor: C.card, paddingHorizontal: 14, fontFamily: F.semi, fontSize: 16, color: C.ink, outlineWidth: 0 } as any,
  go: { height: 50, paddingHorizontal: 18, borderRadius: 25, backgroundColor: C.navy, alignItems: 'center', justifyContent: 'center' },
  goT: { fontFamily: F.bold, fontSize: 15, color: '#fff' },
  miss: { padding: 14, borderRadius: 16, backgroundColor: C.redTint, gap: 10 },
  missT: { fontFamily: F.semi, fontSize: 14, lineHeight: 20, color: C.ink },
  missB: { alignSelf: 'flex-start', height: 40, paddingHorizontal: 16, borderRadius: 20, backgroundColor: C.red, justifyContent: 'center' },
  missBT: { fontFamily: F.bold, fontSize: 14, color: '#fff' },
  done: { fontFamily: F.bold, fontSize: 15, color: C.green, textAlign: 'center' },
  fine: { fontFamily: F.medium, fontSize: 12, color: C.muted, textAlign: 'center' },
});
