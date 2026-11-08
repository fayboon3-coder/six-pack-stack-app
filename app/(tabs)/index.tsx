import React, { useCallback, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View, type ImageSourcePropType } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Path, Polyline, Rect } from 'react-native-svg';
import { useAuth } from '../../src/lib/auth';
import { E, F } from '../../src/lib/theme';
import NoPlan from '../../src/components/NoPlan';
import { daysToSunday, phaseOf, PHOTO_WEEKS, todayIndex, weekOf } from '../../src/lib/program';
import { dayMeta } from '../../src/lib/workoutMeta';
import { heroPhoto } from '../../src/lib/heroPhotos';
import { HEADER_HD, hdUrl, workoutHD } from '../../src/lib/hd';
import { isoDate, lastSession, loggedDays } from '../../src/lib/logs';
import { isCoached, isFree, isLocked } from '../../src/lib/access';
import { addProtein, num, proteinGoal, readDay, stepGoal, syncPhoneSteps, type Day } from '../../src/lib/daily';
import { kcalToday, readFood, type FoodEntry } from '../../src/lib/food';
import { readMeals, writeMeals, type MealDay } from '../../src/lib/mealsToday';
import { mealTiles } from '../../src/lib/foodPhotos';
import { mealImage } from '../../src/lib/meals';
import { allWeighIns } from '../../src/lib/body';
import { goalDate, ratePerWeek, suggestNext, trendSeries, type SetRec, type TrendPoint } from '../../src/lib/trend';
import { adaptFor } from '../../src/lib/adaptive';
import { health } from '../../src/lib/health';
import { checkinState, focusOf, loadCoaching, type ClientCheckin, type Review } from '../../src/lib/coaching';
import { afterProtein } from '../../src/lib/reminders';
import { mondayOf } from '../../src/lib/recap';
import { track } from '../../src/lib/track';
import { showCoaching } from '../../src/components/Coach';
import BackOffice from '../../src/components/BackOffice';
import MealCard from '../../src/components/MealCard';
import Pic from '../../src/components/Pic';
import { CountUp, Drift, MotionScroll, Ping, Press, Reveal } from '../../src/components/motion';
import { DotTrack, GoalPath, MiniRing, WeekLine } from '../../src/components/charts';
import { FuelCard } from '../../src/components/Fuel';
import { plain } from '../../src/lib/program';

