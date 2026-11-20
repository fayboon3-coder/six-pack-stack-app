import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { F } from '../lib/theme';
import { Press } from './motion';
import { DumbbellIcon, ForkIcon } from './icons';
import { track } from '../lib/track';

/** The big, obvious way into advanced customization from the Train and Meals tabs. */
export default function CustomizeCard({ tab, done }: { tab: 'train' | 'food'; done?: boolean }) {
  const router = useRouter();
  const train = tab === 'train';
  const title = done ? (train ? 'Your training, tailored to you' : 'Your meals, tailored to you') : (train ? 'Tailor your training exactly to you' : 'Tailor your meals exactly to you');
  const body = train
    ? 'Tell me your week, the moves you like and what you lift, in your own words. Your plan rebuilds around it.'
    : 'Tell me what you eat, what you order and what you skip. Your meals get built from it, sized to your numbers.';
  return (
    <Press accessibilityRole="button" onPress={() => { track('customize_card', { tab }); router.push({ pathname: '/customize', params: { tab } }); }} style={st.card}>
      <View style={st.icon}>{train ? <DumbbellIcon color="#fff" size={22} /> : <ForkIcon color="#fff" size={22} />}</View>
      <View style={{ flex: 1, gap: 4 }}>
        <Text style={st.k}>{done ? 'ADVANCED CUSTOMIZATION · ON' : 'ADVANCED CUSTOMIZATION'}</Text>
        <Text style={st.t}>{title}</Text>
        <Text style={st.s}>{body}</Text>
      </View>
      <View style={st.btn}><Text style={st.btnT}>{done ? 'Edit' : 'Start'}</Text></View>
    </Press>
  );
}

const st = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16, borderRadius: 22, backgroundColor: '#141c33' },
  icon: { width: 48, height: 48, borderRadius: 16, backgroundColor: '#d0362f', alignItems: 'center', justifyContent: 'center' },
  k: { fontFamily: F.xbold, fontSize: 10.5, letterSpacing: 1.3, color: '#7ff0b5' },
  t: { fontFamily: F.black, fontSize: 17.5, lineHeight: 21, color: '#fff', letterSpacing: -0.3 },
  s: { fontFamily: F.medium, fontSize: 13, lineHeight: 18, color: '#c7cde0' },
  btn: { height: 36, paddingHorizontal: 14, borderRadius: 18, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  btnT: { fontFamily: F.xbold, fontSize: 13.5, color: '#141c33' },
});
