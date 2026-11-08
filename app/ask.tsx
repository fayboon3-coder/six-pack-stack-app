import React, { useEffect, useRef, useState } from 'react';
import { Animated, Image, KeyboardAvoidingView, Linking, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, usePathname, useRouter } from 'expo-router';
import Svg, { Path } from 'react-native-svg';
import { useAuth } from '../src/lib/auth';
import { C, F } from '../src/lib/theme';
import Backdrop from '../src/components/Backdrop';
import { BackIcon } from '../src/components/icons';
import { twoTone } from '../src/components/TwoTone';
import { WHATSAPP } from '../src/components/NoPlan';
import { track } from '../src/lib/track';
import { AI_CONSENT_KEY as CONSENT, AI_CONSENT_TEXT, ask, ChatMsg, loadHistory, questionsLeft, STARTERS } from '../src/lib/askboon';
import * as ImagePicker from 'expo-image-picker';
import { prepImage } from '../src/lib/scan';
import { isCoached, isFree } from '../src/lib/access';
import { showCoaching } from '../src/components/Coach';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { PRIVACY_URL } from '../src/lib/access';
import { goBack } from '../src/lib/nav';


const FACE = require('../assets/logo-b.png');

/** Stack: the Six-Pack Stack AI, a chat trained on Boon's method, this person's plan and his product verdicts. */
/** Sample conversation for App Store screenshots (only with EXPO_PUBLIC_DEMO_CHAT=1, never in real builds). */
const DEMO_CHAT: ChatMsg[] = [
  { id: 'q1', role: 'user', content: 'Going out Saturday. Can I still drink on this plan?' },
  { id: 'a1', role: 'assistant', content: "Yes. Pick drinks or a big meal, not both.\n\nStick to **2–3 light beers or vodka sodas** (about 100–150 calories each), eat protein before you go out, and skip the late-night food. Sunday is a normal day, no \"starting over.\"" },
  { id: 'q2', role: 'user', content: 'Should I buy a fat burner to speed it up?' },
  { id: 'a2', role: 'assistant', content: "Save your money. Most fat burners are **caffeine with a markup**. A coffee before your workout does the same job for about $0.30.\n\nYour deficit is what's burning fat. You're already down 7 lbs in 4 weeks." },
];

