import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  AccessibilityInfo, Animated, Dimensions, Easing, Image, Platform, Pressable, ScrollView, Text, View,
  type ImageSourcePropType, type PressableProps, type ScrollViewProps, type StyleProp, type TextStyle, type ViewStyle,
} from 'react-native';
import Pic from './Pic';
import * as Haptics from 'expo-haptics';

/**
 * The app's motion kit, matching the landing pages: sections rise in as they scroll into view,
 * numbers count up, bars fill, photos drift, rows of photos glide, live dots pulse and every
 * tap springs. Built on React Native's Animated, so it runs the same on iPhone and the web.
 * Everything stays still when the phone's Reduce Motion setting is on.
 */

const native = Platform.OS !== 'web';
const EASE = Easing.bezier(0.2, 0.8, 0.2, 1);

let reduce = false;
AccessibilityInfo.isReduceMotionEnabled?.().then((v) => { reduce = !!v; }).catch(() => {});
export const reducedMotion = () => reduce;

/*
 * The launch splash covers the first screen for a moment. Nothing plays until it lifts, so the
 * person actually sees the charts draw and the sections rise in.
 */
let curtainUp = false;
const waiters = new Set<() => void>();
export function raiseCurtain() {
  if (curtainUp) return;
  curtainUp = true;
  waiters.forEach((f) => f());
  waiters.clear();
}
setTimeout(raiseCurtain, 6000); // never wait forever
function whenCurtainUp(f: () => void) {
  if (curtainUp) { f(); return () => {}; }
  waiters.add(f);
  return () => { waiters.delete(f); };
}

/* ---------------- Scroll-triggered reveals ---------------- */

type Pending = { check: () => void };
const RevealCtx = createContext<{ add: (p: Pending) => () => void } | null>(null);

/** A ScrollView that reveals <Reveal> children as they come into view. */
export const MotionScroll = React.forwardRef<any, ScrollViewProps>(function MotionScroll({ onScroll, children, ...rest }, ref) {
  const items = useRef(new Set<Pending>());
  const ctx = useMemo(() => ({
    add: (p: Pending) => { items.current.add(p); return () => { items.current.delete(p); }; },
  }), []);
  const tick = useRef(0);
  return (
    <RevealCtx.Provider value={ctx}>
      <ScrollView ref={ref} scrollEventThrottle={32} {...rest}
        onScroll={(e) => {
          onScroll?.(e);
          const now = Date.now();
          if (now - tick.current < 60) return;
          tick.current = now;
          items.current.forEach((p) => p.check());
        }}
        onMomentumScrollEnd={() => items.current.forEach((p) => p.check())}>
        {children}
      </ScrollView>
    </RevealCtx.Provider>
  );
});

/** Rises and fades in once, the first time it's on screen. `delay` staggers a group. */
export function Reveal({ children, delay = 0, y = 18, style }: { children: React.ReactNode; delay?: number; y?: number; style?: StyleProp<ViewStyle> }) {
  const ctx = useContext(RevealCtx);
  const v = useRef(new Animated.Value(reduce ? 1 : 0)).current;
  const ref = useRef<any>(null);
  const done = useRef(reduce);
  useEffect(() => {
    if (done.current) return;
    let unsub = () => {};
    const go = () => {
      if (done.current) return;
      done.current = true;
      unsub = whenCurtainUp(() => Animated.timing(v, { toValue: 1, duration: 700, delay, easing: EASE, useNativeDriver: native }).start());
    };
    const check = () => {
      if (done.current || !ref.current) return;
      ref.current.measureInWindow((_x: number, top: number, _w: number, h: number) => {
        const winH = Dimensions.get('window').height || 800;
        if (h === 0 && top === 0) return;
        if (top < winH - 30) go();
      });
    };
    const off = ctx?.add({ check });
    const t = setTimeout(check, 60);
    const safety = setTimeout(() => { if (!ctx) go(); }, 50);
    return () => { off?.(); clearTimeout(t); clearTimeout(safety); unsub(); };
  }, []);
  return (
    <Animated.View ref={ref as any} collapsable={false}
      style={[style, { opacity: v, transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [y, 0] }) }] }]}>
      {children}
    </Animated.View>
  );
}

/**
 * True once the element behind `ref` has come on screen (inside a MotionScroll), so a chart can
 * play its animation when the person actually sees it. Outside a MotionScroll it plays right away.
 */
