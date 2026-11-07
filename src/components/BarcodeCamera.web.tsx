import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { F } from '../lib/theme';

/** Web: no live scanner, so the number is typed in below (or use the phone app). */
export default function BarcodeCamera(_: { onCode: (code: string) => void; paused?: boolean }) {
  return (
    <View style={st.box}>
      <Svg width={64} height={44} viewBox="0 0 24 16"><Path d="M2 1v14M5 1v14M8 1v14M12 1v14M14 1v14M18 1v14M21 1v14" stroke="#fff" strokeWidth={1.4} strokeLinecap="round" /></Svg>
      <Text style={st.t}>Type the barcode number below</Text>
      <Text style={st.s}>The live scanner works in the iPhone app.</Text>
    </View>
  );
}

const st = StyleSheet.create({
  box: { width: '100%', aspectRatio: 2, borderRadius: 24, backgroundColor: '#141c33', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 20 },
  t: { fontFamily: F.xbold, fontSize: 17, color: '#fff', textAlign: 'center' },
  s: { fontFamily: F.medium, fontSize: 14, color: 'rgba(255,255,255,0.8)', textAlign: 'center' },
});
