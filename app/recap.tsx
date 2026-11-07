import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import Svg, { Circle, Defs, LinearGradient, Rect, Stop, Text as T } from 'react-native-svg';
import { C, F } from '../src/lib/theme';
import Page from '../src/components/Page';
import PageTitle from '../src/components/PageTitle';
import { useAuth } from '../src/lib/auth';
import { mondayOf, weekRecap, type Recap } from '../src/lib/recap';
import { isoDate } from '../src/lib/logs';
import { track } from '../src/lib/track';

const W = 1080, H = 1350;
const FONT = 'Inter_900Black, Inter, Helvetica Neue, Arial, sans-serif';
const FONT_B = 'Inter_700Bold, Inter, Helvetica Neue, Arial, sans-serif';
const fmt = (n: number) => Math.round(n).toLocaleString('en-US');

/** Weekly recap: the week on one card they can share (Instagram story size). */
export default function RecapScreen() {
  const { m } = useLocalSearchParams<{ m?: string }>();
  const { session, plan, profile } = useAuth();
  const [monday, setMonday] = useState<Date>(m ? new Date(m + 'T12:00:00') : mondayOf());
  const [r, setR] = useState<Recap | null>(null);
  const [sharing, setSharing] = useState(false);
  const [note, setNote] = useState('');
  const svg = useRef<any>(null);
  const name = plan?.name || profile?.first_name || '';

  useEffect(() => { if (session && plan) { setR(null); weekRecap(session.user.id, plan, monday).then(setR); } }, [monday.getTime(), session, plan]);
  const isThis = isoDate(monday) === isoDate(mondayOf());
  const shift = (d: number) => { const x = new Date(monday); x.setDate(x.getDate() + d * 7); if (x.getTime() <= mondayOf().getTime()) setMonday(x); };

  const share = async () => {
    if (!r) return;
    setSharing(true); setNote('');
    track('recap_share', { week: r.programWeek });
    try {
      if (Platform.OS === 'web') await shareWeb(r); else await shareNative(svg.current, r);
    } catch { setNote("Couldn't open sharing. Take a screenshot instead."); }
    setSharing(false);
  };

  return (
    <Page tabs={false} header={<PageTitle back title="Weekly recap" sub={r ? `Week ${r.programWeek} · ${r.label}` : ' '} size={26} />}
      footer={<Pressable accessibilityRole="button" disabled={!r || sharing} onPress={share} style={[st.cta, (!r || sharing) && { opacity: 0.6 }]}>
        {sharing ? <ActivityIndicator color="#fff" /> : <Text style={st.ctaT}>Share my week</Text>}</Pressable>}>
      <View style={st.nav}>
        <Pressable accessibilityRole="button" accessibilityLabel="Week before" onPress={() => shift(-1)} style={st.navB}><Text style={st.navT}>‹</Text></Pressable>
        <Text style={st.navL}>{isThis ? 'This week so far' : r?.label || ''}</Text>
        <Pressable accessibilityRole="button" accessibilityLabel="Next week" disabled={isThis} onPress={() => shift(1)} style={[st.navB, isThis && { opacity: 0.3 }]}><Text style={st.navT}>›</Text></Pressable>
      </View>
      <View nativeID="recap-card" style={st.cardWrap}>
        {r ? <Card r={r} name={name} svgRef={svg} /> : <View style={[st.cardWrap, { alignItems: 'center', justifyContent: 'center' }]}><ActivityIndicator color={C.ink} /></View>}
      </View>
      {!!note && <Text style={st.note}>{note}</Text>}
      {r && <Text style={st.hint}>{r.workouts >= r.planned ? 'Every workout done. That\'s the week that builds abs.' : r.workouts ? `${r.workouts} of ${r.planned} workouts. Next week: one more.` : 'Your first workout fills this card in.'}</Text>}
    </Page>
  );
}

