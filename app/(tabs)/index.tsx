import React, { useCallback, useState } from 'react';
import { ImageBackground, Pressable, ScrollView, StyleSheet, Text, View, RefreshControl } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../../src/lib/auth';
import { C, F } from '../../src/lib/theme';
import { Card, s as ui } from '../../src/components/ui';
import NoPlan from '../../src/components/NoPlan';
import Poster from '../../src/components/Poster';
import { CheckIcon, FlameIcon, PlayIcon } from '../../src/components/icons';
import { daysToSunday, exercises, phaseOf, PHOTO_WEEKS, todayIndex, weekOf } from '../../src/lib/program';
import { flushQueue, isoDate, loggedDays } from '../../src/lib/logs';
import { productImage } from '../../src/lib/images';
import { dayPhoto } from '../../src/lib/photos';

export default function Today() {
  const { profile, plan, session, refresh } = useAuth();
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const [doneThisWeek, setDoneThisWeek] = useState(0);
  const [taken, setTaken] = useState<Record<string, boolean>>({});
  const today = isoDate();

  const load = useCallback(async () => {
    if (!session) return;
    await flushQueue();
    const sunday = new Date(); sunday.setDate(sunday.getDate() - sunday.getDay());
    const rows = await loggedDays(session.user.id, isoDate(sunday));
    setDoneThisWeek(new Set(rows.map((r) => r.logged_on)).size);
    try { setTaken(JSON.parse((await AsyncStorage.getItem('sps:stack:' + today)) || '{}')); } catch { setTaken({}); }
  }, [session, today]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  if (!plan) return <NoPlan name={profile?.first_name} />;

  const week = weekOf(plan.train.s);
  const phase = phaseOf(week);
  const { index, isToday } = todayIndex(plan);
  const day = plan.train.d[index];
  const [dayName, dayType] = day.t.split('·').map((x) => x.trim());
  const toSunday = daysToSunday();
  const photoWeek = PHOTO_WEEKS.includes(week);
  const hour = new Date().getHours();
  const greet = hour < 12 ? 'Morning' : hour < 18 ? 'Afternoon' : 'Evening';
  const stack = plan.stack || [];
  const perWeek = plan.train.d.length;

  const toggle = async (k: string) => {
    const next = { ...taken, [k]: !taken[k] };
    setTaken(next);
    await AsyncStorage.setItem('sps:stack:' + today, JSON.stringify(next));
  };

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: C.navy }}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} tintColor={C.white}
          onRefresh={async () => { setRefreshing(true); await refresh(); await load(); setRefreshing(false); }} />}
      >
        <View style={st.head}>
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={[ui.eyebrow, { color: C.red2 }]}>Week {week} · {phase.name}</Text>
            <Text style={st.greet}>{greet}, {plan.name}</Text>
          </View>
          <View style={st.pill} accessibilityLabel={`${doneThisWeek} of ${perWeek} workouts this week`}>
            <FlameIcon />
            <Text style={st.pillText}>{doneThisWeek}/{perWeek}</Text>
          </View>
        </View>

        {/* Hero: today's workout */}
        <Pressable accessibilityRole="button" accessibilityLabel={`${isToday ? 'Start' : 'Preview'} ${day.t}`}
          onPress={() => router.push({ pathname: '/workout', params: { d: String(index) } })} style={st.heroWrap}>
          <ImageBackground source={typeof dayPhoto(day.t) === 'number' ? (dayPhoto(day.t) as number) : { uri: dayPhoto(day.t) as string }} style={st.hero} imageStyle={{ borderRadius: 24 }} resizeMode="cover">
            <LinearGradient colors={['rgba(13,27,51,0.05)', 'rgba(13,27,51,0.55)', 'rgba(13,27,51,0.97)']} locations={[0, 0.45, 1]} style={[StyleSheet.absoluteFill, { borderRadius: 24 }]} />
            <View style={st.badge}><Text style={st.badgeText}>{isToday ? "Today's workout" : `Next · ${dayName}`}</Text></View>
            <View style={{ gap: 6 }}>
              <Text style={st.heroTitle}>{dayType || dayName}</Text>
              <Text style={st.heroSub}>{day.x.length} exercises · about 45 min · starts with {exercises[day.x[0][0]]?.name || day.x[0][0]}</Text>
              <View style={st.heroBtn}>
                <PlayIcon size={16} />
                <Text style={st.heroBtnText}>{isToday ? 'Start workout' : 'Preview workout'}</Text>
              </View>
            </View>
          </ImageBackground>
        </Pressable>

        {/* Scoreboard */}
        <View style={st.score}>
          <Score big={`${week}`} small="of 12" label="Week" />
          <View style={st.div} />
          <Score big={`${doneThisWeek}`} small={`of ${perWeek}`} label="Workouts" />
          <View style={st.div} />
          <Score big={toSunday === 0 ? 'Today' : `${toSunday}`} small={toSunday === 0 ? '' : toSunday === 1 ? 'day' : 'days'} label="Check-in" />
        </View>

        {/* Targets */}
        <View style={{ paddingHorizontal: 20 }}>
          <Card>
            <Text style={ui.label}>Hit these every day</Text>
            <View style={{ flexDirection: 'row' }}>
              <Target value={plan.kcal} label="calories" />
              <Target value={`${plan.protein}g`} label="protein" />
              <Target value={plan.steps} label="steps" />
            </View>
          </Card>
        </View>

        {/* Stack carousel */}
        {stack.length > 0 && (
          <>
            <View style={st.rowHead}>
              <Text style={st.rowTitle}>Your stack today</Text>
              <Text style={st.rowHint}>Tap when taken</Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, gap: 12 }}>
              {stack.map((x) => {
                const k = x.product; const on = !!taken[k];
                return (
                  <Pressable key={k} accessibilityRole="checkbox" accessibilityState={{ checked: on }} accessibilityLabel={k} onPress={() => toggle(k)} style={{ width: 130, gap: 8 }}>
                    <Poster source={productImage(k)} label={k} size={130}>
                      <View style={[st.check, on && { backgroundColor: C.green, borderColor: C.green }]}>{on && <CheckIcon size={12} />}</View>
                    </Poster>
                    <Text style={st.posterName} numberOfLines={1}>{k.split('(')[0].trim()}</Text>
                    <Text style={st.posterSub} numberOfLines={1}>{x.dose} · {x.when}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </>
        )}

        {/* Check-in + phase */}
        <View style={{ paddingHorizontal: 20, gap: 12, marginTop: 20 }}>
          <Pressable accessibilityRole="button" onPress={() => router.push('/checkin')}>
            <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 14, borderColor: toSunday === 0 ? C.red : C.line, borderWidth: toSunday === 0 ? 2 : 1 }}>
              <View style={{ flex: 1, gap: 4 }}>
                <Text style={ui.label}>Sunday check-in{photoWeek ? ' · photo week' : ''}</Text>
                <Text style={st.cardTitle}>{toSunday === 0 ? 'Check in now' : `Opens in ${toSunday} day${toSunday > 1 ? 's' : ''}`}</Text>
              </View>
              <Text style={st.arrow}>→</Text>
            </Card>
          </Pressable>
          <Pressable accessibilityRole="button" onPress={() => router.push('/boon')}>
            <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View style={st.avatar}><Text style={st.avatarText}>B</Text></View>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={st.tipTitle}>{week <= 4 ? 'Phase 1: build the habit' : week <= 8 ? 'Phase 2: beat last week' : 'Phase 3: finish strong'}</Text>
                <Text style={st.tipSub}>{week <= 4 ? plan.phase1 : week <= 8 ? plan.phase2 : plan.phase3}</Text>
              </View>
            </Card>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const Score = ({ big, small, label }: { big: string; small: string; label: string }) => (
  <View style={{ flex: 1, alignItems: 'center', gap: 2 }}>
    <Text style={st.scoreBig}>{big}<Text style={st.scoreSmall}>{small ? ` ${small}` : ''}</Text></Text>
    <Text style={st.scoreLabel}>{label}</Text>
  </View>
);

