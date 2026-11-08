import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Platform, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Circle, ClipPath, Defs, G, Line, LinearGradient, Path, Rect, Stop, Text as SvgText } from 'react-native-svg';
import { E, F } from '../lib/theme';
import { dayNum, type TrendPoint } from '../lib/trend';
import { isoDate } from '../lib/logs';
import { CountUp, Ping, reducedMotion, useInView, useTween } from './motion';

/**
 * The app's charts. Every one is drawn from the person's own plan and logs, shows something real
 * from day one (their path, their targets, their 12 weeks), and animates in when it comes on screen:
 * lines draw, rings fill, bars grow, dots pop, and "you are here" pulses.
 */

const native = Platform.OS !== 'web';
const FONT = (w: 'semi' | 'bold' | 'xbold') => (w === 'semi' ? 'Inter_600SemiBold' : w === 'bold' ? 'Inter_700Bold' : 'Inter_800ExtraBold') + ', Inter, Helvetica, Arial, sans-serif';
const clamp = (n: number, a: number, b: number) => Math.max(a, Math.min(b, n));
let uid = 0;
const useId = (p: string) => useRef(`${p}${++uid}`).current;

/* ================================================================
 * Goal path: start weight → goal over the 12 weeks, with the real trend drawn over it.
 * ================================================================ */

