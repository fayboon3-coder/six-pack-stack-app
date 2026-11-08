import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuth } from '../../src/lib/auth';
import { C, F } from '../../src/lib/theme';
import { BackIcon, LockIcon } from '../../src/components/icons';
import Poster from '../../src/components/Poster';
import { byId, imageFor, KIND } from '../../src/lib/stackcheck';
import Backdrop from '../../src/components/Backdrop';
import { goBack } from '../../src/lib/nav';


/** One verdict. Free users get the verdict and the why; the full breakdown comes with the subscription. */
export default function VerdictScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { profile } = useAuth();
  const router = useRouter();
  const v = byId(String(id));
  if (!v) return null;
  const k = KIND[v.kind];
  // Full breakdowns: coaching clients, subscribers and the coach. Free users and visitors see the verdict.
  const locked = !profile || (profile.role !== 'coach' && profile.tier === 'free');

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }}>
      <Backdrop />
      <ScrollView contentContainerStyle={{ padding: 20, gap: 16, paddingBottom: 56 }}>
        <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={() => goBack(router, '/stack-check')} hitSlop={10} style={{ width: 40, height: 40, justifyContent: 'center' }}>
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
          <Pressable accessibilityRole="button" onPress={() => router.push(profile ? '/unlock' : '/quiz')} style={st.lock}>
            <View style={st.lockIcon}><LockIcon size={20} /></View>
            <Text style={st.lockT}>What the research says, the cheaper swap and the marketing tricks</Text>
            <Text style={st.body}>{profile ? 'Full breakdowns for every product come with the full plan.' : 'Every full breakdown comes with the Six-Pack Stack app. Build your free plan to start.'}</Text>
            <View style={st.btn}><Text style={st.btnText}>{profile ? 'Unlock Stack Check' : 'Build my free plan'}</Text></View>
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
  k: { fontFamily: F.xbold, fontSize: 12, letterSpacing: 1.6, textTransform: 'uppercase', color: C.red },
  h: { fontFamily: F.black, fontSize: 28, lineHeight: 32, color: C.ink, letterSpacing: -0.4 },
  verdict: { flexDirection: 'row', alignItems: 'center', gap: 14, borderWidth: 2, borderRadius: 18, padding: 14, backgroundColor: C.card },
  mark: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  markText: { fontFamily: F.black, fontSize: 22, color: C.bg },
  vLabel: { fontFamily: F.black, fontSize: 22 },
  vSub: { fontFamily: F.bold, fontSize: 13, color: C.ink },
  headline: { fontFamily: F.black, fontSize: 22, lineHeight: 27, color: C.ink },
  body: { fontFamily: F.semi, fontSize: 15, lineHeight: 22, color: C.ink },
  card: { backgroundColor: C.card, borderRadius: 18, borderWidth: 1, borderColor: C.line, padding: 16, gap: 8 },
  label: { fontFamily: F.xbold, fontSize: 11, letterSpacing: 1.4, textTransform: 'uppercase', color: C.red },
  mvr: { paddingVertical: 8, gap: 4 },
  say: { fontFamily: F.black, fontSize: 15, color: C.ink },
  lock: { backgroundColor: C.card, borderRadius: 20, borderWidth: 1.5, borderColor: C.red, padding: 18, gap: 10 },
  lockIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: C.red, alignItems: 'center', justifyContent: 'center' },
  lockT: { fontFamily: F.black, fontSize: 18, lineHeight: 23, color: C.ink },
  btn: { height: 54, borderRadius: 14, backgroundColor: C.red, alignItems: 'center', justifyContent: 'center' },
  btnText: { fontFamily: F.bold, fontSize: 16, color: C.onAccent },
  fine: { fontFamily: F.medium, fontSize: 12, lineHeight: 17, color: C.ink },
});
