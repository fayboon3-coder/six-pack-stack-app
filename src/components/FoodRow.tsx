import React from 'react';
import { Image, ScrollView, StyleSheet, Text, View } from 'react-native';
import { C, F } from '../lib/theme';
import type { Pic } from '../lib/photos';

/** A row of product tiles (white, like a store shelf card). */
export default function FoodRow({ items, size = 92 }: { items: { name: string; pic: Pic }[]; size?: number }) {
  if (!items.length) return null;
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
      {items.map((f, i) => (
        <View key={i} style={{ width: size, gap: 6 }}>
          <View style={[st.tile, { width: size, height: size }]}>
            <Image source={typeof f.pic === 'number' ? f.pic : { uri: f.pic }} resizeMode="contain" style={{ width: '86%', height: '86%' }}
              accessibilityLabel={f.name} />
          </View>
          <Text style={st.name} numberOfLines={2}>{f.name}</Text>
        </View>
      ))}
    </ScrollView>
  );
}

const st = StyleSheet.create({
  tile: { backgroundColor: '#ffffff', borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  name: { fontFamily: F.bold, fontSize: 11, lineHeight: 14, color: C.white },
});