function Card({ r, name, svgRef }: { r: Recap; name: string; svgRef: React.MutableRefObject<any> }) {
  const change = r.change;
  const big = change == null ? `${r.workouts}/${r.planned}` : `${change > 0 ? '+' : change < 0 ? '−' : ''}${Math.abs(change).toFixed(1)}`;
  const bigL = change == null ? 'WORKOUTS DONE' : 'LBS ON THE TREND';
  const tiles: [string, string][] = [
    [`${r.workouts}/${r.planned}`, 'Workouts'],
    [`${r.stacked}/7`, 'Days stacked'],
    [String(r.prs.length), r.prs.length === 1 ? 'New PR' : 'New PRs'],
    [`${r.proteinDays}/7`, 'Protein days'],
  ];
  const vol = r.volume >= 1000 ? `${Math.round(r.volume / 1000)}k` : fmt(r.volume);
  return (
    <Svg ref={svgRef} width="100%" height="100%" viewBox={`0 0 ${W} ${H}`}>
      <Defs>
        <LinearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#141c33" /><Stop offset="0.55" stopColor="#1d2a52" /><Stop offset="1" stopColor="#2a1530" />
        </LinearGradient>
        <LinearGradient id="red" x1="0" y1="0" x2="1" y2="1"><Stop offset="0" stopColor="#ff5a4e" /><Stop offset="1" stopColor="#c92f2a" /></LinearGradient>
      </Defs>
      <Rect width={W} height={H} fill="url(#bg)" />
      <Circle cx={W - 80} cy={120} r={260} fill="#e2433b" opacity={0.12} />
      <Circle cx={60} cy={H - 120} r={220} fill="#4b6bff" opacity={0.08} />
      <T x={80} y={130} fontFamily={FONT} fontSize={34} fontWeight="900" fill="#ffffff" letterSpacing={3}>SIX-PACK STACK</T>
      <Rect x={80} y={150} width={120} height={8} rx={4} fill="#e2433b" />
      <T x={80} y={250} fontFamily={FONT_B} fontSize={36} fontWeight="700" fill="#ffffff" opacity={0.75} letterSpacing={2}>{`WEEK ${r.programWeek} RECAP · ${r.label.toUpperCase()}`}</T>
      <T x={80} y={330} fontFamily={FONT} fontSize={60} fontWeight="900" fill="#ffffff">{name ? `${name}'s week` : 'My week'}</T>

      <T x={80} y={560} fontFamily={FONT} fontSize={230} fontWeight="900" fill="url(#red)" letterSpacing={-6}>{big}</T>
      <T x={86} y={630} fontFamily={FONT_B} fontSize={38} fontWeight="700" fill="#ffffff" letterSpacing={3}>{bigL}</T>

      {tiles.map(([v, l], k) => {
        const x = 80 + (k % 2) * 470, y = 700 + Math.floor(k / 2) * 230;
        return (
          <React.Fragment key={l}>
            <Rect x={x} y={y} width={450} height={205} rx={36} fill="#ffffff" opacity={0.08} />
            <T x={x + 40} y={y + 112} fontFamily={FONT} fontSize={88} fontWeight="900" fill="#ffffff">{v}</T>
            <T x={x + 42} y={y + 165} fontFamily={FONT_B} fontSize={32} fontWeight="700" fill="#ffffff" opacity={0.75}>{l}</T>
          </React.Fragment>
        );
      })}

      <Rect x={80} y={1180} width={W - 160} height={2} fill="#ffffff" opacity={0.15} />
      <T x={80} y={1250} fontFamily={FONT_B} fontSize={32} fontWeight="700" fill="#ffffff" opacity={0.9}>
        {r.best ? `Best lift: ${r.best.name} ${r.best.weight} × ${r.best.reps}` : `${vol} lbs lifted this week`}
      </T>
      <T x={80} y={1300} fontFamily={FONT_B} fontSize={28} fontWeight="700" fill="#ffffff" opacity={0.55}>{r.best ? `${vol} lbs lifted · boonfay.com` : 'boonfay.com'}</T>
    </Svg>
  );
}

/** iPhone/Android: the card as a PNG in the share sheet. */
async function shareNative(svg: any, r: Recap) {
  const base64: string = await new Promise((res, rej) => { if (!svg?.toDataURL) return rej(new Error('no svg')); svg.toDataURL((b: string) => res(b), { width: W, height: H }); });
  const { File, Paths } = require('expo-file-system');
  const Sharing = require('expo-sharing');
  const f = new File(Paths.cache, `week-${r.programWeek}-recap.png`);
  try { f.delete(); } catch {}
  f.create();
  f.write(base64, { encoding: 'base64' });
  await Sharing.shareAsync(f.uri, { mimeType: 'image/png', dialogTitle: 'Share your week', UTI: 'public.png' });
}

/** Web: draw the SVG to a canvas, then share the PNG (phones) or download it (computers). */
async function shareWeb(r: Recap) {
  const node = document.querySelector('#recap-card svg') as SVGSVGElement | null;
  if (!node) throw new Error('no svg');
  const clone = node.cloneNode(true) as SVGSVGElement;
  clone.setAttribute('width', String(W)); clone.setAttribute('height', String(H)); clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  const xml = new XMLSerializer().serializeToString(clone);
  const img = new Image();
  await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(xml); });
  const canvas = document.createElement('canvas'); canvas.width = W; canvas.height = H;
  canvas.getContext('2d')!.drawImage(img, 0, 0, W, H);
  const blob: Blob = await new Promise((res) => canvas.toBlob((b) => res(b!), 'image/png'));
  const file = new File([blob], `week-${r.programWeek}-recap.png`, { type: 'image/png' });
  const nav: any = navigator;
  if (nav.canShare?.({ files: [file] })) { await nav.share({ files: [file], title: 'My week' }); return; }
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = file.name; a.click();
}

const st = StyleSheet.create({
  nav: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  navB: { width: 40, height: 40, borderRadius: 20, borderWidth: 1.5, borderColor: '#d9dde7', alignItems: 'center', justifyContent: 'center' },
  navT: { fontFamily: F.bold, fontSize: 22, color: C.ink, marginTop: -2 },
  navL: { flex: 1, textAlign: 'center', fontFamily: F.bold, fontSize: 15, color: C.ink },
  cardWrap: { width: '100%', aspectRatio: W / H, borderRadius: 22, overflow: 'hidden', backgroundColor: '#141c33' },
  cta: { flex: 1, height: 54, borderRadius: 27, backgroundColor: C.red, alignItems: 'center', justifyContent: 'center' },
  ctaT: { fontFamily: F.bold, fontSize: 18, color: '#fff' },
  note: { fontFamily: F.semi, fontSize: 13, color: C.red, textAlign: 'center' },
  hint: { fontFamily: F.semi, fontSize: 15, color: C.ink, textAlign: 'center' },
});
