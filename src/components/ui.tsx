import React from 'react';
import { Pressable, StyleSheet, Text, View, ViewStyle, TextStyle, ActivityIndicator } from 'react-native';
import { C, F, R } from '../lib/theme';

export const Eyebrow = ({ children, color = C.red, style }: { children: React.ReactNode; color?: string; style?: TextStyle }) => (
  <Text style={[s.eyebrow, { color }, style]}>{children}</Text>
);

export const H1 = ({ children, style }: { children: React.ReactNode; style?: TextStyle }) => (
  <Text accessibilityRole="header" style={[s.h1, style]}>{children}</Text>
);

export const Body = ({ children, style }: { children: React.ReactNode; style?: TextStyle }) => (
  <Text style={[s.body, style]}>{children}</Text>
);

export const Card = ({ children, style }: { children: React.ReactNode; style?: ViewStyle }) => (
  <View style={[s.card, style]}>{children}</View>
);

export function Button({ title, onPress, disabled, loading, variant = 'red', style }: {
  title: string; onPress?: () => void; disabled?: boolean; loading?: boolean;
  variant?: 'red' | 'navy' | 'ghost'; style?: ViewStyle;
}) {
  const bg = variant === 'red' ? C.red : variant === 'navy' ? C.navy : C.bg;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled }}
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [s.btn, { backgroundColor: bg, opacity: disabled ? 0.5 : pressed ? 0.85 : 1 },
        variant === 'ghost' && { borderWidth: 1, borderColor: C.line }, style]}
    >
      {loading ? <ActivityIndicator color={variant === 'ghost' ? C.ink : C.onAccent} /> : <Text style={[s.btnText, variant === 'ghost' && { color: C.ink }]}>{title}</Text>}
    </Pressable>
  );
}

export function Bar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = Math.max(0, Math.min(1, max ? value / max : 0));
  return (
    <View style={s.barBg}><View style={[s.barFg, { width: `${pct * 100}%`, backgroundColor: color }]} /></View>
  );
}

export const s = StyleSheet.create({
  eyebrow: { fontFamily: F.xbold, fontSize: 12, letterSpacing: 1.8, textTransform: 'uppercase' },
  h1: { fontFamily: F.black, fontSize: 28, color: C.ink, letterSpacing: -0.3 },
  body: { fontFamily: F.semi, fontSize: 15, lineHeight: 22, color: C.ink },
  card: { backgroundColor: C.card, borderWidth: 1, borderColor: C.line, borderRadius: R.card, padding: 16, gap: 10 },
  btn: { height: 54, borderRadius: R.btn, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20 },
  btnText: { fontFamily: F.bold, fontSize: 18, color: C.onAccent },
  barBg: { height: 8, borderRadius: 4, backgroundColor: '#e8eaf0', overflow: 'hidden' },
  barFg: { height: 8, borderRadius: 4 },
  label: { fontFamily: F.xbold, fontSize: 11, letterSpacing: 1.4, textTransform: 'uppercase', color: C.ink },
});
