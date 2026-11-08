import type { ImageSourcePropType } from 'react-native';
import { THUMBS } from './thumbs';
import type { Muscle } from './workoutMeta';

/** A real gym photo for a day's main muscle (bundled, so it shows instantly and offline). */
const HERO: Partial<Record<Muscle, string>> = {
  Chest: 'rT7DgCr-3pg', Back: 'KE2A7G_nDc8', Shoulders: 'Anu8s_nkNpM', Quads: 'nfX7IFK9UNI', Glutes: 'hQgFixeXdZo',
  Hamstrings: 'hQgFixeXdZo', Biceps: '93R8V6uvwHc', Triceps: 'O7e8j8K3cJo', Calves: 'Q2k3kYbtOcl', Abs: 'mwlp75MS6Rg',
};
export function heroPhoto(m: Muscle | undefined, equip?: string): ImageSourcePropType {
  if (equip === 'bw' && (m === 'Chest' || m === 'Triceps')) return THUMBS['rG-rAMxA9Lo'];
  if (equip === 'db' && m === 'Chest') return THUMBS['5Y3VZsLb1Ys'];
  if (equip !== 'gym' && m === 'Back') return THUMBS['vbechsUCn24'];
  return THUMBS[(m && HERO[m]) || 'rT7DgCr-3pg'];
}
