import type { ImageSourcePropType } from 'react-native';
import { supabase } from './supabase';
import { isPreviewing } from './preview';
import { weekOf } from './program';

/** Progress photos: every photo they've taken (check-ins and any-day photos), newest last, with signed links. */
export type Angle = 'front' | 'side' | 'back';
export type ProgressPhoto = { id: string; angle: Angle; src: ImageSourcePropType; date: string; week: number };

const DEMO = process.env.EXPO_PUBLIC_DEMO === '1';
const SEED = DEMO && process.env.EXPO_PUBLIC_DEMO_FRESH !== '1'; // design previews: FRESH shows a brand-new account
/** Design previews only: Boon's own before/after (never in real builds). */
function demoPhotos(start?: string): ProgressPhoto[] {
  const before = require('../../assets/demo/before.jpg'), after = require('../../assets/demo/after.jpg');
  const d0 = start ? new Date(start + 'T12:00:00') : new Date(Date.now() - 35 * 864e5);
  const at = (days: number) => { const d = new Date(d0); d.setDate(d.getDate() + days); return d.toISOString().slice(0, 10); };
  return [
    { id: 'd1', angle: 'front', src: before, date: at(0), week: 1 },
    { id: 'd2', angle: 'front', src: before, date: at(14), week: 3 },
    { id: 'd3', angle: 'front', src: after, date: at(28), week: 5 },
  ];
}

export async function listPhotos(userId: string, start?: string): Promise<ProgressPhoto[]> {
  if (DEMO) return SEED ? demoPhotos(start) : [];
  try {
    const { data } = await supabase.from('photos').select('id,angle,path,created_at').eq('user_id', userId).order('created_at', { ascending: true }).limit(200);
    const rows = (data as { id: string; angle: Angle; path: string; created_at: string }[]) || [];
    if (!rows.length) return [];
    const { data: signed } = await supabase.storage.from('progress-photos').createSignedUrls(rows.map((r) => r.path), 3600);
    return rows.map((r, k) => {
      const url = signed?.[k]?.signedUrl; if (!url) return null;
      const date = r.created_at.slice(0, 10);
      return { id: r.id, angle: r.angle || 'front', src: { uri: url }, date, week: weekOf(start, new Date(date + 'T12:00:00')) } as ProgressPhoto;
    }).filter(Boolean) as ProgressPhoto[];
  } catch { return []; }
}

/** Add a photo any day (not only with a check-in). Private: only them, and Boon for coaching clients. */
export async function addPhoto(userId: string, angle: Angle, uri: string, week: number) {
  if (isPreviewing() || DEMO) return false;
  try {
    const path = `${userId}/week${week}-${angle}-${Date.now()}.jpg`;
    const body = await (await fetch(uri)).arrayBuffer();
    const up = await supabase.storage.from('progress-photos').upload(path, body, { contentType: 'image/jpeg' });
    if (up.error) return false;
    const { error } = await supabase.from('photos').insert({ user_id: userId, angle, path });
    return !error;
  } catch { return false; }
}
