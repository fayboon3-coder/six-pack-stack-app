import React, { useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { E, F } from '../lib/theme';
import { num } from '../lib/daily';
import FoodTiles from './FoodTiles';
import { Pop, Press } from './motion';

export type MealOpt = { name: string; detail: string; kcal: string; protein: string; ids?: string[] };
const fmt = (n: number) => Math.round(n).toLocaleString('en-US');

/**
 * One meal, photo first: every food in it with its own picture, the meal, its numbers,
 * and the two things you do with it (ate it, swap it). Swapping cross-fades to the next option.
 */
export default function MealCard({ slot, opt, eaten, onToggle, onSwap, canSwap, onOpen, count, index, compact }: {
  slot: string; opt: MealOpt; eaten: boolean; onToggle: () => void; onSwap?: () => void; canSwap?: boolean; onOpen?: () => void;
  count?: number; index?: number; compact?: boolean;
}) {
  const fade = useRef(new Animated.Value(1)).current;
  const first = useRef(true);
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    fade.setValue(0.25);
    Animated.timing(fade, { toValue: 1, duration: 420, useNativeDriver: true }).start();
  }, [opt.name]);
  const kcal = num(opt.kcal), protein = num(opt.protein);
  return (
    <View style={[st.card, eaten && { opacity: 0.94 }]}>
      <Pressable accessibilityRole="button" accessibilityLabel={`${slot}: ${opt.name}`} onPress={onOpen} disabled={!onOpen}>
        <Animated.View style={{ opacity: fade }}>
          <FoodTiles name={opt.name} detail={opt.detail} ids={opt.ids} height={compact ? 150 : 196}>
            {eaten && <View style={st.veil} />}
          </FoodTiles>
        </Animated.View>
        <View style={st.slot}><Text style={st.slotT}>{slot.toUpperCase()}{count && count > 1 && index != null ? `  ·  ${index + 1} OF ${count}` : ''}</Text></View>
        <Pop show={eaten} style={st.done}>
          <Svg width={13} height={13} viewBox="0 0 24 24"><Path d="M5 12.5l4.5 4.5L19 7.5" stroke="#fff" strokeWidth={3.4} fill="none" strokeLinecap="round" strokeLinejoin="round" /></Svg>
          <Text style={st.doneT}>Eaten</Text>
        </Pop>
      </Pressable>
      <View style={st.body}>
        <Text style={st.name} numberOfLines={2}>{opt.name}</Text>
        {!compact && !!opt.detail && <Text style={st.detail} numberOfLines={2}>{opt.detail.replace(/\{#?([\d.]+)\}/g, '$1')}</Text>}
        <View style={st.row}>
          <View style={st.chips}>
            <View style={st.chip}><Text style={st.chipV}>{kcal ? fmt(kcal) : opt.kcal}</Text><Text style={st.chipU}>cal</Text></View>
            <View style={st.chip}><Text style={st.chipV}>{protein || opt.protein}</Text><Text style={st.chipU}>g protein</Text></View>
          </View>
          {canSwap && onSwap && (
            <Press accessibilityRole="button" accessibilityLabel={`Swap ${slot}`} disabled={eaten} onPress={onSwap} style={[st.swap, eaten && { opacity: 0.35 }]}>
              <Svg width={16} height={16} viewBox="0 0 24 24"><Path d="M7 7h11l-3-3M17 17H6l3 3" stroke={E.ink} strokeWidth={2.2} fill="none" strokeLinecap="round" strokeLinejoin="round" /></Svg>
            </Press>
          )}
          <Press accessibilityRole="checkbox" accessibilityState={{ checked: eaten }} accessibilityLabel={eaten ? `Undo ${slot}` : `Mark ${slot} eaten`} onPress={onToggle}
            style={[st.ate, eaten && st.ateOn]}>
            <Svg width={14} height={14} viewBox="0 0 24 24"><Path d="M5 12.5l4.5 4.5L19 7.5" stroke={eaten ? '#fff' : E.ink} strokeWidth={2.8} fill="none" strokeLinecap="round" strokeLinejoin="round" /></Svg>
            <Text style={[st.ateT, eaten && { color: '#fff' }]}>{eaten ? 'Eaten' : 'Ate it'}</Text>
          </Press>
        </View>
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  card: { borderRadius: 24, overflow: 'hidden', backgroundColor: E.surface, borderWidth: 1, borderColor: E.hair },
  veil: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(16,23,42,0.28)' },
  slot: { position: 'absolute', top: 12, left: 12, height: 26, paddingHorizontal: 10, borderRadius: 13, backgroundColor: 'rgba(16,23,42,0.78)', justifyContent: 'center' },
  slotT: { fontFamily: F.bold, fontSize: 10.5, letterSpacing: 1.2, color: '#fff' },
  done: { position: 'absolute', top: 12, right: 12, height: 28, paddingHorizontal: 11, borderRadius: 14, backgroundColor: E.green, flexDirection: 'row', alignItems: 'center', gap: 5 },
  doneT: { fontFamily: F.bold, fontSize: 12.5, color: '#fff' },
  body: { padding: 16, gap: 6 },
  name: { fontFamily: F.xbold, fontSize: 19, lineHeight: 24, letterSpacing: -0.4, color: E.ink },
  detail: { fontFamily: F.medium, fontSize: 13.5, lineHeight: 19, color: E.sub },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 },
  chips: { flex: 1, flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  chip: { flexDirection: 'row', alignItems: 'baseline', gap: 3, height: 30, paddingHorizontal: 10, borderRadius: 15, backgroundColor: E.paper, paddingTop: 6 },
  chipV: { fontFamily: F.xbold, fontSize: 14, color: E.ink },
  chipU: { fontFamily: F.semi, fontSize: 11.5, color: E.sub },
  swap: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, borderColor: E.hair, alignItems: 'center', justifyContent: 'center' },
  ate: { height: 40, paddingHorizontal: 14, borderRadius: 20, backgroundColor: E.surface, borderWidth: 1.5, borderColor: E.ink, flexDirection: 'row', alignItems: 'center', gap: 6 },
  ateOn: { backgroundColor: E.green, borderColor: E.green },
  ateT: { fontFamily: F.bold, fontSize: 14, color: E.ink },
});
