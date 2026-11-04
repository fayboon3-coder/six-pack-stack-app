import React from 'react';
import { StyleSheet, View } from 'react-native';
import { C } from '../lib/theme';

/** Plain white background behind every screen (light theme). */
export default function Backdrop() {
  return <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: C.bg }]} />;
}
