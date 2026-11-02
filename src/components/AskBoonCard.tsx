import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { C, F } from '../lib/theme';
import { useAuth } from '../lib/auth';
import { useAskBoonLive } from '../lib/askboon';

const FACE = require('../../assets/hero/boon_avatar.jpg');

/** Opens Ask Boon. Hidden until the AI is switched on (the coach always sees it, to test). */
export default function AskBoonCard({ style, q, title, sub }: { style?: object; q?: string; title?: string; sub?: string }) {
  const router = useRouter();
  const { isCoachAccount } = useAuth();
  const live = useAskBoonLive();
  if (!live && !isCoachAccount) return null;
  return (
    <Pressable accessibilityRole="button" accessibilityLabel="Open Ask Boon"
      onPress={() => router.push(q ? { pathname: '/ask', params: { q } } : '/ask')} style={[st.card, style]}>
      <Image source={FACE} style={st.logo} />
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={st.k}>Ask Boon · AI{!live ? ' · not switched on yet' : ''}</Text>
        <Text style={st.t}>{title || 'Got a question? Ask me anything, any time.'}</Text>
        {!!sub && <Text style={st.s}>{sub}</Text>}
      </View>
      <Text style={st.chev}>›</Text>
    </Pressable>
  );
}

const st = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: C.navy2, borderWidth: 1.5, borderColor: C.red, borderRadius: 18, padding: 14 },
  logo: { width: 44, height: 44, borderRadius: 22 },
  k: { fontFamily: F.xbold, fontSize: 11, letterSpacing: 1.4, textTransform: 'uppercase', color: C.red2 },
  t: { fontFamily: F.black, fontSize: 15, lineHeight: 20, color: C.white },
  s: { fontFamily: F.semi, fontSize: 13, lineHeight: 18, color: 'rgba(255,255,255,0.7)' },
  chev: { fontFamily: F.bold, fontSize: 30, color: C.white, marginTop: -4 },
});
