import React, { useCallback, useMemo, useState } from 'react';
import { Image, StyleSheet, Text, View, ScrollView } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle, Path } from 'react-native-svg';
import { useAuth } from '../../src/lib/auth';
import { E, F } from '../../src/lib/theme';
import NoPlan from '../../src/components/NoPlan';
import ProgramsHeader from '../../src/components/ProgramsHeader';
import { addProtein, num, proteinGoal, readDay } from '../../src/lib/daily';
import { isCoached } from '../../src/lib/access';
import { CoachCard } from '../../src/components/Coach';
import { readMeals, writeMeals, type MealDay } from '../../src/lib/mealsToday';
import { readFood } from '../../src/lib/food';
import { afterProtein } from '../../src/lib/reminders';
import { mealImage } from '../../src/lib/meals';
import { foodsWithPhotos, picFor } from '../../src/lib/foodMatch';
import MealCard from '../../src/components/MealCard';
import Pic from '../../src/components/Pic';
import { FoodThumb } from '../../src/components/FoodTiles';
import { Bar, CountUp, Drift, Marquee, MotionScroll, Press, Reveal } from '../../src/components/motion';
import { FuelCard } from '../../src/components/Fuel';
import { track } from '../../src/lib/track';

const fmt = (n: number) => Math.round(n).toLocaleString('en-US');

