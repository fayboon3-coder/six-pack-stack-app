import React from 'react';
import { Pressable, StyleSheet, Text, View, ViewStyle } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { C, F } from '../lib/theme';

/** The grey card with an uppercase header row used across the app (canvas design). */
export default function Panel({ title, right, onMore, children, style, bodyStyle }: {
  title: string; right?: React.ReactNode; onMore?: () => void; children?: React.ReactNode; style?: ViewStyle; bodyStyle?: ViewStyle;
}) {
  return (
    <View style={[st.card, style]}>
      <View style={st.head}>
        <Text style={st.title} accessibilityRole="header">{title.toUpperCase()}</Text>
        {typeof right === 'string' ? <Text style={st.right}>{right}</Text> : right}
        {!!onMore && (
          <Pressable accessibilityRole="button" accessibilityLabel={`Open ${title}`} onPress={onMore} hitSlop={8} style={st.more}>
            <Svg width={14} height={14} viewBox="0 0 24 24"><Path d="M9 5l7 7-7 7" stroke={C.red} strokeWidth={2.6} fill="none" strokeLinecap="round" strokeLinejoin="round" /></Svg>
          </Pressable>
        )}
      </View>
      {children != null && <View style={[st.body, bodyStyle]}>{children}</View>}
    </View>
  );
}

export const Divider = () => <View style={{ height: 1, backgroundColor: '#e9ebf1' }} />;

export const panel = StyleSheet.create({
  big: { fontFamily: F.xbold, fontSize: 22, color: C.ink },
  small: { fontFamily: F.medium, fontSize: 14, color: C.ink },
});

const st = StyleSheet.create({
  card: { backgroundColor: C.card, borderWidth: 1, borderColor: C.line, borderRadius: 22, overflow: 'hidden' },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, minHeight: 50, borderBottomWidth: 1, borderBottomColor: C.line, gap: 10 },
  title: { fontFamily: F.bold, fontSize: 13, letterSpacing: 0.8, color: C.ink, flexShrink: 1 },
  right: { fontFamily: F.medium, fontSize: 13, color: C.ink },
  more: { width: 30, height: 30, borderRadius: 15, backgroundColor: '#e8eaf0', alignItems: 'center', justifyContent: 'center' },
  body: { paddingHorizontal: 18, paddingVertical: 14 },
});