const DEMO = process.env.EXPO_PUBLIC_DEMO === '1';
const BOON = require('../../assets/hero/boon_avatar.jpg');
const BOON_WIDE = require('../../assets/hero/boon_wide.jpg');
const SCALE = { uri: hdUrl(HEADER_HD.scale, 300) };
const LOGO = require('../../assets/logo-b.png');
const fmt = (n: number) => Math.round(n).toLocaleString('en-US');
const DOW = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
const DAY_NAME = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const LETTER = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
const EQUIP: Record<string, string> = { gym: 'Gym', db: 'Home', bw: 'No equipment' };
const LOWER = /squat|deadlift|rdl|leg_press|lunge|hip_thrust|split/;
const greet = () => { const h = new Date().getHours(); return h < 5 ? 'Late night' : h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening'; };
const dowOf = (t: string) => DOW.indexOf(t.trim().slice(0, 3).toLowerCase());
const hm = (min: number) => `${Math.floor(min / 60)}h ${String(Math.round(min % 60)).padStart(2, '0')}m`;
const shortDate = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

/**
 * Today: the home screen. One place for the whole day: the workout and its target, calories,
 * protein, steps and sleep, food logging, trend weight and the weekly calorie check, the Sunday
 * check-in, Boon (for 1:1 clients) and every tool in the app.
 */
export default function Today() {
  const { plan, profile, session, viewAs, isCoachAccount } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const uid = session?.user.id;
  const coached = isCoached(profile) && (!isCoachAccount || viewAs === 'coached');

  const [done, setDone] = useState<Set<string>>(new Set());
  const [day, setDay] = useState<Day>({ steps: 0, protein: 0, adds: [] });
  const [kcal, setKcal] = useState(0);
  const [food, setFood] = useState<FoodEntry[]>([]);
  const [meals, setMeals] = useState<MealDay>({ pick: {}, eaten: {} });
  const [series, setSeries] = useState<TrendPoint[]>([]);
  const [healthOn, setHealthOn] = useState(false);
  const [sleep, setSleep] = useState<number | null>(null);
  const [prev, setPrev] = useState<SetRec[] | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [checkins, setCheckins] = useState<ClientCheckin[]>([]);

  const t = plan ? todayIndex(plan) : null;
  const firstEx = plan && t ? plan.train.d[t.index]?.x[0]?.[0] : undefined;

  const load = useCallback(() => {
    if (!plan) return;
    readDay().then(setDay);
    kcalToday(plan).then(setKcal);
    readFood().then(setFood);
    readMeals().then(setMeals);
    allWeighIns(DEMO ? undefined : uid).then((w) => setSeries(trendSeries(w))).catch(() => {});
    health.isOn().then(async (on) => {
      setHealthOn(on);
      if (on) { const h = await health.today().catch(() => null); setSleep(h?.sleepMin ?? null); }
    }).catch(() => {});
    syncPhoneSteps().then((s) => { if (s != null) readDay().then(setDay); }).catch(() => {});
    if (DEMO) {
      if (process.env.EXPO_PUBLIC_DEMO_FRESH === '1') return; // design preview of a brand-new account
      const today = (new Date().getDay() + 6) % 7;
      setDone(new Set(plan.train.d.filter((d) => { const w = dowOf(d.t); return w >= 0 && (w + 6) % 7 < today; }).map((d) => d.t)));
      setPrev([{ weight: 135, reps: 10 }, { weight: 135, reps: 10 }, { weight: 135, reps: 10 }]);
    } else if (uid) {
      loggedDays(uid, isoDate(mondayOf())).then((r: any[]) => setDone(new Set(r.map((x) => x.day_label)))).catch(() => {});
      if (firstEx) lastSession(uid, [firstEx], isoDate()).then((p) => setPrev(p[firstEx] || [])).catch(() => setPrev([]));
    }
    if (coached && uid) loadCoaching(uid).then(({ reviews: r, checkins: c }) => { setReviews(r); setCheckins(c); }).catch(() => {});
  }, [plan, uid, coached, firstEx]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  // Boon's own account opens on the back office ("View the app as" switches to a client's Today).
  if (isCoachAccount && !viewAs) return <BackOffice />;
  if (!plan || !t) return <NoPlan name={profile?.first_name} />;

  /* ---------- the numbers ---------- */
  const name = (plan.name && plan.name !== 'You' ? plan.name : profile?.first_name) || '';
  const week = weekOf(plan.train.s);
  const phase = phaseOf(week);
  const days = plan.train.d;
  const meta = dayMeta(days[t.index], plan.train.c);
  const locked = isLocked(profile, week);
  const free = isFree(profile);
  const doneToday = t.isToday && done.has(days[t.index].t);
  const restDay = !t.isToday;
  const nextDow = dowOf(days[t.index].t);
  const equip = plan.train.cfg?.equip ? EQUIP[plan.train.cfg.equip] : undefined;
  const hero = heroPhoto(meta.muscles[0], plan.train.cfg?.equip);
  const sug = firstEx && prev ? suggestNext(days[t.index].x[0][1], prev, week, LOWER.test(firstEx)) : null;

  const kGoal = num(plan.kcal) || 2000, pGoal = proteinGoal(plan), sGoal = stepGoal(plan);
  const planned = days.length;
  const doneN = days.filter((d) => done.has(d.t)).length;

  const last = series.length ? series[series.length - 1] : null;
  const rate = ratePerWeek(series, 21);
  const goalW = Number((plan.goal_short || '').match(/(\d{2,3})\s*lbs/i)?.[1]) || Number((profile?.quiz as any)?.goal_weight) || null;
  const startW = Number(plain(plan.goal_long || '').match(/from\s*(\d{2,3})/i)?.[1]) || Number((profile?.quiz as any)?.weight) || series[0]?.w || null;
  const eta = last ? goalDate(last.t, rate, goalW) : null;
  const weighedToday = series.some((p) => p.date === isoDate());
  const spark = series.slice(-30);
  const adapt = adaptFor(plan, profile, series);

  const toSun = daysToSunday();
  const photoWeek = PHOTO_WEEKS.includes(week);
  const cs = coached ? checkinState(reviews, checkins) : null;
  const focus = coached ? focusOf(reviews[0]) : null;
  const monday = new Date().getDay() === 1 || new Date().getDay() === 2;

  // Today's stack: workout (or rest), protein, steps.
  const stack = [
    { label: restDay ? 'Rest day' : 'Workout', ok: restDay || doneToday },
    { label: 'Protein', ok: day.protein >= pGoal },
    { label: 'Steps', ok: day.steps >= sGoal },
  ];
  const stackedN = stack.filter((s) => s.ok).length;
  const stackPct = [restDay || doneToday ? 1 : 0, day.protein / pGoal, day.steps / sGoal];

  // Next meal on the plan that isn't ticked off.
  const mealList = plan.meals || [];
  const mk = mealList.findIndex((_, k) => !meals.eaten[k]);
  const meal = mk >= 0 ? mealList[mk] : null;
  const opt = meal && meal.options.length ? meal.options[(meals.pick[mk] || 0) % meal.options.length] : null;
  // Today's meals as slices of the day's calories.
  const mealParts = mealList.map((m, k) => {
    const o = m.options.length ? m.options[(meals.pick[k] || 0) % m.options.length] : null;
    return { label: m.slot, kcal: o ? num(o.kcal) : 0, done: !!meals.eaten[k] };
  }).filter((p) => p.kcal > 0);
  const tickMeal = async () => {
    if (mk < 0 || !opt) return;
    const next = { ...meals, eaten: { ...meals.eaten, [mk]: true } };
    setMeals(next); await writeMeals(next);
    const g = num(opt.protein);
    if (g) { const d = await addProtein(g); setDay(d); afterProtein(d.protein, pGoal).catch(() => {}); }
    setKcal(await kcalToday(plan));
    track('meal_tick', { where: 'today' });
  };
  // After anything is logged from the box: the gauge, protein and stack move right away.
  const refreshFuel = async () => {
    if (!plan) return;
    const [k, d, f] = await Promise.all([kcalToday(plan), readDay(), readFood()]);
    setKcal(k); setDay(d); setFood(f);
    afterProtein(d.protein, pGoal).catch(() => {});
  };
  const quickProtein = async () => { const d = await addProtein(25); setDay(d); afterProtein(d.protein, pGoal).catch(() => {}); track('protein_add', { where: 'today', g: 25 }); };
  const openWorkout = () => (locked ? router.push('/unlock') : router.push({ pathname: '/day', params: { d: String(t.index) } }));
  const go = (path: string, ev?: string) => () => { if (ev) track('today_tap', { to: ev }); router.push(path as any); };

  const now = new Date();
  const dateLine = now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }).toUpperCase();

  return (
    <View style={{ flex: 1, backgroundColor: E.paper }}>
      <MotionScroll keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets contentContainerStyle={{ paddingTop: insets.top + 10, paddingBottom: 140 }} showsVerticalScrollIndicator={false}>
        {/* ---------- Masthead ---------- */}
        <Reveal style={st.gutter} y={10}>
          <View style={st.mastRow}>
            <Image source={LOGO} style={st.logo} accessibilityIgnoresInvertColors />
            <Text style={st.dateLine} numberOfLines={1}>{dateLine}</Text>
            <Pressable accessibilityRole="button" accessibilityLabel="You and settings" onPress={go('/you')} hitSlop={8} style={st.me}>
              <Text style={st.meT}>{(name || 'Y').slice(0, 1).toUpperCase()}</Text>
            </Pressable>
          </View>
          <Text style={st.display} accessibilityRole="header">{greet()}{name ? `,\n${name}.` : '.'}</Text>
          <View style={st.weekBar} accessibilityLabel={`Week ${week} of 12, ${phase.name}`}>
            {Array.from({ length: 12 }, (_, k) => <View key={k} style={[st.seg, k + 1 < week && { backgroundColor: E.ink }, k + 1 === week && { backgroundColor: E.red }]} />)}
          </View>
          <View style={st.weekMeta}>
            <Text style={st.weekT}>Week {week} of 12</Text>
            <Text style={st.weekT}>{phase.name} phase</Text>
          </View>

          {/* Today's stack */}
          <View style={st.stack}>
            <Text style={st.stackK}>TODAY'S STACK · {stackedN} OF 3</Text>
            <View style={st.stackRow}>
              {stack.map((s, k) => (
                <View key={s.label} style={st.stackItem}>
                  <MiniRing pct={s.ok ? 1 : stackPct[k]} color={s.ok ? E.green : E.ink} size={24} stroke={3.2}>
                    {s.ok && <Svg width={11} height={11} viewBox="0 0 24 24"><Path d="M5 12.5l4.5 4.5L19 7.5" stroke={E.green} strokeWidth={3.6} fill="none" strokeLinecap="round" strokeLinejoin="round" /></Svg>}
                  </MiniRing>
                  <Text style={[st.stackT, s.ok && { color: E.ink }]} numberOfLines={1}>{s.label}</Text>
                </View>
              ))}
            </View>
          </View>
        </Reveal>

        {/* ---------- 1:1: Boon's note ---------- */}
        {coached && (
          <Reveal delay={120} style={[st.gutter, { marginTop: 22 }]}>
          <Press accessibilityRole="button" onPress={go('/corner', 'corner')} scale={0.985}>
            <View style={st.note}>
              <View style={st.noteHead}>
                <Image source={BOON} style={st.noteAv} />
                <View style={{ flex: 1 }}>
                  <Text style={st.noteK}>FROM BOON{reviews[0]?.week ? ` · WEEK ${reviews[0].week}` : ''}</Text>
                  <Text style={st.noteS}>{cs?.state === 'sent' ? 'Reviewing your check-in now' : cs?.state === 'reviewed' ? 'Your review is in' : 'Your coach'}</Text>
                </View>
                <Arrow color="#fff" />
              </View>
              <Text style={st.noteQ}>{focus ? `“${focus}”` : 'Your first note from me lands after your first Sunday check-in.'}</Text>
              {!!focus && <Text style={st.noteF}>YOUR ONE THING THIS WEEK</Text>}
            </View>
          </Press>
          </Reveal>
        )}

        {/* ---------- Free plan: what unlocks ---------- */}
        {free && (
          <Reveal delay={120} style={[st.gutter, { marginTop: 22 }]}>
          <Press accessibilityRole="button" onPress={go('/unlock', 'unlock')} scale={0.985}>
            <View style={st.freeBand}>
              <View style={{ flex: 1 }}>
                <Text style={st.freeK}>FREE STACK · WEEK {Math.min(week, 2)} OF 2</Text>
                <Text style={st.freeT}>{locked ? 'Week 3 starts with The Full Stack.' : 'Weeks 3–12 are where your body changes.'}</Text>
              </View>
              <View style={st.freeBtn}><Text style={st.freeBtnT}>Unlock</Text></View>
            </View>
          </Press>
          </Reveal>
        )}

        {/* ---------- Training ---------- */}
        <Section label={restDay ? `Up next · ${DAY_NAME[nextDow] || 'Next'}` : 'Today’s training'} right={`Day ${t.index + 1} of ${days.length}`} />
        <Reveal style={st.gutter}>
          <Press accessibilityRole="button" accessibilityLabel={`${meta.type}, ${meta.items.length} exercises`} onPress={openWorkout} scale={0.985} style={st.heroCard}>
            <View style={st.heroImg}>
              <Drift source={hero} hd={workoutHD(meta.muscles[0], plan.train.cfg?.equip)} style={st.fill} />
              <LinearGradient colors={['rgba(16,23,42,0)', 'rgba(16,23,42,0.25)', 'rgba(16,23,42,0.92)']} locations={[0, 0.45, 1]} style={st.fill} />
              <View style={st.heroTop}>
                <View style={[st.chip, doneToday && { backgroundColor: E.green }]}>{!restDay && !doneToday && !locked && <Ping color="#ff6b61" size={6} />}<Text style={st.chipT}>{locked ? 'LOCKED' : doneToday ? 'DONE TODAY' : restDay ? 'REST DAY TODAY' : `WEEK ${week} · ${phase.name.toUpperCase()}`}</Text></View>
              </View>
              <View style={st.heroBottom}>
                <Text style={st.heroTitle} numberOfLines={2}>{meta.type}</Text>
                <Text style={st.heroMeta}>{meta.items.length} exercises  ·  About {meta.minutes} min{equip ? `  ·  ${equip}` : ''}</Text>
              </View>
            </View>
            <View style={st.heroBody}>
              {locked ? (
                <Text style={st.target}>Your Free Stack covered weeks 1 and 2. Unlock The Full Stack to keep going with week {week}.</Text>
              ) : sug && !doneToday ? (
                <View style={st.targetRow}>
                  <View style={st.targetIcon}><Svg width={16} height={16} viewBox="0 0 24 24"><Circle cx={12} cy={12} r={8} stroke={E.red} strokeWidth={2} fill="none" /><Circle cx={12} cy={12} r={3} fill={E.red} /></Svg></View>
                  <View style={{ flex: 1 }}>
                    <Text style={st.targetK}>{restDay ? 'NEXT TARGET' : 'TODAY’S TARGET'}</Text>
                    <Text style={st.target}><Text style={{ fontFamily: F.bold }}>{meta.items[0]?.name}: </Text>{sug.weight ? `${sug.weight} lbs × ${sug.reps}` : `${sug.reps} reps`}. <Text style={{ color: E.sub }}>{sug.note}</Text></Text>
                  </View>
                </View>
              ) : doneToday ? (
                <Text style={st.target}>Workout logged. Now stack the day: hit your protein and your steps.</Text>
              ) : null}
              <View style={st.heroBtns}>
                <View style={[st.btnInk, { flex: 1 }]}>
                  {!locked && !doneToday && !restDay && <Svg width={14} height={14} viewBox="0 0 24 24"><Path d="M7 4.5v15l12.5-7.5z" fill="#fff" /></Svg>}
                  <Text style={st.btnInkT}>{locked ? 'Unlock all 12 weeks' : doneToday ? 'See today’s workout' : restDay ? 'Preview workout' : 'Start workout'}</Text>
                </View>
              </View>
            </View>
          </Press>

          {/* Week strip */}
          <View style={st.strip}>
            {[1, 2, 3, 4, 5, 6, 0].map((dow, k) => {
              const di = days.findIndex((d) => dowOf(d.t) === dow);
              const isT = dow === now.getDay();
              const ok = di >= 0 && done.has(days[di].t);
              return (
                <Pressable key={dow} disabled={di < 0 && dow !== 0} accessibilityRole="button"
                  accessibilityLabel={`${DAY_NAME[dow]}: ${di >= 0 ? `day ${di + 1}${ok ? ', done' : ''}` : dow === 0 ? 'check-in' : 'rest'}`}
                  onPress={() => (di >= 0 ? (locked ? router.push('/unlock') : router.push({ pathname: '/day', params: { d: String(di) } })) : router.push('/checkin'))} style={st.stripCol}>
                  <Text style={[st.stripL, isT && { color: E.ink, fontFamily: F.bold }]}>{LETTER[k]}</Text>
                  {isT && !ok && di >= 0 && <View style={st.stripPing}><Ping color={E.red} size={6} /></View>}
                  <View style={[st.stripDot, di >= 0 && st.stripTrain, ok && st.stripDone, isT && !ok && st.stripToday]}>
                    {ok ? <Svg width={12} height={12} viewBox="0 0 24 24"><Path d="M5 12.5l4.5 4.5L19 7.5" stroke="#fff" strokeWidth={3.4} fill="none" strokeLinecap="round" strokeLinejoin="round" /></Svg>
                      : di >= 0 ? <Text style={[st.stripN, isT && { color: E.red }]}>{di + 1}</Text>
                        : dow === 0 ? <Svg width={12} height={12} viewBox="0 0 24 24"><Rect x={3} y={7} width={18} height={13} rx={2.5} stroke={E.sub} strokeWidth={2.2} fill="none" /><Circle cx={12} cy={13.5} r={3.2} stroke={E.sub} strokeWidth={2.2} fill="none" /></Svg>
                          : <View style={st.restDot} />}
                  </View>
                </Pressable>
              );
            })}
          </View>
          <Text style={st.stripCap}>{doneN} of {planned} workouts this week{toSun === 0 ? ' · Check-in today' : ''}</Text>
        </Reveal>

        {/* ---------- Numbers ---------- */}
        <Section label="Your numbers today" right="Food log" onRight={go('/log-food', 'food_list')} />
        <Reveal style={st.gutter}>
          <FuelCard kcal={kcal} kGoal={kGoal} protein={day.protein} pGoal={pGoal} onProtein={quickProtein}
            onLogged={refreshFuel} where="today" parts={mealParts} onParts={go('/plan', 'day_plan')}>
            <View style={st.hHair} />
            <View style={st.gridRow}>
              <Pressable accessibilityRole="button" onPress={go('/train', 'week')} style={st.mini}>
                <MiniRing pct={doneN / Math.max(1, planned)} color={doneN >= planned ? E.green : E.ink} size={48} stroke={5}>
                  <Text style={st.miniV}>{doneN}<Text style={st.miniO}>/{planned}</Text></Text>
                </MiniRing>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={st.mK}>THIS WEEK</Text>
                  <Text style={st.miniT} numberOfLines={2}>{doneN >= planned ? 'Week done' : `${planned - doneN} workout${planned - doneN === 1 ? '' : 's'} to go`}</Text>
                </View>
              </Pressable>
              <View style={st.vHair} />
              {healthOn && sleep != null ? (
                <Pressable accessibilityRole="button" onPress={go('/you', 'sleep')} style={st.mini}>
                  <MiniRing pct={sleep / 480} color={sleep >= 420 ? E.green : E.ink} size={48} stroke={5}>
                    <Text style={st.miniV}>{Math.floor(sleep / 60)}<Text style={st.miniO}>h</Text></Text>
                  </MiniRing>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={st.mK}>SLEEP</Text>
                    <Text style={st.miniT} numberOfLines={2}>{hm(sleep)}{sleep >= 420 ? ' · rested' : ' · aim for 7h'}</Text>
                  </View>
                </Pressable>
              ) : health.available() && !healthOn ? (
                <Pressable accessibilityRole="button" onPress={async () => { const ok = await health.connect(); setHealthOn(ok); if (ok) load(); track('health_connect', { where: 'today' }); }} style={st.mini}>
                  <View style={st.heart}><Svg width={22} height={22} viewBox="0 0 24 24"><Path d="M12 20s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7.3a4.3 4.3 0 0 1 7.5 2.5C19.5 15.4 12 20 12 20z" fill={E.red} /></Svg></View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={st.mK}>APPLE HEALTH</Text>
                    <Text style={st.miniT} numberOfLines={2}>Connect for steps, sleep and weight</Text>
                  </View>
                </Pressable>
              ) : (
                <Pressable accessibilityRole="button" onPress={go('/train', 'program')} style={st.mini}>
                  <MiniRing pct={week / 12} color={E.red} size={48} stroke={5}>
                    <Text style={st.miniV}>{week}<Text style={st.miniO}>/12</Text></Text>
                  </MiniRing>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={st.mK}>PROGRAM</Text>
                    <Text style={st.miniT} numberOfLines={2}>{phase.name} phase</Text>
                  </View>
                </Pressable>
              )}
            </View>
          </FuelCard>
        </Reveal>

        {/* ---------- Food ---------- */}
        <Section label="Next meal" right="All meals" onRight={go('/plan', 'meals')} />
        <Reveal style={st.gutter}>
          {meal && opt ? (
            <View>
              <MealCard compact slot={`Next up · ${meal.slot}`} opt={opt} eaten={false} onToggle={tickMeal} onOpen={go('/plan', 'meal')} />
            </View>
          ) : mealList.length ? (
            <View style={[st.meal, { paddingVertical: 16 }]}><Text style={st.mealT}>Every meal on today's plan is ticked off.</Text></View>
          ) : null}
        </Reveal>

        {/* ---------- Body ---------- */}
        <Section label="Body" right="Progress" onRight={go('/progress', 'progress')} />
        <Reveal style={st.gutter}>
          <View style={st.surface}>
            <Pressable accessibilityRole="button" onPress={go('/progress', 'trend')} style={st.bodyTop}>
              <Text style={st.mK}>{last ? 'TREND WEIGHT' : 'YOUR 12-WEEK PATH'}</Text>
              {last ? (
                <View style={st.bigRow}>
                  <CountUp value={last.t} format={(n) => n.toFixed(1)} style={st.big} duration={1100} />
                  <Text style={st.bigU}>lbs</Text>
                </View>
              ) : startW && goalW ? (
                <View style={st.bigRow}>
                  <Text style={st.big}>{Math.round(startW)}</Text>
                  <Svg width={26} height={26} viewBox="0 0 24 24" style={{ marginHorizontal: 4 }}><Path d="M4 12h15M13 6l6 6-6 6" stroke={E.faint} strokeWidth={2.4} fill="none" strokeLinecap="round" strokeLinejoin="round" /></Svg>
                  <Text style={[st.big, { color: E.green }]}>{Math.round(goalW)}</Text>
                  <Text style={st.bigU}>lbs</Text>
                </View>
              ) : <Text style={[st.big, { color: E.faint }]}>—</Text>}
              <Text style={st.bodyS}>
                {rate == null ? (last ? 'A few more weigh-ins and your pace shows here.' : 'Weigh in tomorrow morning and your first dot lands on this line.')
                  : rate < -0.05 ? `Down ${Math.abs(rate).toFixed(1)} lbs a week` : rate > 0.05 ? `Up ${rate.toFixed(1)} lbs a week` : 'Holding steady'}
              </Text>
              {!!eta && !!goalW && <Text style={st.bodyGoal}>{goalW} lbs by {shortDate(eta)}</Text>}
            </Pressable>
            {startW && goalW ? (
              <View style={{ paddingHorizontal: 12, paddingBottom: 4 }}>
                <GoalPath startW={startW} goalW={goalW} startDate={plan.train.s} series={series} height={156} />
              </View>
            ) : null}
            <View style={st.hHair} />
            <View style={st.bodyRow}>
              <Pressable accessibilityRole="button" onPress={go('/weigh-in', 'weigh')} style={[st.weighBtn, weighedToday && st.weighDone]}>
                {weighedToday
                  ? <Svg width={14} height={14} viewBox="0 0 24 24"><Path d="M5 12.5l4.5 4.5L19 7.5" stroke={E.green} strokeWidth={3} fill="none" strokeLinecap="round" strokeLinejoin="round" /></Svg>
                  : <View style={st.redDot} />}
                <Text style={[st.weighT, weighedToday && { color: E.ink }]}>{weighedToday ? 'Weighed in today' : 'Weigh in now'}</Text>
              </Pressable>
              <Pressable accessibilityRole="button" onPress={go('/photos', 'photos')} style={st.ghostBtn}><Text style={st.ghostT}>Photos</Text></Pressable>
            </View>
            {adapt.who !== 'none' && (
              <Pressable accessibilityRole="button" onPress={go('/progress', 'calorie_check')} style={[st.check, adapt.kind === 'adjust' && adapt.who !== 'coached' && { backgroundColor: '#fdeceb' }]}>
                <Text style={st.checkK}>WEEKLY CALORIE CHECK</Text>
                <Text style={st.checkT}>
                  {adapt.who === 'coached' ? 'Boon sets your calories at your Sunday check-in.'
                    : adapt.kind === 'adjust' ? `New number ready: ${fmt(adapt.from)} → ${fmt(adapt.to)} a day. Tap to review.`
                      : adapt.kind === 'on_track' ? `On track at ${fmt(kGoal)} a day. Same calories this week.`
                        : adapt.kind === 'wait' ? `Calories just changed. Next check in ${adapt.days} day${adapt.days === 1 ? '' : 's'}.`
                          : `${Math.max(1, 8 - Math.min(adapt.have, 8))} more morning weigh-ins and your calories start tuning themselves to your body.`}
                </Text>
                {adapt.who !== 'coached' && adapt.kind === 'need_data' && (
                  <View style={{ marginTop: 12 }}><DotTrack total={8} have={Math.min(adapt.have, 8)} size={13} label={`${Math.min(adapt.have, 8)} of 8 weigh-ins`} /></View>
                )}
              </Pressable>
            )}
          </View>
        </Reveal>

        {/* ---------- Check-in ---------- */}
        <Section label="Sunday check-in" />
        <Reveal style={st.gutter}>
          <View style={st.surface}>
            <Press accessibilityRole="button" onPress={go(coached && cs?.state !== 'due' ? '/corner' : '/checkin', 'checkin')} scale={0.985} style={st.checkin}>
              <View>
                <Pic source={SCALE} style={st.checkinPic} />
                {toSun === 0 && cs?.state !== 'sent' && cs?.state !== 'reviewed' && <View style={st.checkinPing}><Ping color={E.red} size={8} /></View>}
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={st.mealK}>{toSun === 0 ? 'TODAY' : `IN ${toSun} DAY${toSun > 1 ? 'S' : ''}`}{photoWeek ? ' · PHOTO WEEK' : ''}</Text>
                <Text style={st.mealT}>{cs?.state === 'sent' ? 'Sent. Boon is reviewing it.' : cs?.state === 'reviewed' ? 'Reviewed. Read Boon’s notes.' : toSun === 0 ? 'Check in now. Takes 2 minutes.' : `${DAY_NAME[0]} ${shortDate(new Date(now.getTime() + toSun * 864e5))}`}</Text>
                <Text style={st.mealS}>{coached ? 'Your weight, your week and your photos. Boon reads every one.' : 'Your weight and your week. That’s how you know it’s working.'}</Text>
              </View>
              <Arrow />
            </Press>
            <View style={st.hHair} />
            <View style={{ padding: 16 }}>
              <View style={[st.mHead, { marginBottom: 10 }]}>
                <Text style={[st.mK, { flex: 1 }]}>YOUR 12 WEEKS</Text>
                <Text style={st.mKr}>Week {week} · {phase.name}</Text>
              </View>
              <WeekLine week={week} photoWeeks={PHOTO_WEEKS} />
            </View>
          </View>
        </Reveal>

        {/* ---------- Stack (AI) ---------- */}
        <Section label="Ask Stack" right="Open" onRight={go('/stack', 'stack')} />
        <Reveal style={st.gutter}>
          <Press accessibilityRole="button" onPress={go('/stack', 'stack_box')} scale={0.985} style={st.ask}>
            <Svg width={18} height={18} viewBox="0 0 24 24"><Path d="M4 5.5h16v10.5H9.5L4 20z" stroke={E.ink} strokeWidth={1.8} fill="none" strokeLinejoin="round" /></Svg>
            <Text style={st.askT}>Ask anything, or snap your plate</Text>
            <View style={st.typing}>{[0, 1, 2].map((i) => <View key={i} style={[st.typeDot, { opacity: 0.35 + i * 0.25 }]} />)}</View>
          </Press>
        </Reveal>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingTop: 10, paddingHorizontal: 20 }}>
            {['What should I eat tonight?', 'Swap an exercise for me', 'Is creatine worth it?', 'I missed a workout. Now what?'].map((q) => (
              <Pressable key={q} accessibilityRole="button" onPress={() => { track('today_tap', { to: 'stack_prompt' }); router.push({ pathname: '/stack', params: { q } }); }} style={st.prompt}>
                <Text style={st.promptT}>{q}</Text>
              </Pressable>
            ))}
        </ScrollView>

        {/* ---------- Everything else ---------- */}
        <Section label="Your tools" />
        <Reveal style={st.gutter}>
          <View style={st.surface}>
            {[
              { t: 'Stack Check', s: 'Scan a supplement, get my verdict.', to: '/stack-check', d: 'M12 3l7.5 3v6c0 4.3-3.2 8-7.5 9-4.3-1-7.5-4.7-7.5-9V6z|M8.7 12.2l2.3 2.3 4.4-4.6' },
              { t: monday ? 'Last week, recapped' : 'Weekly recap', s: monday ? 'Your week in one card, ready to share.' : 'Your week in one card.', to: '/recap', d: 'M4 5.5h16v14H4z|M4 9.5h16M8.5 3.5v4M15.5 3.5v4', hot: monday },
              { t: 'Progress photos', s: photoWeek ? 'Photo week: week 1 next to today.' : 'Week 1 next to today.', to: '/photos', d: 'M4 5.5h16v13H4z|M4 16l4.5-4.5 3.5 3.5 2.5-2.5L20 17.5', hot: photoWeek && toSun === 0 },
              { t: 'Meal plan & groceries', s: 'Meals, eating out, shopping list.', to: '/plan-details?tab=Groceries', d: 'M8.5 6.5H20M8.5 12H20M8.5 17.5H20|M4.5 6.5h.01M4.5 12h.01M4.5 17.5h.01' },
              { t: 'Training plan', s: `${days.length} days a week${equip ? ` · ${equip}` : ''}`, to: '/train', d: 'M6.5 7v10M17.5 7v10M3.5 10v4M20.5 10v4M6.5 12h11' },
              { t: 'Reminders & Apple Health', s: 'Nudges, steps, sleep and weight.', to: '/you', d: 'M6.5 16v-5a5.5 5.5 0 0 1 11 0v5l1.8 1.8H4.7z|M10 20.2a2 2 0 0 0 4 0' },
            ].map((r, k, arr) => (
              <Pressable key={r.t} accessibilityRole="button" onPress={go(r.to, r.to.slice(1))} style={({ pressed }) => [st.tool, k < arr.length - 1 && st.toolLine, pressed && { backgroundColor: '#faf9f6' }]}>
                <View style={st.toolIc}>
                  <Svg width={19} height={19} viewBox="0 0 24 24">{r.d.split('|').map((d, i) => <Path key={i} d={d} stroke={E.ink} strokeWidth={1.8} fill="none" strokeLinecap="round" strokeLinejoin="round" />)}</Svg>
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Text style={st.toolT}>{r.t}</Text>
                    {r.hot && <View style={st.hot}><Text style={st.hotT}>NEW</Text></View>}
                  </View>
                  <Text style={st.toolS} numberOfLines={1}>{r.s}</Text>
                </View>
                <Arrow />
              </Pressable>
            ))}
          </View>
        </Reveal>

        {/* ---------- Coaching (not yet coached) ---------- */}
        {showCoaching(profile) && !isCoachAccount && (
          <Reveal style={[st.gutter, { marginTop: 34 }]}>
            <Press accessibilityRole="button" onPress={() => { track('coaching_tap', { where: 'today' }); router.push('/coaching'); }} scale={0.985} style={st.coach}>
              <View style={st.coachPic}>
                <Drift source={BOON_WIDE} style={st.fill} range={0.05} />
                <LinearGradient colors={['rgba(16,23,42,0)', 'rgba(16,23,42,1)']} locations={[0.55, 1]} style={st.fill} />
              </View>
              <View style={st.coachBody}>
                <Text style={st.coachK}>1:1 COACHING WITH BOON</Text>
                <Text style={st.coachT}>Want me in your corner?</Text>
                <Text style={st.coachS}>I review your week every Sunday and change one thing at a time. Abs in 12 weeks, or I keep coaching you free.</Text>
                <View style={st.coachBtn}><Text style={st.coachBtnT}>See if you qualify</Text></View>
              </View>
            </Press>
          </Reveal>
        )}

        <Text style={st.colophon}>SIX-PACK STACK · BY BOON FAY</Text>
      </MotionScroll>
    </View>
  );
}