export function useInView(): [React.MutableRefObject<any>, boolean] {
  const ctx = useContext(RevealCtx);
  const ref = useRef<any>(null);
  const [seen, setSeen] = useState(reduce);
  useEffect(() => {
    if (seen) return;
    let done = false, unsub = () => {};
    const show = () => { if (!done) { done = true; unsub = whenCurtainUp(() => setSeen(true)); } };
    const check = () => {
      if (done || !ref.current?.measureInWindow) return;
      ref.current.measureInWindow((_x: number, top: number, _w: number, h: number) => {
        const winH = Dimensions.get('window').height || 800;
        if (h === 0 && top === 0) return;
        if (top < winH - 40) show();
      });
    };
    const off = ctx?.add({ check });
    const t = setTimeout(ctx ? check : show, ctx ? 140 : 160);
    const t2 = setTimeout(check, 700);
    return () => { off?.(); clearTimeout(t); clearTimeout(t2); unsub(); };
  }, []);
  return [ref, seen];
}

/** A number that eases from where it was to `to` (cubic ease-out), once `run` is true. */
export function useTween(to: number, { duration = 1100, delay = 0, run = true }: { duration?: number; delay?: number; run?: boolean } = {}) {
  const [v, setV] = useState(reduce ? to : 0);
  const from = useRef(reduce ? to : 0);
  const first = useRef(true);
  useEffect(() => {
    if (!run) return;
    if (reduce) { from.current = to; setV(to); return; }
    const a = from.current;
    if (a === to) return;
    let raf = 0, t0 = 0;
    const wait = first.current ? delay : 0;
    first.current = false;
    const timer = setTimeout(() => {
      const step = (ts: number) => {
        if (!t0) t0 = ts;
        const t = Math.min(1, (ts - t0) / duration);
        const n = a + (to - a) * (1 - Math.pow(1 - t, 3));
        from.current = n; setV(n);
        if (t < 1) raf = requestAnimationFrame(step);
      };
      raf = requestAnimationFrame(step);
    }, wait);
    return () => { clearTimeout(timer); cancelAnimationFrame(raf); };
  }, [to, run]);
  return v;
}

/* ---------------- Numbers and bars ---------------- */

/** A number that counts up to its value (and glides when it changes). */
export function CountUp({ value, format = (n) => Math.round(n).toLocaleString('en-US'), style, duration = 900 }: {
  value: number; format?: (n: number) => string; style?: StyleProp<TextStyle>; duration?: number;
}) {
  const [shown, setShown] = useState(reduce ? value : 0);
  const from = useRef(reduce ? value : 0);
  useEffect(() => {
    if (reduce) { setShown(value); return; }
    const start = Date.now(), a = from.current, b = value;
    let raf = 0;
    const step = () => {
      const t = Math.min(1, (Date.now() - start) / duration);
      const e = 1 - Math.pow(1 - t, 3);
      const n = a + (b - a) * e;
      setShown(n); from.current = n;
      if (t < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [value]);
  return <Text style={style}>{format(shown)}</Text>;
}

/** A progress bar that fills smoothly. */
export function Bar({ pct, color, track, height = 4, delay = 150 }: { pct: number; color: string; track: string; height?: number; delay?: number }) {
  const v = useRef(new Animated.Value(0)).current;
  const p = Math.max(0, Math.min(1, pct || 0));
  useEffect(() => {
    Animated.timing(v, { toValue: p, duration: reduce ? 0 : 1000, delay: reduce ? 0 : delay, easing: EASE, useNativeDriver: false }).start();
  }, [p]);
  return (
    <View style={{ height, borderRadius: height / 2, backgroundColor: track, overflow: 'hidden' }}>
      <Animated.View style={{ height, borderRadius: height / 2, backgroundColor: color, width: v.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) }} />
    </View>
  );
}

/* ---------------- Touch ---------------- */

/** Pressable that springs down a touch when pressed. */
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/** Pressable that springs down a touch when pressed (one element, so layout styles work as usual). */
export function Press({ style, children, scale = 0.97, haptic = true, ...rest }: PressableProps & { style?: StyleProp<ViewStyle>; scale?: number; haptic?: boolean; children?: React.ReactNode }) {
  const v = useRef(new Animated.Value(1)).current;
  const to = (n: number) => Animated.spring(v, { toValue: n, useNativeDriver: native, speed: 40, bounciness: n === 1 ? 6 : 0 }).start();
  return (
    <AnimatedPressable {...(rest as any)} onPressIn={(e: any) => { to(scale); if (haptic && Platform.OS === 'ios' && !rest.disabled) Haptics.selectionAsync().catch(() => {}); rest.onPressIn?.(e); }} onPressOut={(e: any) => { to(1); rest.onPressOut?.(e); }}
      style={[style, { transform: [{ scale: v }] }]}>
      {children}
    </AnimatedPressable>
  );
}

/* ---------------- Photos ---------------- */

/** A photo that slowly drifts and zooms, like the hero on the landing page. */
export function Drift({ source, hd, w = 1200, style, range = 0.08, duration = 14000 }: { source?: ImageSourcePropType | null; hd?: string | null; w?: number; style?: StyleProp<any>; range?: number; duration?: number }) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (reduce) return;
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(v, { toValue: 1, duration, easing: Easing.inOut(Easing.quad), useNativeDriver: native }),
      Animated.timing(v, { toValue: 0, duration, easing: Easing.inOut(Easing.quad), useNativeDriver: native }),
    ]));
    loop.start();
    return () => loop.stop();
  }, []);
  return (
    <View pointerEvents="none" style={[style, { overflow: 'hidden' }]}>
      <Animated.View style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', transform: [{ scale: v.interpolate({ inputRange: [0, 1], outputRange: [1.02, 1 + range] }) }, { translateX: v.interpolate({ inputRange: [0, 1], outputRange: [0, -8] }) }] }}>
        <Pic source={source} hd={hd} w={w} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }} priority="high" />
      </Animated.View>
    </View>
  );
}

