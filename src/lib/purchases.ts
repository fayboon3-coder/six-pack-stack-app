/**
 * The Full Stack subscription (yearly $99 with a 7-day free trial, monthly $19.99),
 * sold through Apple in-app purchase via RevenueCat.
 *
 * Switches on when the RevenueCat public iOS key is set (EXPO_PUBLIC_RC_IOS_KEY).
 * Until then the paywall shows "Opens with the App Store launch".
 *
 * After a purchase or restore, the app asks the `subscription` server function to
 * check RevenueCat and set this account to The Full Stack (tier "self"). RevenueCat's
 * webhook calls the same function for renewals, cancellations and expiries.
 */
import { Platform } from 'react-native';
import { supabase, SUPABASE_URL, SUPABASE_KEY } from './supabase';

export const ENTITLEMENT = 'full_stack';
export const FALLBACK_PRICES = { yearly: '$99', monthly: '$19.99' };
/** The free trial on each plan (web products and the App Store intro offers are set up to match). */
export const FALLBACK_TRIALS: Record<'yearly' | 'monthly', string> = { yearly: '7 days', monthly: '2 weeks' };

const IOS_KEY = process.env.EXPO_PUBLIC_RC_IOS_KEY || '';
const ANDROID_KEY = process.env.EXPO_PUBLIC_RC_ANDROID_KEY || '';
const KEY = Platform.OS === 'ios' ? IOS_KEY : Platform.OS === 'android' ? ANDROID_KEY : '';

/** True when this build can sell the subscription through the App Store / Play Store. */
export const purchasesEnabled = () => !!KEY;

/**
 * On the web the subscription is sold through RevenueCat Billing (Stripe): a hosted
 * checkout page where the person picks yearly (7-day free trial) or monthly. The
 * purchase is tied to their account ID, so the same "full_stack" entitlement unlocks
 * the app everywhere. After paying, RevenueCat sends them back to /app?purchased=1.
 */
const WEB_CHECKOUT = 'https://pay.rev.cat/utmodkowwofcuown/';
export const webCheckoutEnabled = () => Platform.OS === 'web';
/** plan: goes straight to that plan's checkout (RevenueCat package_id), skipping the plan list. */
export function webCheckoutUrl(userId: string, email?: string | null, plan?: 'yearly' | 'monthly') {
  const q = new URLSearchParams();
  if (email) q.set('email', email);
  if (plan) q.set('package_id', plan === 'yearly' ? '$rc_annual' : '$rc_monthly');
  const qs = q.toString();
  return `${WEB_CHECKOUT}${encodeURIComponent(userId)}${qs ? `?${qs}` : ''}`;
}
export const PURCHASED_FLAG = 'purchased';

let Purchases: any = null;
let configuredFor: string | null = null;

function lib() {
  if (!Purchases) Purchases = require('react-native-purchases').default;
  return Purchases;
}

/** Call once the person is signed in. Their RevenueCat ID is their account ID. */
export async function setupPurchases(userId: string) {
  if (!purchasesEnabled() || !userId || userId === 'demo') return;
  const P = lib();
  if (!configuredFor) {
    P.configure({ apiKey: KEY, appUserID: userId });
    configuredFor = userId;
  } else if (configuredFor !== userId) {
    await P.logIn(userId);
    configuredFor = userId;
  }
}

/** trial: e.g. "7 days" or "2 weeks"; empty when the store has no free trial on this product. */
export type Offer = { id: 'yearly' | 'monthly'; price: string; trial: string; pkg: any | null };

/** "7 days" / "2 weeks" / "1 month" from the store's free intro offer, or '' if there isn't one. */
function trialText(product: any): string {
  const ip = product?.introPrice;
  if (!ip || ip.price !== 0) return '';
  const n = ip.periodNumberOfUnits || ip.cycles || 1;
  const unit = String(ip.periodUnit || '').toUpperCase();
  const word = unit.startsWith('DAY') ? 'day' : unit.startsWith('WEEK') ? 'week' : unit.startsWith('MONTH') ? 'month' : unit.startsWith('YEAR') ? 'year' : '';
  if (!word) return '';
  if (word === 'week' && n === 1) return '7 days';
  return `${n} ${word}${n === 1 ? '' : 's'}`;
}

/** The two options with the store's real local prices (falls back to US prices). */
export async function getOffers(): Promise<Record<'yearly' | 'monthly', Offer>> {
  const base = {
    yearly: { id: 'yearly' as const, price: FALLBACK_PRICES.yearly, trial: FALLBACK_TRIALS.yearly, pkg: null },
    monthly: { id: 'monthly' as const, price: FALLBACK_PRICES.monthly, trial: FALLBACK_TRIALS.monthly, pkg: null },
  };
  if (!purchasesEnabled() || !configuredFor) return base;
  try {
    const o = await lib().getOfferings();
    const cur = o.current;
    if (cur?.annual) base.yearly = { id: 'yearly', price: cur.annual.product.priceString, trial: trialText(cur.annual.product), pkg: cur.annual };
    if (cur?.monthly) base.monthly = { id: 'monthly', price: cur.monthly.product.priceString, trial: trialText(cur.monthly.product), pkg: cur.monthly };
  } catch { /* keep fallback prices */ }
  return base;
}

const active = (info: any) => !!info?.entitlements?.active?.[ENTITLEMENT];

/** Tell the server to re-check RevenueCat and update this account's tier. */
export async function syncSubscription(): Promise<boolean> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return false;
  try {
    const r = await fetch(`${SUPABASE_URL}/functions/v1/subscription`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: SUPABASE_KEY, Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({ sync: true }),
    });
    const j = await r.json().catch(() => ({}));
    return !!j.active;
  } catch { return false; }
}

export type BuyResult = { ok: true } | { ok: false; reason: 'cancelled' | 'unavailable' | 'failed'; message?: string };

export async function buy(offer: Offer): Promise<BuyResult> {
  if (!offer.pkg) return { ok: false, reason: 'unavailable' };
  try {
    const { customerInfo } = await lib().purchasePackage(offer.pkg);
    if (!active(customerInfo)) return { ok: false, reason: 'failed' };
    await syncSubscription();
    return { ok: true };
  } catch (e: any) {
    if (e?.userCancelled) return { ok: false, reason: 'cancelled' };
    return { ok: false, reason: 'failed', message: e?.message };
  }
}

/** Apple requires a Restore Purchases button. True if an active subscription was found. */
export async function restore(): Promise<boolean> {
  if (!purchasesEnabled() || !configuredFor) return false;
  try {
    const info = await lib().restorePurchases();
    if (!active(info)) return false;
    await syncSubscription();
    return true;
  } catch { return false; }
}

/**
 * Back from the web checkout: RevenueCat can take a few seconds to record the purchase,
 * so ask the server a few times. True once the subscription shows as active.
 */
export async function confirmWebPurchase(tries = 6): Promise<boolean> {
  for (let i = 0; i < tries; i++) {
    if (await syncSubscription()) return true;
    await new Promise((r) => setTimeout(r, 2500));
  }
  return false;
}

/** Where people manage or cancel (Apple's own subscriptions page). */
export const MANAGE_URL = Platform.OS === 'android'
  ? 'https://play.google.com/store/account/subscriptions'
  : 'https://apps.apple.com/account/subscriptions';

/** Set once the free user has seen the 7-day trial offer after their plan was built. */
export const TRIAL_SEEN = 'sps:trial-offer-seen';