const Target = ({ value, label }: { value: string; label: string }) => (
  <View style={{ flex: 1, gap: 2 }}>
    <Text style={st.targetVal}>{value}</Text>
    <Text style={st.targetLabel}>{label}</Text>
  </View>
);

const st = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingTop: 8, paddingBottom: 14 },
  greet: { fontFamily: F.black, fontSize: 26, color: C.white },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: C.navy2, borderWidth: 1, borderColor: C.line, borderRadius: 999, paddingVertical: 8, paddingHorizontal: 12 },
  pillText: { fontFamily: F.black, fontSize: 14, color: C.white },
  heroWrap: { paddingHorizontal: 20 },
  hero: { height: 340, borderRadius: 24, padding: 20, justifyContent: 'space-between', overflow: 'hidden' },
  badge: { alignSelf: 'flex-start', backgroundColor: C.red, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
  badgeText: { fontFamily: F.black, fontSize: 11, letterSpacing: 1.4, textTransform: 'uppercase', color: C.white },
  heroTitle: { fontFamily: F.black, fontSize: 40, lineHeight: 42, color: C.white, textTransform: 'uppercase', letterSpacing: -0.5 },
  heroSub: { fontFamily: F.bold, fontSize: 13, color: C.white, lineHeight: 18 },
  heroBtn: { marginTop: 10, height: 54, borderRadius: 14, backgroundColor: C.red, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  heroBtnText: { fontFamily: F.black, fontSize: 16, color: C.white, textTransform: 'uppercase', letterSpacing: 0.6 },
  score: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 20, marginVertical: 16, paddingVertical: 14, backgroundColor: C.navy2, borderRadius: 18, borderWidth: 1, borderColor: C.line },
  div: { width: 1, height: 36, backgroundColor: C.line },
  scoreBig: { fontFamily: F.black, fontSize: 24, color: C.white },
  scoreSmall: { fontFamily: F.bold, fontSize: 12, color: C.white },
  scoreLabel: { fontFamily: F.xbold, fontSize: 10, letterSpacing: 1.4, textTransform: 'uppercase', color: C.white },
  targetVal: { fontFamily: F.black, fontSize: 22, color: C.white },
  targetLabel: { fontFamily: F.semi, fontSize: 12, color: C.white },
  rowHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', paddingHorizontal: 20, marginTop: 22, marginBottom: 12 },
  rowTitle: { fontFamily: F.black, fontSize: 19, color: C.white },
  rowHint: { fontFamily: F.bold, fontSize: 12, color: C.white },
  check: { position: 'absolute', top: 8, right: 8, width: 26, height: 26, borderRadius: 13, borderWidth: 2, borderColor: C.white, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(13,27,51,0.6)' },
  posterName: { fontFamily: F.xbold, fontSize: 13, color: C.white },
  posterSub: { fontFamily: F.semi, fontSize: 11, color: C.white },
  cardTitle: { fontFamily: F.black, fontSize: 18, color: C.white },
  arrow: { fontFamily: F.black, fontSize: 22, color: C.red2 },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: C.red, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontFamily: F.black, fontSize: 16, color: C.white },
  tipTitle: { fontFamily: F.xbold, fontSize: 13, color: C.white },
  tipSub: { fontFamily: F.semi, fontSize: 12, color: C.white, lineHeight: 17 },
});