export function GoalPath({ startW, goalW, startDate, series = [], height = 176, dark = false, compact = false, weeks = 12 }: {
  startW: number | null; goalW: number | null; startDate?: string | null; series?: TrendPoint[];
  height?: number; dark?: boolean; compact?: boolean; weeks?: number;
}) {
  const [w, setW] = useState(0);
  const [ref, seen] = useInView();
  const p = useTween(seen ? 1 : 0, { duration: 1600, delay: 120, run: seen });
  const q = useTween(seen ? 1 : 0, { duration: 1100, delay: 1000, run: seen });
  const clipA = useId('gpA'), clipB = useId('gpB'), grad = useId('gpG');
  if (!startW || !goalW) return null;

  const DAYS = weeks * 7;
  const s0 = startDate ? dayNum(startDate) : series.length ? dayNum(series[0].date) : dayNum(isoDate());
  const today = clamp(dayNum(isoDate()) - s0, 0, DAYS);
  const pts = series.filter((pt) => dayNum(pt.date) >= s0 - 7).map((pt) => ({ x: clamp(dayNum(pt.date) - s0, 0, DAYS), t: pt.t }));
  // The plan: a touch faster early (water and the first habits), steady after.
  const planAt = (d: number) => startW - (startW - goalW) * (1 - Math.pow(1 - d / DAYS, 1.3));
  const vals = [startW, goalW, ...pts.map((v) => v.t)];
  let lo = Math.min(...vals), hi = Math.max(...vals);
  const pad = Math.max(1.2, (hi - lo) * 0.14); lo -= pad; hi += pad;

  const PL = 8, PR = compact ? 60 : 64, PT = compact ? 16 : 22, PB = compact ? 8 : 34;
  const X = (d: number) => PL + (d / DAYS) * (w - PL - PR);
  const Y = (v: number) => PT + ((hi - v) / (hi - lo)) * (height - PT - PB);
  const N = 36;
  const plan = Array.from({ length: N + 1 }, (_, k) => [X((k * DAYS) / N), Y(planAt((k * DAYS) / N))]);
  const planD = plan.map(([x, y], k) => `${k ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
  const planArea = `${planD} L${X(DAYS).toFixed(1)},${height - PB} L${X(0).toFixed(1)},${height - PB} Z`;
  const trendD = pts.map((v, k) => `${k ? 'L' : 'M'}${X(v.x).toFixed(1)},${Y(v.t).toFixed(1)}`).join(' ');
  const lastPt = pts.length ? pts[pts.length - 1] : null;
  const you = lastPt ? { x: X(lastPt.x), y: Y(lastPt.t) } : { x: X(0), y: Y(startW) };

  const ink = dark ? '#ffffff' : E.ink;
  const sub = dark ? 'rgba(255,255,255,0.62)' : E.sub;
  const ghost = dark ? 'rgba(255,255,255,0.5)' : '#b9b4a8';
  const hair = dark ? 'rgba(255,255,255,0.12)' : E.hair;
  const red = dark ? '#ff6b61' : E.red;
  const goalIn = clamp((p - 0.82) / 0.18, 0, 1);
  // "You" lands when the trend line reaches it (or right away on day one, at the start of the path).
  const youIn = pts.length > 1 ? clamp((q - 0.82) / 0.18, 0, 1) : clamp(p * 4, 0, 1);
  const phases = ['STRIP', 'STACK', 'SIX-PACK'];
  const curPhase = Math.min(2, Math.floor(today / 28));

  return (
    <View ref={ref} collapsable={false} onLayout={(e) => setW(e.nativeEvent.layout.width)} style={{ height }}
      accessibilityLabel={`Your path: ${startW} to ${goalW} pounds over ${weeks} weeks${lastPt ? `. Trend now ${lastPt.t.toFixed(1)}` : ''}`}>
      {w > 0 && (
        <Svg width={w} height={height}>
          <Defs>
            <ClipPath id={clipA}><Rect x={0} y={0} width={PL + p * (w - PL - PR) + 2} height={height} /></ClipPath>
            <ClipPath id={clipB}><Rect x={0} y={0} width={PL + q * (w - PL - PR) + 8} height={height} /></ClipPath>
            <LinearGradient id={grad} x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={red} stopOpacity={dark ? 0.32 : 0.14} />
              <Stop offset="1" stopColor={red} stopOpacity={0} />
            </LinearGradient>
          </Defs>

          {/* Goal line and start line */}
          <Line x1={PL} x2={w - PR + 6} y1={Y(goalW)} y2={Y(goalW)} stroke={hair} strokeWidth={1} />
          <Line x1={PL} x2={w - PR + 6} y1={Y(startW)} y2={Y(startW)} stroke={hair} strokeWidth={1} />

          {/* Today */}
          {today > 0 && <Line x1={X(today)} x2={X(today)} y1={PT - 6} y2={height - PB} stroke={hair} strokeWidth={1.5} strokeDasharray="3 4" />}

          {/* The plan */}
          <G clipPath={`url(#${clipA})`}>
            <Path d={planArea} fill={`url(#${grad})`} opacity={pts.length ? 0.55 : 1} />
            <Path d={planD} stroke={ghost} strokeWidth={2.4} strokeDasharray="1 6" strokeLinecap="round" fill="none" />
          </G>

          {/* The real trend */}
          {pts.length > 1 && (
            <G clipPath={`url(#${clipB})`}>
              <Path d={trendD} stroke={red} strokeWidth={3.2} strokeLinejoin="round" strokeLinecap="round" fill="none" />
            </G>
          )}

          {/* Start */}
          <Circle cx={X(0)} cy={Y(startW)} r={3.5} fill={ink} />
          {!compact && <SvgText x={X(0)} y={Y(startW) - 10} fontSize={11} fontFamily={FONT('bold')} fontWeight="700" fill={lastPt ? sub : ink}>{lastPt ? `Start ${Math.round(startW)}` : `You start at ${Math.round(startW)}`}</SvgText>}

          {/* Goal flag */}
          <G opacity={goalIn}>
            <Circle cx={X(DAYS)} cy={Y(goalW)} r={6} fill={dark ? '#1d2a52' : E.surface} stroke={dark ? '#5fd39a' : E.green} strokeWidth={2.5} />
            <SvgText x={X(DAYS) + 11} y={Y(goalW) - 2} fontSize={10} fontFamily={FONT('bold')} fontWeight="700" fill={dark ? '#5fd39a' : E.green} letterSpacing={0.8}>GOAL</SvgText>
            <SvgText x={X(DAYS) + 11} y={Y(goalW) + 12} fontSize={13} fontFamily={FONT('xbold')} fontWeight="800" fill={ink}>{`${Math.round(goalW)}`}</SvgText>
          </G>

          {/* Phases */}
          {!compact && phases.map((ph, k) => {
            const x0 = X(k * 28) + (k ? 2 : 0), x1 = X((k + 1) * 28) - 2;
            const on = k === curPhase;
            return (
              <G key={ph}>
                <Rect x={x0} y={height - PB + 12} width={Math.max(0, x1 - x0)} height={3} rx={1.5} fill={on ? red : hair} />
                <SvgText x={(x0 + x1) / 2} y={height - 4} fontSize={9.5} fontFamily={FONT('bold')} fontWeight="700" letterSpacing={1.1} fill={on ? ink : sub} textAnchor="middle">{ph}</SvgText>
              </G>
            );
          })}

          {/* You */}
          <Circle cx={you.x} cy={you.y} r={6 * youIn} fill={dark ? '#141c33' : E.surface} stroke={red} strokeWidth={3} opacity={youIn} />
        </Svg>
      )}
      {w > 0 && (
        <View pointerEvents="none" style={{ position: 'absolute', left: you.x - 5, top: you.y - 5, width: 10, height: 10, alignItems: 'center', justifyContent: 'center', opacity: youIn }}>
          <Ping color={red} size={10} />
        </View>
      )}
      {w > 0 && !compact && !!lastPt && pts.length > 1 && (
        <View pointerEvents="none" style={[gp.youTag, { left: clamp(you.x - 20, 0, w - 50), top: Math.max(0, you.y - 32), opacity: youIn }, dark && { backgroundColor: '#fff' }]}>
          <Text style={[gp.youT, dark && { color: E.ink }]}>You</Text>
        </View>
      )}
    </View>
  );
}

