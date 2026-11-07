import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import Svg, { Path } from 'react-native-svg';
import { C, F } from '../lib/theme';
import { useAuth } from '../lib/auth';
import { isCoached } from '../lib/access';
import { track } from '../lib/track';
import type { Profile } from '../lib/types';

const BOON = require('../../assets/hero/boon_avatar.jpg');

/** Everyone who isn't already coached (and isn't Boon) sees the 1:1 offer. */
export const showCoaching = (p?: Profile | null) => !!p && p.role !== 'coach' && !isCoached(p);

function useOpen(where: string) {
  const router = useRouter();
  return () => { track('coaching_tap', { where }); router.push('/coaching'); };
}

/** Small floating Boon button that opens the 1:1 coaching page. */
export function CoachFab({ bottom }: { bottom: number }) {
  const { profile } = useAuth();
  const open = useOpen('fab');
  if (!showCoaching(profile)) return null;
  return (
    <Pressable accessibilityRole="button" accessibilityLabel="1:1 coaching with Boon" onPress={open} hitSlop={6}
      style={({ pressed }) => [st.fab, { bottom }, pressed && { transform: [{ scale: 0.94 }] }]}>
      <Image source={BOON} style={st.fabImg} accessibilityIgnoresInvertColors />
      <View style={st.fabTag}><Text style={st.fabTagT}>1:1</Text></View>
    </Pressable>
  );
}

/** In-context coaching offer card: Boon's face, one line on what coaching fixes here, Apply. */
export function CoachCard({ where, title, body, cta = 'See how coaching works' }: { where: string; title: string; body: string; cta?: string }) {
  const { profile } = useAuth();
  const open = useOpen(where);
  if (!showCoaching(profile)) return null;
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`${title} ${cta}`} onPress={open} style={({ pressed }) => [st.card, pressed && { opacity: 0.92 }]}>
      <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
        <Image source={BOON} style={st.av} accessibilityIgnoresInvertColors />
        <View style={{ flex: 1 }}>
          <Text style={st.k}>1:1 COACHING WITH BOON</Text>
          <Text style={st.t}>{title}</Text>
        </View>
      </View>
      <Text style={st.b}>{body}</Text>
      <View style={st.btn}>
        <Text style={st.btnT}>{cta}</Text>
        <Svg width={14} height={14} viewBox="0 0 24 24"><Path d="M9 5l7 7-7 7" stroke="#fff" strokeWidth={2.6} fill="none" strokeLinecap="round" strokeLinejoin="round" /></Svg>
      </View>
    </Pressable>
  );
}

const st = StyleSheet.create({
  fab: { position: 'absolute', right: 20, width: 58, height: 58, borderRadius: 29, borderWidth: 3, borderColor: C.red, backgroundColor: C.bg,
    shadowColor: '#141c33', shadowOpacity: 0.22, shadowRadius: 14, shadowOffset: { width: 0, height: 6 }, elevation: 10 },
  fabImg: { width: '100%', height: '100%', borderRadius: 26 },
  fabTag: { position: 'absolute', top: -6, right: -8, backgroundColor: C.red, borderRadius: 10, paddingHorizontal: 6, paddingVertical: 2, borderWidth: 2, borderColor: C.bg },
  fabTagT: { fontFamily: F.black, fontSize: 11, color: C.onAccent },
  card: { backgroundColor: C.navy, borderRadius: 22, padding: 18, gap: 12 },
  av: { width: 46, height: 46, borderRadius: 23, borderWidth: 2, borderColor: 'rgba(255,255,255,0.9)' },
  k: { fontFamily: F.bold, fontSize: 11, letterSpacing: 1, color: '#ff8a83' },
  t: { fontFamily: F.xbold, fontSize: 18, lineHeight: 23, color: '#ffffff', marginTop: 2 },
  b: { fontFamily: F.medium, fontSize: 14, lineHeight: 20, color: '#ffffff' },
  btn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, height: 46, borderRadius: 23, backgroundColor: C.red },
  btnT: { fontFamily: F.bold, fontSize: 16, color: C.onAccent },
});
