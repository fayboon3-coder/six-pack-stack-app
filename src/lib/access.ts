import type { Profile } from './types';

/** The Free Stack: weeks 1–2 open, weeks 3–12 need the subscription (or coaching). */
export const FREE_WEEKS = 2;
export const isFree = (p?: Profile | null) => !!p && p.role === 'client' && p.tier === 'free';
/** 1:1 coaching client: Boon reads their check-ins and answers on WhatsApp. */
export const isCoached = (p?: Profile | null) => !!p && p.role === 'client' && p.tier === 'coached';
/** The Full Stack subscriber: everything unlocked, on their own (no Boon reviews). */
export const isSubscriber = (p?: Profile | null) => !!p && p.role === 'client' && p.tier === 'self';
export const isLocked = (p: Profile | null | undefined, week: number) => isFree(p) && week > FREE_WEEKS;

export const TERMS_URL = 'https://six-pack-stack.vercel.app/terms';
export const PRIVACY_URL = 'https://six-pack-stack.vercel.app/privacy';
/** The free 60-second Stack Score (website lead magnet: Kit report email, then Nurture). */
export const STACK_SCORE_URL = 'https://six-pack-stack.vercel.app/stack-score?src=app';
export const BTL_URL = 'https://boon-fay.kit.com/a9cb0690c3';
/** Six-Pack Stack 1:1 coaching landing page (its Apply button goes to the same application form). */
export const COACHING_URL = 'https://six-pack-stack.vercel.app/?src=app';

/** Who should see coaching first (they told the quiz they're ready now). */
export function coachingFirst(p?: Profile | null) {
  const q = p?.quiz || {};
  return ['Today', 'This week'].includes(q.start_timing) && ['Yes', 'Yes, with a payment plan'].includes(q.ready_to_invest);
}
