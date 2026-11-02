/**
 * Coach-only "View the app as" mode. While it's on, the coach sees the app exactly
 * as a free user, a Full 12-Week Program subscriber or a coaching client would,
 * with a sample plan. Nothing is saved: workout sets and check-ins are skipped.
 */
export type ViewAs = 'free' | 'self' | 'coached';

export const VIEW_AS_LABEL: Record<ViewAs, string> = {
  free: 'Free plan user',
  self: 'Full 12-Week Program',
  coached: 'Coaching client',
};

let on = false;
export const setPreviewing = (v: boolean) => { on = v; };
export const isPreviewing = () => on;
