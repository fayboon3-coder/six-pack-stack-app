import React, { useState } from 'react';
import { Image, StyleSheet, Text, View, type ImageSourcePropType, type StyleProp, type ViewStyle } from 'react-native';
import { E, F } from '../lib/theme';
import { foodsWithPhotos } from '../lib/foodMatch';
import { mealImage } from '../lib/meals';
import { Drift } from './motion';
import Pic from './Pic';

type Tile = { label: string; source: ImageSourcePropType; hd?: string };

/**
 * A meal shown as the foods that are actually in it, each with its own photo:
 * one big tile and up to two more, every tile labeled. Falls back to a dish photo.
 */
export default function FoodTiles({ name, detail, ids, height = 190, drift = false, style, children }: {
  name: string; detail?: string; ids?: string[]; height?: number; drift?: boolean; style?: StyleProp<ViewStyle>; children?: React.ReactNode;
}) {
  const foods: Tile[] = foodsWithPhotos(name, detail, ids);
  const dish = mealImage(name, detail || '');
  // A named dish (burrito, sandwich, a restaurant order) leads with the dish, then its foods.
  const lead = dish && /burrito|taco|wrap|burger|sandwich|sub\b|pizza|chipotle|starbucks|subway|chick|mcdonald|panda|bowl|shake|smoothie|oats|parfait|salad/i.test(name);
  const leadLabel = name.split(/[:,&(]| with /i)[0].trim();
  // Never show the same thing twice (a "Protein shake" dish and the protein powder labeled the same).
  const rest = foods.filter((f) => f.label.toLowerCase() !== leadLabel.toLowerCase() && !leadLabel.toLowerCase().includes(f.label.toLowerCase()));
  const tiles: Tile[] = lead ? [{ label: leadLabel, source: dish! }, ...rest].slice(0, 3) : foods.slice(0, 3);
  if (!tiles.length && dish) tiles.push({ label: '', source: dish });
  const n = tiles.length;
  return (
    <View style={[{ height, flexDirection: 'row', gap: 3, overflow: 'hidden', backgroundColor: E.soft }, style]}
      accessibilityLabel={tiles.length ? `Photo: ${tiles.map((t) => t.label).filter(Boolean).join(', ')}` : undefined}>
      {n === 0 ? <View style={{ flex: 1, backgroundColor: E.soft }} /> : (
        <>
          <One t={tiles[0]} style={{ flex: n === 3 ? 1.45 : 1 }} drift={drift} />
          {n === 2 && <One t={tiles[1]} style={{ flex: 1 }} />}
          {n === 3 && (
            <View style={{ flex: 1, gap: 3 }}>
              <One t={tiles[1]} style={{ flex: 1 }} />
              <One t={tiles[2]} style={{ flex: 1 }} />
            </View>
          )}
        </>
      )}
      {children}
    </View>
  );
}

function One({ t, style, drift }: { t: Tile; style?: StyleProp<ViewStyle>; drift?: boolean }) {
  return (
    <View style={[{ overflow: 'hidden', backgroundColor: E.soft }, style]}>
      {drift ? <Drift source={t.source} hd={t.hd} style={st.fill} range={0.06} /> : <Pic source={t.source} hd={t.hd} w={700} style={st.fill} />}
      {!!t.label && <View style={st.tag}><Text style={st.tagT} numberOfLines={1}>{t.label}</Text></View>}
    </View>
  );
}

/** One food photo in a circle or rounded square, with a soft fallback. */
export function FoodThumb({ source, hd, size = 48, round = false, uri }: { source?: ImageSourcePropType | null; hd?: string | null; size?: number; round?: boolean; uri?: string | null }) {
  const [bad, setBad] = useState(false);
  const r = round ? size / 2 : Math.round(size * 0.28);
  const box = { width: size, height: size, borderRadius: r, backgroundColor: E.soft, overflow: 'hidden' as const };
  // Their own photo (a snapped meal or the product's label shot) wins over a stock photo.
  if (uri && !bad) return <Image source={{ uri }} onError={() => setBad(true)} resizeMode="cover" style={box} accessibilityIgnoresInvertColors />;
  if (!source && !hd) return <View style={box} />;
  return <View style={box}><Pic source={source} hd={hd} w={size * 3} style={st.fill} /></View>;
}

const st = StyleSheet.create({
  fill: { position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' },
  tag: { position: 'absolute', left: 8, bottom: 8, maxWidth: '86%', height: 22, paddingHorizontal: 8, borderRadius: 11, backgroundColor: 'rgba(255,255,255,0.92)', justifyContent: 'center' },
  tagT: { fontFamily: F.bold, fontSize: 11, color: E.ink },
});
