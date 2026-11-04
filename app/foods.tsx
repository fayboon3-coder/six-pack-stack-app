import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { supabase } from '../src/lib/supabase';
import { useAuth } from '../src/lib/auth';
import { C, F } from '../src/lib/theme';
import { Button } from '../src/components/ui';
import { BackIcon } from '../src/components/icons';
import Backdrop from '../src/components/Backdrop';
import { twoTone } from '../src/components/TwoTone';
import FoodPicker from '../src/components/FoodPicker';
import { foodsOf } from '../src/lib/quiz';
import { buildFoodGrocery, buildFoodPlan, whatsMissing } from '../src/lib/mealplan';
import { foodById, type Food } from '../src/data/foods';

const num = (s?: string) => Number(String(s || '').replace(/[^\d.]/g, '')) || 0;

/** Change the foods your meal plan is built from. Rebuilds every meal on save. */
export default function Foods() {
  const router = useRouter();
  const { plan, profile, session, refresh } = useAuth();
  const quiz = (profile?.quiz || {}) as any;
  const [ids, setIds] = useState<string[]>(() => foodsOf(quiz));
  const [custom, setCustom] = useState<Food[]>(() => quiz.custom_foods || []);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  const chosen = useMemo(() => ids.map((id) => custom.find((f) => f.id === id) || foodById(id)).filter(Boolean) as Food[], [ids, custom]);
  const missing = whatsMissing(chosen);

  const save = async () => {
    if (!plan || !session) return;
    if (missing.length) return setMsg(`Add ${missing.join(', ')} so every meal has options.`);
    setBusy(true); setMsg('');
    const kcal = num(plan.kcal), protein = num(plan.protein);
    const fp = buildFoodPlan(kcal, protein, ids, custom);
    const next = { ...plan, meals: fp.meals, grocery: buildFoodGrocery(fp.meals, ids, custom), food: 'picked' as const };
    const [{ error }] = await Promise.all([
      supabase.from('plans').update({ data: next }).eq('user_id', session.user.id).eq('active', true),
      supabase.from('profiles').update({ quiz: { ...quiz, foods: ids, custom_foods: custom } }).eq('id', session.user.id),
    ]);
    setBusy(false);
    if (error) return setMsg("That didn't save. Check your connection and try again.");
    await refresh();
    router.back();
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }}>
      <Backdrop />
      <ScrollView contentContainerStyle={{ padding: 20, gap: 16, paddingBottom: 48 }} keyboardShouldPersistTaps="handled">
        <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={() => router.back()} hitSlop={10} style={{ width: 40, height: 40, justifyContent: 'center' }}>
          <BackIcon />
        </Pressable>
        <Text style={st.k}>Your meal plan</Text>
        <Text style={st.h}>{twoTone('Your| foods')}</Text>
        <Text style={st.body}>Add or remove anything. Every meal gets rebuilt from this list, sized to {plan?.kcal || 'your'} calories and {plan?.protein || 'your'} g of protein.</Text>
        <FoodPicker ids={ids} custom={custom} onChange={(a, b) => { setMsg(''); setIds(a); setCustom(b); }} />
        {!!msg && <Text style={[st.body, { color: C.red }]}>{msg}</Text>}
        <Button title={busy ? 'Building your meals…' : 'Rebuild my meals'} onPress={save} />
      </ScrollView>
    </SafeAreaView>
  );
}

const st = StyleSheet.create({
  k: { fontFamily: F.xbold, fontSize: 12, letterSpacing: 1.6, textTransform: 'uppercase', color: C.red },
  h: { fontFamily: F.black, fontSize: 32, lineHeight: 36, color: C.ink, letterSpacing: -0.5 },
  body: { fontFamily: F.semi, fontSize: 15, lineHeight: 22, color: C.ink },
});
