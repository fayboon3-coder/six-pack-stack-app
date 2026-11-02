import AsyncStorage from '@react-native-async-storage/async-storage';
import { KIT_FORMS, kitForm, kitTag } from './kit';

export type Want = 'plan' | 'btl' | 'sub' | 'coaching';
export type Lead = { first_name: string; email: string; want: Want; src?: string };
const KEY = 'sps:lead';

export const readLead = async (): Promise<Lead | null> => {
  try { const s = await AsyncStorage.getItem(KEY); return s ? JSON.parse(s) : null; } catch { return null; }
};

/**
 * Someone picked a path on the welcome screen and gave their email.
 * They join the Fad Free list (Boon's existing welcome + nurture emails, which sell
 * Beyond the Label and coaching) and get tagged with what they picked.
 */
export async function captureLead(l: Lead) {
  await AsyncStorage.setItem(KEY, JSON.stringify(l));
  const source = l.src ? `app:${l.src}` : 'app';
  await kitForm(KIT_FORMS.guide, l.email, l.first_name, { lead_source: source, app_tier: 'lead' });
  await kitTag(l.email, l.first_name, ['app-lead', 'src-app', `app-want-${l.want}`], { lead_source: source });
}
