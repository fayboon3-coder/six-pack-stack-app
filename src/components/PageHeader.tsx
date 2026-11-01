import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../lib/auth';
import { C, F } from '../lib/theme';

/**
 * Clean page header (Sweat-style): small date/context line, big bold title,
 * one-line subtitle, profile avatar top-right, optional 12-week progress bar.
 */
export default function PageHeader({ kicker, title, subtitle, week, right }: {
  kicker?: string; title: string; subtitle?: string; week?: number; right?: React.ReactNode;
}) {
  const { profile, plan } = useAuth();
  const router = useRouter();
  const name = profile?.first_name || plan?.name || '';
  const initial = (name || 'Y')[0].toUpperCase();
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });

  return (
    <View style={st.wrap}>
      <View style={st.top}>
        <Text style={st.kicker}>{kicker || today}</Text>
        {right ?? (
          <Pressable accessibilityRole="button" accessibilityLabel="Your account" onPress={() => router.push('/boon')} style={st.avatar} hitSlop={8}>
            <Text style={st.avatarText}>{initial}</Text>
          </Pressable>
        )}
      </View>
      <Text style={st.title} accessibilityRole="header">{title}</Text>
      {!!subtitle && <Text style={st.subtitle}>{subtitle}</Text>}
      {week != null && (
        <View style={st.weeks} accessibilityLabel={`Week ${week} of 12`}>
          {Array.from({ length: 12 }, (_, i) => (
            <View key={i} style={[st.seg, { backgroundColor: i < week - 1 ? C.green : i === week - 1 ? C.red : C.line },
              (i === 3 || i === 7) && { marginRight: 6 }]} />
          ))}
        </View>
      )}
    </View>
  );
}

const st = StyleSheet.create({
  wrap: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 6, gap: 6 },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', minHeight: 44 },
  kicker: { fontFamily: F.xbold, fontSize: 12, letterSpacing: 1.6, textTransform: 'uppercase', color: C.red2 },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: C.navy2, borderWidth: 2, borderColor: C.red, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontFamily: F.black, fontSize: 16, color: C.white },
  title: { fontFamily: F.black, fontSize: 34, lineHeight: 38, color: C.white, letterSpacing: -0.6 },
  subtitle: { fontFamily: F.semi, fontSize: 15, lineHeight: 21, color: C.white },
  weeks: { flexDirection: 'row', gap: 3, marginTop: 8 },
  seg: { flex: 1, height: 5, borderRadius: 3 },
});