/** Programs · Meals: today's meals as photos of their foods (tick, swap), food logging, eating out, groceries. */
export default function Meals() {
  const { plan, profile } = useAuth();
  const router = useRouter();
  const [day, setDay] = useState<MealDay>({ pick: {}, eaten: {} });
  const [protein, setProtein] = useState(0);
  const [logged, setLogged] = useState<{ kcal: number; n: number }>({ kcal: 0, n: 0 });

  const load = useCallback(async () => {
    setDay(await readMeals());
    setProtein((await readDay()).protein);
    const f = await readFood(); setLogged({ kcal: f.reduce((n, x) => n + (x.kcal || 0), 0), n: f.length });
  }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  // Every food the plan is built from, each with its photo (for the moving strip).
  const pantry = useMemo(() => {
    const seen = new Map<string, { label: string; source: any; hd?: string }>();
    (plan?.meals || []).forEach((m) => m.options.forEach((o) => foodsWithPhotos(o.name, o.detail, o.ids).forEach((f) => { if (!seen.has(f.id)) seen.set(f.id, f); })));
    return [...seen.values()];
  }, [plan?.meals]);

  if (!plan) return <NoPlan name={profile?.first_name} />;
  const meals = plan.meals || [];
  const save = async (next: MealDay) => { setDay(next); await writeMeals(next); };
  const opt = (k: number) => meals[k].options[(day.pick[k] || 0) % meals[k].options.length];

  const toggle = async (k: number) => {
    const on = !day.eaten[k];
    await save({ ...day, eaten: { ...day.eaten, [k]: on } });
    const g = num(opt(k).protein);
    if (g) { const d = await addProtein(on ? g : -g); setProtein(d.protein); if (plan) afterProtein(d.protein, proteinGoal(plan)).catch(() => {}); }
    track('meal_tick', { where: 'meals', on });
  };
  const swap = (k: number) => { if (day.eaten[k] || meals[k].options.length < 2) return; save({ ...day, pick: { ...day.pick, [k]: ((day.pick[k] || 0) + 1) % meals[k].options.length } }); };

  const kcalGoal = num(plan.kcal) || 2000, pg = proteinGoal(plan);
  const kcal = meals.reduce((n, _, k) => n + (day.eaten[k] ? num(opt(k).kcal) : 0), 0) + logged.kcal;
  const groceryItems = (plan.grocery || []).flatMap((g) => g.items.split(/,|·|\n/).map((x) => x.trim()).filter(Boolean));
  const own = !isCoached(profile) && profile?.role !== 'coach';
  const eatenN = meals.filter((_, k) => day.eaten[k]).length;

  return (
    <View style={{ flex: 1, backgroundColor: E.paper }}>
      <ProgramsHeader active="meals" />
      <MotionScroll keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets contentContainerStyle={{ paddingBottom: 140 }} showsVerticalScrollIndicator={false}>
        {/* Today's numbers */}
        <Reveal style={[st.gutter, { marginTop: 18 }]}>
          <FuelCard kcal={kcal} kGoal={kcalGoal} protein={protein} pGoal={pg} onLogged={load} where="meals"
            parts={meals.map((m, k) => ({ label: m.slot, kcal: num(opt(k).kcal), done: !!day.eaten[k] })).filter((x) => x.kcal > 0)} />
        </Reveal>

        {/* The foods it's built from, gliding by */}
        {pantry.length >= 5 && (
          <Reveal delay={80} style={{ marginTop: 26 }}>
            <Text style={[st.k, st.gutter, { marginBottom: 12 }]}>{plan.food === 'picked' ? 'BUILT FROM THE FOODS YOU PICKED' : 'BUILT FROM FOODS YOU LIKE'}</Text>
            <Marquee speed={26} gap={14}>
              {pantry.map((f) => (
                <View key={f.label} style={st.pantry}>
                  <FoodThumb source={f.source} hd={f.hd} size={64} round />
                  <Text style={st.pantryT} numberOfLines={1}>{f.label}</Text>
                </View>
              ))}
            </Marquee>
          </Reveal>
        )}

        {/* Today's meals */}
        <View style={[st.gutter, st.head]}>
          <Text style={st.h} accessibilityRole="header">Today’s meals</Text>
          <Text style={st.hR}>{eatenN} of {meals.length} eaten</Text>
        </View>
        <View style={[st.gutter, { gap: 14 }]}>
          {meals.map((m, k) => (
            <Reveal key={k} delay={k * 60}>
              <MealCard slot={m.slot} opt={opt(k)} eaten={!!day.eaten[k]} onToggle={() => toggle(k)} onSwap={() => swap(k)} canSwap={m.options.length > 1}
                count={m.options.length} index={(day.pick[k] || 0) % m.options.length}
                onOpen={() => router.push({ pathname: '/plan-details', params: { tab: 'Meals' } })} />
            </Reveal>
          ))}
        </View>

        {/* Log anything else */}
        <Reveal style={[st.gutter, { marginTop: 22 }]}>
          <Press accessibilityRole="button" onPress={() => router.push('/log-food')} style={st.log}>
            <View style={st.logPic}>
              <Drift source={mealImage('chicken rice bowl')!} style={StyleSheet.absoluteFill} />
              <LinearGradient colors={['rgba(16,23,42,0.1)', 'rgba(16,23,42,0.85)']} style={StyleSheet.absoluteFill} />
              <View style={st.logIn}>
                <Text style={st.logK}>LOG FOOD{logged.n ? ` · ${logged.n} LOGGED TODAY` : ''}</Text>
                <Text style={st.logT}>Snap it, scan it, done.</Text>
                <Text style={st.logS}>Photo, barcode or label. It counts toward today in seconds.</Text>
              </View>
              <View style={st.cam}>
                <Svg width={22} height={22} viewBox="0 0 24 24"><Path d="M3.5 8.5a2 2 0 0 1 2-2h2.2l1.6-2.5h5.4l1.6 2.5h2.2a2 2 0 0 1 2 2V18a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2z" stroke={E.ink} strokeWidth={2} fill="none" strokeLinejoin="round" /><Circle cx={12} cy={13} r={3.6} stroke={E.ink} strokeWidth={2} fill="none" /></Svg>
              </View>
            </View>
          </Press>
        </Reveal>

        {/* Eating out */}
        {!!plan.eat_out?.length && (
          <>
            <View style={[st.gutter, st.head]}>
              <Text style={st.h} accessibilityRole="header">Eating out</Text>
              <Press accessibilityRole="button" onPress={() => router.push({ pathname: '/plan-details', params: { tab: 'Eating out' } })}><Text style={st.hLink}>All orders</Text></Press>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingHorizontal: 20 }}>
              {plan.eat_out.map((e, k) => (
                <Reveal key={k} delay={k * 70}>
                  <Press accessibilityRole="button" accessibilityLabel={`${e.where}: ${e.order}`} onPress={() => router.push({ pathname: '/plan-details', params: { tab: 'Eating out' } })} style={st.out}>
                    <View style={st.outPic}>
                      {mealImage(e.where, e.order) ? <Pic source={mealImage(e.where, e.order)} style={st.fill} /> : null}
                      <LinearGradient colors={['rgba(16,23,42,0)', 'rgba(16,23,42,0.75)']} style={StyleSheet.absoluteFill} />
                      <Text style={st.outW}>{e.where}</Text>
                    </View>
                    <View style={{ padding: 12, gap: 6 }}>
                      <Text style={st.outO} numberOfLines={3}>{e.order}</Text>
                      <Text style={st.outM}>{fmt(num(e.kcal))} cal · {num(e.protein)} g protein</Text>
                    </View>
                  </Press>
                </Reveal>
              ))}
            </ScrollView>
            <Text style={[st.gutter, st.credit]}>Example dishes, not the restaurants' own photos. Six-Pack Stack isn't affiliated with any restaurant.</Text>
          </>
        )}

        {/* Groceries */}
        <View style={[st.gutter, st.head]}><Text style={st.h} accessibilityRole="header">Your list</Text></View>
        <View style={[st.gutter, { gap: 10 }]}>
          {!!groceryItems.length && (
            <Reveal>
              <Press accessibilityRole="button" onPress={() => router.push({ pathname: '/plan-details', params: { tab: 'Groceries' } })} style={st.row}>
                <View style={st.stackPics}>
                  {groceryItems.slice(0, 4).map((g, k) => (
                    <View key={g} style={[st.stackPic, { marginLeft: k ? -14 : 0, zIndex: 10 - k }]}><FoodThumb {...picFor(g)} size={40} round /></View>
                  ))}
                </View>
                <View style={{ flex: 1 }}><Text style={st.rowT}>Grocery list</Text><Text style={st.rowS}>{groceryItems.length} items, every one pictured</Text></View>
                <Arrow />
              </Press>
            </Reveal>
          )}
          {[
            ...(plan.stack?.length ? [{ t: 'Your stack', s: `${plan.stack.length} products that work`, tab: 'Stack' }] : []),
            { t: 'Every meal option', s: 'All your options, your numbers and the rules', tab: 'Meals' },
          ].map((r, k) => (
            <Reveal key={r.t} delay={(k + 1) * 50}>
              <Press accessibilityRole="button" onPress={() => router.push({ pathname: '/plan-details', params: { tab: r.tab } })} style={st.row}>
                <View style={{ flex: 1 }}><Text style={st.rowT}>{r.t}</Text><Text style={st.rowS}>{r.s}</Text></View>
                <Arrow />
              </Press>
            </Reveal>
          ))}
          {own && (
            <Reveal delay={150}>
              <Press accessibilityRole="button" onPress={() => router.push('/foods')} style={st.row}>
                <View style={{ flex: 1 }}><Text style={st.rowT}>Your foods</Text><Text style={st.rowS}>Add or swap foods and rebuild your meals</Text></View>
                <Arrow />
              </Press>
            </Reveal>
          )}
          <View style={{ marginTop: 10 }}>
            <CoachCard where="meals" title="Meals built around your actual week"
              body="Late shifts, date nights, weekends away. With 1:1 coaching I build your meals around your life and adjust them every Sunday. Text me from any restaurant." />
          </View>
        </View>
      </MotionScroll>
    </View>
  );
}

