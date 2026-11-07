import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { supabase } from './supabase';
import { isPreviewing } from './preview';

/**
 * Push notifications from Boon (on top of the reminders the phone schedules itself).
 * Saves this phone's Expo push token on the profile so the coach screen can send a nudge.
 * Quiet if notifications are off or the database column isn't there yet.
 */
export async function registerPush() {
  if (Platform.OS === 'web' || isPreviewing()) return null;
  try {
    if (!(await Notifications.getPermissionsAsync()).granted) return null;
    const projectId = (Constants as any).easConfig?.projectId || (Constants.expoConfig as any)?.extra?.eas?.projectId;
    if (!projectId) return null;
    const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
    const { data } = await supabase.auth.getSession();
    const uid = data.session?.user.id;
    if (uid && token) await supabase.from('profiles').update({ push_token: token }).eq('id', uid);
    return token;
  } catch { return null; }
}

/** Coach only: send one push to a client's phone through Expo's push service. */
export async function sendPush(token: string, title: string, body: string) {
  try {
    const r = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ to: token, title, body, sound: 'default' }),
    });
    const j = await r.json().catch(() => ({}));
    return r.ok && j?.data?.status !== 'error';
  } catch { return false; }
}
