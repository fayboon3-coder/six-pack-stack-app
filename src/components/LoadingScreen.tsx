import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import Backdrop from './Backdrop';
import { twoTone } from './TwoTone';
import { C, F } from '../lib/theme';

const LOGO = require('../../assets/logo-b.png');

type Props = {
  /** Headline. Use "|" to turn the second half red, e.g. "Building your| plan". */
  title: string;
  sub?: string;
  /** Lines that tick off one by one while the bar fills. Leave out for a simple loader. */
  steps?: string[];
  /** Time per step (ms). */
  stepMs?: number;
  /** When false, the last step waits (bar holds near the end) until the work is done. */
  done?: boolean;
  /** Called once every step has ticked and done is true. */
  onFinish?: () => void;
  /** Cover the screen it sits on (for overlays) instead of filling a page. */
  overlay?: boolean;
  children?: React.ReactNode;
};

/**
 * Branded loading screen, same look as the opening animation: the B with a red
 * pulse ring on the navy-to-red glow, a two-tone headline, steps that tick off
 * and a red progress bar.
 */
export default function LoadingScreen({ title, sub, steps, stepMs = 650, done = true, onFinish, overlay, children }: Props) {
  const n = steps?.length || 0;
  const [ticked, setTicked] = useState(0);
  const logo = useRef(new Animated.Value(0)).current;
  const ring = useRef(new Animated.Value(0)).current;
  const bar = useRef(new Animated.Value(0)).current;
  const fade = useRef(new Animated.Value(0)).current;
  const finished = useRef(false);

  useEffect(() => {
    Animated.timing(fade, { toValue: 1, duration: 220, useNativeDriver: true }).start();
    Animated.spring(logo, { toValue: 1, friction: 6, tension: 70, useNativeDriver: true }).start();
    const loop = Animated.loop(Animated.timing(ring, { toValue: 1, duration: 1200, easing: Easing.out(Easing.quad), useNativeDriver: true }));
    loop.start();
    if (!n) {
      Animated.loop(Animated.timing(bar, { toValue: 1, duration: 1300, easing: Easing.inOut(Easing.cubic), useNativeDriver: false })).start();
    }
    return () => loop.stop();
  }, []);

  // Tick the steps off one at a time; the last one waits for `done`.
  useEffect(() => {
    if (!n) return;
    if (ticked >= n) return;
    if (ticked === n - 1 && !done) return;
    const t = setTimeout(() => setTicked((x) => x + 1), stepMs);
    return () => clearTimeout(t);
  }, [ticked, done, n, stepMs]);

  useEffect(() => {
    if (!n) return;
    const target = ticked >= n ? 1 : Math.min(0.94, (ticked + 0.85) / n);
    Animated.timing(bar, { toValue: target, duration: stepMs, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
    if (ticked >= n && !finished.current) {
      finished.current = true;
      const t = setTimeout(() => onFinish?.(), 420);
      return () => clearTimeout(t);
    }
  }, [ticked, n]);

  const scale = logo.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1] });
  const ringScale = ring.interpolate({ inputRange: [0, 1], outputRange: [1, 1.9] });
  const ringOpacity = ring.interpolate({ inputRange: [0, 0.2, 1], outputRange: [0, 0.6, 0] });
  const barW = n
    ? bar.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] })
    : '38%';
  const barX = n ? 0 : bar.interpolate({ inputRange: [0, 1], outputRange: [-70, 230] });

  return (
    <Animated.View style={[overlay ? [StyleSheet.absoluteFill, { zIndex: 50 }] : { flex: 1 }, { opacity: fade }]}>
      <View style={[StyleSheet.absoluteFill, { backgroundColor: '#ffffff' }]} />
      <View style={st.center}>
        <View style={st.logoBox}>
          <Animated.View style={[st.ring, { opacity: ringOpacity, transform: [{ scale: ringScale }] }]} />
          <Animated.Image source={LOGO} style={{ width: 84, height: 84, opacity: logo, transform: [{ scale }] }} accessibilityLabel="Six-Pack Stack" />
        </View>
        <Text style={st.title}>{twoTone(title)}</Text>
        {!!sub && <Text style={st.sub}>{sub}</Text>}

        {n > 0 && (
          <View style={st.steps}>
            {steps!.map((s, i) => {
              const state = i < ticked ? 'done' : i === ticked ? 'now' : 'next';
              return (
                <View key={s} style={st.row}>
                  <View style={[st.dot, state === 'done' && st.dotDone, state === 'now' && st.dotNow]}>
                    {state === 'done' && (
                      <Svg width={12} height={12} viewBox="0 0 24 24"><Path d="M5 12.5l4.5 4.5L19 7.5" stroke="#ffffff" strokeWidth={3.2} fill="none" strokeLinecap="round" strokeLinejoin="round" /></Svg>
                    )}
                  </View>
                  <Text style={[st.step, state === 'next' && { opacity: 0.4 }, state === 'now' && { color: C.ink }]}>{s}</Text>
                </View>
              );
            })}
          </View>
        )}

        <View style={st.track}>
          <Animated.View style={[st.bar, { width: barW as any, transform: [{ translateX: barX as any }] }]} />
        </View>
        {children}
      </View>
    </Animated.View>
  );
}

const st = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 28 },
  logoBox: { width: 84, height: 84, alignItems: 'center', justifyContent: 'center', marginBottom: 26 },
  ring: { position: 'absolute', width: 84, height: 84, borderRadius: 22, borderWidth: 3, borderColor: C.navy },
  title: { fontFamily: F.black, fontSize: 26, lineHeight: 31, color: C.ink, textAlign: 'center' },
  sub: { fontFamily: F.semi, fontSize: 14, lineHeight: 20, color: 'rgba(27,36,64,0.7)', textAlign: 'center', marginTop: 8, maxWidth: 300 },
  steps: { marginTop: 26, gap: 12, alignSelf: 'stretch', maxWidth: 300, marginHorizontal: 'auto' as any, width: '100%' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  dot: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: 'rgba(27,36,64,0.25)', alignItems: 'center', justifyContent: 'center' },
  dotNow: { borderColor: C.red },
  dotDone: { backgroundColor: C.green, borderColor: C.green },
  step: { fontFamily: F.bold, fontSize: 15, color: 'rgba(27,36,64,0.85)', flexShrink: 1 },
  track: { width: 180, height: 4, borderRadius: 2, backgroundColor: 'rgba(27,36,64,0.12)', marginTop: 28, overflow: 'hidden' },
  bar: { height: 4, borderRadius: 2, backgroundColor: C.red },
});