const gp = StyleSheet.create({
  youTag: { position: 'absolute', paddingHorizontal: 7, height: 20, borderRadius: 10, backgroundColor: E.ink, justifyContent: 'center' },
  youT: { fontFamily: F.bold, fontSize: 10.5, color: '#fff' },
});

/* ================================================================
 * Rings: calories, protein, steps filling like Apple's activity rings.
 * ================================================================ */

export type RingSpec = { pct: number; color: string; track?: string };

export function Rings({ rings, size = 128, stroke = 12, gap = 3, children, label, style }: {
  rings: RingSpec[]; size?: number; stroke?: number; gap?: number; children?: React.ReactNode; label?: string; style?: StyleProp<ViewStyle>;
}) {
  const [ref, seen] = useInView();
  const c = size / 2;
  return (
    <View ref={ref} collapsable={false} style={[{ width: size, height: size }, style]} accessibilityLabel={label}>
      <Svg width={size} height={size}>
        {rings.map((r, i) => (
          <Arc key={i} cx={c} r={c - stroke / 2 - i * (stroke + gap)} stroke={stroke} pct={r.pct} color={r.color} track={r.track || E.soft} run={seen} delay={160 + i * 170} />
        ))}
      </Svg>
      {!!children && <View pointerEvents="none" style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center' }]}>{children}</View>}
    </View>
  );
}

function Arc({ cx, r, stroke, pct, color, track, run, delay }: { cx: number; r: number; stroke: number; pct: number; color: string; track: string; run: boolean; delay: number }) {
  const p = useTween(clamp(pct || 0, 0, 1), { duration: 1300, delay, run });
  const circ = 2 * Math.PI * r;
  const len = Math.max(0.01, p * circ);
  return (
    <G transform={`rotate(-90 ${cx} ${cx})`}>
      <Circle cx={cx} cy={cx} r={r} stroke={track} strokeWidth={stroke} fill="none" />
      <Circle cx={cx} cy={cx} r={r} stroke={color} strokeWidth={stroke} fill="none" strokeLinecap="round" strokeDasharray={`${len} ${circ + stroke}`} />
    </G>
  );
}

/** One small ring with the number inside. */
export function MiniRing({ pct, color, size = 46, stroke = 5, track, children }: { pct: number; color: string; size?: number; stroke?: number; track?: string; children?: React.ReactNode }) {
  return <Rings rings={[{ pct, color, track }]} size={size} stroke={stroke}>{children}</Rings>;
}

/* ================================================================
 * The day on the plan: each meal is a slice of today's calories.
 * ================================================================ */

export function DayPlan({ parts }: { parts: { label: string; kcal: number; done: boolean }[] }) {
  const [ref, seen] = useInView();
  const total = Math.max(1, parts.reduce((a, b) => a + b.kcal, 0));
  if (!parts.length) return null;
  return (
    <View ref={ref} collapsable={false} accessibilityLabel={`Today's meals: ${parts.map((p) => `${p.label} ${p.kcal} calories${p.done ? ', eaten' : ''}`).join('; ')}`}>
      <View style={dp.row}>
        {parts.map((p, k) => <Slice key={k} flex={Math.max(p.kcal, total * 0.2)} done={p.done} run={seen} delay={200 + k * 160} />)}
      </View>
      <View style={[dp.row, { marginTop: 8 }]}>
        {parts.map((p, k) => (
          <View key={k} style={{ flex: Math.max(p.kcal, total * 0.2), minWidth: 0 }}>
            <Text style={[dp.k, p.done && { color: E.ink }]} numberOfLines={1}>{shortSlot(p.label)}</Text>
            <Text style={[dp.v, p.done && { color: E.green }]} numberOfLines={1}>{p.done ? '✓ ' : ''}{Math.round(p.kcal).toLocaleString('en-US')}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

/** "Afternoon snack" → "SNACK", "Pre-workout meal" → "PRE-WORKOUT": short enough for a slice. */
const shortSlot = (s: string) => (/snack|afternoon/i.test(s) ? 'SNACK' : s.split(/\s+/)[0]).toUpperCase();

function Slice({ flex, done, run, delay }: { flex: number; done: boolean; run: boolean; delay: number }) {
  const g = useTween(run ? 1 : 0, { duration: 700, delay, run });
  const f = useTween(done ? 1 : 0, { duration: 600, delay: delay + 300, run });
  return (
    <View style={{ flex, height: 12, borderRadius: 6, overflow: 'hidden', backgroundColor: 'transparent' }}>
      <View style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${g * 100}%`, borderRadius: 6, backgroundColor: '#e2ded4' }} />
      <View style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${f * 100}%`, borderRadius: 6, backgroundColor: E.ink }} />
    </View>
  );
}

const dp = StyleSheet.create({
  row: { flexDirection: 'row', gap: 4 },
  k: { fontFamily: F.bold, fontSize: 9, letterSpacing: 0.6, color: E.faint },
  v: { fontFamily: F.bold, fontSize: 12.5, color: E.sub, marginTop: 1, fontVariant: ['tabular-nums'] },
});

/* ================================================================
 * Dots: weigh-ins toward the weekly calorie check (8 in 2 weeks), check-ins sent, and so on.
 * ================================================================ */

export function DotTrack({ total, have, size = 12, color = E.ink, label }: { total: number; have: number; size?: number; color?: string; label?: string }) {
  const [ref, seen] = useInView();
  return (
    <View ref={ref} collapsable={false} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }} accessibilityLabel={label || `${have} of ${total}`}>
      {Array.from({ length: total }, (_, k) => <Dot key={k} on={k < have} next={k === have} size={size} color={color} run={seen} delay={120 + k * 70} />)}
    </View>
  );
}

function Dot({ on, next, size, color, run, delay }: { on: boolean; next: boolean; size: number; color: string; run: boolean; delay: number }) {
  const v = useRef(new Animated.Value(reducedMotion() ? 1 : 0)).current;
  useEffect(() => {
    if (!run) return;
    Animated.spring(v, { toValue: 1, delay, useNativeDriver: native, speed: 12, bounciness: 10 }).start();
  }, [run]);
  return (
    <Animated.View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center', opacity: v, transform: [{ scale: v.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] }) }] }}>
      {next && <Halo color={E.red} size={size} />}
      <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: on ? color : 'transparent', borderWidth: on ? 0 : 1.6, borderColor: next ? E.red : '#cfcbc2' }} />
    </Animated.View>
  );
}

