import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';
import { C, F } from '../lib/theme';

/** Sweat-style segmented pills that scroll sideways. */
export default function Pills<T extends string>({ items, value, onChange }: { items: readonly T[]; value: T; onChange: (v: T) => void }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 20 }} accessibilityRole="tablist">
      {items.map((t) => {
        const on = t === value;
        return (
          <Pressable key={t} accessibilityRole="tab" accessibilityState={{ selected: on }} onPress={() => onChange(t)}
            style={[st.pill, on ? { backgroundColor: C.ink, borderColor: C.ink } : null]}>
            <Text style={[st.text, on && { color: C.bg }]}>{t}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const st = StyleSheet.create({
  pill: { height: 40, paddingHorizontal: 18, borderRadius: 999, borderWidth: 1, borderColor: C.line, justifyContent: 'center' },
  text: { fontFamily: F.xbold, fontSize: 14, color: C.ink },
});
