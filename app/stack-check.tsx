import React, { useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { C, F } from '../src/lib/theme';
import { BackIcon, SearchIcon } from '../src/components/icons';
import Poster from '../src/components/Poster';
import { imageFor, KIND, search, Verdict, VERDICTS } from '../src/lib/stackcheck';

const FILTERS = ['All', 'Worth it', 'Depends', 'Skip it'] as const;

/** Stack Check: type any supplement or gadget, get Boon's verdict. */
export default function StackCheck() {
  const router = useRouter();
  const [q, setQ] = useState('');
  const [f, setF] = useState<(typeof FILTERS)[number]>('All');
  const list = useMemo(() => search(q).filter((v) => f === 'All' || KIND[v.kind].label === f), [q, f]);
  const counts = { worth: 0, situational: 0, skip: 0 } as Record<Verdict['kind'], number>;
  VERDICTS.forEach((v) => { counts[v.kind]++; });

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.navy }}>
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
            <Text style={st.h}>Before you buy it, check it.</Text>
            <Text style={st.body}>{VERDICTS.length} products I investigated for Beyond the Label. Type a brand or what it claims to do.</Text>
            <View style={st.search}>
              <SearchIcon color={C.white} />
              <TextInput accessibilityLabel="Search supplements" value={q} onChangeText={setQ} placeholder="AG1, C4, fat burner, creatine…"
                placeholderTextColor="#ffffff77" style={st.input} autoCorrect={false} autoCapitalize="none" returnKeyType="search" />
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
  k: { fontFamily: F.xbold, fontSize: 12, letterSpacing: 1.6, textTransform: 'uppercase', color: C.red2 },
  h: { fontFamily: F.black, fontSize: 30, lineHeight: 34, color: C.white, textTransform: 'uppercase', letterSpacing: -0.5 },
  body: { fontFamily: F.semi, fontSize: 15, lineHeight: 22, color: C.white },
  search: { height: 56, borderRadius: 16, backgroundColor: C.navy2, borderWidth: 1.5, borderColor: C.red, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16 },
  input: { flex: 1, fontFamily: F.bold, fontSize: 17, color: C.white, minWidth: 0 },
  clear: { fontFamily: F.black, fontSize: 16, color: C.white },
  chip: { minHeight: 40, borderRadius: 999, borderWidth: 1.5, borderColor: C.line, paddingHorizontal: 14, justifyContent: 'center' },
  chipOn: { borderColor: C.red, backgroundColor: 'rgba(226,67,59,0.18)' },
  chipText: { fontFamily: F.bold, fontSize: 13, color: C.white },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: C.navy2, borderRadius: 18, borderWidth: 1, borderColor: C.line, padding: 10 },
  name: { fontFamily: F.black, fontSize: 16, color: C.white },
  sub: { fontFamily: F.semi, fontSize: 13, color: C.white },
  badge: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 },
  badgeText: { fontFamily: F.black, fontSize: 11, letterSpacing: 0.8, textTransform: 'uppercase', color: C.navy },
  empty: { backgroundColor: C.navy2, borderRadius: 18, padding: 16, gap: 8 },
  emptyT: { fontFamily: F.black, fontSize: 18, color: C.white },
});