const Arrow = () => <Svg width={14} height={14} viewBox="0 0 24 24"><Path d="M9 5.5l6.5 6.5L9 18.5" stroke={E.ink} strokeWidth={2.4} fill="none" strokeLinecap="round" strokeLinejoin="round" /></Svg>;

const st = StyleSheet.create({
  credit: { fontFamily: F.medium, fontSize: 11, lineHeight: 15, color: E.faint, marginTop: 8 },
  fill: { position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' },
  gutter: { paddingHorizontal: 20 },
  totals: { flexDirection: 'row', gap: 16, marginTop: 18, padding: 18, borderRadius: 22, backgroundColor: E.surface, borderWidth: 1, borderColor: E.hair },
  vHair: { width: 1, backgroundColor: E.hair },
  k: { fontFamily: F.bold, fontSize: 10.5, letterSpacing: 1.4, color: E.sub },
  bigRow: { flexDirection: 'row', alignItems: 'baseline', gap: 5, marginTop: 6, marginBottom: 12 },
  big: { fontFamily: F.black, fontSize: 32, letterSpacing: -1.2, color: E.ink, fontVariant: ['tabular-nums'] },
  of: { fontFamily: F.semi, fontSize: 13, color: E.sub },
  pantry: { width: 76, alignItems: 'center', gap: 7 },
  pantryT: { fontFamily: F.semi, fontSize: 11.5, color: E.ink, textAlign: 'center' },
  head: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: 32, marginBottom: 14 },
  h: { fontFamily: F.xbold, fontSize: 24, letterSpacing: -0.7, color: E.ink },
  hR: { fontFamily: F.semi, fontSize: 13, color: E.sub },
  hLink: { fontFamily: F.semi, fontSize: 14, color: E.ink },
  log: { borderRadius: 24, overflow: 'hidden' },
  logPic: { height: 180, backgroundColor: E.ink, justifyContent: 'flex-end' },
  logIn: { padding: 18, paddingRight: 80 },
  logK: { fontFamily: F.bold, fontSize: 10.5, letterSpacing: 1.4, color: '#ff8a80' },
  logT: { fontFamily: F.black, fontSize: 24, letterSpacing: -0.6, color: '#fff', marginTop: 4 },
  logS: { fontFamily: F.medium, fontSize: 13.5, lineHeight: 19, color: 'rgba(255,255,255,0.86)', marginTop: 3 },
  cam: { position: 'absolute', right: 18, bottom: 18, width: 50, height: 50, borderRadius: 25, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  out: { width: 230, borderRadius: 20, overflow: 'hidden', backgroundColor: E.surface, borderWidth: 1, borderColor: E.hair },
  outPic: { height: 120, backgroundColor: E.ink, justifyContent: 'flex-end' },
  outW: { fontFamily: F.black, fontSize: 19, letterSpacing: -0.4, color: '#fff', padding: 12 },
  outO: { fontFamily: F.medium, fontSize: 13.5, lineHeight: 19, color: E.ink },
  outM: { fontFamily: F.bold, fontSize: 12.5, color: E.sub },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 15, paddingHorizontal: 16, borderRadius: 20, backgroundColor: E.surface, borderWidth: 1, borderColor: E.hair },
  rowT: { fontFamily: F.bold, fontSize: 16, color: E.ink },
  rowS: { fontFamily: F.medium, fontSize: 13, color: E.sub, marginTop: 2 },
  stackPics: { flexDirection: 'row' },
  stackPic: { borderRadius: 22, borderWidth: 2, borderColor: E.surface },
});
