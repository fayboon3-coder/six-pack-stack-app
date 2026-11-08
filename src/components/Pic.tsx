import React, { useState } from 'react';
import { Image } from 'expo-image';
import type { ImageSourcePropType, ImageStyle, StyleProp } from 'react-native';
import { hdUrl } from '../lib/hd';

/**
 * A photo that's sharp on every screen: the high-res copy from the CDN, sized to fit,
 * fading in over the small bundled copy (which also covers offline). Cached on the phone.
 */
export default function Pic({ source, hd, w = 900, style, fit = 'cover', label, transition = 280, priority }: {
  source?: ImageSourcePropType | null; hd?: string | null; w?: number; style?: StyleProp<ImageStyle>;
  fit?: 'cover' | 'contain'; label?: string; transition?: number; priority?: 'low' | 'normal' | 'high';
}) {
  const [bad, setBad] = useState(false);
  const uri = hd && !bad ? hdUrl(hd, Math.round(w)) : null;
  return (
    <Image
      source={uri ? { uri } : (source as any)}
      placeholder={uri && typeof source === 'number' ? source : undefined}
      placeholderContentFit={fit}
      contentFit={fit}
      transition={transition}
      cachePolicy="memory-disk"
      priority={priority}
      recyclingKey={uri || undefined}
      onError={() => { if (uri) setBad(true); }}
      style={style as any}
      accessible={!!label}
      accessibilityLabel={label}
    />
  );
}
