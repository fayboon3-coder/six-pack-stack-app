/**
 * Back that never dead-ends: pages opened straight from an email, the website or a notification
 * have no history, so go to a sensible screen instead of doing nothing.
 */
type Nav = { canGoBack: () => boolean; back: () => void; replace: (href: any) => void };
export function goBack(router: Nav, fallback: string = '/') {
  if (router.canGoBack()) router.back();
  else router.replace(fallback);
}