function Halo({ color, size }: { color: string; size: number }) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (reducedMotion()) return;
    const loop = Animated.loop(Animated.timing(v, { toValue: 1, duration: 1700, easing: Easing.out(Easing.quad), useNativeDriver: native }));
    loop.start();
    return () => loop.stop();
  }, []);
  return (
    <Animated.View pointerEvents="none" style={{ position: 'absolute', width: size, height: size, borderRadius: size / 2, borderWidth: 2, borderColor: color,
      opacity: v.interpolate({ inputRange: [0, 1], outputRange: [0.7, 0] }), transform: [{ scale: v.interpolate({ inputRange: [0, 1], outputRange: [1, 2.3] }) }] }} />
  );
}

/* ================================================================
 * The 12 weeks: where they are, photo weeks, the week 4 and 8 re-sets, the three phases.
 * ================================================================ */

export function WeekLine({ week, photoWeeks = [1, 3, 5, 7, 9, 11, 12], resets = [4, 8], dark = false }: { week: number; photoWeeks?: number[]; resets?: number[]; dark?: boolean }) {
  const [ref, seen] = useInView();
  const fill = useTween(seen ? (week - 1) / 11 : 0, { duration: 1400, delay: 200, run: seen });
  const ink = dark ? '#fff' : E.ink;
  const sub = dark ? 'rgba(255,255,255,0.6)' : E.faint;
  const hair = dark ? 'rgba(255,255,255,0.18)' : '#dcd8cf';
  return (
    <View ref={ref} collapsable={false} accessibilityLabel={`Week ${week} of 12`}>
      <View style={{ height: 26, justifyContent: 'center' }}>
        <View style={[wl.track, { backgroundColor: hair }]} />
        <View style={[wl.track, { backgroundColor: ink, width: `${(fill * 11) / 12 * 100}%`, left: `${100 / 24}%` }]} />
        <View style={[StyleSheet.absoluteFill, { flexDirection: 'row' }]}>
          {Array.from({ length: 12 }, (_, k) => {
            const n = k + 1, cur = n === week, photo = photoWeeks.includes(n), reset = resets.includes(n);
            const past = n < week && fill * 11 + 1 >= n - 0.01;
            return (
              <View key={n} style={wl.col}>
                {cur && <View style={wl.ping}><Halo color={E.red} size={24} /></View>}
                <View style={[wl.node, { borderColor: hair, backgroundColor: dark ? '#141c33' : E.surface },
                  past && { backgroundColor: ink, borderColor: ink },
                  cur && { borderColor: E.red, borderWidth: 2, backgroundColor: dark ? '#141c33' : E.surface }]}>
                  {photo ? <Cam color={past ? (dark ? E.ink : '#fff') : cur ? E.red : sub} />
                    : reset ? <Reset color={past ? (dark ? E.ink : '#fff') : cur ? E.red : sub} />
                      : <Text style={[wl.n, { color: past ? (dark ? E.ink : '#fff') : cur ? E.red : sub }]}>{n}</Text>}
                </View>
              </View>
            );
          })}
        </View>
      </View>
      <View style={{ flexDirection: 'row', marginTop: 8 }}>
        {['Strip', 'Stack', 'Six-Pack'].map((ph, k) => {
          const on = Math.min(2, Math.floor((week - 1) / 4)) === k;
          return <Text key={ph} style={[wl.ph, { color: on ? (dark ? '#fff' : E.ink) : sub }]}>{ph.toUpperCase()}</Text>;
        })}
      </View>
      <View style={{ flexDirection: 'row', gap: 14, marginTop: 10, flexWrap: 'wrap' }}>
        <Legend icon={<Cam color={dark ? '#fff' : E.sub} />} text="Photo week" dark={dark} />
        <Legend icon={<Reset color={dark ? '#fff' : E.sub} />} text="Calorie re-set" dark={dark} />
      </View>
    </View>
  );
}

