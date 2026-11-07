import React, { useEffect, useState } from 'react';
import { Image, ImageStyle, StyleProp, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { thumb } from '../lib/workoutMeta';
import { PlayIcon } from './icons';

/**
 * A form-video still that never shows as a broken image: bundled copy first, then
 * YouTube's medium still, and if that fails (a video taken down, no connection)
 * a clean navy tile with a play mark instead.
 */
export default function Thumb({ video, q = 'mq', style }: { video?: string; q?: 'mq' | 'hq'; style?: StyleProp<ImageStyle> }) {
  const [step, setStep] = useState(0);
  useEffect(() => setStep(0), [video]);
  const src = !video ? undefined : step === 0 ? thumb(video, q) : step === 1 ? { uri: `https://i.ytimg.com/vi/${video}/mqdefault.jpg` } : undefined;
  if (!src) {
    return (
      <View style={[style as any, { overflow: 'hidden', alignItems: 'center', justifyContent: 'center' }]}>
        <LinearGradient colors={['#1d2a52', '#141c33']} style={StyleSheet.absoluteFill} />
        <PlayIcon color="rgba(255,255,255,0.55)" size={18} />
      </View>
    );
  }
  return <Image source={src} style={style} resizeMode="cover" accessibilityIgnoresInvertColors onError={() => setStep((s) => s + 1)} />;
}