export default function Ask() {
  const { q } = useLocalSearchParams<{ q?: string }>();
  const { session, profile, plan, viewAs, isCoachAccount } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [msgs, setMsgs] = useState<ChatMsg[]>([]);
  const [text, setText] = useState(q ? String(q) : '');
  const [thinking, setThinking] = useState(false);
  const [left, setLeft] = useState<number | null>(null);
  const [blocked, setBlocked] = useState<null | 'limit' | 'not_live'>(null);
  const [photo, setPhoto] = useState<string | null>(null);
  const attach = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.7 });
    if (!res.canceled && res.assets[0]) { setPhoto(res.assets[0].uri); track('ask_photo_attach'); }
  };
  const snap = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) return attach();
    const res = await ImagePicker.launchCameraAsync({ quality: 0.7 });
    if (!res.canceled && res.assets[0]) { setPhoto(res.assets[0].uri); track('ask_photo_attach'); }
  };
  const scroll = useRef<any>(null);
  // Apple 5.1.2(i): say plainly what goes to the AI provider and get a yes before the first question.
  const [consent, setConsent] = useState<boolean | null>(null);
  useEffect(() => { AsyncStorage.getItem(CONSENT).then((v) => setConsent(v === 'yes' || process.env.EXPO_PUBLIC_DEMO_CHAT === '1')).catch(() => setConsent(false)); }, []);
  const agree = async () => { setConsent(true); track('ai_consent'); try { await AsyncStorage.setItem(CONSENT, 'yes'); } catch {} };
  const free = isFree(profile);
  const name = plan?.name || profile?.first_name || '';
  const tier = profile?.tier || 'free';

  useEffect(() => {
    if (process.env.EXPO_PUBLIC_DEMO_CHAT === '1') { setMsgs(DEMO_CHAT); return; } // store screenshots only
    if (!session) return;
    loadHistory(session.user.id).then(setMsgs);
    questionsLeft(session.user.id, tier, isCoachAccount && !viewAs).then((n) => { setLeft(n); if (n === 0) setBlocked('limit'); });
  }, [session, tier]);

  useEffect(() => { setTimeout(() => scroll.current?.scrollToEnd({ animated: true }), 60); }, [msgs.length, thinking]);

  const send = async (raw?: string) => {
    const question = (raw ?? text).trim();
    const pic = raw ? null : photo;
    if ((!question && !pic) || thinking || blocked) return;
    if (!consent) { setText(question); return; }
    setText(''); setPhoto(null);
    setMsgs((m) => [...m, { id: 'u' + Date.now(), role: 'user', content: question || 'What do you think of this?', photo: pic || undefined } as any]);
    setThinking(true);
    track('ask_sent', { photo: !!pic });
    const img = pic ? await prepImage(pic) : null;
    const r = await ask(question || 'What do you think of this?', viewAs ? { plan, tier } : undefined, img || undefined);
    setThinking(false);
    if (r.ok) {
      setMsgs((m) => [...m, { id: 'a' + Date.now(), role: 'assistant', content: r.answer },
        ...(pic && !r.sawImage ? [{ id: 'n' + Date.now(), role: 'assistant' as const, content: 'Heads up: photo questions switch on with the next update, so I only saw your text this time.' }] : [])]);
      if (r.left !== null) { setLeft(r.left); if (r.left === 0) setBlocked('limit'); }
      return;
    }
    if (r.reason === 'limit') { setLeft(0); setBlocked('limit'); }
    if (r.reason === 'not_live') setBlocked('not_live');
    const note = r.reason === 'offline' ? "I couldn't reach the server. Check your signal and send it again."
      : r.reason === 'busy' ? "I'm a little slammed right now. Give it a few seconds and send it again."
      : r.reason === 'signed_out' ? 'Sign in again and ask me that one more time.'
      : null;
    if (note) { setMsgs((m) => [...m, { id: 'e' + Date.now(), role: 'assistant', content: note }]); setText(question); }
    else setMsgs((m) => m.slice(0, -1));
  };

  const inTab = pathname === '/stack';
  const empty = msgs.length === 0;

  return (
    <SafeAreaView edges={inTab ? ['top'] : ['top', 'bottom']} style={{ flex: 1, backgroundColor: C.bg, paddingBottom: inTab ? 96 : 0 }}>
      <Backdrop />
      <View style={st.top}>
        {!inTab && <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={() => goBack(router, '/stack')} hitSlop={12} style={st.back}><BackIcon /></Pressable>}
        <Image source={FACE} style={st.avatar} />
        <View style={{ flex: 1 }}>
          <Text style={st.topT}>Stack</Text>
          <Text style={st.topS}>Your AI coach, trained on Boon's plans. No sponsors.</Text>
        </View>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView ref={scroll} contentContainerStyle={st.list} keyboardShouldPersistTaps="handled">
          <Bubble role="assistant" content={`Hey${name ? ' ' + name : ''}. Ask me anything about your plan, food, training or a supplement you saw online. I know your numbers, so I'll answer for you, not for everyone.`} />
          {msgs.map((m) => <Bubble key={m.id} role={m.role} content={m.content} photo={(m as any).photo} />)}
          {thinking && <Typing />}

          {blocked === 'limit' && (
            <View style={st.wall}>
              <Text style={st.wallT}>{free ? "That's your 5 free questions for today." : "That's today's questions."}</Text>
              <Text style={st.wallB}>{free
                ? 'They come back tomorrow. With The Full Stack you get 40 a day, plus all 12 weeks of your plan.'
                : 'They come back tomorrow.' + (isCoached(profile) ? ' Need me before then? Text me on WhatsApp.' : '')}</Text>
              {free && <Pressable accessibilityRole="button" onPress={() => router.push('/unlock')} style={st.wallBtn}><Text style={st.wallBtnT}>See The Full Stack</Text></Pressable>}
              {isCoached(profile) && <Pressable accessibilityRole="button" onPress={() => Linking.openURL(`https://wa.me/${WHATSAPP}`)} style={st.wallBtn}><Text style={st.wallBtnT}>Text Boon on WhatsApp</Text></Pressable>}
            </View>
          )}
          {blocked === 'not_live' && (
            <View style={st.wall}>
              <Text style={st.wallT}>Stack is almost ready.</Text>
              <Text style={st.wallB}>It switches on as soon as the AI key is added on the server.</Text>
            </View>
          )}
        </ScrollView>

        {consent === false && (
          <View style={st.consent} accessibilityLiveRegion="polite">
            <Text style={st.consentT}>Before you ask</Text>
            <Text style={st.consentB}>{AI_CONSENT_TEXT}</Text>
            <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
              <Pressable accessibilityRole="button" onPress={agree} style={st.consentBtn}><Text style={st.consentBtnT}>OK, turn on Stack</Text></Pressable>
              <Text accessibilityRole="link" onPress={() => Linking.openURL(PRIVACY_URL)} style={st.consentLink}>Privacy policy</Text>
            </View>
          </View>
        )}
        <View style={st.bar}>
          {!blocked && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={st.starters}>
              {showCoaching(profile) && (
                <Pressable accessibilityRole="button" onPress={() => { track('coaching_tap', { where: 'stack_chat' }); router.push('/coaching'); }} style={[st.chip, { backgroundColor: C.navy, borderColor: C.navy }]}>
                  <Text style={[st.chipT, { color: '#ffffff' }]}>1:1 coaching with Boon</Text>
                </Pressable>
              )}
              {STARTERS.map((s) => (
                <Pressable key={s} accessibilityRole="button" onPress={() => send(s)} disabled={thinking} style={st.chip}><Text style={st.chipT}>{s}</Text></Pressable>
              ))}
            </ScrollView>
          )}
          {!!photo && (
            <View style={st.attached}>
              <Image source={{ uri: photo }} style={st.attachedImg} />
              <Text style={st.attachedT}>Photo attached. Ask anything about it, or just send.</Text>
              <Pressable accessibilityRole="button" accessibilityLabel="Remove photo" onPress={() => setPhoto(null)} hitSlop={8} style={st.attachedX}>
                <Svg width={12} height={12} viewBox="0 0 24 24"><Path d="M6 6l12 12M18 6L6 18" stroke={C.ink} strokeWidth={3} strokeLinecap="round" /></Svg>
              </Pressable>
            </View>
          )}
          <View style={st.inputRow}>
            <Pressable accessibilityRole="button" accessibilityLabel="Add a photo" onPress={Platform.OS === 'web' ? attach : snap} onLongPress={attach} disabled={!!blocked} hitSlop={4} style={[st.cam, !!blocked && { opacity: 0.4 }]}>
              <Svg width={20} height={20} viewBox="0 0 24 24"><Path d="M3 9a2 2 0 0 1 2-2h2l2-3h6l2 3h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" stroke={C.ink} strokeWidth={2} fill="none" strokeLinejoin="round" /><Path d="M12 10.5a3 3 0 1 0 0 6 3 3 0 0 0 0-6z" stroke={C.ink} strokeWidth={2} fill="none" /></Svg>
            </Pressable>
            <TextInput value={text} onChangeText={setText} placeholder={blocked ? 'Back tomorrow' : photo ? 'Ask about this photo' : 'Ask, or snap a meal, label or menu'} placeholderTextColor={C.muted}
              style={st.input} multiline maxLength={1500} editable={!blocked} onSubmitEditing={() => send()} blurOnSubmit={false}
              accessibilityLabel="Your question" />
            <Pressable accessibilityRole="button" accessibilityLabel="Send" onPress={() => send()} disabled={(!text.trim() && !photo) || thinking || !!blocked}
              style={[st.send, ((!text.trim() && !photo) || thinking || !!blocked) && { opacity: 0.4 }]}>
              <Svg width={18} height={18} viewBox="0 0 24 24"><Path d="M12 19V5M6 11l6-6 6 6" stroke="#fff" strokeWidth={2.6} fill="none" strokeLinecap="round" strokeLinejoin="round" /></Svg>
            </Pressable>
          </View>
          <Text style={st.fine}>
            {left !== null && !blocked ? `${left} question${left === 1 ? '' : 's'} left today · ` : ''}AI can get things wrong. Not medical advice.
          </Text>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

