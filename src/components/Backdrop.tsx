import React from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Defs, LinearGradient, RadialGradient, Rect, Stop } from 'react-native-svg';

/**
 * The brand background: deep navy that warms into a soft red glow at the top,
 * the same look as the App Store screenshots. Sits behind every screen.
 */
export default function Backdrop() {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Svg width="100%" height="100%" preserveAspectRatio="none">
        <Defs>
          <LinearGradient id="bdBase" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#172c55" />
            <Stop offset="0.45" stopColor="#0f1f3c" />
            <Stop offset="1" stopColor="#09142a" />
          </LinearGradient>
          <RadialGradient id="bdGlow" cx="0.85" cy="0" rx="0.95" ry="0.55" fx="0.85" fy="0">
            <Stop offset="0" stopColor="#8a2a33" stopOpacity="0.75" />
            <Stop offset="0.5" stopColor="#5a2236" stopOpacity="0.35" />
            <Stop offset="1" stopColor="#0f1f3c" stopOpacity="0" />
          </RadialGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height="100%" fill="url(#bdBase)" />
        <Rect x="0" y="0" width="100%" height="100%" fill="url(#bdGlow)" />
      </Svg>
    </View>
  );
}
