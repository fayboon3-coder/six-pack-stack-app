import React, { useEffect, useRef, useState } from 'react';
import { Animated, Image, Linking, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { F } from '../lib/theme';
import { thumb } from '../lib/workoutMeta';
import { PlayIcon } from './icons';
import { track } from '../lib/track';

/**
 * The exercise's form video, played right inside the app (no jumping out to YouTube),
 * with the coaching on top of it: the move's name, today's sets and reps, and the
 * cues cycling along the bottom while it plays. It loops, muted, like a gym demo;
 * the player's own controls turn the sound on.
 */
type Props = { id?: string; name: string; target: string; cues: string[]; height?: number };

// On the phone the player is a small web view; on the web it's a plain iframe.
let WebView: any = null;
if (Platform.OS !== 'web') { try { WebView = require('react-native-webview').WebView; } catch { WebView = null; } }

const src = (id: string) =>
  `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&mute=1&loop=1&playlist=${id}&playsinline=1&rel=0&modestbranding=1&controls=1&iv_load_policy=3&fs=0&origin=https%3A%2F%2Fboonfay.com`;

const html = (id: string) => `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1">
<style>html,body{margin:0;height:100%;background:#000;overflow:hidden}iframe{position:absolute;inset:0;width:100%;height:100%;border:0}</style></head>
<body><iframe src="${src(id)}" allow="autoplay; encrypted-media; picture-in-picture" referrerpolicy="strict-origin-when-cross-origin"></iframe></body></html>`;

export default function FormVideo({ id, name, target, cues, height = 210 }: Props) {
  const [playing, setPlaying] = useState(false);
  const [cue, setCue] = useState(0);
  const fade = useRef(new Animated.Value(1)).current;

  // A new exercise: back to the cover.
  useEffect(() => { setPlaying(false); setCue(0); }, [id]);

  // While it plays, the cues take turns on the video.
  useEffect(() => {
    if (!playing || cues.length < 2) return;
    const t = setInterval(() => {
      Animated.timing(fade, { toValue: 0, duration: 220, useNativeDriver: true }).start(() => {
        setCue((c) => (c + 1) % cues.length);
        Animated.timing(fade, { toValue: 1, duration: 260, useNativeDriver: true }).start();
      });
    }, 3600);
    return () => clearInterval(t);
  }, [playing, cues.length]);

  const play = () => { if (!id) return; track('form_video_play', { id }); setPlaying(true); };

  return (
    <View style={[st.box, { height }]}>
      {playing && id ? (
        Platform.OS === 'web'
          ? React.createElement('iframe', { src: src(id), allow: 'autoplay; encrypted-media; picture-in-picture', style: { position: 'absolute', inset: 0, width: '100%', height: '100%', border: 0 }, title: `${name} form video` })
          : WebView
            ? <WebView source={{ html: html(id), baseUrl: 'https://boonfay.com' }} style={StyleSheet.absoluteFill} allowsInlineMediaPlayback
                mediaPlaybackRequiresUserAction={false} javaScriptEnabled scrollEnabled={false} bounces={false} allowsFullscreenVideo={false} />
            : null
      ) : (
        <Pressable accessibilityRole="button" accessibilityLabel={`Play the form video for ${name}`} onPress={play} disabled={!id} style={StyleSheet.absoluteFill}>
          {!!id && <Image source={thumb(id, 'hq')} style={StyleSheet.absoluteFill} resizeMode="cover" accessibilityIgnoresInvertColors />}
          <View style={st.shade} />
          <View style={st.play}><PlayIcon color="#fff" size={26} /></View>
          <View style={st.coverText}>
            <Text style={st.coverName} numberOfLines={1}>{name}</Text>
            <Text style={st.coverSub}>Tap to watch the form · plays right here</Text>
          </View>
        </Pressable>
      )}

      {/* The coaching on top of the video */}
      <View pointerEvents="box-none" style={st.topRow}>
        <Text style={st.chip}>{playing ? '● FORM DEMO' : 'HD FORM DEMO'}</Text>
        {playing && id ? (
          // Backup if a video won't play inside the app: open it on YouTube.
          <Pressable accessibilityRole="link" accessibilityLabel="Open this video on YouTube" hitSlop={8}
            onPress={() => { track('form_video_youtube', { id }); Linking.openURL(`https://www.youtube.com/watch?v=${id}`); }}>
            <Text style={[st.chip, st.chipRed]}>{target}  ·  YouTube ↗</Text>
          </Pressable>
        ) : <Text style={[st.chip, st.chipRed]}>{target}</Text>}
      </View>
      {playing && cues.length > 0 && (
        <Animated.View pointerEvents="none" style={[st.cueBar, { opacity: fade }]}>
          <View style={st.cueN}><Text style={st.cueNT}>{cue + 1}</Text></View>
          <Text style={st.cueT} numberOfLines={2}>{cues[cue]}</Text>
        </Animated.View>
      )}
    </View>
  );
}

const st = StyleSheet.create({
  box: { borderRadius: 18, overflow: 'hidden', backgroundColor: '#0d1220' },
  shade: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(13,18,32,0.28)' },
  play: { position: 'absolute', alignSelf: 'center', top: '50%', marginTop: -36, width: 60, height: 60, borderRadius: 30, backgroundColor: '#e2433b', alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOpacity: 0.35, shadowRadius: 14, shadowOffset: { width: 0, height: 6 }, elevation: 6 },
  coverText: { position: 'absolute', left: 14, right: 14, bottom: 12 },
  coverName: { fontFamily: F.black, fontSize: 18, color: '#fff' },
  coverSub: { fontFamily: F.semi, fontSize: 12.5, color: 'rgba(255,255,255,0.85)', marginTop: 2 },
  topRow: { position: 'absolute', top: 10, left: 10, right: 10, flexDirection: 'row', justifyContent: 'space-between' },
  chip: { fontFamily: F.xbold, fontSize: 11, letterSpacing: 0.6, color: '#141c33', backgroundColor: 'rgba(255,255,255,0.94)', paddingHorizontal: 9, paddingVertical: 5, borderRadius: 8, overflow: 'hidden' },
  chipRed: { backgroundColor: '#e2433b', color: '#fff' },
  cueBar: { position: 'absolute', left: 10, right: 10, bottom: 46, flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: 'rgba(20,28,51,0.88)', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 8 },
  cueN: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#e2433b', alignItems: 'center', justifyContent: 'center' },
  cueNT: { fontFamily: F.black, fontSize: 12, color: '#fff' },
  cueT: { flex: 1, fontFamily: F.bold, fontSize: 13.5, lineHeight: 18, color: '#fff' },
});
