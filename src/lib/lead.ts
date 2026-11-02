import AsyncStorage from '@react-native-async-storage/async-storage';
import { kitTag } from './kit';

export type Want = 'plan' | 'btl' | 'sub' | 'coaching';
export type Lead = { first_name: string; email: string; want: Want; src?: string };
const KEY = 'sps:lead';

export const readLead = async (): Promise<Lead | null> => {
  try { const s = await AsyncStorage.getItem(KEY); return s ? JSON.parse(s) : null; } catch { return null; }
};

/**
 * Someone picked a path on the welcome screen and gave their email.
 * The app-lead tag starts Kit's "App Lead → Nurture (24) → Beyond the Label" automation:
 * the 24 coaching emails first, then the Beyond the Label emails.
 */
export async function captureLead(l: Lead) {
  await AsyncStorage.setItem(KEY, JSON.stringify(l));
  const source = l.src ? `app:${l.src}` : 'app';
  await kitTag(l.email, l.first_name, ['app-lead', 'src-app', `app-want-${l.want}`], { lead_source: source, app_tier: 'lead' });
}
