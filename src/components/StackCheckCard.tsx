import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { C, F } from '../lib/theme';
import { SearchIcon } from './icons';
import { VERDICTS } from '../lib/stackcheck';

/** "Thinking of buying something? Check it first." Opens Stack Check. */
export default function StackCheckCard({ style }: { style?: object }) {
  const router = useRouter();
  return (
    <Pressable accessibilityRole="button" accessibilityLabel="Open Stack Check" onPress={() => router.push('/stack-check')} style={[st.card, style]}>
      <View style={st.icon}><SearchIcon color={C.white} size={20} /></View>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={st.k}>Stack Check · {VERDICTS.length} products</Text>
        <Text style={st.t}>Saw a supplement online? Check it before you buy.</Text>
      </View>
      <Text style={st.chev}>›</Text>
    </Pressable>
  );
}

const st = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: C.navy2, borderWidth: 1.5, borderColor: C.red, borderRadius: 18, padding: 14 },
  icon: { width: 44, height: 44, borderRadius: 22, backgroundColor: C.red, alignItems: 'center', justifyContent: 'center' },
  k: { fontFamily: F.xbold, fontSize: 11, letterSpacing: 1.4, textTransform: 'uppercase', color: C.red2 },
  t: { fontFamily: F.black, fontSize: 15, lineHeight: 20, color: C.white },
  chev: { fontFamily: F.bold, fontSize: 30, color: C.white, marginTop: -4 },
});
