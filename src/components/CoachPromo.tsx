import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import Svg, { Path } from 'react-native-svg';
import { F } from '../lib/theme';
import { track } from '../lib/track';

const BOON = require('../../assets/hero/boon_avatar.jpg');

/** The 1:1 coaching invite: a dark, premium card that stands out on the light screens. */
export default function CoachPromo({ where }: { where: string }) {
  const router = useRouter();
  return (
    <Pressable accessibilityRole="button" onPress={() => { track('coaching_tap', { where }); router.push('/coaching'); }} style={({ pressed }) => [s.card, { opacity: pressed ? 0.94 : 1 }]}>
      <View style={s.row}>
        <Image source={BOON} style={s.avatar} accessibilityLabel="Boon Fay" />
        <View style={{ flex: 1, gap: 2 }}>
          <View style={s.chip}><View style={s.dot} /><Text style={s.chipT}>1:1 COACHING · LIMITED SPOTS</Text></View>
          <Text style={s.t}>Want me in your corner?</Text>
        </View>
      </View>
      <Text style={s.p}>I review your week every Sunday and change one thing at a time. Abs in 12 weeks, or I keep coaching you free.</Text>
      <View style={s.foot}>
        <View style={s.guar}>
          <Svg width={16} height={16} viewBox="0 0 24 24"><Path d="M12 3l7.5 3v5.5c0 4.6-3.2 8.2-7.5 9.5-4.3-1.3-7.5-4.9-7.5-9.5V6zM8.8 12l2.3 2.3 4.2-4.6" stroke="#7fe3b0" strokeWidth={2} fill="none" strokeLinecap="round" strokeLinejoin="round" /></Svg>
          <Text style={s.guarT}>Abs or it's free</Text>
        </View>
        <View style={s.btn}><Text style={s.btnT}>See if I qualify  →</Text></View>
      </View>
    </Pressable>
  );
}

const s = StyleSheet.create({
  card: { backgroundColor: '#141c33', borderRadius: 22, padding: 18, gap: 12, borderWidth: 1, borderColor: '#2a3456', shadowColor: '#141c33', shadowOpacity: 0.25, shadowRadius: 18, shadowOffset: { width: 0, height: 10 }, elevation: 6 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 54, height: 54, borderRadius: 27, borderWidth: 2, borderColor: '#d0362f' },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#2fbf78' },
  chipT: { fontFamily: F.xbold, fontSize: 10.5, letterSpacing: 1.1, color: '#8f99b8' },
  t: { fontFamily: F.black, fontSize: 21, lineHeight: 25, color: '#fff', letterSpacing: -0.4 },
  p: { fontFamily: F.medium, fontSize: 14, lineHeight: 20, color: '#c7cde0' },
  foot: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' },
  guar: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  guarT: { fontFamily: F.bold, fontSize: 13, color: '#7fe3b0' },
  btn: { height: 44, paddingHorizontal: 18, borderRadius: 12, backgroundColor: '#d0362f', justifyContent: 'center' },
  btnT: { fontFamily: F.black, fontSize: 15, color: '#fff' },
});
