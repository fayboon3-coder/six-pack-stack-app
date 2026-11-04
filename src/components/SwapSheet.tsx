import React, { useMemo, useState } from 'react';
import { Image, Linking, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { C, F } from '../lib/theme';
import { exercises } from '../lib/program';
import { thumb } from '../lib/workoutMeta';
import { buildWeek, isSwapped, PATTERN_LABEL, swapsFor, type TrainCfg } from '../lib/training';
import { CheckIcon, PlayIcon } from './icons';

type Reason = 'busy' | 'dislike' | 'hurts';
const REASONS: [Reason, string][] = [['busy', "Equipment's taken"], ['dislike', "Don't like it"], ['hurts', 'It hurts']];

/**
 * Swap one exercise for another that trains the same movement.
 * Sets, reps and progression stay exactly the same.
 */
export default function SwapSheet({ cfg, day, ex, onPick, onReset, onClose }: {
  cfg: TrainCfg; day: number; ex: number;
  onPick: (to: string, hurts: boolean) => void; onReset: () => void; onClose: () => void;
}) {
  const [reason, setReason] = useState<Reason | null>(null);
  const s = useMemo(() => swapsFor(cfg, day, ex), [cfg, day, ex]);
  const cur = s.current ? exercises[s.current] : undefined;
  const target = buildWeek(cfg)[day]?.x[ex]?.[1];
  const swapped = isSwapped(cfg, day, ex);

  return (
    <Modal visible animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={st.dim} onPress={onClose} accessibilityLabel="Close" />
      <SafeAreaView edges={['bottom']} style={st.sheet}>
        <View style={st.grab} />
        <ScrollView contentContainerStyle={{ padding: 20, gap: 14, paddingBottom: 28 }}>
          <Text style={st.k}>{s.pattern ? PATTERN_LABEL[s.pattern] : 'Swap'} · {target}</Text>
          <Text style={st.h}>Swap {cur?.name || 'this move'}</Text>
          <Text style={st.body}>Same movement, same sets and reps. Your progress keeps counting.</Text>

          <View style={st.reasons}>
            {REASONS.map(([id, label]) => (
              <Pressable key={id} accessibilityRole="radio" accessibilityState={{ selected: reason === id }} onPress={() => setReason(reason === id ? null : id)}
                style={[st.reason, reason === id && (id === 'hurts' ? st.reasonHurt : st.reasonOn)]}>
                <Text style={st.reasonT}>{label}</Text>
              </Pressable>
            ))}
          </View>
          {reason === 'hurts' && (
            <View style={st.warn}>
              <Text style={st.warnT}>Good call. Stop any move that hurts. We'll take {cur?.name || 'it'} out of your whole plan.</Text>
              <Text style={st.warnS}>Sharp pain, or pain that's still there the next day: get it checked by a doctor or physio before you train it again.</Text>
            </View>
          )}

          {s.options.length === 0 && <Text style={st.body}>No other option fits your equipment for this one. Change your equipment in Your training to see more.</Text>}
          {s.options.map((id) => {
            const e = exercises[id];
            if (!e) return null;
            return (
              <View key={id} style={st.opt}>
                <Pressable accessibilityRole="button" accessibilityLabel={`Watch form video for ${e.name}`} onPress={() => Linking.openURL(`https://www.youtube.com/watch?v=${e.video}`)}>
                  <Image source={thumb(e.video)} style={st.thumb} resizeMode="cover" accessibilityIgnoresInvertColors />
                  <View style={st.play}><PlayIcon size={12} /></View>
                </Pressable>
                <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
                  <Text style={st.name}>{e.name}</Text>
                  <Text style={st.cue} numberOfLines={2}>{e.cues[0]}</Text>
                </View>
                <Pressable accessibilityRole="button" accessibilityLabel={`Use ${e.name}`} onPress={() => onPick(id, reason === 'hurts')} style={st.use}>
                  <Text style={st.useT}>Use</Text>
                </Pressable>
              </View>
            );
          })}

          {swapped && (
            <Pressable accessibilityRole="button" onPress={onReset} style={st.reset}>
              <CheckIcon color={C.ink} size={12} /><Text style={st.resetT}>Back to the original move</Text>
            </Pressable>
          )}
          <Pressable accessibilityRole="button" onPress={onClose} style={st.cancel}><Text style={st.cancelT}>Keep {cur?.name || 'it'}</Text></Pressable>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const st = StyleSheet.create({
  dim: { flex: 1, backgroundColor: 'rgba(5,10,22,0.65)' },
  sheet: { maxHeight: '86%', backgroundColor: C.bg, borderTopLeftRadius: 26, borderTopRightRadius: 26, borderWidth: 1, borderColor: C.line },
  grab: { alignSelf: 'center', width: 44, height: 5, borderRadius: 3, backgroundColor: C.line, marginTop: 10 },
  k: { fontFamily: F.xbold, fontSize: 11, letterSpacing: 1.4, textTransform: 'uppercase', color: C.red },
  h: { fontFamily: F.black, fontSize: 24, color: C.ink },
  body: { fontFamily: F.semi, fontSize: 14, lineHeight: 20, color: 'rgba(27,36,64,0.85)' },
  reasons: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  reason: { paddingHorizontal: 13, paddingVertical: 9, borderRadius: 999, borderWidth: 1.5, borderColor: C.line, backgroundColor: C.card },
  reasonOn: { borderColor: C.ink },
  reasonHurt: { borderColor: C.red, backgroundColor: 'rgba(226,67,59,0.18)' },
  reasonT: { fontFamily: F.bold, fontSize: 13, color: C.ink },
  warn: { borderRadius: 14, borderWidth: 1.5, borderColor: C.red, backgroundColor: 'rgba(226,67,59,0.1)', padding: 12, gap: 6 },
  warnT: { fontFamily: F.bold, fontSize: 14, lineHeight: 20, color: C.ink },
  warnS: { fontFamily: F.semi, fontSize: 12, lineHeight: 18, color: 'rgba(27,36,64,0.8)' },
  opt: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: C.card, borderWidth: 1, borderColor: C.line, borderRadius: 16, padding: 10 },
  thumb: { width: 96, height: 58, borderRadius: 10, backgroundColor: C.bg },
  play: { position: 'absolute', right: 5, bottom: 5, width: 22, height: 22, borderRadius: 11, backgroundColor: C.red, alignItems: 'center', justifyContent: 'center' },
  name: { fontFamily: F.black, fontSize: 15, color: C.ink },
  cue: { fontFamily: F.semi, fontSize: 12, lineHeight: 16, color: 'rgba(27,36,64,0.75)' },
  use: { backgroundColor: C.red, borderRadius: 12, paddingHorizontal: 14, height: 40, justifyContent: 'center' },
  useT: { fontFamily: F.black, fontSize: 13, color: C.ink, textTransform: 'uppercase', letterSpacing: 0.5 },
  reset: { flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center', height: 48, borderRadius: 14, borderWidth: 1.5, borderColor: C.line },
  resetT: { fontFamily: F.bold, fontSize: 14, color: C.ink },
  cancel: { height: 44, alignItems: 'center', justifyContent: 'center' },
  cancelT: { fontFamily: F.bold, fontSize: 14, color: C.ink, textDecorationLine: 'underline' },
});
