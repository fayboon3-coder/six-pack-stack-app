import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { C, F } from '../lib/theme';
import { Muscle, MUSCLE_COLOR } from '../lib/workoutMeta';

export const Stat = ({ icon, value }: { icon: React.ReactNode; value: string }) => (
  <View style={st.stat}>{icon}<Text style={st.statText}>{value}</Text></View>
);

export const MuscleChips = ({ muscles, max = 5 }: { muscles: Muscle[]; max?: number }) => (
  <View style={st.chips}>
    {muscles.slice(0, max).map((m) => (
      <View key={m} style={[st.chip, { borderColor: MUSCLE_COLOR[m] + '66', backgroundColor: MUSCLE_COLOR[m] + '1f' }]}>
        <View style={[st.dot, { backgroundColor: MUSCLE_COLOR[m] }]} />
        <Text style={st.chipText}>{m}</Text>
      </View>
    ))}
  </View>
);

const st = StyleSheet.create({
  stat: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: C.navy, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 7 },
  statText: { fontFamily: F.xbold, fontSize: 13, color: C.white },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 999, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 5 },
  dot: { width: 7, height: 7, borderRadius: 4 },
  chipText: { fontFamily: F.bold, fontSize: 12, color: C.white },
});
