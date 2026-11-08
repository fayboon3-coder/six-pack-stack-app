import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import Svg, { Path } from 'react-native-svg';
import { C, E, F } from '../lib/theme';

/** Big page title on a white bar with a hairline under it, optional round back button and right slot. */
export default function PageTitle({ title, sub, back, close, right, size = 34, paper }: {
  title: string; sub?: string; back?: boolean; close?: boolean; right?: React.ReactNode; size?: number; paper?: boolean;
}) {
  const router = useRouter();
  return (
    <View style={[st.wrap, paper && { backgroundColor: E.paper, borderBottomColor: E.hair, paddingHorizontal: 20 }]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        {(back || close) && <RoundBtn kind={close ? 'close' : 'back'} onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} />}
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={[st.title, { fontSize: size }, paper && { letterSpacing: -1, color: E.ink }]} accessibilityRole="header">{title}</Text>
          {!!sub && <Text style={[st.sub, paper && { color: E.sub }]}>{sub}</Text>}
        </View>
        {right}
      </View>
    </View>
  );
}

export function RoundBtn({ kind, onPress, label }: { kind: 'back' | 'close'; onPress: () => void; label?: string }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label || (kind === 'close' ? 'Close' : 'Back')} onPress={onPress} hitSlop={6} style={st.round}>
      <Svg width={kind === 'close' ? 16 : 18} height={kind === 'close' ? 16 : 18} viewBox="0 0 24 24">
        <Path d={kind === 'close' ? 'M6 6l12 12M18 6L6 18' : 'M15 5l-7 7 7 7'} stroke={C.ink} strokeWidth={kind === 'close' ? 2.6 : 2.4} fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </Svg>
    </Pressable>
  );
}

const st = StyleSheet.create({
  wrap: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: '#e6e8ef', backgroundColor: C.bg },
  title: { fontFamily: F.black, letterSpacing: -0.6, color: C.ink },
  sub: { fontFamily: F.medium, fontSize: 14, color: C.ink, marginTop: 2 },
  round: { width: 42, height: 42, borderRadius: 21, borderWidth: 1.5, borderColor: '#d9dde7', alignItems: 'center', justifyContent: 'center', backgroundColor: C.bg },
});
