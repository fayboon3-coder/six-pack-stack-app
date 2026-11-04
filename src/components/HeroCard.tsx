import React from 'react';
import { Image, ImageSourcePropType, Pressable, StyleSheet, Text, View, ViewStyle, useWindowDimensions } from 'react-native';
import { C, F } from '../lib/theme';
import { PlayIcon } from './icons';

/**
 * The one big card at the top of a screen (Sweat-style): photo on top,
 * then what it is, then the ONE thing to do.
 */
export default function HeroCard({ image, badge, title, subtitle, cta, onPress, imageRatio = 1200 / 540, style, children }: {
  image: ImageSourcePropType; badge?: string; title: string; subtitle?: string; cta?: string; onPress?: () => void;
  imageRatio?: number; style?: ViewStyle; children?: React.ReactNode;
}) {
  const long = title.length > 18;
  const { width } = useWindowDimensions();
  const w = Math.min(width, 520) - 40;
  const h = Math.round(w / imageRatio);
  return (
    <Pressable accessibilityRole={onPress ? 'button' : undefined} accessibilityLabel={cta ? `${cta}: ${title}` : title}
      onPress={onPress} disabled={!onPress} style={({ pressed }) => [st.card, { transform: [{ scale: pressed ? 0.985 : 1 }] }, style]}>
      <View style={{ width: w, height: h }}>
        <Image source={image} resizeMode="cover" style={{ width: w, height: h }} accessibilityIgnoresInvertColors />
        {!!badge && <View style={st.badge}><Text style={st.badgeText}>{badge}</Text></View>}
      </View>
      <View style={st.body}>
        <Text style={[st.title, long && { fontSize: 24, lineHeight: 28 }]} accessibilityRole="header">{title}</Text>
        {!!subtitle && <Text style={st.subtitle}>{subtitle}</Text>}
        {children}
        {!!cta && (
          <View style={st.cta}>
            <PlayIcon size={15} />
            <Text style={st.ctaText}>{cta}</Text>
          </View>
        )}
      </View>
    </Pressable>
  );
}

const st = StyleSheet.create({
  card: { marginHorizontal: 20, borderRadius: 28, overflow: 'hidden', backgroundColor: C.card, borderWidth: 1, borderColor: C.line },
  badge: { position: 'absolute', top: 16, left: 16, backgroundColor: C.red, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7 },
  badgeText: { fontFamily: F.black, fontSize: 11, letterSpacing: 1.4, textTransform: 'uppercase', color: C.onAccent },
  body: { paddingHorizontal: 20, paddingBottom: 20, paddingTop: 4, gap: 6 },
  title: { fontFamily: F.black, fontSize: 34, lineHeight: 36, color: C.ink, textTransform: 'uppercase', letterSpacing: -0.5 },
  subtitle: { fontFamily: F.bold, fontSize: 14, lineHeight: 20, color: C.ink },
  cta: { marginTop: 12, height: 58, borderRadius: 16, backgroundColor: C.red, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  ctaText: { fontFamily: F.black, fontSize: 17, letterSpacing: 0.6, textTransform: 'uppercase', color: C.onAccent },
});
