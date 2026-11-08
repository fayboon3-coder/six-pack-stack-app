import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { E, F } from '../lib/theme';

/** "Programs" title with the Training / Meals switch (both tabs share it). Sits under the status bar. */
export default function ProgramsHeader({ active }: { active: 'train' | 'meals'; sub?: string }) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  return (
    <View style={[st.wrap, { paddingTop: insets.top + 10 }]}>
      <View style={st.top}>
        <Text style={st.title} accessibilityRole="header">Programs</Text>
        <View style={st.seg} accessibilityRole="tablist">
          {([['train', 'Training'], ['meals', 'Meals']] as const).map(([k, l]) => {
            const on = k === active;
            return (
              <Pressable key={k} accessibilityRole="tab" accessibilityState={{ selected: on }}
                onPress={() => !on && router.replace(k === 'train' ? '/train' : '/plan')} style={[st.btn, on && st.on]}>
                <Text style={[st.btnT, on && { color: '#fff' }]}>{l}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  wrap: { paddingHorizontal: 20, paddingBottom: 12, backgroundColor: E.paper, borderBottomWidth: 1, borderBottomColor: E.hair },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  title: { fontFamily: F.black, fontSize: 32, letterSpacing: -1.2, color: E.ink },
  seg: { flexDirection: 'row', padding: 3, borderRadius: 14, backgroundColor: E.surface, borderWidth: 1, borderColor: E.hair },
  btn: { height: 34, paddingHorizontal: 14, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  on: { backgroundColor: E.ink },
  btnT: { fontFamily: F.bold, fontSize: 13.5, color: E.ink },
});
