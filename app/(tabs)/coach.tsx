import React, { useCallback, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import { supabase } from '../../src/lib/supabase';
import { C, F } from '../../src/lib/theme';
import { ChevronIcon } from '../../src/components/icons';
import { useAuth } from '../../src/lib/auth';
import { VIEW_AS_LABEL, type ViewAs } from '../../src/lib/preview';
import LoadingScreen from '../../src/components/LoadingScreen';
import Backdrop from '../../src/components/Backdrop';

type Row = {
  id: string; email: string | null; first_name: string | null; tier: string; start_date: string | null;
  last_week: number | null; last_checkin: string | null; last_weight: number | null; checkins: number; needs_review: boolean;
};
type Invite = { email: string; first_name: string | null; created_at: string };
type Step = { step: string; label: string; people: number };

/** Coach-only: every client, newest unreviewed check-ins first, plus plans waiting for a sign-up. */
export default function Coach() {
  const router = useRouter();
  const { setViewAs } = useAuth();
  const [opening, setOpening] = useState<ViewAs | null>(null);
  const viewAs = (v: ViewAs) => setOpening(v);
  const [rows, setRows] = useState<Row[]>([]);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [funnel, setFunnel] = useState<Step[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const [{ data: c }, { data: f }, { data: i }] = await Promise.all([
      supabase.from('coach_clients').select('*'),
      supabase.from('funnel_7d').select('step,label,people'),
      supabase.from('plan_invites').select('email,first_name,created_at').is('claimed_at', null).order('created_at', { ascending: false }),
    ]);
    const list = ((c as Row[]) || []).sort((a, b) =>
      Number(b.needs_review) - Number(a.needs_review) || String(b.last_checkin || '').localeCompare(String(a.last_checkin || '')));
    setRows(list); setInvites((i as Invite[]) || []); setFunnel((f as Step[]) || []);
  }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const due = rows.filter((r) => r.needs_review).length;
  const coached = rows.filter((r) => r.tier === 'coached');

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: C.bg }}>
      <Backdrop />
      <ScrollView contentContainerStyle={{ padding: 20, gap: 14, paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} tintColor={C.ink} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} />}>
        <Text style={st.kicker}>Coach</Text>
        <Text style={st.title}>{due ? `${due} check-in${due > 1 ? 's' : ''} to review` : 'All caught up'}</Text>
        <Text style={st.sub}>{coached.length} coaching client{coached.length === 1 ? '' : 's'} · {rows.length} in the app</Text>

        {funnel.length > 0 && (
          <View style={st.preview}>
            <Text style={st.section}>Your funnel · last 7 days</Text>
            <Text style={st.meta}>Unique people at each step. The biggest drop is the one to fix first.</Text>
            {funnel.map((f, k) => {
              const top = Math.max(1, funnel[0].people);
              const prev = k ? funnel[k - 1].people : f.people;
              const drop = k && prev ? Math.round((1 - f.people / prev) * 100) : 0;
              return (
                <View key={f.step} style={{ gap: 4 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={st.meta}>{f.label}</Text>
                    <Text style={st.name}>{f.people}{k > 0 && drop > 0 ? <Text style={[st.meta, { color: C.red }]}>  −{drop}%</Text> : null}</Text>
                  </View>
                  <View style={{ height: 8, borderRadius: 4, backgroundColor: 'rgba(27,36,64,0.08)' }}>
                    <View style={{ height: 8, borderRadius: 4, width: `${Math.max(2, (f.people / top) * 100)}%`, backgroundColor: k >= 7 ? C.green : C.red }} />
                  </View>
                </View>
              );
            })}
          </View>
        )}

        <View style={[st.preview, { borderColor: C.red, borderWidth: 2 }]}>
          <Text style={st.section}>View the full app as</Text>
          <Text style={st.meta}>Opens every tab exactly as they'd see it, with a sample plan for "Jake". Tap Exit on the red bar to come back. Nothing saves.</Text>
          {([
            ['free', 'The Free Stack', 'Weeks 1–2 open, weeks 3–12 locked, offers on the Boon tab'],
            ['self', 'The Full Stack', 'The $19.99/mo or $99/yr subscriber: all 12 weeks, meals, Stack Check, on their own'],
            ['coached', 'Coaching client', 'Everything, plus your Sunday reviews and WhatsApp'],
          ] as [ViewAs, string, string][]).map(([v, l, d]) => (
            <Pressable key={v} accessibilityRole="button" onPress={() => viewAs(v)} style={st.vrow}>
              <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
                <Text style={st.name}>{l}</Text>
                <Text style={st.meta}>{d}</Text>
              </View>
              <ChevronIcon />
            </Pressable>
          ))}
        </View>

        <View style={st.preview}>
          <Text style={st.section}>See what new people see</Text>
          <Text style={st.meta}>Preview only. Nothing gets saved or sent to Kit.</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {[['Welcome', '/welcome'], ['Quiz', '/quiz'], ['Unlock screen', '/unlock'], ['Application', '/coaching-application'], ['Stack Check', '/stack-check']].map(([l, h]) => (
              <Pressable key={h} accessibilityRole="button" onPress={() => router.push(h as any)} style={st.pbtn}>
                <Text style={st.pbtnText}>{l}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        {rows.map((r) => (
          <Pressable key={r.id} accessibilityRole="button" onPress={() => router.push({ pathname: '/client/[id]', params: { id: r.id } })}
            style={[st.row, r.needs_review && { borderColor: C.red, borderWidth: 2 }]}>
            <View style={[st.avatar, r.tier === 'coached' && { backgroundColor: C.red }]}>
              <Text style={st.avatarText}>{(r.first_name || r.email || '?')[0].toUpperCase()}</Text>
            </View>
            <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
              <Text style={st.name} numberOfLines={1}>{r.first_name || r.email}</Text>
              <Text style={st.meta} numberOfLines={1}>
                {r.last_checkin ? `Week ${r.last_week} · ${r.last_weight ?? '–'} lbs · ${r.last_checkin}` : 'No check-in yet'}
              </Text>
            </View>
            {r.needs_review ? <View style={st.due}><Text style={st.dueText}>Review</Text></View> : <Text style={st.tier}>{r.tier}</Text>}
            <ChevronIcon />
          </Pressable>
        ))}
        {rows.length === 0 && <Text style={st.sub}>No clients in the app yet.</Text>}

        {invites.length > 0 && (
          <View style={{ gap: 8, marginTop: 10 }}>
            <Text style={st.section}>Plans waiting for a sign-up</Text>
            {invites.map((i) => (
              <View key={i.email} style={st.invite}>
                <Text style={st.name}>{i.first_name || i.email}</Text>
                <Text style={st.meta}>{i.email} · plan ready, attaches when they create their account</Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
      {opening && (
        <LoadingScreen overlay
          title={`Opening| ${VIEW_AS_LABEL[opening]}`}
          sub={'Viewing as "Jake", a sample client. Nothing saves.'}
          steps={['Loading Jake\'s plan', opening === 'free' ? 'Locking weeks 3–12' : opening === 'self' ? 'Unlocking all 12 weeks' : 'Turning on Boon\'s reviews']}
          stepMs={500}
          onFinish={() => { const v = opening; setOpening(null); setViewAs(v); router.replace('/'); }}
        />
      )}
    </SafeAreaView>
  );
}

const st = StyleSheet.create({
  preview: { borderWidth: 1.5, borderColor: C.red, borderRadius: 18, padding: 14, gap: 8 },
  vrow: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 56, backgroundColor: C.bg, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 10 },
  pbtn: { minHeight: 44, borderRadius: 999, backgroundColor: C.red, paddingHorizontal: 16, justifyContent: 'center' },
  pbtnText: { fontFamily: F.bold, fontSize: 16, color: C.onAccent },
  kicker: { fontFamily: F.xbold, fontSize: 12, letterSpacing: 1.6, textTransform: 'uppercase', color: C.red, marginTop: 10 },
  title: { fontFamily: F.black, fontSize: 30, lineHeight: 34, color: C.ink },
  sub: { fontFamily: F.semi, fontSize: 14, color: C.ink },
  section: { fontFamily: F.black, fontSize: 18, color: C.ink },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: C.card, borderWidth: 1, borderColor: C.line, borderRadius: 18, padding: 14 },
  avatar: { width: 42, height: 42, borderRadius: 21, backgroundColor: C.line, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontFamily: F.black, fontSize: 16, color: C.ink },
  name: { fontFamily: F.black, fontSize: 16, color: C.ink },
  meta: { fontFamily: F.semi, fontSize: 12, color: C.ink },
  due: { backgroundColor: C.red, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 },
  dueText: { fontFamily: F.black, fontSize: 11, color: C.ink, textTransform: 'uppercase', letterSpacing: 1 },
  tier: { fontFamily: F.xbold, fontSize: 11, color: C.ink, textTransform: 'uppercase', letterSpacing: 1 },
  invite: { backgroundColor: C.card, borderWidth: 1, borderStyle: 'dashed', borderColor: C.line, borderRadius: 14, padding: 12, gap: 2 },
});
