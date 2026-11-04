import React, { useState } from 'react';
import { useLocalSearchParams } from 'expo-router';
import PageTitle from '../src/components/PageTitle';
import { Image, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { isCoached } from '../src/lib/access';
import { useRouter } from 'expo-router';
import { useAuth } from '../src/lib/auth';
import { C, F } from '../src/lib/theme';
import { Body, Card, Eyebrow, H1, s as ui } from '../src/components/ui';
import Screen from '../src/components/Screen';
import NoPlan from '../src/components/NoPlan';
import { plain } from '../src/lib/program';
import Poster from '../src/components/Poster';
import PageHeader from '../src/components/PageHeader';
import Pills from '../src/components/Pills';
import FullHero from '../src/components/FullHero';

const PLAN_IMG = require('../assets/hero/plan_full.jpg');
const STACK_IMG = require('../assets/hero/stack_full.jpg');
import { productImage } from '../src/lib/images';
import { mealImage } from '../src/lib/meals';
import { mealTiles, type Tile } from '../src/lib/foodPhotos';
import StackCheckCard from '../src/components/StackCheckCard';

const TABS = ['Stack', 'Meals', 'Eating out', 'Groceries', 'Overview'] as const;
type Tab = (typeof TABS)[number];

const VERDICT_COLOR: Record<string, string> = { CUT: C.red, KEEP: C.green, SWAP: C.navy, ADD: C.green };

export default function PlanDetails() {
  const { tab: t0 } = useLocalSearchParams<{ tab?: string }>();
  const { plan, profile } = useAuth();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>((TABS as readonly string[]).includes(String(t0)) ? (t0 as Tab) : 'Meals');
  if (!plan) return <NoPlan name={profile?.first_name} />;
  const saved = (plan.before ?? 0) - (plan.after ?? 0);

  return (
    <Screen header={
      <View style={{ gap: 16 }}>
        <PageTitle back title="Your plan" size={28} />
        {tab === 'Stack'
          ? <FullHero image={STACK_IMG} pills={[{ text: 'Your stack' }, ...(saved > 0 ? [{ text: `$${saved}/mo saved`, tone: 'green' as const }] : [])]}
              title="The| Stack"
              lede={`${(plan.stack || []).length} products that actually work. Everything else got cut.`} />
          : <FullHero image={PLAN_IMG} pills={[{ text: 'Your plan' }, { text: `${plan.kcal} cal · ${plan.protein}g protein`, tone: 'green' }]}
              title="Eat like| this"
              lede={isCoached(profile) || profile?.role === 'coach' ? "Built only from food you already love. Pick one option per meal and you're on plan." : plan.food === 'picked' ? "Built from the foods you picked, sized to your calories and protein. Pick one per meal and you're on plan." : "Every option is sized to your calories and protein. Pick one per meal and you're on plan."} />}
        <Pills items={TABS} value={tab} onChange={setTab} />
      </View>
    }>


      {tab === 'Overview' && (
        <>
          <Card>
            <Text style={ui.label}>Daily numbers</Text>
            <View style={st.grid}>
              <Num v={plan.kcal} l="calories" /><Num v={`${plan.protein} g`} l="protein" />
              {!!plan.fat && <Num v={`${plan.fat} g`} l="fat" />}{!!plan.carbs && <Num v={`${plan.carbs} g`} l="carbs" />}
              <Num v={plan.steps} l="steps" /><Num v={`${plan.train.d.length} days`} l="training" />
            </View>
          </Card>
          {!!plan.goal_long && <Card><Text style={ui.label}>Your goal</Text><Body>{plain(plan.goal_long)}</Body></Card>}
          {!!plan.rules?.length && (
            <Card>
              <Text style={ui.label}>Your rules</Text>
              {plan.rules.map((r, k) => <Body key={k}>{k + 1}. {plain(r)}</Body>)}
            </Card>
          )}
          {!!plan.week1?.length && (
            <Card>
              <Text style={ui.label}>Week 1 checklist</Text>
              {plan.week1.map((r, k) => <Body key={k}>• {plain(r)}</Body>)}
            </Card>
          )}
          {!!plan.injury_note && <Card style={{ borderColor: C.red }}><Text style={ui.label}>Injury note</Text><Body>{plain(plan.injury_note)}</Body></Card>}
        </>
      )}

      {tab === 'Stack' && (
        <>
          <StackCheckCard />
          {saved > 0 && (
            <Card style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View><Text style={ui.label}>Saved every month</Text><Text style={[st.big, { color: C.green }]}>${saved}</Text></View>
              <Body style={{ fontSize: 13 }}>${plan.before} → ${plan.after}</Body>
            </Card>
          )}
          <Text style={ui.label}>What you take</Text>
          {(plan.stack || []).map((x, k) => (
            <Card key={k}>
              <View style={{ flexDirection: 'row', gap: 14, alignItems: 'center' }}>
                <Poster source={productImage(x.product)} label={x.product} size={84} />
                <View style={{ flex: 1, gap: 4 }}>
                  <Text style={st.item}>{x.product}</Text>
                  <Body style={{ fontSize: 13 }}>{x.dose} · {x.when}</Body>
                  <Text style={st.macro}>{x.cost}</Text>
                </View>
              </View>
              <Body style={{ fontSize: 13 }}>{plain(x.why)}</Body>
              {!!x.buy && (
                <Pressable accessibilityRole="link" onPress={() => Linking.openURL(x.buy!)} style={st.buy}><Text style={st.buyText}>Buy here →</Text></Pressable>
              )}
              {!x.buy && !!x.buy_text && <Body style={{ fontSize: 13 }}>{x.buy_text}</Body>}
            </Card>
          ))}
          {!!plan.audit?.length && <Text style={ui.label}>Your audit</Text>}
          {(plan.audit || []).map((a, k) => (
            <Card key={k}>
              <View style={{ flexDirection: 'row', gap: 14, alignItems: 'center' }}>
                <Poster source={productImage(a.product)} label={a.product} size={72} style={a.verdict === 'CUT' ? { opacity: 0.55 } : undefined} />
                <View style={{ flex: 1, gap: 6 }}>
                  <Text style={[st.pill, { backgroundColor: VERDICT_COLOR[a.verdict] || C.ink, color: '#ffffff' }]}>{a.verdict}</Text>
                  <Text style={st.item}>{a.product}</Text>
                  <Text style={[st.macro, { color: C.ink }]}>${a.cost}/month</Text>
                </View>
              </View>
              <Body style={{ fontSize: 13 }}>{plain(a.why)}</Body>
              {!!a.instead && <Body style={{ fontSize: 13 }}>Instead: {plain(a.instead)}</Body>}
            </Card>
          ))}
        </>
      )}

      {tab === 'Meals' && (
        <>
          {!!plan.meal_note && <Body>{plain(plan.meal_note)}</Body>}
          {!isCoached(profile) && profile?.role !== 'coach' && (
            <Pressable accessibilityRole="button" onPress={() => router.push('/foods')} style={st.editFoods}>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={st.editK}>Your foods</Text>
                <Text style={st.editT}>Add or swap foods and rebuild your meals</Text>
              </View>
              <Text style={st.editChev}>›</Text>
            </Pressable>
          )}
          {(plan.meals || []).map((m, k) => (
            <Card key={k}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <Text style={st.slot}>{m.slot}</Text>
                <Text style={[ui.label, { color: C.red }]}>Pick one</Text>
              </View>
              <Body style={{ fontSize: 12 }}>{m.target}</Body>
              <View style={{ gap: 10 }}>
              {m.options.map((o, j) => (
                <View key={j} style={st.option}>
                  <MealPhoto name={o.name} ids={o.ids} fallback={mealImage(o.name, o.detail)} />
                  <Text style={st.optName}>{o.name}</Text>
                  <Body style={{ fontSize: 13 }}>{o.detail}</Body>
                  <Text style={st.macro}>{o.kcal} cal · {o.protein} protein</Text>
                </View>
              ))}
              </View>
            </Card>
          ))}
        </>
      )}

      {tab === 'Eating out' && (plan.eat_out || []).map((e, k) => (
        <Card key={k}>
          <FoodPhoto source={mealImage(e.where, e.order)} />
          <Text style={st.item}>{e.where}</Text>
          <Body style={{ fontSize: 14 }}>{e.order}</Body>
          <Text style={st.macro}>{e.kcal} cal · {e.protein} protein</Text>
        </Card>
      ))}

      {tab === 'Groceries' && (plan.grocery || []).map((g, k) => (
        <Card key={k}><Text style={ui.label}>{g.aisle}</Text><Body>{g.items}</Body></Card>
      ))}
    </Screen>
  );
}

/** Full-width food photo with rounded corners (hidden if we have no photo for it). */
const FoodPhoto = ({ source }: { source: ReturnType<typeof mealImage> }) =>
  source ? (
    <View style={st.photo}>
      <Image source={source} resizeMode="cover" accessibilityIgnoresInvertColors style={{ width: '100%', height: '100%' }} />
    </View>
  ) : null;

/** The meal's own foods, photographed: one big tile plus up to two more. */
function MealPhoto({ name, ids, fallback }: { name: string; ids?: string[]; fallback: ReturnType<typeof mealImage> }) {
  const tiles = mealTiles(name, ids);
  if (!tiles.length) return <FoodPhoto source={fallback} />;
  const T = ({ t, style }: { t: Tile; style?: any }) => (
    <View style={[{ overflow: 'hidden', backgroundColor: C.bg }, style]}>
      <Image source={t.source} resizeMode="cover" accessibilityIgnoresInvertColors style={{ width: '100%', height: '100%' }} />
      <View style={st.tileTag}><Text style={st.tileTagT} numberOfLines={1}>{t.label}</Text></View>
    </View>
  );
  return (
    <View style={[st.photo, { flexDirection: 'row', gap: 3, backgroundColor: 'transparent' }]} accessibilityLabel={`Photo: ${tiles.map((t) => t.label).join(', ')}`}>
      <T t={tiles[0]} style={{ flex: tiles.length === 3 ? 1.5 : 1 }} />
      {tiles.length === 2 && <T t={tiles[1]} style={{ flex: 1 }} />}
      {tiles.length === 3 && (
        <View style={{ flex: 1, gap: 3 }}>
          <T t={tiles[1]} style={{ flex: 1 }} />
          <T t={tiles[2]} style={{ flex: 1 }} />
        </View>
      )}
    </View>
  );
}

const Num = ({ v, l }: { v: string; l: string }) => (
  <View style={{ width: '31%', gap: 2 }}><Text style={st.num}>{v}</Text><Text style={st.numL}>{l}</Text></View>
);

const st = StyleSheet.create({
  editFoods: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 18, borderWidth: 1.5, borderColor: C.red, backgroundColor: C.card, padding: 16 },
  editK: { fontFamily: F.xbold, fontSize: 11, letterSpacing: 1.4, textTransform: 'uppercase', color: C.red },
  editT: { fontFamily: F.black, fontSize: 15, color: C.ink },
  editChev: { fontFamily: F.bold, fontSize: 30, color: C.ink, marginTop: -4 },
  tabs: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tab: { height: 38, paddingHorizontal: 14, borderRadius: 999, borderWidth: 1, borderColor: C.line, justifyContent: 'center' },
  tabText: { fontFamily: F.xbold, fontSize: 13, color: C.ink },
  grid: { flexDirection: 'row', flexWrap: 'wrap', rowGap: 14, columnGap: '3.5%' },
  num: { fontFamily: F.black, fontSize: 20, color: C.ink },
  numL: { fontFamily: F.semi, fontSize: 12, color: C.ink },
  big: { fontFamily: F.black, fontSize: 28 },
  item: { fontFamily: F.black, fontSize: 17, color: C.ink },
  slot: { fontFamily: F.black, fontSize: 22, color: C.ink },
  buy: { alignSelf: 'flex-start', height: 40, paddingHorizontal: 14, borderRadius: 10, backgroundColor: C.red, justifyContent: 'center' },
  buyText: { fontFamily: F.black, fontSize: 13, color: C.onAccent, textTransform: 'uppercase' },
  pill: { fontFamily: F.black, fontSize: 11, letterSpacing: 1, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, overflow: 'hidden', alignSelf: 'flex-start' },
  option: { borderTopWidth: 1, borderTopColor: C.line, paddingTop: 14, gap: 4 },
  tileTag: { position: 'absolute', left: 6, bottom: 6, maxWidth: '90%', backgroundColor: 'rgba(9,20,42,0.82)', borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3 },
  tileTagT: { fontFamily: F.xbold, fontSize: 11, color: '#ffffff' },
  photo: { width: '100%', aspectRatio: 16 / 10, borderRadius: 14, overflow: 'hidden', marginBottom: 8, backgroundColor: C.bg },
  optName: { fontFamily: F.xbold, fontSize: 15, color: C.ink },
  macro: { fontFamily: F.xbold, fontSize: 12, color: C.green },
});
