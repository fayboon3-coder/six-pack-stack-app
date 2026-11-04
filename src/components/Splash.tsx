import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { C } from '../lib/theme';

const LOGO = require('../../assets/logo-b.png');

/**
 * Opening animation (about 1.8 s): the B drops in with a red pulse ring,
 * the wordmark slides up, a red bar sweeps across, then everything fades out.
 */
export default function Splash({ ready, onDone }: { ready: boolean; onDone: () => void }) {
  const logo = useRef(new Animated.Value(0)).current;
  const ring = useRef(new Animated.Value(0)).current;
  const word = useRef(new Animated.Value(0)).current;
  const bar = useRef(new Animated.Value(0)).current;
  const out = useRef(new Animated.Value(1)).current;
  const intro = useRef(false);

  useEffect(() => {
    Animated.parallel([
      Animated.spring(logo, { toValue: 1, friction: 5, tension: 70, useNativeDriver: true }),
      Animated.loop(Animated.timing(ring, { toValue: 1, duration: 1100, easing: Easing.out(Easing.quad), useNativeDriver: true })),
      Animated.sequence([
        Animated.delay(350),
        Animated.timing(word, { toValue: 1, duration: 450, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      ]),
      Animated.timing(bar, { toValue: 1, duration: 1500, easing: Easing.inOut(Easing.cubic), useNativeDriver: false }),
    ]).start();
    const t = setTimeout(() => { intro.current = true; }, 1600);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!ready) return;
    const wait = setInterval(() => {
      if (!intro.current) return;
      clearInterval(wait);
      Animated.timing(out, { toValue: 0, duration: 320, useNativeDriver: true }).start(() => onDone());
    }, 50);
    return () => clearInterval(wait);
  }, [ready]);

  const scale = logo.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] });
  const ringScale = ring.interpolate({ inputRange: [0, 1], outputRange: [1, 2.1] });
  const ringOpacity = ring.interpolate({ inputRange: [0, 0.2, 1], outputRange: [0, 0.7, 0] });
  const wordY = word.interpolate({ inputRange: [0, 1], outputRange: [18, 0] });
  const barW = bar.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });

  return (
    <Animated.View style={[StyleSheet.absoluteFill, { opacity: out, zIndex: 100 }]} pointerEvents="none">
      <LinearGradient colors={['#13284d', C.bg, '#070f1f']} style={StyleSheet.absoluteFill} />
      <View style={st.center}>
        <View style={{ width: 120, height: 120, alignItems: 'center', justifyContent: 'center' }}>
          <Animated.View style={[st.ring, { opacity: ringOpacity, transform: [{ scale: ringScale }] }]} />
          <Animated.Image source={LOGO} style={{ width: 120, height: 120, opacity: logo, transform: [{ scale }] }} accessibilityLabel="Six-Pack Stack" />
        </View>
        <Animated.View style={{ opacity: word, transform: [{ translateY: wordY }], alignItems: 'center', gap: 6, marginTop: 26 }}>
          <Text style={st.word}>SIX-PACK STACK</Text>
          <Text style={st.tag}>BY BOON FAY</Text>
        </Animated.View>
        <View style={st.track}><Animated.View style={[st.bar, { width: barW }]} /></View>
      </View>
    </Animated.View>
  );
}

const st = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  ring: { position: 'absolute', width: 120, height: 120, borderRadius: 30, borderWidth: 3, borderColor: C.red },
  word: { fontFamily: 'Inter_900Black', fontSize: 26, letterSpacing: 3, color: C.ink },
  tag: { fontFamily: 'Inter_800ExtraBold', fontSize: 11, letterSpacing: 4, color: C.red },
  track: { width: 140, height: 4, borderRadius: 2, backgroundColor: 'rgba(27,36,64,0.12)', marginTop: 28, overflow: 'hidden' },
  bar: { height: 4, borderRadius: 2, backgroundColor: C.red },
});
