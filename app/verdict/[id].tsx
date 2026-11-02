import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuth } from '../../src/lib/auth';
import { C, F } from '../../src/lib/theme';
import { BackIcon, LockIcon } from '../../src/components/icons';
import Poster from '../../src/components/Poster';
import { byId, imageFor, KIND } from '../../src/lib/stackcheck';
import { isFree } from '../../src/lib/access';

/** One verdict. Free users get the verdict and the why; the full breakdown comes with the subscription. */
export default function VerdictScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { profile } = useAuth();
  const router = useRouter();
  const v = byId(String(id));
  if (!v) return null;
  const k = KIND[v.kind];
  const locked = isFree(profile);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.navy }}>
      <ScrollView contentContainerStyle={{ padding: 20, gap: 16, paddingBottom: 56 }}>
        <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={() => router.back()} hitSlop={10} style={{ width: 40, height: 40, justifyContent: 'center' }}>
          <BackIcon />
        </Pressable>
        <View style={{ flexDirection: 'row', gap: 16, alignItems: 'center' }}>
          <Poster source={imageFor(v)} label={v.name} size={96} />
          <View style={{ flex: 1, gap: 6 }}>
            <Text style={st.k}>{v.category}</Text>
            <Text style={st.h} accessibilityRole="header">{v.name}</Text>
          </View>
        </View>

        <View style={[st.verdict, { borderColor: k.color }]}>
          <View style={[st.mark, { backgroundColor: k.color }]}><Text style={st.markText}>{k.mark}</Text></View>
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={[st.vLabel, { color: k.color }]}>{v.verdict}</Text>
            <Text style={st.vSub}>Evidence: {v.evidence}{v.cost ? ` · ${v.cost}` : ''}</Text>
          </View>
        </View>

        <Text style={st.headline}>{v.headline}</Text>
        <Text style={st.body}>{v.intro}</Text>
        {!!v.claim && <Block label="What they claim" text={v.claim} />}

        {locked ? (
          <Pressable accessibilityRole="button" onPress={() => router.push('/unlock')} style={st.lock}>
            <View style={st.lockIcon}><LockIcon size={20} /></View>
            <Text style={st.lockT}>What the research says, the cheaper swap and the marketing tricks</Text>
            <Text style={st.body}>Full breakdowns for every product come with the full plan.</Text>
            <View style={st.btn}><Text style={st.btnText}>Unlock Stack Check</Text></View>
          </Pressable>
        ) : (
          <>
            {!!v.research && <Block label="What the research says" text={v.research} />}
            {!!v.swap && <Block label="The swap" text={v.swap} tone="green" />}
            {v.mvr.length > 0 && (
              <View style={st.card}>
                <Text style={st.label}>They say → Reality</Text>
                {v.mvr.map(([a, b], i) => (
                  <View key={i} style={[st.mvr, i > 0 && { borderTopWidth: 1, borderTopColor: C.line }]}>
                    <Text style={st.say}>"{a}"</Text>
                    <Text style={st.body}>{b}</Text>
                  </View>
                ))}
              </View>
            )}
          </>
        )}
        <Text style={st.fine}>From Boon's Beyond the Label investigation. Not medical advice: check with your doctor if you have a condition or take medication.</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const Block = ({ label, text, tone }: { label: string; text: string; tone?: 'green' }) => (
  <View style={[st.card, tone === 'green' && { borderColor: C.green }]}>
    <Text style={[st.label, tone === 'green' && { color: C.green }]}>{label}</Text>
    <Text style={st.body}>{text}</Text>
  </View>
);

const st = StyleSheet.create({
  k: { fontFamily: F.xbold, fontSize: 12, letterSpacing: 1.6, textTransform: 'uppercase', color: C.red2 },
  h: { fontFamily: F.black, fontSize: 28, lineHeight: 32, color: C.white, textTransform: 'uppercase', letterSpacing: -0.4 },
  verdict: { flexDirection: 'row', alignItems: 'center', gap: 14, borderWidth: 2, borderRadius: 18, padding: 14, backgroundColor: C.navy2 },
  mark: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  markText: { fontFamily: F.black, fontSize: 22, color: C.navy },
  vLabel: { fontFamily: F.black, fontSize: 22, textTransform: 'uppercase' },
  vSub: { fontFamily: F.bold, fontSize: 13, color: C.white },
  headline: { fontFamily: F.black, fontSize: 22, lineHeight: 27, color: C.white },
  body: { fontFamily: F.semi, fontSize: 15, lineHeight: 22, color: C.white },
  card: { backgroundColor: C.navy2, borderRadius: 18, borderWidth: 1, borderColor: C.line, padding: 16, gap: 8 },
  label: { fontFamily: F.xbold, fontSize: 11, letterSpacing: 1.4, textTransform: 'uppercase', color: C.red2 },
  mvr: { paddingVertical: 8, gap: 4 },
  say: { fontFamily: F.black, fontSize: 15, color: C.white },
  lock: { backgroundColor: C.navy2, borderRadius: 20, borderWidth: 1.5, borderColor: C.red, padding: 18, gap: 10 },
  lockIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: C.red, alignItems: 'center', justifyContent: 'center' },
  lockT: { fontFamily: F.black, fontSize: 18, lineHeight: 23, color: C.white },
  btn: { height: 54, borderRadius: 14, backgroundColor: C.red, alignItems: 'center', justifyContent: 'center' },
  btnText: { fontFamily: F.black, fontSize: 15, letterSpacing: 0.6, textTransform: 'uppercase', color: C.white },
  fine: { fontFamily: F.medium, fontSize: 12, lineHeight: 17, color: C.white },
});