/* ---------- pieces ---------- */

function Section({ label, right, onRight }: { label: string; right?: string; onRight?: () => void }) {
  return (
    <View style={[st.gutter, st.section]}>
      <Text style={st.sectionL} accessibilityRole="header">{label}</Text>
      {!!right && (onRight
        ? <Pressable accessibilityRole="button" onPress={onRight} hitSlop={8} style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}><Text style={st.sectionR}>{right}</Text><Arrow size={12} /></Pressable>
        : <Text style={[st.sectionR, { color: E.sub }]}>{right}</Text>)}
    </View>
  );
}

function Legend({ color, label, value, of, good, warn, action, onPress }: {
  color: string; label: string; value: string; of: string; good?: boolean; warn?: boolean;
  action?: { label: string; onPress: () => void }; onPress?: () => void;
}) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`${label} ${value} of ${of}`} onPress={onPress} style={st.leg}>
      <View style={[st.legBar, { backgroundColor: color }]} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={st.legK}>{label.toUpperCase()}</Text>
        <Text style={st.legV} numberOfLines={1}>
          <Text style={[st.legVb, good && { color: E.green }, warn && { color: E.red }]}>{value}</Text>
          <Text style={st.legOf}> / {of}</Text>
        </Text>
      </View>
      {!!action && (
        <Pressable accessibilityRole="button" accessibilityLabel={`Add ${action.label} protein`} onPress={action.onPress} hitSlop={8} style={st.mAdd}>
          <Text style={st.mAddT}>{action.label}</Text>
        </Pressable>
      )}
      {good && !action && <Svg width={16} height={16} viewBox="0 0 24 24"><Path d="M5 12.5l4.5 4.5L19 7.5" stroke={E.green} strokeWidth={3} fill="none" strokeLinecap="round" strokeLinejoin="round" /></Svg>}
    </Pressable>
  );
}

