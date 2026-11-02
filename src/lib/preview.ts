/**
 * Coach-only "View the app as" mode. While it's on, the coach sees the app exactly
 * as a Free Stack user, a Full Stack subscriber or a coaching client would,
 * with a sample plan. Nothing is saved: workout sets and check-ins are skipped.
 */
export type ViewAs = 'free' | 'self' | 'coached';

export const VIEW_AS_LABEL: Record<ViewAs, string> = {
  free: 'The Free Stack',
  self: 'The Full Stack',
  coached: 'Coaching client',
};

let on = false;
export const setPreviewing = (v: boolean) => { on = v; };
export const isPreviewing = () => on;