/** An endless row that glides sideways (the landing page's moving walls). */
export function Marquee({ children, speed = 30, gap = 10, reverse = false }: { children: React.ReactNode; speed?: number; gap?: number; reverse?: boolean }) {
  const [w, setW] = useState(0);
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!w || reduce) return;
    v.setValue(0);
    const loop = Animated.loop(Animated.timing(v, { toValue: 1, duration: (w / speed) * 1000, easing: Easing.linear, useNativeDriver: native }));
    loop.start();
    return () => loop.stop();
  }, [w]);
  const x = v.interpolate({ inputRange: [0, 1], outputRange: reverse ? [-w - gap, 0] : [0, -w - gap] });
  return (
    <View style={{ overflow: 'hidden' }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Animated.View style={{ flexDirection: 'row', gap, transform: [{ translateX: x }] }}>
        <View style={{ flexDirection: 'row', gap }} onLayout={(e) => setW(e.nativeEvent.layout.width)}>{children}</View>
        <View style={{ flexDirection: 'row', gap }}>{children}</View>
      </Animated.View>
    </View>
  );
}

/* ---------------- Live bits ---------------- */

/** A dot with a ring that pings outward, for anything live or due today. */
export function Ping({ color, size = 8 }: { color: string; size?: number }) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (reduce) return;
    const loop = Animated.loop(Animated.timing(v, { toValue: 1, duration: 1800, easing: Easing.out(Easing.quad), useNativeDriver: native }));
    loop.start();
    return () => loop.stop();
  }, []);
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Animated.View style={{ position: 'absolute', width: size, height: size, borderRadius: size, backgroundColor: color,
        opacity: v.interpolate({ inputRange: [0, 1], outputRange: [0.55, 0] }), transform: [{ scale: v.interpolate({ inputRange: [0, 1], outputRange: [1, 3] }) }] }} />
      <View style={{ width: size, height: size, borderRadius: size, backgroundColor: color }} />
    </View>
  );
}

/** Gentle up-and-down float (the landing page's floating phones). */
export function Float({ children, distance = 6, duration = 3200, style }: { children: React.ReactNode; distance?: number; duration?: number; style?: StyleProp<ViewStyle> }) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (reduce) return;
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(v, { toValue: 1, duration, easing: Easing.inOut(Easing.sin), useNativeDriver: native }),
      Animated.timing(v, { toValue: 0, duration, easing: Easing.inOut(Easing.sin), useNativeDriver: native }),
    ]));
    loop.start();
    return () => loop.stop();
  }, []);
  return <Animated.View style={[style, { transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [0, -distance] }) }] }]}>{children}</Animated.View>;
}

/** Pops in with a little overshoot (a tick, a badge, a done state). */
export function Pop({ children, show = true, style }: { children: React.ReactNode; show?: boolean; style?: StyleProp<ViewStyle> }) {
  const v = useRef(new Animated.Value(show ? 1 : 0)).current;
  useEffect(() => {
    Animated.spring(v, { toValue: show ? 1 : 0, useNativeDriver: native, speed: 14, bounciness: 12 }).start();
  }, [show]);
  return <Animated.View style={[style, { opacity: v, transform: [{ scale: v.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] }) }] }]}>{children}</Animated.View>;
}

export { Image as StillImage };
