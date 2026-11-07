import React, { useCallback, useState } from 'react';
import { Image, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import Svg, { Path } from 'react-native-svg';
import { C, F } from '../lib/theme';
import { useAuth } from '../lib/auth';
import Page from './Page';
import PageTitle from './PageTitle';
import RemindersCard from './RemindersCard';
import { WHATSAPP } from './NoPlan';
import { checkinState, focusOf, loadCoaching, thread, type ThreadItem } from '../lib/coaching';
import { track } from '../lib/track';

const BOON = require('../../assets/hero/boon_avatar.jpg');
const nice = (iso: string) => new Date(iso.slice(0, 10) + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

/** 1:1 clients: every check-in they sent and every review Boon wrote back, as one conversation. */
export default function CoachThread() {
  const { session } = useAuth();
  const router = useRouter();
  const [items, setItems] = useState<ThreadItem[] | null>(null);
  const [state, setState] = useState<ReturnType<typeof checkinState> | null>(null);
  useFocusEffect(useCallback(() => {
    if (!session) return;
    loadCoaching(session.user.id).then(({ reviews, checkins }) => { setItems(thread(reviews, checkins)); setState(checkinState(reviews, checkins)); });
  }, [session]));

  return (
    <Page tabs header={<PageTitle title="Your coach" sub="Every check-in and every reply" />}>
      <Pressable accessibilityRole="button" onPress={() => { track('whatsapp_tap', { where: 'thread' }); Linking.openURL(`https://wa.me/${WHATSAPP}`); }} style={st.wa}>
        <Image source={BOON} style={st.waAv} />
        <View style={{ flex: 1 }}><Text style={st.waT}>Text me anytime</Text><Text style={st.waS}>WhatsApp (323) 229-0609 · replies within 24 hours</Text></View>
        <Svg width={16} height={16} viewBox="0 0 24 24"><Path d="M9 5l7 7-7 7" stroke="#fff" strokeWidth={2.6} fill="none" strokeLinecap="round" strokeLinejoin="round" /></Svg>
      </Pressable>

      {state?.state === 'due' && (
        <Pressable accessibilityRole="button" onPress={() => router.push('/checkin')} style={st.due}>
          <Text style={st.dueT}>Send me this week's check-in</Text>
          <Text style={st.dueS}>About 2 minutes. It comes straight to me.</Text>
        </Pressable>
      )}
      {state?.state === 'sent' && (
        <View style={st.sent}><View style={st.dot} /><Text style={st.sentT}>Week {state.latest?.week} received. I'm going through it now.</Text></View>
      )}

      {items && !items.length && <Text style={st.empty}>Your first check-in starts this thread. I reply to every one myself.</Text>}
      {(items || []).map((it) => it.kind === 'review' ? (
        <View key={'r' + it.r.id} style={st.review}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Image source={BOON} style={st.rAv} />
            <View style={{ flex: 1 }}><Text style={st.rK}>BOON{it.r.week ? ` · WEEK ${it.r.week} REVIEW` : ''}</Text><Text style={st.rD}>{nice(it.r.created_at)}</Text></View>
          </View>
          <Text style={st.rB}>{it.r.body}</Text>
          {!!focusOf(it.r) && <View style={st.focus}><Text style={st.focusK}>YOUR ONE THING</Text><Text style={st.focusT}>{focusOf(it.r)}</Text></View>}
        </View>
      ) : (
        <View key={'c' + it.c.id} style={st.mine}>
          <Text style={st.mK}>YOU · WEEK {it.c.week} CHECK-IN · {nice(it.c.checkin_date).toUpperCase()}</Text>
          <View style={st.mStats}>
            {it.c.weight != null && <Text style={st.mStat}>{Number(it.c.weight).toFixed(1)} lbs</Text>}
            {it.c.workouts != null && <Text style={st.mStat}>{it.c.workouts} workouts</Text>}
            {it.c.adherence != null && <Text style={st.mStat}>{it.c.adherence}/5 on plan</Text>}
          </View>
          {!!it.c.stronger && <Text style={st.mB}><Text style={st.mBold}>Last week's focus: </Text>{it.c.stronger}</Text>}
          {!!it.c.win && <Text style={st.mB}><Text style={st.mBold}>Win: </Text>{it.c.win}</Text>}
          {!!it.c.hardest && <Text style={st.mB}><Text style={st.mBold}>Hardest: </Text>{it.c.hardest}</Text>}
          {!!it.c.questions && <Text style={st.mB}><Text style={st.mBold}>Asked: </Text>{it.c.questions}</Text>}
        </View>
      ))}

      <View style={{ height: 8 }} />
      <RemindersCard />
    </Page>
  );
}

const st = StyleSheet.create({
  wa: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderRadius: 22, backgroundColor: '#1f9d5f' },
  waAv: { width: 44, height: 44, borderRadius: 22, borderWidth: 2, borderColor: '#fff' },
  waT: { fontFamily: F.xbold, fontSize: 16, color: '#fff' },
  waS: { fontFamily: F.medium, fontSize: 13, color: 'rgba(255,255,255,0.9)' },
  due: { padding: 16, borderRadius: 22, backgroundColor: C.red, gap: 2 },
  dueT: { fontFamily: F.xbold, fontSize: 17, color: '#fff' },
  dueS: { fontFamily: F.medium, fontSize: 14, color: 'rgba(255,255,255,0.9)' },
  sent: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, borderRadius: 18, backgroundColor: C.card, borderWidth: 1, borderColor: C.line },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: C.green },
  sentT: { flex: 1, fontFamily: F.semi, fontSize: 14, color: C.ink },
  empty: { fontFamily: F.medium, fontSize: 15, lineHeight: 22, color: C.ink, textAlign: 'center', padding: 20 },
  review: { marginRight: 18, padding: 16, gap: 12, borderRadius: 22, borderTopLeftRadius: 6, backgroundColor: C.bg, borderWidth: 1, borderColor: C.line, shadowColor: '#141c33', shadowOpacity: 0.07, shadowRadius: 12, shadowOffset: { width: 0, height: 4 } },
  rAv: { width: 36, height: 36, borderRadius: 18 },
  rK: { fontFamily: F.bold, fontSize: 11, letterSpacing: 0.8, color: C.red },
  rD: { fontFamily: F.semi, fontSize: 13, color: C.ink },
  rB: { fontFamily: F.medium, fontSize: 15, lineHeight: 23, color: C.ink },
  focus: { backgroundColor: C.redTint, borderRadius: 14, padding: 12, borderLeftWidth: 4, borderLeftColor: C.red },
  focusK: { fontFamily: F.bold, fontSize: 10, letterSpacing: 1, color: C.red },
  focusT: { fontFamily: F.xbold, fontSize: 15, lineHeight: 21, color: C.ink, marginTop: 3 },
  mine: { marginLeft: 36, padding: 16, gap: 8, borderRadius: 22, borderTopRightRadius: 6, backgroundColor: C.navy },
  mK: { fontFamily: F.bold, fontSize: 10, letterSpacing: 0.8, color: 'rgba(255,255,255,0.7)' },
  mStats: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  mStat: { fontFamily: F.bold, fontSize: 13, color: '#fff', backgroundColor: 'rgba(255,255,255,0.12)', paddingHorizontal: 9, paddingVertical: 4, borderRadius: 8, overflow: 'hidden' },
  mB: { fontFamily: F.medium, fontSize: 14, lineHeight: 20, color: '#fff' },
  mBold: { fontFamily: F.bold },
});
