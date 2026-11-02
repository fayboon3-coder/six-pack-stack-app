import type { Profile } from './types';

/** Free plan: weeks 1–2 open, weeks 3–12 need the subscription (or coaching). */
export const FREE_WEEKS = 2;
export const isFree = (p?: Profile | null) => !!p && p.role === 'client' && p.tier === 'free';
export const isLocked = (p: Profile | null | undefined, week: number) => isFree(p) && week > FREE_WEEKS;

export const BTL_URL = 'https://boon-fay.kit.com/a9cb0690c3';

/** Who should see coaching first (they told the quiz they're ready now). */
export function coachingFirst(p?: Profile | null) {
  const q = p?.quiz || {};
  return ['Today', 'This week'].includes(q.start_timing) && ['Yes', 'Yes, with a payment plan'].includes(q.ready_to_invest);
}
