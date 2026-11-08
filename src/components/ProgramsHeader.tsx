import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { C, F } from '../lib/theme';

/** "Programs" title with the Training / Meals switch (both tabs share it). */
export default function ProgramsHeader({ active }: { active: 'train' | 'meals'; sub?: string }) {
  const router = useRouter();
  return (
    <View style={st.wrap}>
      <Text style={st.title} accessibilityRole="header">Programs</Text>
      <View style={st.seg} accessibilityRole="tablist">
        {([['train', 'Training'], ['meals', 'Meals']] as const).map(([k, l]) => {
          const on = k === active;
          return (
            <Pressable key={k} accessibilityRole="tab" accessibilityState={{ selected: on }}
              onPress={() => !on && router.replace(k === 'train' ? '/train' : '/plan')} style={[st.btn, on && { backgroundColor: C.navy }]}>
              <Text style={[st.btnT, on && { color: C.onAccent, fontFamily: F.bold }]}>{l}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  wrap: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: '#e6e8ef', backgroundColor: C.bg },
  title: { fontFamily: F.black, fontSize: 34, letterSpacing: -0.6, color: C.ink, marginBottom: 14 },
  seg: { flexDirection: 'row', padding: 4, borderRadius: 14, borderWidth: 1, borderColor: C.line, backgroundColor: C.bg },
  btn: { flex: 1, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  btnT: { fontFamily: F.semi, fontSize: 15, color: C.ink },
});