function Legend({ icon, text, dark }: { icon: React.ReactNode; text: string; dark?: boolean }) {
  return <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>{icon}<Text style={[wl.leg, dark && { color: 'rgba(255,255,255,0.7)' }]}>{text}</Text></View>;
}
const Cam = ({ color }: { color: string }) => (
  <Svg width={11} height={11} viewBox="0 0 24 24"><Path d="M3.5 8.5a2 2 0 0 1 2-2h2.2l1.6-2.5h5.4l1.6 2.5h2.2a2 2 0 0 1 2 2V18a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2z" stroke={color} strokeWidth={2.6} fill="none" strokeLinejoin="round" /><Circle cx={12} cy={13} r={3.4} stroke={color} strokeWidth={2.6} fill="none" /></Svg>
);
const Reset = ({ color }: { color: string }) => (
  <Svg width={11} height={11} viewBox="0 0 24 24"><Path d="M19 12a7 7 0 1 1-2.05-4.95M19 4.5V9h-4.5" stroke={color} strokeWidth={2.8} fill="none" strokeLinecap="round" strokeLinejoin="round" /></Svg>
);

const wl = StyleSheet.create({
  track: { position: 'absolute', left: `${100 / 24}%`, right: `${100 / 24}%`, height: 2, borderRadius: 1 },
  col: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  node: { width: 22, height: 22, borderRadius: 11, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  ping: { position: 'absolute', width: 24, height: 24, alignItems: 'center', justifyContent: 'center' },
  n: { fontFamily: F.bold, fontSize: 9.5 },
  ph: { flex: 1, textAlign: 'center', fontFamily: F.bold, fontSize: 9.5, letterSpacing: 1.2 },
  leg: { fontFamily: F.semi, fontSize: 11.5, color: E.sub },
});

/* ================================================================
 * Weekly bars: weight lifted per week (and, before the first log, the shape of the plan).
 * ================================================================ */

export function WeekBars({ values, week, height = 92, format }: { values: (number | null)[]; week: number; height?: number; format?: (n: number) => string }) {
  const [ref, seen] = useInView();
  const max = Math.max(1, ...values.map((v) => v || 0));
  const empty = values.every((v) => !v);
  return (
    <View ref={ref} collapsable={false} accessibilityLabel={empty ? 'Weight lifted per week: fills in as you log' : `Weight lifted per week, week ${week}`}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 5, height }}>
        {values.map((v, k) => {
          const n = k + 1;
          // Before any logs: the plan's shape, a little more every week.
          const h = empty ? 0.28 + 0.62 * (k / (values.length - 1)) : (v || 0) / max;
          return <GrowBar key={k} h={h} run={seen} delay={120 + k * 60} height={height - 18} ghost={empty || !v} cur={n === week} label={!empty && v && format ? format(v) : ''} />;
        })}
      </View>
      <View style={{ flexDirection: 'row', gap: 5, marginTop: 6 }}>
        {values.map((_, k) => <Text key={k} style={[wb.l, k + 1 === week && { color: E.red, fontFamily: F.bold }]}>{k + 1}</Text>)}
      </View>
    </View>
  );
}

