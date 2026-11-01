import React from 'react';
import { Image, ImageSourcePropType, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { C, F } from '../lib/theme';

/** A product "poster": photo on a lit navy tile, Netflix-card style. */
export default function Poster({ source, label, size = 120, style, children }: {
  source: ImageSourcePropType | null; label?: string; size?: number; style?: ViewStyle; children?: React.ReactNode;
}) {
  return (
    <View style={[st.tile, { width: size, height: size * 1.25 }, style]}>
      <LinearGradient colors={['#23406e', C.navy2, '#0f1f3b']} start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 1 }} style={StyleSheet.absoluteFill} />
      {source ? (
        <Image source={source} resizeMode="contain" style={{ width: '78%', height: '72%' }} accessibilityIgnoresInvertColors />
      ) : (
        <Text style={st.initial}>{(label || '?').trim()[0]?.toUpperCase()}</Text>
      )}
      {children}
    </View>
  );
}

const st = StyleSheet.create({
  tile: { borderRadius: 16, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: C.line },
  initial: { fontFamily: F.black, fontSize: 40, color: C.white },
});