function Action({ label, icon, extra, onPress }: { label: string; icon: React.ReactNode; extra?: React.ReactNode; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [st.action, pressed && { backgroundColor: '#faf9f6' }]}>
      <Svg width={24} height={24} viewBox="0 0 24 24">{icon}{extra}</Svg>
      <Text style={st.actionT}>{label}</Text>
    </Pressable>
  );
}

function Arrow({ color = E.ink, size = 14 }: { color?: string; size?: number }) {
  return <Svg width={size} height={size} viewBox="0 0 24 24"><Path d="M9 5.5l6.5 6.5L9 18.5" stroke={color} strokeWidth={2.4} fill="none" strokeLinecap="round" strokeLinejoin="round" /></Svg>;
}

const st = StyleSheet.create({
  gutter: { paddingHorizontal: 20 },
  fill: { position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' },

  mastRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  logo: { width: 26, height: 26 },
  dateLine: { flex: 1, fontFamily: F.bold, fontSize: 11, letterSpacing: 1.6, color: E.sub },
  me: { width: 34, height: 34, borderRadius: 17, backgroundColor: E.ink, alignItems: 'center', justifyContent: 'center' },
  meT: { fontFamily: F.bold, fontSize: 14, color: '#fff' },
  display: { fontFamily: F.black, fontSize: 40, lineHeight: 43, letterSpacing: -1.6, color: E.ink, marginTop: 22 },
  weekBar: { flexDirection: 'row', gap: 3, marginTop: 20 },
  seg: { flex: 1, height: 3, borderRadius: 2, backgroundColor: '#dcd9d1' },
  weekMeta: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  weekT: { fontFamily: F.semi, fontSize: 12, color: E.sub },

  stack: { marginTop: 20, paddingVertical: 14, borderTopWidth: 1, borderBottomWidth: 1, borderColor: E.hair },
  stackK: { fontFamily: F.bold, fontSize: 11, letterSpacing: 1.4, color: E.sub },
  stackRow: { flexDirection: 'row', gap: 10, marginTop: 10 },
  stackItem: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 7, minWidth: 0 },
  tick: { width: 20, height: 20, borderRadius: 10, borderWidth: 1.5, borderColor: '#cfcbc2', alignItems: 'center', justifyContent: 'center' },
  stackT: { flexShrink: 1, fontFamily: F.semi, fontSize: 13, color: E.sub },

  note: { borderRadius: 22, backgroundColor: E.ink, padding: 18, gap: 14 },
  noteHead: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  noteAv: { width: 40, height: 40, borderRadius: 20, borderWidth: 2, borderColor: E.red },
  noteK: { fontFamily: F.bold, fontSize: 11, letterSpacing: 1.4, color: '#ff8a80' },
  noteS: { fontFamily: F.semi, fontSize: 14, color: '#fff', marginTop: 2 },
  noteQ: { fontFamily: F.xbold, fontSize: 21, lineHeight: 27, letterSpacing: -0.4, color: '#fff' },
  noteF: { fontFamily: F.bold, fontSize: 10.5, letterSpacing: 1.4, color: 'rgba(255,255,255,0.55)', marginTop: -6 },

  freeBand: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderRadius: 18, borderWidth: 1, borderColor: E.hair, backgroundColor: E.surface },
  freeK: { fontFamily: F.bold, fontSize: 11, letterSpacing: 1.4, color: E.red },
  freeT: { fontFamily: F.bold, fontSize: 15, lineHeight: 20, color: E.ink, marginTop: 3 },
  freeBtn: { height: 38, paddingHorizontal: 16, borderRadius: 19, backgroundColor: E.red, alignItems: 'center', justifyContent: 'center' },
  freeBtnT: { fontFamily: F.bold, fontSize: 14, color: '#fff' },

  section: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: 34, marginBottom: 12 },
  sectionL: { fontFamily: F.xbold, fontSize: 22, letterSpacing: -0.6, color: E.ink },
  sectionR: { fontFamily: F.semi, fontSize: 14, color: E.ink },

  heroCard: { borderRadius: 24, overflow: 'hidden', backgroundColor: E.surface, borderWidth: 1, borderColor: E.hair },
  heroImg: { height: 236, backgroundColor: E.ink, justifyContent: 'space-between' },
  heroTop: { padding: 16, flexDirection: 'row' },
  chip: { paddingHorizontal: 10, height: 26, borderRadius: 13, backgroundColor: 'rgba(16,23,42,0.72)', justifyContent: 'center' },
  chipT: { fontFamily: F.bold, fontSize: 10.5, letterSpacing: 1.3, color: '#fff' },
  heroBottom: { padding: 18, paddingTop: 0 },
  heroTitle: { fontFamily: F.black, fontSize: 32, lineHeight: 35, letterSpacing: -1, color: '#fff' },
  heroMeta: { fontFamily: F.semi, fontSize: 13.5, color: 'rgba(255,255,255,0.86)', marginTop: 6 },
  heroBody: { padding: 16, gap: 14 },
  targetRow: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  targetIcon: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#fdeceb', alignItems: 'center', justifyContent: 'center' },
  targetK: { fontFamily: F.bold, fontSize: 10.5, letterSpacing: 1.4, color: E.red, marginBottom: 2 },
  target: { fontFamily: F.medium, fontSize: 15, lineHeight: 21, color: E.ink },
  heroBtns: { flexDirection: 'row', gap: 10 },
  btnInk: { height: 52, borderRadius: 26, backgroundColor: E.ink, flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center' },
  btnInkT: { fontFamily: F.bold, fontSize: 16, color: '#fff' },

  strip: { flexDirection: 'row', marginTop: 16 },
  stripCol: { flex: 1, alignItems: 'center', gap: 7 },
  stripL: { fontFamily: F.semi, fontSize: 11.5, color: E.faint },
  stripDot: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  stripTrain: { backgroundColor: E.surface, borderWidth: 1, borderColor: E.hair },
  stripDone: { backgroundColor: E.ink, borderColor: E.ink },
  stripToday: { borderWidth: 2, borderColor: E.red },
  stripN: { fontFamily: F.bold, fontSize: 13, color: E.ink },
  restDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: '#cfcbc2' },
  stripCap: { fontFamily: F.medium, fontSize: 12.5, color: E.sub, textAlign: 'center', marginTop: 12 },

  grid: { borderRadius: 22, backgroundColor: E.surface, borderWidth: 1, borderColor: E.hair },
  gridRow: { flexDirection: 'row' },
  vHair: { width: 1, backgroundColor: E.hair },
  hHair: { height: 1, backgroundColor: E.hair },
  metric: { flex: 1, padding: 16, minWidth: 0 },
  mK: { fontFamily: F.bold, fontSize: 10.5, letterSpacing: 1.4, color: E.sub },
  mHead: { flexDirection: 'row', alignItems: 'center', height: 26 },
  bigRow: { flexDirection: 'row', alignItems: 'baseline', gap: 3, marginTop: 4 },
  mV: { fontFamily: F.black, fontSize: 30, letterSpacing: -1.2, color: E.ink, fontVariant: ['tabular-nums'] },
  mU: { fontFamily: F.bold, fontSize: 15, color: E.ink },
  mOf: { fontFamily: F.medium, fontSize: 12.5, color: E.sub, marginTop: 1 },
  bar: { height: 3, borderRadius: 2, backgroundColor: E.soft, marginTop: 12, overflow: 'hidden' },
  barFill: { height: 3, borderRadius: 2, backgroundColor: E.ink },
  mFoot: { fontFamily: F.medium, fontSize: 12.5, color: E.sub, marginTop: 8 },
  mKr: { fontFamily: F.semi, fontSize: 12, color: E.sub },
  ringRow: { flexDirection: 'row', alignItems: 'center', gap: 18, padding: 18 },
  ringV: { fontFamily: F.black, fontSize: 25, letterSpacing: -1, color: E.ink, fontVariant: ['tabular-nums'] },
  ringU: { fontFamily: F.bold, fontSize: 9, letterSpacing: 1.2, color: E.sub, marginTop: -1 },
  leg: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  legBar: { width: 4, height: 30, borderRadius: 2 },
  legK: { fontFamily: F.bold, fontSize: 10, letterSpacing: 1.3, color: E.sub },
  legV: { marginTop: 1 },
  legVb: { fontFamily: F.black, fontSize: 19, letterSpacing: -0.6, color: E.ink, fontVariant: ['tabular-nums'] },
  legOf: { fontFamily: F.semi, fontSize: 12.5, color: E.sub },
  dayPlan: { paddingHorizontal: 18, paddingVertical: 14 },
  mini: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, minWidth: 0 },
  miniV: { fontFamily: F.black, fontSize: 14, color: E.ink },
  miniO: { fontFamily: F.bold, fontSize: 10, color: E.sub },
  miniT: { fontFamily: F.semi, fontSize: 13, lineHeight: 17, color: E.ink, marginTop: 2 },
  heart: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#fdeceb', alignItems: 'center', justifyContent: 'center' },
  mAdd: { height: 26, paddingHorizontal: 10, borderRadius: 13, backgroundColor: E.ink, justifyContent: 'center' },
  mAddT: { fontFamily: F.bold, fontSize: 12, color: '#fff' },

  actions: { flexDirection: 'row', gap: 10 },
  action: { flex: 1, height: 92, borderRadius: 20, backgroundColor: E.surface, borderWidth: 1, borderColor: E.hair, alignItems: 'center', justifyContent: 'center', gap: 9 },
  actionT: { fontFamily: F.semi, fontSize: 13, color: E.ink },
  meal: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 10, padding: 12, borderRadius: 20, backgroundColor: E.surface, borderWidth: 1, borderColor: E.hair },
  mealMain: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12, minWidth: 0 },
  mealPic: { width: 64, height: 64, borderRadius: 14 },
  mealK: { fontFamily: F.bold, fontSize: 10.5, letterSpacing: 1.3, color: E.sub },
  mealT: { fontFamily: F.bold, fontSize: 15, lineHeight: 20, color: E.ink, marginTop: 2 },
  mealS: { fontFamily: F.medium, fontSize: 13, lineHeight: 18, color: E.sub, marginTop: 2 },
  eat: { height: 36, paddingHorizontal: 12, borderRadius: 18, borderWidth: 1, borderColor: E.hair, flexDirection: 'row', alignItems: 'center', gap: 5 },
  eatT: { fontFamily: F.bold, fontSize: 13, color: E.ink },

  surface: { borderRadius: 22, backgroundColor: E.surface, borderWidth: 1, borderColor: E.hair, overflow: 'hidden' },
  bodyTop: { padding: 16, paddingBottom: 6 },
  big: { fontFamily: F.black, fontSize: 44, letterSpacing: -2, color: E.ink, fontVariant: ['tabular-nums'] },
  bigU: { fontFamily: F.bold, fontSize: 16, color: E.ink },
  bodyS: { fontFamily: F.medium, fontSize: 13, lineHeight: 18, color: E.sub, marginTop: 2 },
  bodyGoal: { fontFamily: F.bold, fontSize: 13, lineHeight: 18, color: E.ink, marginTop: 2 },
  bodyRow: { flexDirection: 'row', gap: 10, padding: 12 },
  weighBtn: { flex: 1, height: 46, borderRadius: 23, backgroundColor: E.ink, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  weighT: { fontFamily: F.bold, fontSize: 15, color: '#fff' },
  weighDone: { backgroundColor: E.surface, borderWidth: 1, borderColor: E.hair },
  redDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#ff6b61' },
  ghostBtn: { height: 46, paddingHorizontal: 22, borderRadius: 23, borderWidth: 1, borderColor: E.hair, alignItems: 'center', justifyContent: 'center' },
  ghostT: { fontFamily: F.bold, fontSize: 15, color: E.ink },
  check: { marginHorizontal: 12, marginBottom: 12, padding: 14, borderRadius: 16, backgroundColor: E.paper },
  checkK: { fontFamily: F.bold, fontSize: 10.5, letterSpacing: 1.4, color: E.sub },
  checkT: { fontFamily: F.semi, fontSize: 14, lineHeight: 20, color: E.ink, marginTop: 4 },

  checkin: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 12, paddingRight: 16 },
  checkinPic: { width: 76, height: 76, borderRadius: 16 },
  checkinPing: { position: 'absolute', top: 6, right: 6 },
  stripPing: { position: 'absolute', top: 18, right: 4, zIndex: 2 },
  typing: { flexDirection: 'row', gap: 4 },
  typeDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: E.ink },

  ask: { height: 54, borderRadius: 27, backgroundColor: E.surface, borderWidth: 1, borderColor: E.hair, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 18 },
  askT: { flex: 1, fontFamily: F.medium, fontSize: 15, color: E.sub },
  prompt: { height: 36, paddingHorizontal: 14, borderRadius: 18, backgroundColor: E.soft, justifyContent: 'center' },
  promptT: { fontFamily: F.semi, fontSize: 13, color: E.ink },

  tool: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14, paddingHorizontal: 16 },
  toolLine: { borderBottomWidth: 1, borderBottomColor: E.hair },
  toolIc: { width: 40, height: 40, borderRadius: 12, backgroundColor: E.paper, alignItems: 'center', justifyContent: 'center' },
  toolT: { fontFamily: F.bold, fontSize: 15.5, color: E.ink },
  toolS: { fontFamily: F.medium, fontSize: 13, color: E.sub, marginTop: 2 },
  hot: { paddingHorizontal: 6, height: 18, borderRadius: 5, backgroundColor: E.red, justifyContent: 'center' },
  hotT: { fontFamily: F.bold, fontSize: 9.5, letterSpacing: 0.8, color: '#fff' },

  coach: { borderRadius: 24, overflow: 'hidden', backgroundColor: E.ink },
  coachPic: { height: 210 },
  coachBody: { padding: 20, paddingTop: 4, gap: 8 },
  coachK: { fontFamily: F.bold, fontSize: 11, letterSpacing: 1.4, color: '#ff8a80' },
  coachT: { fontFamily: F.black, fontSize: 28, lineHeight: 31, letterSpacing: -0.8, color: '#fff' },
  coachS: { fontFamily: F.medium, fontSize: 14.5, lineHeight: 21, color: 'rgba(255,255,255,0.88)' },
  coachBtn: { alignSelf: 'flex-start', height: 44, paddingHorizontal: 20, borderRadius: 22, backgroundColor: '#fff', justifyContent: 'center', marginTop: 6 },
  coachBtnT: { fontFamily: F.bold, fontSize: 15, color: E.ink },

  colophon: { fontFamily: F.bold, fontSize: 10.5, letterSpacing: 2, color: E.faint, textAlign: 'center', marginTop: 40 },
});