function GrowBar({ h, run, delay, height, ghost, cur, label }: { h: number; run: boolean; delay: number; height: number; ghost: boolean; cur: boolean; label: string }) {
  const g = useTween(run ? h : 0, { duration: 900, delay, run });
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'flex-end', height: height + 18 }}>
      {!!label && <Text style={wb.v} numberOfLines={1}>{label}</Text>}
      <View style={[{ width: '100%', height: Math.max(4, g * height), borderRadius: 5 },
        ghost ? { backgroundColor: cur ? 'transparent' : '#e7e3da', borderWidth: cur ? 1.5 : 0, borderColor: E.red, borderStyle: 'dashed' } : { backgroundColor: cur ? E.red : E.ink }]} />
    </View>
  );
}

const wb = StyleSheet.create({
  l: { flex: 1, textAlign: 'center', fontFamily: F.semi, fontSize: 10, color: E.faint },
  v: { fontFamily: F.bold, fontSize: 9, color: E.sub, marginBottom: 3 },
});

/* ================================================================
 * Photo slots: the four photos that tell the story, before the first one exists.
 * ================================================================ */

export function PhotoSlots({ week = 1, slots = [1, 4, 8, 12] }: { week?: number; slots?: number[] }) {
  const [ref, seen] = useInView();
  const next = slots.find((s) => s >= week) ?? slots[slots.length - 1];
  return (
    <View ref={ref} collapsable={false} style={{ flexDirection: 'row', gap: 8 }} accessibilityLabel={`Photo weeks ${slots.join(', ')}. Next: week ${next}`}>
      {slots.map((s, k) => <Slot key={s} week={s} next={s === next} run={seen} delay={100 + k * 130} />)}
    </View>
  );
}

function Slot({ week, next, run, delay }: { week: number; next: boolean; run: boolean; delay: number }) {
  const v = useRef(new Animated.Value(reducedMotion() ? 1 : 0)).current;
  useEffect(() => {
    if (!run) return;
    Animated.timing(v, { toValue: 1, duration: 650, delay, easing: Easing.bezier(0.2, 0.8, 0.2, 1), useNativeDriver: native }).start();
  }, [run]);
  return (
    <Animated.View style={[ps.slot, next && ps.next, { opacity: v, transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [14, 0] }) }] }]}>
      <Svg width="62%" height="70%" viewBox="0 0 60 92" style={{ marginTop: 10 }}>
        <Circle cx={30} cy={11} r={8} fill={next ? '#f4c9c5' : '#e2ded4'} />
        <Path d="M18 25 Q30 21 42 25 L50 29 Q54 31 54.5 37 L56.5 60 Q56.5 63 53.5 63 L51 62.5 L48.5 41 L46.5 43 L46.5 61 L44 90 L35.5 90 L31 63 L29 63 L24.5 90 L16 90 L13.5 61 L13.5 43 L11.5 41 L9 62.5 L6.5 63 Q3.5 63 3.5 60 L5.5 37 Q6 31 10 29 Z"
          fill={next ? '#f4c9c5' : '#e2ded4'} />
      </Svg>
      <View style={[ps.tag, next && { backgroundColor: E.red }]}>
        <Text style={[ps.tagT, next && { color: '#fff' }]}>WK {week}</Text>
      </View>
      {next && (
        <View style={ps.cam}>
          <View style={StyleSheet.absoluteFill}><Ping color={E.red} size={28} /></View>
          <View style={ps.camIn}><Cam color="#fff" /></View>
        </View>
      )}
    </Animated.View>
  );
}

