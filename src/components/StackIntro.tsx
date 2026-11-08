import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Platform, StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { C, E, F } from '../lib/theme';
import { MEAL_HD } from '../lib/hd';
import { foodPhoto } from '../lib/foodPhotos';
import Pic from './Pic';
import { Press, Reveal, reducedMotion, useInView, useTween } from './motion';

const native = Platform.OS !== 'web';

/**
 * What Stack does, shown instead of told: a plate being scanned, a supplement label being
 * checked dose by dose, and a reply being typed. Each row is also the button that does it.
 */
export default function StackIntro({ onSnap, onCheck, onAsk }: { onSnap: () => void; onCheck: () => void; onAsk: () => void }) {
  return (
    <View style={{ gap: 10, marginTop: 4 }}>
      <Text style={st.k}>WHAT I CAN DO FOR YOU</Text>
      <Reveal delay={60}><Row title="Snap your plate" sub="Send a photo. I'll count the calories and protein." onPress={onSnap} visual={<ScanVisual />} /></Reveal>
      <Reveal delay={160}><Row title="Check a supplement" sub="Scan the label. I'll tell you if the doses actually work." onPress={onCheck} visual={<DoseVisual />} /></Reveal>
      <Reveal delay={260}><Row title="Ask about your plan" sub="Swaps, eating out, a missed workout. I know your numbers." onPress={onAsk} visual={<ChatVisual />} /></Reveal>
    </View>
  );
}

function Row({ title, sub, onPress, visual }: { title: string; sub: string; onPress: () => void; visual: React.ReactNode }) {
  return (
    <Press accessibilityRole="button" accessibilityLabel={title} onPress={onPress} scale={0.98} style={st.row}>
      {visual}
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={st.t}>{title}</Text>
        <Text style={st.s}>{sub}</Text>
      </View>
      <Svg width={14} height={14} viewBox="0 0 24 24"><Path d="M9 5.5l6.5 6.5L9 18.5" stroke={E.ink} strokeWidth={2.4} fill="none" strokeLinecap="round" strokeLinejoin="round" /></Svg>
    </Press>
  );
}

const SIZE = 84;

/** A plate with a scan line sweeping over it. */
function ScanVisual() {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (reducedMotion()) return;
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(v, { toValue: 1, duration: 1500, easing: Easing.inOut(Easing.quad), useNativeDriver: native }),
      Animated.timing(v, { toValue: 0, duration: 1500, easing: Easing.inOut(Easing.quad), useNativeDriver: native }),
    ]));
    loop.start();
    return () => loop.stop();
  }, []);
  return (
    <View style={st.vis}>
      <Pic source={foodPhoto('chicken_breast')} hd={MEAL_HD.chicken_rice} w={260} style={StyleSheet.absoluteFill} />
      <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(16,23,42,0.18)' }]} />
      <Animated.View style={[st.scan, { transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [8, SIZE - 10] }) }] }]} />
      {[[0, 0], [1, 0], [0, 1], [1, 1]].map(([x, y], k) => (
        <View key={k} style={[st.corner, { [x ? 'right' : 'left']: 7, [y ? 'bottom' : 'top']: 7, borderLeftWidth: x ? 0 : 2.5, borderRightWidth: x ? 2.5 : 0, borderTopWidth: y ? 0 : 2.5, borderBottomWidth: y ? 2.5 : 0 } as any]} />
      ))}
    </View>
  );
}

/** Three ingredient doses filling against what the research says works. */
function DoseVisual() {
  const [ref, seen] = useInView();
  const rows = [{ w: 1, ok: true }, { w: 0.92, ok: true }, { w: 0.34, ok: false }];
  return (
    <View ref={ref} collapsable={false} style={[st.vis, { backgroundColor: E.paper, padding: 12, justifyContent: 'center', gap: 9 }]}>
      {rows.map((r, k) => <Dose key={k} w={r.w} ok={r.ok} run={seen} delay={250 + k * 220} />)}
    </View>
  );
}

function Dose({ w, ok, run, delay }: { w: number; ok: boolean; run: boolean; delay: number }) {
  const g = useTween(run ? w : 0, { duration: 900, delay, run });
  return (
    <View style={{ height: 8, borderRadius: 4, backgroundColor: '#e2ded4', overflow: 'hidden' }}>
      <View style={{ height: 8, width: `${g * 100}%`, borderRadius: 4, backgroundColor: ok ? C.green : C.red }} />
    </View>
  );
}

/** A reply being typed. */
function ChatVisual() {
  const dots = [useRef(new Animated.Value(0)).current, useRef(new Animated.Value(0)).current, useRef(new Animated.Value(0)).current];
  useEffect(() => {
    if (reducedMotion()) return;
    const loops = dots.map((d, k) => Animated.loop(Animated.sequence([
      Animated.delay(k * 160),
      Animated.timing(d, { toValue: 1, duration: 320, easing: Easing.out(Easing.quad), useNativeDriver: native }),
      Animated.timing(d, { toValue: 0, duration: 320, easing: Easing.in(Easing.quad), useNativeDriver: native }),
      Animated.delay((2 - k) * 160 + 380),
    ])));
    loops.forEach((l) => l.start());
    return () => loops.forEach((l) => l.stop());
  }, []);
  return (
    <View style={[st.vis, { backgroundColor: E.ink, justifyContent: 'center', alignItems: 'center' }]}>
      <View style={st.bubble}>
        {dots.map((d, k) => (
          <Animated.View key={k} style={[st.dot, { transform: [{ translateY: d.interpolate({ inputRange: [0, 1], outputRange: [0, -4] }) }], opacity: d.interpolate({ inputRange: [0, 1], outputRange: [0.45, 1] }) }]} />
        ))}
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  k: { fontFamily: F.bold, fontSize: 11, letterSpacing: 1.3, color: C.muted, marginTop: 6, marginLeft: 2 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 10, paddingRight: 16, borderRadius: 20, backgroundColor: '#ffffff', borderWidth: 1, borderColor: C.line },
  vis: { width: SIZE, height: SIZE, borderRadius: 16, overflow: 'hidden', backgroundColor: E.soft },
  scan: { position: 'absolute', left: 6, right: 6, top: 0, height: 2.5, borderRadius: 2, backgroundColor: '#ff6b61', shadowColor: '#ff6b61', shadowOpacity: 0.9, shadowRadius: 6, shadowOffset: { width: 0, height: 0 } },
  corner: { position: 'absolute', width: 12, height: 12, borderColor: '#fff' },
  badge: { position: 'absolute', top: 6, right: 6, width: 18, height: 18, borderRadius: 9, backgroundColor: C.green, alignItems: 'center', justifyContent: 'center' },
  bubble: { flexDirection: 'row', gap: 5, paddingHorizontal: 14, height: 34, borderRadius: 17, borderBottomLeftRadius: 6, backgroundColor: '#fff', alignItems: 'center' },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: E.ink },
  t: { fontFamily: F.xbold, fontSize: 16, color: C.ink },
  s: { fontFamily: F.medium, fontSize: 13.5, lineHeight: 19, color: C.muted, marginTop: 2 },
});
