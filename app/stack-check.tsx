import React, { useMemo, useState } from 'react';
import { Linking, FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Svg, { Path } from 'react-native-svg';
import { useAuth } from '../src/lib/auth';
import { plain } from '../src/lib/program';
import Page from '../src/components/Page';
import PageTitle from '../src/components/PageTitle';
import { C, F } from '../src/lib/theme';
import { BackIcon, SearchIcon } from '../src/components/icons';
import AskBoonCard from '../src/components/AskBoonCard';
import { STACK_SCORE_URL } from '../src/lib/access';
import Poster from '../src/components/Poster';
import { imageFor, KIND, search, Verdict, VERDICTS } from '../src/lib/stackcheck';
import Backdrop from '../src/components/Backdrop';
import { twoTone } from '../src/components/TwoTone';

const FILTERS = ['All', 'Worth it', 'Depends', 'Skip it'] as const;

const TAG: Record<string, { label: string; fg: string; bg: string }> = {
  KEEP: { label: 'WORTH IT', fg: '#12804f', bg: '#e7f6ee' },
  SWAP: { label: 'SWAP', fg: '#a86400', bg: '#fdf3dc' },
  CUT: { label: 'WASTE', fg: '#c62f27', bg: '#fdeceb' },
};

/** Stack Check: their own audit (what's worth it and what's a waste), with the full library one tap away. */
export default function StackCheck() {
  const { plan } = useAuth();
  const { lib } = useLocalSearchParams<{ lib?: string }>();
  const router = useRouter();
  const audit = plan?.audit || [];
  if (!audit.length || lib === '1') return <Library />;
  const save = Math.max(0, (plan?.before ?? 0) - (plan?.after ?? 0)) || audit.filter((a) => a.verdict === 'CUT').reduce((n, a) => n + (Number(a.cost) || 0), 0);
  const items = audit.filter((a) => a.verdict !== 'ADD');
  const adds = audit.filter((a) => a.verdict === 'ADD');
  const n = (v: string) => audit.filter((a) => a.verdict === v).length;
  return (
    <Page tabs={false} header={<PageTitle back title="Stack Check" size={28} />}>
      <View style={[st2.card, st2.sum]}>
        <View style={{ flex: 1 }}>
          <Text style={st2.small}>You could save</Text>
          <Text><Text style={st2.save}>${save}</Text><Text style={st2.per}> / month</Text></Text>
        </View>
        <View style={{ alignItems: 'flex-end', gap: 2 }}>
          <Text style={st2.small}><Text style={{ color: '#12804f', fontFamily: F.xbold }}>{n('KEEP')}</Text> worth it</Text>
          {!!n('SWAP') && <Text style={st2.small}><Text style={{ color: '#a86400', fontFamily: F.xbold }}>{n('SWAP')}</Text> swap</Text>}
          <Text style={st2.small}><Text style={{ color: '#c62f27', fontFamily: F.xbold }}>{n('CUT')}</Text> waste</Text>
        </View>
      </View>
      {items.map((a, k) => {
        const t = TAG[a.verdict] || TAG.SWAP;
        return (
          <View key={k} style={[st2.card, { padding: 16, gap: 8 }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Text style={st2.name}>{a.product}</Text>
              <Text style={[st2.tag, { color: t.fg, backgroundColor: t.bg }]}>{t.label}</Text>
            </View>
            <Text style={st2.why}>{plain(a.why)}{a.instead ? ` ${plain(a.instead)}` : ''}{a.verdict === 'CUT' && a.cost ? <Text style={{ fontFamily: F.bold }}> Save ${a.cost}/mo.</Text> : null}</Text>
          </View>
        );
      })}
      {adds.map((a, k) => (
        <View key={'a' + k} style={[st2.card, st2.add]}>
          <View style={{ flex: 1 }}>
            <Text style={[st2.name, { fontSize: 16 }]}>Missing: {a.product}</Text>
            <Text style={st2.why}>{plain(a.why)}</Text>
          </View>
        </View>
      ))}
      <Pressable accessibilityRole="button" onPress={() => router.push({ pathname: '/stack-check', params: { lib: '1' } })} style={[st2.card, st2.add, { borderStyle: 'solid' }]}>
        <View style={{ flex: 1 }}>
          <Text style={[st2.name, { fontSize: 16 }]}>Check anything else</Text>
          <Text style={st2.why}>Search every product I've investigated.</Text>
        </View>
        <Svg width={16} height={16} viewBox="0 0 24 24"><Path d="M9 5l7 7-7 7" stroke={C.ink} strokeWidth={2.4} fill="none" strokeLinecap="round" strokeLinejoin="round" /></Svg>
      </Pressable>
      <Text style={st2.fine}>No sponsors, no affiliate links. Take anything prescribed? Keep taking it and check with your doctor.</Text>
    </Page>
  );
}

const st2 = StyleSheet.create({
  card: { backgroundColor: C.card, borderWidth: 1, borderColor: C.line, borderRadius: 18 },
  sum: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18, paddingVertical: 16 },
  small: { fontFamily: F.medium, fontSize: 14, color: C.ink },
  save: { fontFamily: F.black, fontSize: 36, color: C.ink, letterSpacing: -0.5 },
  per: { fontFamily: F.semi, fontSize: 17, color: C.ink },
  name: { flex: 1, fontFamily: F.bold, fontSize: 17, color: C.ink },
  tag: { fontFamily: F.xbold, fontSize: 12, letterSpacing: 0.8, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, overflow: 'hidden' },
  why: { fontFamily: F.medium, fontSize: 14, lineHeight: 20, color: C.ink },
  add: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 16, borderStyle: 'dashed', borderColor: '#cfd4de', backgroundColor: '#f1f3f7' },
  fine: { fontFamily: F.medium, fontSize: 13, lineHeight: 18, color: C.ink, paddingHorizontal: 4, marginTop: 4 },
});

/** Library: type any supplement or gadget, get Boon's verdict. */
function Library() {
  const router = useRouter();
  const [q, setQ] = useState('');
  const [f, setF] = useState<(typeof FILTERS)[number]>('All');
  const list = useMemo(() => search(q).filter((v) => f === 'All' || KIND[v.kind].label === f), [q, f]);
  const counts = { worth: 0, situational: 0, skip: 0 } as Record<Verdict['kind'], number>;
  VERDICTS.forEach((v) => { counts[v.kind]++; });

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }}>
      <Backdrop />
      <FlatList
        data={list}
        keyExtractor={(v) => v.id}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 48, gap: 10 }}
        ListHeaderComponent={
          <View style={{ gap: 14, paddingBottom: 6 }}>
            <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={() => router.back()} hitSlop={10} style={{ width: 40, height: 40, justifyContent: 'center' }}>
              <BackIcon />
            </Pressable>
            <Text style={st.k}>Stack Check</Text>
            <Text style={st.h}>{twoTone('Before you buy it,| check it.')}</Text>
            <Text style={st.body}>{VERDICTS.length} products I investigated for Beyond the Label. Type a brand or what it claims to do.</Text>
            <Pressable accessibilityRole="link" onPress={() => Linking.openURL(STACK_SCORE_URL)} style={st.score}>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={st.scoreK}>Free · 60 seconds</Text>
                <Text style={st.scoreT}>Score your whole stack: what to cut, keep and swap</Text>
              </View>
              <Text style={st.scoreChev}>›</Text>
            </Pressable>
            <View style={st.search}>
              <SearchIcon color={C.ink} />
              <TextInput accessibilityLabel="Search supplements" value={q} onChangeText={setQ} placeholder="AG1, C4, fat burner, creatine…"
                placeholderTextColor="#1b244077" style={st.input} autoCorrect={false} autoCapitalize="none" returnKeyType="search" />
              {!!q && <Pressable accessibilityRole="button" accessibilityLabel="Clear" onPress={() => setQ('')} hitSlop={10}><Text style={st.clear}>✕</Text></Pressable>}
            </View>
            <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
              {FILTERS.map((x) => {
                const n = x === 'All' ? VERDICTS.length : x === 'Worth it' ? counts.worth : x === 'Depends' ? counts.situational : counts.skip;
                return (
                  <Pressable key={x} accessibilityRole="button" accessibilityState={{ selected: f === x }} onPress={() => setF(x)} style={[st.chip, f === x && st.chipOn]}>
                    <Text style={st.chipText}>{x} · {n}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        }
        ListEmptyComponent={
          <View style={st.empty}>
            <Text style={st.emptyT}>Not in the library yet.</Text>
            <AskBoonCard q={`Is ${q.trim()} worth it?`} title={`Ask Stack about "${q.trim()}"`} sub="Stack, our AI, checks the label the same way I would." />
            <Text style={st.body}>Rule of thumb until it is: if the label promises fast fat loss, more testosterone or a "proprietary blend", it's almost always marketing. Water, coffee, creatine, protein and sleep cover most of what works.</Text>
          </View>
        }
        renderItem={({ item: v }) => (
          <Pressable accessibilityRole="button" accessibilityLabel={`${v.name}: ${KIND[v.kind].label}`}
            onPress={() => router.push({ pathname: '/verdict/[id]', params: { id: v.id } })} style={st.row}>
            <Poster source={imageFor(v)} label={v.name} size={52} />
            <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
              <Text style={st.name} numberOfLines={1}>{v.name}</Text>
              <Text style={st.sub} numberOfLines={1}>{v.headline}</Text>
            </View>
            <View style={[st.badge, { backgroundColor: KIND[v.kind].color }]}>
              <Text style={st.badgeText}>{KIND[v.kind].label}</Text>
            </View>
          </Pressable>
        )}
      />
    </SafeAreaView>
  );
}

const st = StyleSheet.create({
  score: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1.5, borderColor: C.green, borderRadius: 16, padding: 14, backgroundColor: 'rgba(63,191,127,0.08)' },
  scoreK: { fontFamily: F.xbold, fontSize: 11, letterSpacing: 1.4, textTransform: 'uppercase', color: C.green },
  scoreT: { fontFamily: F.black, fontSize: 15, lineHeight: 20, color: C.ink },
  scoreChev: { fontFamily: F.bold, fontSize: 28, color: C.ink, marginTop: -4 },
  k: { fontFamily: F.xbold, fontSize: 12, letterSpacing: 1.6, textTransform: 'uppercase', color: C.red },
  h: { fontFamily: F.black, fontSize: 30, lineHeight: 34, color: C.ink, textTransform: 'uppercase', letterSpacing: -0.5 },
  body: { fontFamily: F.semi, fontSize: 15, lineHeight: 22, color: C.ink },
  search: { height: 56, borderRadius: 16, backgroundColor: C.card, borderWidth: 1.5, borderColor: C.red, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16 },
  input: { flex: 1, fontFamily: F.bold, fontSize: 17, color: C.ink, minWidth: 0 },
  clear: { fontFamily: F.black, fontSize: 16, color: C.ink },
  chip: { minHeight: 40, borderRadius: 999, borderWidth: 1.5, borderColor: C.line, paddingHorizontal: 14, justifyContent: 'center' },
  chipOn: { borderColor: C.red, backgroundColor: 'rgba(226,67,59,0.18)' },
  chipText: { fontFamily: F.bold, fontSize: 13, color: C.ink },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: C.card, borderRadius: 18, borderWidth: 1, borderColor: C.line, padding: 10 },
  name: { fontFamily: F.black, fontSize: 16, color: C.ink },
  sub: { fontFamily: F.semi, fontSize: 13, color: C.ink },
  badge: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 },
  badgeText: { fontFamily: F.black, fontSize: 11, letterSpacing: 0.8, textTransform: 'uppercase', color: C.bg },
  empty: { backgroundColor: C.card, borderRadius: 18, padding: 16, gap: 8 },
  emptyT: { fontFamily: F.black, fontSize: 18, color: C.ink },
});