const ps = StyleSheet.create({
  slot: { flex: 1, aspectRatio: 3 / 4.2, borderRadius: 14, backgroundColor: E.paper, borderWidth: 1, borderColor: E.hair, alignItems: 'center', overflow: 'hidden' },
  next: { borderColor: E.red, borderWidth: 1.5, borderStyle: 'dashed', backgroundColor: '#fff7f6' },
  tag: { position: 'absolute', left: 6, bottom: 6, paddingHorizontal: 6, height: 18, borderRadius: 9, backgroundColor: E.surface, justifyContent: 'center' },
  tagT: { fontFamily: F.bold, fontSize: 9.5, letterSpacing: 0.6, color: E.ink },
  cam: { position: 'absolute', top: 7, right: 7, width: 28, height: 28, alignItems: 'center', justifyContent: 'center' },
  camIn: { width: 24, height: 24, borderRadius: 12, backgroundColor: E.red, alignItems: 'center', justifyContent: 'center' },
});

/* ================================================================
 * Sparkline that draws itself.
 * ================================================================ */

export function DrawSpark({ pts, width = 64, height = 26, color = E.green, dot = true }: { pts: number[]; width?: number; height?: number; color?: string; dot?: boolean }) {
  const [ref, seen] = useInView();
  const p = useTween(seen ? 1 : 0, { duration: 1100, delay: 150, run: seen });
  const clip = useId('sp');
  if (pts.length < 2) return <View style={{ width }} />;
  const lo = Math.min(...pts), hi = Math.max(...pts), P = 4;
  const xy = pts.map((v, k) => [P + (k * (width - 2 * P)) / (pts.length - 1), P + (height - 2 * P) - ((v - lo) / Math.max(0.5, hi - lo)) * (height - 2 * P)]);
  const d = xy.map(([x, y], k) => `${k ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
  const [lx, ly] = xy[xy.length - 1];
  return (
    <View ref={ref} collapsable={false} style={{ width, height }}>
      <Svg width={width} height={height}>
        <Defs><ClipPath id={clip}><Rect x={0} y={0} width={p * width + 2} height={height} /></ClipPath></Defs>
        <G clipPath={`url(#${clip})`}>
          <Path d={d} stroke={color} strokeWidth={2.2} fill="none" strokeLinejoin="round" strokeLinecap="round" />
        </G>
        {dot && <Circle cx={lx} cy={ly} r={3.4 * clamp((p - 0.85) / 0.15, 0, 1)} fill={color} />}
      </Svg>
    </View>
  );
}

/* ================================================================
 * How the trend works, before there's any data: the scale jumps, the trend line doesn't.
 * ================================================================ */

const EX_NOISE = [0.9, -0.6, 1.3, 0.2, -1.1, 0.7, 1.6, -0.4, 0.3, -1.2, 0.8, 1.1, -0.7, 0.1, -0.9, 0.6, 1.2, -0.5, 0.2, -0.8, 0.4];

export function TrendExplainer({ height = 150 }: { height?: number }) {
  const [w, setW] = useState(0);
  const [ref, seen] = useInView();
  const p = useTween(seen ? 1 : 0, { duration: 2400, delay: 200, run: seen });
  const clip = useId('tx');
  const N = EX_NOISE.length;
  const trend = (k: number) => 3.2 - (k / (N - 1)) * 3.2;
  const PL = 8, PR = 8, PT = 16, PB = 16;
  const lo = -1.6, hi = 5;
  const X = (k: number) => PL + (k / (N - 1)) * (w - PL - PR);
  const Y = (v: number) => PT + ((hi - v) / (hi - lo)) * (height - PT - PB);
  const line = Array.from({ length: N }, (_, k) => `${k ? 'L' : 'M'}${X(k).toFixed(1)},${Y(trend(k)).toFixed(1)}`).join(' ');
  return (
    <View ref={ref} collapsable={false} onLayout={(e) => setW(e.nativeEvent.layout.width)} style={{ height }}
      accessibilityLabel="Example: daily scale weights jump up and down while the trend line goes steadily down">
      {w > 0 && (
        <Svg width={w} height={height}>
          <Defs><ClipPath id={clip}><Rect x={0} y={0} width={PL + p * (w - PL - PR) + 4} height={height} /></ClipPath></Defs>
          {[0, 1, 2].map((k) => <Line key={k} x1={PL} x2={w - PR} y1={PT + (k * (height - PT - PB)) / 2} y2={PT + (k * (height - PT - PB)) / 2} stroke={E.hair} strokeWidth={1} />)}
          {EX_NOISE.map((n, k) => {
            const show = clamp((p * (N + 2) - k) / 2, 0, 1);
            const y = Y(trend(k) + n);
            return (
              <G key={k} opacity={show}>
                <Line x1={X(k)} x2={X(k)} y1={Y(trend(k))} y2={y} stroke="#d9d5cb" strokeWidth={1.2} />
                <Circle cx={X(k)} cy={y} r={3.6} fill="#b9b4a8" />
              </G>
            );
          })}
          <G clipPath={`url(#${clip})`}>
            <Path d={line} stroke={E.red} strokeWidth={3.4} strokeLinecap="round" fill="none" />
          </G>
        </Svg>
      )}
      <View style={tx.tag}><Text style={tx.tagT}>EXAMPLE</Text></View>
    </View>
  );
}

const tx = StyleSheet.create({
  tag: { position: 'absolute', top: 0, right: 0, paddingHorizontal: 7, height: 18, borderRadius: 9, backgroundColor: E.soft, justifyContent: 'center' },
  tagT: { fontFamily: F.bold, fontSize: 9, letterSpacing: 1, color: E.sub },
});

/* ================================================================
 * Fuel: calories and protein as rings, with today's meals as slices underneath.
 * ================================================================ */

const fmtN = (n: number) => Math.round(n).toLocaleString('en-US');

export function FuelCard({ kcal, kGoal, protein, pGoal, parts, style }: {
  kcal: number; kGoal: number; protein: number; pGoal: number; parts?: { label: string; kcal: number; done: boolean }[]; style?: StyleProp<ViewStyle>;
}) {
  const eaten = (parts || []).filter((p) => p.done).length;
  return (
    <View style={[fc.card, style]}>
      <View style={fc.row}>
        <Rings size={116} stroke={11} gap={3} label={`Calories ${fmtN(kcal)} of ${fmtN(kGoal)}. Protein ${fmtN(protein)} of ${pGoal} grams.`}
          rings={[{ pct: kcal / kGoal, color: E.red }, { pct: protein / pGoal, color: E.ink }]}>
          <CountUp value={Math.abs(kGoal - kcal)} style={fc.v} duration={1200} />
          <Text style={fc.u}>{kcal <= kGoal ? 'CAL LEFT' : 'CAL OVER'}</Text>
        </Rings>
        <View style={{ flex: 1, minWidth: 0, gap: 16 }}>
          <FuelRow color={E.red} label="Calories" v={kcal} of={fmtN(kGoal)} warn={kcal > kGoal + 150} />
          <FuelRow color={E.ink} label="Protein" v={protein} unit="g" of={`${pGoal} g`} good={protein >= pGoal} />
        </View>
      </View>
      {!!parts && parts.length > 1 && (
        <View style={fc.plan}>
          <Text style={fc.k}>TODAY'S MEALS · {eaten} OF {parts.length} EATEN</Text>
          <View style={{ marginTop: 9 }}><DayPlan parts={parts} /></View>
        </View>
      )}
    </View>
  );
}

function FuelRow({ color, label, v, unit, of, good, warn }: { color: string; label: string; v: number; unit?: string; of: string; good?: boolean; warn?: boolean }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
      <View style={{ width: 4, height: 32, borderRadius: 2, backgroundColor: color }} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={fc.k}>{label.toUpperCase()}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 2, marginTop: 1 }}>
          <CountUp value={v} style={[fc.rv, good && { color: E.green }, warn && { color: E.red }]} />
          {!!unit && <Text style={fc.ru}>{unit}</Text>}
          <Text style={fc.rof}> / {of}</Text>
        </View>
      </View>
    </View>
  );
}

const fc = StyleSheet.create({
  card: { borderRadius: 22, backgroundColor: E.surface, borderWidth: 1, borderColor: E.hair, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 18, padding: 18 },
  v: { fontFamily: F.black, fontSize: 22, letterSpacing: -0.8, color: E.ink, fontVariant: ['tabular-nums'] },
  u: { fontFamily: F.bold, fontSize: 8.5, letterSpacing: 1.1, color: E.sub },
  k: { fontFamily: F.bold, fontSize: 10, letterSpacing: 1.3, color: E.sub },
  rv: { fontFamily: F.black, fontSize: 21, letterSpacing: -0.6, color: E.ink, fontVariant: ['tabular-nums'] },
  ru: { fontFamily: F.bold, fontSize: 13, color: E.ink },
  rof: { fontFamily: F.semi, fontSize: 13, color: E.sub },
  plan: { borderTopWidth: 1, borderTopColor: E.hair, paddingHorizontal: 18, paddingVertical: 14 },
});