/** Renders **bold** inside a message. */
function Rich({ text, style }: { text: string; style: any }) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return (
    <Text style={style}>
      {parts.map((p, i) => (p.startsWith('**') && p.endsWith('**') ? <Text key={i} style={{ fontFamily: F.black }}>{p.slice(2, -2)}</Text> : p))}
    </Text>
  );
}

function Bubble({ role, content, photo }: { role: 'user' | 'assistant'; content: string; photo?: string }) {
  const me = role === 'user';
  const saved = content.startsWith('[Photo] ');
  return (
    <View style={[st.row, me && { justifyContent: 'flex-end' }]}>
      <View style={[st.bubble, me ? st.me : st.ai]}>
        {!!photo && <Image source={{ uri: photo }} style={st.msgImg} accessibilityLabel="Your photo" />}
        {saved && !photo && <Text style={st.photoTag}>PHOTO</Text>}
        <Rich text={saved ? content.slice(8) : content} style={[st.msg, me && { color: '#ffffff' }]} />
      </View>
    </View>
  );
}

function Typing() {
  const dots = [useRef(new Animated.Value(0.3)).current, useRef(new Animated.Value(0.3)).current, useRef(new Animated.Value(0.3)).current];
  useEffect(() => {
    const loops = dots.map((d, i) => Animated.loop(Animated.sequence([
      Animated.delay(i * 160),
      Animated.timing(d, { toValue: 1, duration: 320, useNativeDriver: true }),
      Animated.timing(d, { toValue: 0.3, duration: 320, useNativeDriver: true }),
      Animated.delay((2 - i) * 160),
    ])));
    loops.forEach((l) => l.start());
    return () => loops.forEach((l) => l.stop());
  }, []);
  return (
    <View style={st.row} accessibilityLabel="Stack is typing">
      <View style={[st.bubble, st.ai, { flexDirection: 'row', gap: 6, paddingVertical: 16 }]}>
        {dots.map((d, i) => <Animated.View key={i} style={[st.dot, { opacity: d, transform: [{ scale: d }] }]} />)}
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  consent: { marginHorizontal: 16, marginBottom: 8, padding: 16, borderRadius: 18, backgroundColor: C.card, borderWidth: 1, borderColor: C.line, gap: 10 },
  consentT: { fontFamily: F.xbold, fontSize: 16, color: C.ink },
  consentB: { fontFamily: F.medium, fontSize: 14, lineHeight: 20, color: C.ink },
  consentBtn: { height: 44, paddingHorizontal: 18, borderRadius: 22, backgroundColor: C.navy, alignItems: 'center', justifyContent: 'center' },
  consentBtnT: { fontFamily: F.bold, fontSize: 15, color: '#ffffff' },
  consentLink: { fontFamily: F.semi, fontSize: 14, color: C.ink, textDecorationLine: 'underline' },
  top: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: '#e6e8ef' },
  back: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  avatar: { width: 42, height: 42, borderRadius: 11 },
  topT: { fontFamily: F.black, fontSize: 26, letterSpacing: -0.5, color: C.ink },
  topS: { fontFamily: F.medium, fontSize: 13, color: C.ink, marginTop: 1 },
  list: { paddingHorizontal: 16, paddingTop: 16, gap: 12, paddingBottom: 16 },
  row: { flexDirection: 'row', alignItems: 'flex-end' },
  mini: { width: 26, height: 26, borderRadius: 7 },
  bubble: { maxWidth: '92%', borderRadius: 18, paddingHorizontal: 16, paddingVertical: 13 },
  ai: { backgroundColor: C.card, borderWidth: 1, borderColor: C.line },
  me: { backgroundColor: C.navy, maxWidth: '84%' },
  msg: { fontFamily: F.medium, fontSize: 15, lineHeight: 23, color: C.ink },
  starters: { gap: 8, paddingBottom: 10 },
  chip: { borderWidth: 1, borderColor: '#d5d9e3', borderRadius: 999, paddingHorizontal: 14, height: 38, justifyContent: 'center', backgroundColor: C.bg },
  chipT: { fontFamily: F.semi, fontSize: 14, color: C.ink },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: C.ink },
  wall: { backgroundColor: C.card, borderWidth: 1.5, borderColor: C.red, borderRadius: 18, padding: 16, gap: 8, marginTop: 4 },
  wallT: { fontFamily: F.black, fontSize: 16, color: C.ink },
  wallB: { fontFamily: F.semi, fontSize: 14, lineHeight: 20, color: 'rgba(27,36,64,0.8)' },
  wallBtn: { backgroundColor: C.red, borderRadius: 14, paddingVertical: 13, alignItems: 'center', marginTop: 6 },
  wallBtnT: { fontFamily: F.bold, fontSize: 16, color: C.onAccent },
  bar: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 6, backgroundColor: C.bg },
  inputRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, borderRadius: 26, backgroundColor: C.card, borderWidth: 1, borderColor: C.line, paddingLeft: 6, paddingRight: 5, paddingVertical: 5 },
  input: { flex: 1, minHeight: 42, maxHeight: 120, color: C.ink, fontFamily: F.medium, fontSize: 15, paddingHorizontal: 14, paddingTop: 11, paddingBottom: 11, outlineWidth: 0 } as any,
  send: { width: 42, height: 42, borderRadius: 21, backgroundColor: C.navy, alignItems: 'center', justifyContent: 'center' },
  fine: { fontFamily: F.medium, fontSize: 11, color: C.muted, textAlign: 'center', marginTop: 6 },
  cam: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', backgroundColor: C.bg, borderWidth: 1, borderColor: C.line },
  attached: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 8, marginBottom: 8, borderRadius: 16, backgroundColor: C.card, borderWidth: 1, borderColor: C.line },
  attachedImg: { width: 44, height: 44, borderRadius: 10 },
  attachedT: { flex: 1, fontFamily: F.semi, fontSize: 13, color: C.ink },
  attachedX: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#e8eaf0', alignItems: 'center', justifyContent: 'center' },
  msgImg: { width: 200, height: 200, borderRadius: 12, marginBottom: 8 },
  photoTag: { fontFamily: F.bold, fontSize: 10, letterSpacing: 1, color: 'rgba(255,255,255,0.7)', marginBottom: 4 },
});
