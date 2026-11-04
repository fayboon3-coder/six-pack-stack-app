import React, { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import Svg, { Path } from 'react-native-svg';
import { useAuth } from '../../src/lib/auth';
import { C, F } from '../../src/lib/theme';
import Page from '../../src/components/Page';
import Panel from '../../src/components/Panel';
import NoPlan from '../../src/components/NoPlan';
import ProgramsHeader from '../../src/components/ProgramsHeader';
import { addProtein, num, proteinGoal, readDay } from '../../src/lib/daily';
import { isCoached } from '../../src/lib/access';

import { readMeals, writeMeals, type MealDay } from '../../src/lib/mealsToday';
const fmt = (n: number) => Math.round(n).toLocaleString('en-US');

/** Programs · Meals: today's meals from their foods (tick and swap), eating out, groceries. */
export default function Meals() {
  const { plan, profile } = useAuth();
  const router = useRouter();
  const [day, setDay] = useState<MealDay>({ pick: {}, eaten: {} });
  const [protein, setProtein] = useState(0);

  const load = useCallback(async () => {
    setDay(await readMeals());
    setProtein((await readDay()).protein);
  }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  if (!plan) return <NoPlan name={profile?.first_name} />;
  const meals = plan.meals || [];
  const save = async (next: MealDay) => { setDay(next); await writeMeals(next); };
  const opt = (k: number) => meals[k].options[(day.pick[k] || 0) % meals[k].options.length];

  const toggle = async (k: number) => {
    const on = !day.eaten[k];
    await save({ ...day, eaten: { ...day.eaten, [k]: on } });
    const g = num(opt(k).protein);
    if (g) setProtein((await addProtein(on ? g : -g)).protein);
  };
  const swap = (k: number) => { if (day.eaten[k] || meals[k].options.length < 2) return; save({ ...day, pick: { ...day.pick, [k]: ((day.pick[k] || 0) + 1) % meals[k].options.length } }); };

  const kcalGoal = num(plan.kcal) || 2000, pg = proteinGoal(plan);
  const kcal = meals.reduce((n, _, k) => n + (day.eaten[k] ? num(opt(k).kcal) : 0), 0);
  const groceries = (plan.grocery || []).reduce((n, g) => n + g.items.split(/,|·|\n/).filter((x) => x.trim()).length, 0);
  const own = !isCoached(profile) && profile?.role !== 'coach';

  return (
    <Page header={<ProgramsHeader active="meals" />}>
      <View style={[st.card, st.totals]}>
        <Total label="Calories" v={fmt(kcal)} of={fmt(kcalGoal)} pct={kcal / kcalGoal} color="#ffb347" />
        <Total label="Protein" v={`${fmt(protein)} g`} of={`${fmt(pg)} g`} pct={protein / pg} color="#d22f26" />
      </View>

      <Panel title="Today's meals" right={plan.food === 'picked' || isCoached(profile) ? 'From your foods' : 'Tap to swap'} bodyStyle={{ paddingVertical: 2 }}>
        {meals.map((m, k) => {
          const o = opt(k); const on = !!day.eaten[k];
          return (
            <View key={k} style={[st.meal, k < meals.length - 1 && st.line]}>
              <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: on }} accessibilityLabel={`Mark ${m.slot} eaten`} hitSlop={10} onPress={() => toggle(k)}
                style={[st.check, on ? { backgroundColor: C.red, borderWidth: 0 } : null]}>
                {on && <Svg width={12} height={12} viewBox="0 0 24 24"><Path d="M5 12.5l4.5 4.5L19 7.5" stroke="#fff" strokeWidth={3.4} fill="none" strokeLinecap="round" strokeLinejoin="round" /></Svg>}
              </Pressable>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={st.when}>{m.slot.toUpperCase()}</Text>
                <Text style={st.name}>{o.name}</Text>
                <Text style={st.macros}>{o.kcal} cal · {String(o.protein).replace(/\s*g?$/, '')} g protein</Text>
              </View>
              {m.options.length > 1 && (
                <Pressable accessibilityRole="button" accessibilityLabel={`Swap ${m.slot}`} onPress={() => swap(k)} hitSlop={6} style={[st.swap, on && { opacity: 0.4 }]}>
                  <Svg width={15} height={15} viewBox="0 0 24 24"><Path d="M7 7h11l-3-3M17 17H6l3 3" stroke={C.ink} strokeWidth={2.2} fill="none" strokeLinecap="round" strokeLinejoin="round" /></Svg>
                </Pressable>
              )}
            </View>
          );
        })}
      </Panel>

      {!!plan.eat_out?.length && (
        <Panel title="Eating out" bodyStyle={{ paddingHorizontal: 0 }}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingHorizontal: 18 }}>
            {plan.eat_out.map((e, k) => (
              <Pressable key={k} onPress={() => router.push({ pathname: '/plan-details', params: { tab: 'Eating out' } })} style={st.out} accessibilityLabel={`${e.where}: ${e.order}`}>
                <Text style={st.outW}>{e.where}</Text>
                <Text style={st.outO} numberOfLines={3}>{e.order}</Text>
                <Text style={st.outM}>{num(e.kcal)} · {num(e.protein)} g</Text>
              </Pressable>
            ))}
          </ScrollView>
        </Panel>
      )}

      <Row icon={<Svg width={20} height={20} viewBox="0 0 24 24"><Path d="M3 4h2l2.5 11h11L21 7H6.5M9 20h.01M17 20h.01" stroke="#d22f26" strokeWidth={2} fill="none" strokeLinecap="round" strokeLinejoin="round" /></Svg>}
        title="Grocery list" sub={`This week · ${groceries} items`} onPress={() => router.push({ pathname: '/plan-details', params: { tab: 'Groceries' } })} />
      {!!plan.stack?.length && (
        <Row icon={<Svg width={20} height={20} viewBox="0 0 24 24"><Path d="M9 3h6v4l3 3v11H6V10l3-3z" stroke="#d22f26" strokeWidth={2} fill="none" strokeLinejoin="round" /></Svg>}
          title="Your stack" sub={`${plan.stack.length} products that work`} onPress={() => router.push({ pathname: '/plan-details', params: { tab: 'Stack' } })} />
      )}
      <Row icon={<Svg width={20} height={20} viewBox="0 0 24 24"><Path d="M5 4h14v16H5zM9 9h6M9 13h6M9 17h4" stroke="#d22f26" strokeWidth={2} fill="none" strokeLinecap="round" /></Svg>}
        title="All meal options" sub="Every option, your numbers and rules" onPress={() => router.push({ pathname: '/plan-details', params: { tab: 'Meals' } })} />
      {own && (
        <Row icon={<Svg width={20} height={20} viewBox="0 0 24 24"><Path d="M12 5v14M5 12h14" stroke="#d22f26" strokeWidth={2.2} fill="none" strokeLinecap="round" /></Svg>}
          title="Your foods" sub="Add or swap foods and rebuild your meals" onPress={() => router.push('/foods')} />
      )}
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

