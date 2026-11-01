import React, { useState } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '../../src/lib/auth';
import { C, F } from '../../src/lib/theme';
import { Body, Card, Eyebrow, H1, s as ui } from '../../src/components/ui';
import Screen from '../../src/components/Screen';
import NoPlan from '../../src/components/NoPlan';
import { plain } from '../../src/lib/program';
import Poster from '../../src/components/Poster';
import Banner from '../../src/components/Banner';
import { mealPhoto, PHOTO } from '../../src/lib/photos';
import { productImage } from '../../src/lib/images';

const TABS = ['Overview', 'Stack', 'Meals', 'Eating out', 'Groceries'] as const;
type Tab = (typeof TABS)[number];

const TAB_PHOTO: Record<Tab, string> = {
  Overview: PHOTO.plan, Stack: PHOTO.stack, Meals: PHOTO.lunch, 'Eating out': PHOTO.eatOut, Groceries: PHOTO.grocery,
};

const VERDICT_COLOR: Record<string, string> = { CUT: C.red, KEEP: C.green, SWAP: '#ffffff', ADD: C.green };

export default function PlanTab() {
  const { plan, profile } = useAuth();
  const [tab, setTab] = useState<Tab>('Overview');
  if (!plan) return <NoPlan name={profile?.first_name} />;
  const saved = (plan.before ?? 0) - (plan.after ?? 0);

  return (
    <Screen header={<Banner uri={TAB_PHOTO[tab]} eyebrow="Your plan" title={plain(plan.goal_short)} height={300} />}>

      <View style={st.tabs} accessibilityRole="tablist">
        {TABS.map((t) => (
          <Pressable key={t} accessibilityRole="tab" accessibilityState={{ selected: tab === t }} onPress={() => setTab(t)}
            style={[st.tab, tab === t && { backgroundColor: C.red, borderColor: C.red }]}>
            <Text style={st.tabText}>{t}</Text>
          </Pressable>
        ))}
      </View>

      {tab === 'Overview' && (
        <>
          <Card>
            <Text style={ui.label}>Daily numbers</Text>
            <View style={st.grid}>
              <Num v={plan.kcal} l="calories" /><Num v={`${plan.protein} g`} l="protein" />
              {!!plan.fat && <Num v={`${plan.fat} g`} l="fat" />}{!!plan.carbs && <Num v={`${plan.carbs} g`} l="carbs" />}
              <Num v={plan.steps} l="steps" /><Num v={plan.days || `${plan.train.d.length} days`} l="training" />
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
                  <Text style={[st.pill, { backgroundColor: VERDICT_COLOR[a.verdict] || C.white, color: a.verdict === 'CUT' ? C.white : C.navy }]}>{a.verdict}</Text>
                  <Text style={st.item}>{a.product}</Text>
                  <Text style={[st.macro, { color: C.white }]}>${a.cost}/month</Text>
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
          {(plan.meals || []).map((m, k) => (
            <Card key={k} style={{ padding: 0, overflow: 'hidden' }}>
              <Banner uri={mealPhoto(m.slot)} height={160} eyebrow="Pick one" title={m.slot}>
                <Text style={[ui.label, { textTransform: 'none', letterSpacing: 0 }]}>{m.target}</Text>
              </Banner>
              <View style={{ padding: 16, paddingTop: 0, gap: 10 }}>
              {m.options.map((o, j) => (
                <View key={j} style={st.option}>
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

const Num = ({ v, l }: { v: string; l: string }) => (
  <View style={{ width: '31%', gap: 2 }}><Text style={st.num}>{v}</Text><Text style={st.numL}>{l}</Text></View>
);

const st = StyleSheet.create({
  tabs: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tab: { height: 38, paddingHorizontal: 14, borderRadius: 999, borderWidth: 1, borderColor: C.line, justifyContent: 'center' },
  tabText: { fontFamily: F.xbold, fontSize: 13, color: C.white },
  grid: { flexDirection: 'row', flexWrap: 'wrap', rowGap: 14, columnGap: '3.5%' },
  num: { fontFamily: F.black, fontSize: 20, color: C.white },
  numL: { fontFamily: F.semi, fontSize: 12, color: C.white },
  big: { fontFamily: F.black, fontSize: 28 },
  item: { fontFamily: F.black, fontSize: 17, color: C.white },
  buy: { alignSelf: 'flex-start', height: 40, paddingHorizontal: 14, borderRadius: 10, backgroundColor: C.red, justifyContent: 'center' },
  buyText: { fontFamily: F.black, fontSize: 13, color: C.white, textTransform: 'uppercase' },
  pill: { fontFamily: F.black, fontSize: 11, letterSpacing: 1, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, overflow: 'hidden', alignSelf: 'flex-start' },
  option: { borderTopWidth: 1, borderTopColor: C.line, paddingTop: 10, gap: 4 },
  optName: { fontFamily: F.xbold, fontSize: 15, color: C.white },
  macro: { fontFamily: F.xbold, fontSize: 12, color: C.green },
});
