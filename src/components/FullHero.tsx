import React from 'react';
import { Image, ImageSourcePropType, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { C, F } from '../lib/theme';
import { twoTone } from './TwoTone';

/** Edge-to-edge photo with pills, a big title and one line under it (Check-in / Results style). */
export default function FullHero({ image, pills, title, lede, ratio = 0.92 }: {
  image: ImageSourcePropType; pills?: { text: string; tone?: 'red' | 'green' }[]; title: string; lede?: string; ratio?: number;
}) {
  const { width } = useWindowDimensions();
  const w = Math.min(width, 640);
  const h = Math.round(w * ratio);
  return (
    <View style={{ width: w, height: h, alignSelf: 'center' }}>
      <Image source={image} style={{ width: w, height: h }} resizeMode="cover" accessibilityIgnoresInvertColors />
      <LinearGradient colors={['rgba(255,255,255,0)', 'rgba(255,255,255,0)', 'rgba(255,255,255,0.88)', C.bg]} locations={[0, 0.35, 0.68, 1]}
        style={{ position: 'absolute', left: 0, top: 0, width: w, height: h }} />
      <View style={st.text}>
        {!!pills?.length && (
          <View style={st.pills}>
            {pills.map((p) => (
              <View key={p.text} style={[st.pill, p.tone === 'green' && { backgroundColor: C.green }]}>
                <Text style={[st.pillText, p.tone === 'green' && { color: C.bg }]}>{p.text}</Text>
              </View>
            ))}
          </View>
        )}
        <Text style={st.title} accessibilityRole="header">{twoTone(title)}</Text>
        {!!lede && <Text style={st.lede}>{lede}</Text>}
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  text: { position: 'absolute', left: 20, right: 20, bottom: 4, gap: 8 },
  pills: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  pill: { backgroundColor: C.red, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 },
  pillText: { fontFamily: F.black, fontSize: 11, letterSpacing: 1.2, textTransform: 'uppercase', color: C.onAccent },
  title: { fontFamily: F.black, fontSize: 34, lineHeight: 38, color: C.ink, letterSpacing: -0.6, textTransform: 'uppercase' },
  lede: { fontFamily: F.semi, fontSize: 15, lineHeight: 21, color: C.ink },
});
