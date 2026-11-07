import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { C, F } from '../lib/theme';
import { health, type HealthToday } from '../lib/health';
import { syncPhoneSteps } from '../lib/daily';
import { track } from '../lib/track';

const fmt = (n: number) => Math.round(n).toLocaleString('en-US');
const hm = (m: number) => `${Math.floor(m / 60)}h ${String(m % 60).padStart(2, '0')}m`;

/** Apple Health: one tap to sync steps, weight, sleep and workouts. iPhone only (hidden elsewhere). */
export default function HealthCard({ compact }: { compact?: boolean }) {
  const [on, setOn] = useState(false);
  const [today, setToday] = useState<HealthToday | null>(null);
  const [note, setNote] = useState('');
  const load = async () => { const v = await health.isOn(); setOn(v); if (v) setToday(await health.today()); };
  useEffect(() => { if (health.available()) load(); }, []);
  if (!health.available()) return null;

  const connect = async () => {
    setNote('');
    const ok = await health.connect();
    track('health_connect', { ok });
    if (!ok) { setNote("Couldn't open Apple Health. Check Settings → Health → Data Access & Devices → Six-Pack Stack."); return; }
    await syncPhoneSteps().catch(() => null);
    load();
  };

  return (
    <View style={st.card}>
      <View style={st.row}>
        <View style={st.ico}>
          <Svg width={22} height={22} viewBox="0 0 24 24"><Path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z" fill="#ff2d55" /></Svg>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={st.t}>Apple Health</Text>
          <Text style={st.s}>{on ? 'Connected. Steps, weight, sleep and workouts sync on their own.' : 'Sync steps (with your watch), weight, sleep and workouts. Your weigh-ins and workouts save back to Health.'}</Text>
        </View>
        {!on && <Pressable accessibilityRole="button" onPress={connect} style={st.btn}><Text style={st.btnT}>Connect</Text></Pressable>}
      </View>
      {on && !compact && today && (
        <View style={st.stats}>
          <Stat k="Steps today" v={today.steps != null ? fmt(today.steps) : '–'} />
          <Stat k="Sleep" v={today.sleepMin != null ? hm(today.sleepMin) : '–'} />
          <Stat k="Active cal" v={today.activeKcal != null ? fmt(today.activeKcal) : '–'} />
        </View>
      )}
      {!!note && <Text style={st.note}>{note}</Text>}
    </View>
  );
}

const Stat = ({ k, v }: { k: string; v: string }) => (
  <View style={{ flex: 1 }}><Text style={st.v}>{v}</Text><Text style={st.k}>{k}</Text></View>
);

const st = StyleSheet.create({
  card: { backgroundColor: C.card, borderRadius: 22, borderWidth: 1, borderColor: C.line, padding: 16, gap: 14 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  ico: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#fff', borderWidth: 1, borderColor: C.line, alignItems: 'center', justifyContent: 'center' },
  t: { fontFamily: F.xbold, fontSize: 16, color: C.ink },
  s: { fontFamily: F.medium, fontSize: 13, lineHeight: 18, color: C.ink, marginTop: 1 },
  btn: { height: 40, paddingHorizontal: 16, borderRadius: 20, backgroundColor: C.navy, alignItems: 'center', justifyContent: 'center' },
  btnT: { fontFamily: F.bold, fontSize: 14, color: '#fff' },
  stats: { flexDirection: 'row', gap: 10, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#e9ebf1' },
  v: { fontFamily: F.black, fontSize: 18, color: C.ink },
  k: { fontFamily: F.medium, fontSize: 12, color: C.ink },
  note: { fontFamily: F.semi, fontSize: 13, color: C.red },
});
