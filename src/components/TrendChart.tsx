import React, { useRef, useState } from 'react';
import { View } from 'react-native';
import Svg, { Circle, ClipPath, Defs, G, Line, LinearGradient, Path, Rect, Stop, Text as SvgText } from 'react-native-svg';
import { useInView, useTween } from './motion';

let n = 0;
import { C } from '../lib/theme';
import { dayNum, type TrendPoint } from '../lib/trend';

/** Weigh-ins as dots, the trend as a red line, where they're heading as a dashed line, and the goal. */
export default function TrendChart({ series, days, goal, rate, height = 190 }: { series: TrendPoint[]; days: number; goal?: number | null; rate?: number | null; height?: number }) {
  const [w, setW] = useState(320);
  const [ref, seen] = useInView();
  const p = useTween(seen ? 1 : 0, { duration: 1400, delay: 120, run: seen });
  const ids = useRef({ g: `tg${++n}`, c: `tc${n}` }).current;
  if (!series.length) return <View style={{ height }} />;
  const end = dayNum(series[series.length - 1].date);
  const pts = series.filter((p) => end - dayNum(p.date) <= days);
  const ahead = rate != null && pts.length > 2 ? Math.max(7, Math.round(days * 0.25)) : 0;
  const x0 = dayNum(pts[0].date), x1 = end + ahead;
  const last = pts[pts.length - 1];
  const proj = ahead ? last.t + ((rate || 0) / 7) * ahead : null;
  const vals = [...pts.map((p) => p.w), ...pts.map((p) => p.t), ...(proj != null ? [proj] : [])];
  const showGoal = goal != null && goal >= Math.min(...vals) - 6 && goal <= Math.max(...vals) + 6;
  if (showGoal) vals.push(goal!);
  let lo = Math.floor(Math.min(...vals) - 0.5), hi = Math.ceil(Math.max(...vals) + 0.5);
  if (hi - lo < 4) { lo -= 1; hi += 1; }
  const PAD_L = 4, PAD_R = 40, PAD_T = 10, PAD_B = 22;
  const X = (d: number) => PAD_L + ((d - x0) / Math.max(1, x1 - x0)) * (w - PAD_L - PAD_R);
  const Y = (v: number) => PAD_T + ((hi - v) / (hi - lo)) * (height - PAD_T - PAD_B);
  const line = pts.map((p, k) => `${k ? 'L' : 'M'}${X(dayNum(p.date)).toFixed(1)},${Y(p.t).toFixed(1)}`).join(' ');
  const area = `${line} L${X(end).toFixed(1)},${height - PAD_B} L${X(x0).toFixed(1)},${height - PAD_B} Z`;
  const ticks = [hi, (hi + lo) / 2, lo];
  const lbl = (d: number) => new Date(d * 864e5).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  return (
    <View ref={ref} collapsable={false} onLayout={(e) => setW(e.nativeEvent.layout.width)} style={{ height }} accessibilityLabel={`Trend weight ${last.t.toFixed(1)} pounds`}>
      <Svg width={w} height={height}>
        <Defs>
          <ClipPath id={ids.c}><Rect x={0} y={0} width={PAD_L + p * (w - PAD_L - PAD_R) + 6} height={height} /></ClipPath>
          <LinearGradient id={ids.g} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#e2433b" stopOpacity={0.16} />
            <Stop offset="1" stopColor="#e2433b" stopOpacity={0} />
          </LinearGradient>
        </Defs>
        {ticks.map((t, k) => (
          <React.Fragment key={k}>
            <Line x1={PAD_L} x2={w - PAD_R + 4} y1={Y(t)} y2={Y(t)} stroke="#e3e6ee" strokeWidth={1} />
            <SvgText x={w - PAD_R + 8} y={Y(t) + 4} fontSize={11} fontWeight="600" fontFamily="Inter_600SemiBold, Inter, Helvetica, Arial, sans-serif" fill={C.muted}>{Math.round(t)}</SvgText>
          </React.Fragment>
        ))}
        {showGoal && (
          <>
            <Line x1={PAD_L} x2={w - PAD_R + 4} y1={Y(goal!)} y2={Y(goal!)} stroke={C.green} strokeWidth={1.5} strokeDasharray="5 4" />
            <SvgText x={PAD_L + 4} y={Y(goal!) - 5} fontSize={11} fontWeight="700" fontFamily="Inter_700Bold, Inter, Helvetica, Arial, sans-serif" fill={C.green}>{`Goal ${goal}`}</SvgText>
          </>
        )}
        <G clipPath={`url(#${ids.c})`}>
          <Path d={area} fill={`url(#${ids.g})`} />
          {pts.map((pt) => <Circle key={pt.date} cx={X(dayNum(pt.date))} cy={Y(pt.w)} r={2.6} fill="#b9bfcd" />)}
          <Path d={line} stroke="#e2433b" strokeWidth={3} fill="none" strokeLinejoin="round" strokeLinecap="round" />
        </G>
        {proj != null && <Line x1={X(end)} y1={Y(last.t)} x2={X(x1)} y2={Y(proj)} stroke="#e2433b" strokeOpacity={0.55 * Math.max(0, (p - 0.85) / 0.15)} strokeWidth={2.5} strokeDasharray="2 5" strokeLinecap="round" />}
        <Circle cx={X(end)} cy={Y(last.t)} r={5.5 * Math.max(0, Math.min(1, (p - 0.8) / 0.2))} fill="#fff" stroke="#e2433b" strokeWidth={3} />
        <SvgText x={PAD_L} y={height - 6} fontSize={11} fontWeight="600" fontFamily="Inter_600SemiBold, Inter, Helvetica, Arial, sans-serif" fill={C.muted}>{lbl(x0)}</SvgText>
        <SvgText x={X(end)} y={height - 6} fontSize={11} fontWeight="600" fontFamily="Inter_600SemiBold, Inter, Helvetica, Arial, sans-serif" fill={C.muted} textAnchor="middle">{end === dayNum(new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10)) ? 'Today' : lbl(end)}</SvgText>
      </Svg>
    </View>
  );
}
