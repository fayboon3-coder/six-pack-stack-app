import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import { C } from '../lib/theme';

const TABS = [
  { key: 'index', path: '/', also: ['train', 'plan'], label: 'Programs', d: 'M6 7v10M18 7v10M3 10v4M21 10v4M6 12h12' },
  { key: 'progress', path: '/progress', also: [], label: 'Progress', d: 'M4 19h16M6 15l4-4 3 3 5-6' },
  { key: 'stack', path: '/stack', also: [], label: 'Stack', d: 'M4 5h16v11H9l-5 4z' },
  { key: 'you', path: '/you', also: [], label: 'You', d: '' },
];

/** Floating pill tab bar: icons only, active tab in a navy pill. */
export default function TabBar({ state, navigation }: any) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const cur = state?.routes?.[state.index]?.name;
  return (
    <View pointerEvents="box-none" style={[st.wrap, { paddingBottom: Math.max(insets.bottom, 12) }]}>
      <View style={st.bar}>
        {TABS.map((t) => {
          const on = cur === t.key || t.also.includes(cur);
          const color = on ? C.onAccent : C.ink;
          return (
            <Pressable key={t.key} accessibilityRole="tab" accessibilityLabel={t.label} accessibilityState={{ selected: on }}
              onPress={() => { if (on && t.key !== 'index') return; if (navigation?.navigate) navigation.navigate(t.key as never); else router.navigate(t.path as any); }} style={[st.btn, on && { backgroundColor: C.navy }]}>
              <Svg width={27} height={27} viewBox="0 0 24 24">
                {t.key === 'you'
                  ? <><Circle cx={12} cy={8} r={4} stroke={color} strokeWidth={2} fill="none" /><Path d="M4 21c1-4 4-6 8-6s7 2 8 6" stroke={color} strokeWidth={2} fill="none" strokeLinecap="round" /></>
                  : <Path d={t.d} stroke={color} strokeWidth={2} fill="none" strokeLinecap="round" strokeLinejoin="round" />}
              </Svg>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  wrap: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 16 },
  bar: { height: 66, borderRadius: 33, backgroundColor: C.bg, borderWidth: 1, borderColor: C.line, flexDirection: 'row', padding: 5,
    shadowColor: '#141c33', shadowOpacity: 0.12, shadowRadius: 24, shadowOffset: { width: 0, height: 8 }, elevation: 8, maxWidth: 520, alignSelf: 'center', width: '100%' },
  btn: { flex: 1, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
});