const Row = ({ icon, title, sub, onPress }: { icon: React.ReactNode; title: string; sub: string; onPress: () => void }) => (
  <Pressable accessibilityRole="button" onPress={onPress} style={[st.card, st.row]}>
    <View style={st.rowI}>{icon}</View>
    <View style={{ flex: 1 }}><Text style={st.rowT}>{title}</Text><Text style={st.rowS}>{sub}</Text></View>
    <Svg width={16} height={16} viewBox="0 0 24 24"><Path d="M9 5l7 7-7 7" stroke={C.ink} strokeWidth={2.4} fill="none" strokeLinecap="round" strokeLinejoin="round" /></Svg>
  </Pressable>
);

const st = StyleSheet.create({
  card: { backgroundColor: C.card, borderWidth: 1, borderColor: C.line, borderRadius: 22 },
  totals: { flexDirection: 'row', gap: 16, paddingVertical: 14, paddingHorizontal: 18 },
  tL: { fontFamily: F.semi, fontSize: 13, color: C.ink },
  tV: { fontFamily: F.xbold, fontSize: 20, color: C.ink, marginTop: 3 },
  tOf: { fontFamily: F.semi, fontSize: 14, color: C.ink },
  track: { height: 6, borderRadius: 3, backgroundColor: '#e8eaf0', marginTop: 8, overflow: 'hidden' },
  fill: { height: 6, borderRadius: 3 },
  meal: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 11 },
  line: { borderBottomWidth: 1, borderBottomColor: '#e9ebf1' },
  check: { width: 24, height: 24, borderRadius: 12, borderWidth: 1.5, borderColor: '#c3c8d4', alignItems: 'center', justifyContent: 'center', backgroundColor: C.bg },
  when: { fontFamily: F.bold, fontSize: 12, letterSpacing: 0.5, color: C.ink },
  name: { fontFamily: F.semi, fontSize: 15, color: C.ink, marginTop: 2 },
  macros: { fontFamily: F.medium, fontSize: 13, color: C.ink, marginTop: 1 },
  swap: { width: 36, height: 36, borderRadius: 18, borderWidth: 1, borderColor: '#d5d9e3', alignItems: 'center', justifyContent: 'center' },
  out: { width: 150, padding: 12, borderRadius: 14, backgroundColor: C.bg, borderWidth: 1, borderColor: C.line },
  outW: { fontFamily: F.xbold, fontSize: 15, color: C.ink },
  outO: { fontFamily: F.medium, fontSize: 13, lineHeight: 18, color: C.ink, marginTop: 4 },
  outM: { fontFamily: F.medium, fontSize: 13, color: C.ink, marginTop: 6 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, paddingHorizontal: 18 },
  rowI: { width: 40, height: 40, borderRadius: 12, backgroundColor: C.redTint, alignItems: 'center', justifyContent: 'center' },
  rowT: { fontFamily: F.bold, fontSize: 16, color: C.ink },
  rowS: { fontFamily: F.medium, fontSize: 13, color: C.ink },
});
