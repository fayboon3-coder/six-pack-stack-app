import React from 'react';
import { ImageBackground, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { C, F } from '../lib/theme';

/** Full-bleed photo header with a navy fade and big title. */
export default function Banner({ uri, eyebrow, title, height = 260, radius = 0, style, children }: {
  uri: string; eyebrow?: string; title?: string; height?: number; radius?: number; style?: ViewStyle; children?: React.ReactNode;
}) {
  return (
    <ImageBackground source={{ uri }} style={[{ height, justifyContent: 'flex-end', overflow: 'hidden', borderRadius: radius, backgroundColor: C.navy2 }, style]}
      imageStyle={{ borderRadius: radius }} resizeMode="cover" accessibilityIgnoresInvertColors>
      <LinearGradient colors={['rgba(13,27,51,0.15)', 'rgba(13,27,51,0.55)', C.navy]} locations={[0, 0.5, 1]}
        style={[StyleSheet.absoluteFill, { borderRadius: radius }]} />
      <View style={{ padding: 20, gap: 6 }}>
        {!!eyebrow && <Text style={st.eyebrow}>{eyebrow}</Text>}
        {!!title && <Text style={st.title} accessibilityRole="header">{title}</Text>}
        {children}
      </View>
    </ImageBackground>
  );
}

const st = StyleSheet.create({
  eyebrow: { fontFamily: F.xbold, fontSize: 12, letterSpacing: 1.8, textTransform: 'uppercase', color: C.red2 },
  title: { fontFamily: F.black, fontSize: 32, lineHeight: 34, color: C.white, textTransform: 'uppercase', letterSpacing: -0.3 },
});
