/**
 * Funnel events (see supabase/006_events.sql). Fire-and-forget: tracking never
 * blocks or breaks the app. Each phone/browser gets an anonymous id so a person
 * can be followed from first open to purchase, signed in or not.
 */
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';

const KEY = 'sps:anon';
let anon: string | null = null;
const sent = new Set<string>();

async function anonId() {
  if (anon) return anon;
  try { anon = await AsyncStorage.getItem(KEY); } catch { /* storage off */ }
  if (!anon) {
    anon = Math.random().toString(36).slice(2) + Date.now().toString(36);
    AsyncStorage.setItem(KEY, anon).catch(() => {});
  }
  return anon;
}

/** Log one event. `once` = only the first time per app session (e.g. screen views). */
export function track(name: string, props: Record<string, string | number | boolean | null | undefined> = {}, opts: { once?: boolean } = {}) {
  if (process.env.EXPO_PUBLIC_DEMO) return; // design previews and screenshots
  const key = name + JSON.stringify(props);
  if (opts.once && sent.has(key)) return;
  sent.add(key);
  (async () => {
    try {
      const [id, { data }] = await Promise.all([anonId(), supabase.auth.getSession()]);
      const clean = Object.fromEntries(Object.entries(props).filter(([, v]) => v !== undefined));
      await supabase.from('events').insert({ anon_id: id, user_id: data.session?.user.id ?? null, name, props: clean, platform: Platform.OS });
    } catch { /* never let tracking break anything */ }
  })();
}
