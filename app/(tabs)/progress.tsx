import React, { useCallback, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import Svg, { Circle, Line, Polyline } from 'react-native-svg';
import { useAuth } from '../../src/lib/auth';
import { supabase } from '../../src/lib/supabase';
import { C, F } from '../../src/lib/theme';
import { Body, Button, Card, Eyebrow, H1, s as ui } from '../../src/components/ui';
import Screen from '../../src/components/Screen';
import NoPlan from '../../src/components/NoPlan';
import { daysToSunday, weekOf } from '../../src/lib/program';
import type { Checkin } from '../../src/lib/types';

const W = 320, H = 90;

export default function Progress() {
  const { plan, profile, session } = useAuth();
  const router = useRouter();
  const [rows, setRows] = useState<Checkin[]>([]);

  useFocusEffect(useCallback(() => {
    if (!session) return;
    supabase.from('checkins').select('id,week,checkin_date,weight,workouts,nutrition_days,energy,win')
      .eq('user_id', session.user.id).order('checkin_date', { ascending: true })
      .then(({ data }) => setRows((data as Checkin[]) || []));
  }, [session]));

  if (!plan) return <NoPlan name={profile?.first_name} />;
  const week = weekOf(plan.train.s);
  const weights = rows.filter((r) => r.weight != null).map((r) => Number(r.weight));
  const first = weights[0], latest = weights[weights.length - 1], prev = weights[weights.length - 2];
  const min = Math.min(...weights), max = Math.max(...weights);
  const pts = weights.map((w, k) => {
    const x = weights.length === 1 ? W / 2 : 8 + (k * (W - 16)) / (weights.length - 1);
    const y = max === min ? H / 2 : 8 + ((max - w) * (H - 24)) / (max - min);
    return [x, y];
  });
  const fmt = (n: number) => `${n > 0 ? '+' : n < 0 ? '−' : ''}${Math.abs(n).toFixed(1)}`;
  const toSunday = daysToSunday();

  return (
    <Screen>
      <View style={{ gap: 4, marginTop: 8 }}>
        <Eyebrow>Week {week} of 12</Eyebrow>
        <H1>Your progress</H1>
      </View>

      <Card>
        {weights.length ? (
          <>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' }}>
              <View><Text style={ui.label}>Latest average</Text><Text style={st.big}>{latest} <Text style={st.unit}>lbs</Text></Text></View>
              <View style={{ alignItems: 'flex-end' }}>
                {prev != null && <Text style={[st.delta, { color: latest <= prev ? C.green : C.white }]}>{fmt(latest - prev)} this week</Text>}
                <Text style={st.sub}>{fmt(latest - first)} since start</Text>
              </View>
            </View>
            <Svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} accessibilityLabel={`Weight trend from ${first} to ${latest} pounds`}>
              <Line x1={0} y1={H - 8} x2={W} y2={H - 8} stroke={C.line} strokeWidth={1} />
              {pts.length > 1 && <Polyline points={pts.map((p) => p.join(',')).join(' ')} fill="none" stroke={C.green} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />}
              {pts.length > 0 && <Circle cx={pts[pts.length - 1][0]} cy={pts[pts.length - 1][1]} r={5} fill={C.green} />}
            </Svg>
          </>
        ) : (
          <>
            <Text style={ui.label}>Weight trend</Text>
            <Body>Your trend shows up after your first Sunday check-in.</Body>
          </>
        )}
      </Card>

      <Button title={toSunday === 0 ? 'Do your Sunday check-in' : `Check-in · Sunday (${toSunday} days)`} onPress={() => router.push('/checkin')} />

      {[...rows].reverse().map((r) => (
        <Card key={r.id}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={st.item}>Week {r.week}</Text>
            <Text style={st.sub}>{r.checkin_date}</Text>
          </View>
          <Body style={{ fontSize: 13 }}>
            {r.weight != null ? `${r.weight} lbs` : 'No weight'} · {r.workouts ?? '–'}/4 workouts · {r.nutrition_days ?? '–'}/7 days on plan
          </Body>
          {!!r.win && <Body style={{ fontSize: 13 }}>Win: {r.win}</Body>}
        </Card>
      ))}
    </Screen>
  );
}

const st = StyleSheet.create({
  big: { fontFamily: F.black, fontSize: 30, color: C.white },
  unit: { fontFamily: F.bold, fontSize: 14, color: C.white },
  delta: { fontFamily: F.black, fontSize: 14 },
  sub: { fontFamily: F.bold, fontSize: 12, color: C.white },
  item: { fontFamily: F.black, fontSize: 16, color: C.white },
});
