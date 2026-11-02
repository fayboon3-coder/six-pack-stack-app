import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../lib/auth';
import { VIEW_AS_LABEL } from '../lib/preview';
import { C, F } from '../lib/theme';

/** Floating bar while the coach is viewing the app as someone else. */
export default function PreviewBar() {
  const { viewAs, setViewAs } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  if (!viewAs) return null;
  return (
    <View pointerEvents="box-none" style={[st.wrap, { top: insets.top + 6 }]}>
      <View style={st.bar}>
        <Text style={st.text} numberOfLines={1}>Viewing as: {VIEW_AS_LABEL[viewAs]} · nothing saves</Text>
        <Pressable accessibilityRole="button" accessibilityLabel="Exit preview"
          onPress={() => { setViewAs(null); router.replace('/coach'); }} style={st.exit}>
          <Text style={st.exitText}>Exit</Text>
        </Pressable>
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  wrap: { position: 'absolute', left: 0, right: 0, alignItems: 'center', zIndex: 50 },
  bar: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: C.red, borderRadius: 999, paddingLeft: 14, paddingRight: 4, paddingVertical: 4, maxWidth: '94%' },
  text: { flexShrink: 1, fontFamily: F.xbold, fontSize: 11, color: C.white },
  exit: { backgroundColor: C.navy, borderRadius: 999, paddingHorizontal: 14, minHeight: 32, justifyContent: 'center' },
  exitText: { fontFamily: F.black, fontSize: 11, letterSpacing: 0.8, textTransform: 'uppercase', color: C.white },
});
