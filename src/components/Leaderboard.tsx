import React, { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import Svg, { Path } from 'react-native-svg';
import { C, F } from '../lib/theme';
import { supabase } from '../lib/supabase';
import { setOnLeaderboard, stepsLeaderboard, type Leader } from '../lib/daily';
import Panel from './Panel';

const fmt = (n: number) => Math.round(n).toLocaleString('en-US');
const RING = { 1: '#a86400', 2: C.navy, 3: '#c98a5a' } as Record<number, string>;

/** Weekly steps leaderboard. Opt-in: only first names and weekly steps are shown. Hidden if the server isn't set up. */
export default function Leaderboard({ userId }: { userId: string }) {
  const [rows, setRows] = useState<Leader[] | null>(null);
  const [joined, setJoined] = useState<boolean | null>(null);
  const [more, setMore] = useState(false);

  const load = useCallback(async () => {
    setRows(await stepsLeaderboard());
    try { const { data } = await supabase.from('profiles').select('on_leaderboard').eq('id', userId).maybeSingle(); setJoined(!!(data as any)?.on_leaderboard); } catch { setJoined(false); }
  }, [userId]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  if (!rows || joined == null) return null;
  const join = async () => { if (await setOnLeaderboard(true)) load(); };

  if (!joined) return (
    <Panel title="Steps leaderboard" bodyStyle={{ gap: 12 }}>
      <Text style={st.body}>See how your steps stack up against other members this week. Only your first name and weekly steps show.</Text>
      <Pressable accessibilityRole="button" onPress={join} style={st.join}><Text style={st.joinT}>Join the leaderboard</Text></Pressable>
    </Panel>
  );

  const top = rows.filter((r) => r.rank <= 3).slice(0, 3);
  const podium = [top.find((r) => r.rank === 2) || top[1], top.find((r) => r.rank === 1) || top[0], top.find((r) => r.rank === 3) || top[2]].filter(Boolean) as Leader[];
  const rest = rows.filter((r) => !top.includes(r) && !r.is_me);
  const me = rows.find((r) => r.is_me);
  const list = more ? rest : rest.slice(0, 1);

  return (
    <Panel title="Steps leaderboard" onMore={() => setMore(!more)} bodyStyle={{ paddingHorizontal: 0, paddingVertical: 0 }}>
      <View style={st.podium}>
        {podium.map((r) => {
          const first = r.rank === 1;
          return (
            <View key={r.rank + r.first_name} style={{ flex: 1, alignItems: 'center', gap: 6 }}>
              {first && <Svg width={22} height={22} viewBox="0 0 24 24"><Path d="M8 4h8v5a4 4 0 0 1-8 0zM8 6H5a3 3 0 0 0 3 4M16 6h3a3 3 0 0 1-3 4M12 13v4M8 20h8" stroke="#a86400" strokeWidth={2} fill="none" strokeLinecap="round" strokeLinejoin="round" /></Svg>}
              <View style={[st.av, first && st.avBig, { borderColor: RING[r.rank] || C.navy }]}><Text style={[st.avT, first && { fontSize: 24 }]}>{r.first_name.slice(0, 1).toUpperCase()}</Text></View>
              <Text style={[st.rank, { color: RING[r.rank] || C.ink }]}>#{r.rank}</Text>
              <Text style={st.name} numberOfLines={1}>{r.is_me ? 'You' : r.first_name}</Text>
              <Text style={st.steps}>{fmt(r.steps)}</Text>
            </View>
          );
        })}
      </View>
      <View style={st.sep}><View style={st.hr} /><Text style={st.sepT}>THIS WEEK</Text><View style={st.hr} /></View>
      <View style={{ paddingHorizontal: 18, paddingTop: 4, paddingBottom: 8 }}>
        {list.map((r) => <Row key={r.rank + r.first_name} r={r} />)}
        {!!me && !top.includes(me) && <Row r={me} me />}
      </View>
      {rest.length > 1 && (
        <Pressable accessibilityRole="button" onPress={() => setMore(!more)} style={{ paddingTop: 6, paddingBottom: 16 }}>
          <Text style={st.more}>{more ? 'Show less' : 'Show more'}</Text>
        </Pressable>
      )}
    </Panel>
  );
}

const Row = ({ r, me }: { r: Leader; me?: boolean }) => (
  <View style={[st.row, me && st.meRow]}>
    <Text style={st.rowN}>{r.rank}</Text>
    <Text style={[st.rowT, me && { fontFamily: F.bold }]}>{me ? 'You' : r.first_name}</Text>
    <Text style={st.rowS}>{fmt(r.steps)}</Text>
  </View>
);

const st = StyleSheet.create({
  body: { fontFamily: F.medium, fontSize: 14, lineHeight: 20, color: C.ink },
  join: { height: 48, borderRadius: 24, backgroundColor: C.navy, alignItems: 'center', justifyContent: 'center' },
  joinT: { fontFamily: F.bold, fontSize: 16, color: C.onAccent },
  podium: { flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: 18, paddingTop: 18, paddingBottom: 6 },
  av: { width: 62, height: 62, borderRadius: 31, backgroundColor: '#e8eaf0', borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  avBig: { width: 78, height: 78, borderRadius: 39 },
  avT: { fontFamily: F.xbold, fontSize: 20, color: C.ink },
  rank: { fontFamily: F.xbold, fontSize: 12 },
  name: { fontFamily: F.bold, fontSize: 15, color: C.ink, marginTop: -2 },
  steps: { fontFamily: F.xbold, fontSize: 15, color: C.ink },
  sep: { flexDirection: 'row', alignItems: 'center', gap: 12, marginHorizontal: 18, marginTop: 10 },
  hr: { flex: 1, height: 1, backgroundColor: C.line },
  sepT: { fontFamily: F.bold, fontSize: 12, letterSpacing: 1, color: C.ink },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
  meRow: { paddingHorizontal: 12, marginHorizontal: -12, borderRadius: 12, backgroundColor: C.redTint, borderWidth: 1, borderColor: '#f3c9c6' },
  rowN: { width: 22, fontFamily: F.xbold, fontSize: 16, color: C.ink },
  rowT: { flex: 1, fontFamily: F.medium, fontSize: 16, color: C.ink },
  rowS: { fontFamily: F.bold, fontSize: 16, color: C.ink },
  more: { fontFamily: F.bold, fontSize: 15, color: C.ink, textAlign: 'center', textDecorationLine: 'underline' },
});
