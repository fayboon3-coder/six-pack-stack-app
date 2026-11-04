import React from 'react';
import { Image, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { C, F } from '../lib/theme';
import { ClockIcon, DumbbellIcon, LayersIcon, PlayIcon } from './icons';
import { DayMeta, MUSCLE_COLOR, thumb } from '../lib/workoutMeta';
import { MuscleChips, Stat } from './WorkoutBits';

/**
 * The big workout card: form-video still on top, the stats, every exercise
 * (thumbnail, sets × reps, muscle), then one button to start.
 */
export default function WorkoutPreview({ meta: w, badge, cta, done, onPress, maxRows = 99, cover = 0 }: {
  meta: DayMeta; badge: string; cta: string; done?: boolean; onPress: () => void; maxRows?: number; cover?: number;
}) {
  const coverItem = w.items[Math.min(cover, w.items.length - 1)] || w.items[0];
  const { width } = useWindowDimensions();
  const cw = Math.min(width, 520) - 40;
  const ih = Math.round(cw * 9 / 16);
  const shown = w.items.slice(0, maxRows);

  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`${cta}: ${w.type}, ${w.items.length} exercises`}
      onPress={onPress} style={({ pressed }) => [st.card, { transform: [{ scale: pressed ? 0.99 : 1 }] }]}>
      <View style={{ width: cw, height: ih }}>
        {!!coverItem?.video && <Image source={thumb(coverItem.video, 'hq')} style={{ width: cw, height: ih }} resizeMode="cover" accessibilityIgnoresInvertColors />}
        <LinearGradient colors={['rgba(245,246,249,0)', 'rgba(245,246,249,0.15)', 'rgba(245,246,249,0.92)', C.card]} locations={[0, 0.45, 0.8, 1]}
          style={{ position: 'absolute', left: 0, top: 0, width: cw, height: ih }} />
        <View style={[st.badge, done && { backgroundColor: C.green }]}><Text style={st.badgeText}>{badge}</Text></View>
        <View style={st.play}><PlayIcon size={22} /></View>
        <View style={st.titleWrap}>
          <Text style={st.day}>{w.day}</Text>
          <Text style={st.title} accessibilityRole="header">{w.type}</Text>
        </View>
      </View>

      <View style={st.body}>
        <View style={st.stats}>
          <View style={{ flex: 1 }}><Stat icon={<ClockIcon color={C.red} size={15} />} value={`${w.minutes} min`} /></View>
          <View style={{ flex: 1.3 }}><Stat icon={<DumbbellIcon color={C.red} size={15} />} value={`${w.items.length} moves`} /></View>
          <View style={{ flex: 1 }}><Stat icon={<LayersIcon color={C.red} size={15} />} value={`${w.sets} sets`} /></View>
        </View>
        <MuscleChips muscles={w.muscles} />

        <View style={{ gap: 2 }}>
          {shown.map((x, k) => (
            <View key={k} style={[st.row, k > 0 && st.rowLine]}>
              <View style={st.thumbWrap}>
                {!!x.video && <Image source={thumb(x.video, 'mq')} style={st.thumb} resizeMode="cover" accessibilityIgnoresInvertColors />}
                <View style={st.num}><Text style={st.numText}>{k + 1}</Text></View>
              </View>
              <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
                <Text style={st.exName} numberOfLines={1}>{x.name}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Text style={st.target}>{String(x.target)}</Text>
                  {!!x.muscle && <View style={[st.dot, { backgroundColor: MUSCLE_COLOR[x.muscle] }]} />}
                  {!!x.muscle && <Text style={st.muscle} numberOfLines={1}>{x.muscle}</Text>}
                </View>
              </View>
            </View>
          ))}
          {w.items.length > shown.length && (
            <Text style={st.more}>+ {w.items.length - shown.length} more exercise{w.items.length - shown.length > 1 ? 's' : ''}</Text>
          )}
        </View>

        <View style={st.cta}>
          <PlayIcon size={15} />
          <Text style={st.ctaText}>{cta}</Text>
        </View>
      </View>
    </Pressable>
  );
}


const st = StyleSheet.create({
  card: { marginHorizontal: 20, borderRadius: 28, overflow: 'hidden', backgroundColor: C.card, borderWidth: 1, borderColor: C.line },
  badge: { position: 'absolute', top: 16, left: 16, backgroundColor: C.red, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7 },
  badgeText: { fontFamily: F.black, fontSize: 11, letterSpacing: 1.4, textTransform: 'uppercase', color: C.onAccent },
  play: { position: 'absolute', top: 14, right: 14, width: 46, height: 46, borderRadius: 23, backgroundColor: 'rgba(226,67,59,0.92)', alignItems: 'center', justifyContent: 'center', paddingLeft: 3 },
  titleWrap: { position: 'absolute', left: 20, right: 20, bottom: 10 },
  day: { fontFamily: F.xbold, fontSize: 12, letterSpacing: 1.6, textTransform: 'uppercase', color: C.red },
  title: { fontFamily: F.black, fontSize: 36, lineHeight: 40, color: C.ink, letterSpacing: -0.5 },
  body: { paddingHorizontal: 20, paddingBottom: 20, paddingTop: 8, gap: 14 },
  stats: { flexDirection: 'row', gap: 8 },
  stat: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: C.bg, borderRadius: 12, paddingVertical: 10 },
  statText: { fontFamily: F.xbold, fontSize: 12, color: C.ink },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 },
  chipText: { fontFamily: F.bold, fontSize: 12, color: C.ink },
  dot: { width: 7, height: 7, borderRadius: 4 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8 },
  rowLine: { borderTopWidth: 1, borderTopColor: C.line },
  thumbWrap: { width: 76, height: 48, borderRadius: 10, overflow: 'hidden', backgroundColor: C.bg },
  thumb: { width: 76, height: 48 },
  num: { position: 'absolute', left: 4, top: 4, minWidth: 18, height: 18, borderRadius: 9, backgroundColor: C.red, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  numText: { fontFamily: F.black, fontSize: 10, color: C.ink },
  exName: { fontFamily: F.xbold, fontSize: 15, color: C.ink },
  target: { fontFamily: F.black, fontSize: 13, color: C.ink },
  muscle: { fontFamily: F.semi, fontSize: 12, color: C.ink, flexShrink: 1 },
  more: { fontFamily: F.bold, fontSize: 13, color: C.ink, paddingTop: 6, borderTopWidth: 1, borderTopColor: C.line },
  cta: { height: 58, borderRadius: 16, backgroundColor: C.red, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  ctaText: { fontFamily: F.black, fontSize: 17, letterSpacing: -0.5, color: C.onAccent },
});
