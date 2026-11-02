/**
 * Ask for an App Store rating right after a win (first check-in, a new personal
 * record), never more than once every 4 months, never on the web. Apple decides
 * whether the prompt actually shows; this only asks at good moments.
 */
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { track } from './track';

const KEY = 'sps:rating-asked';
const GAP_DAYS = 120;

export async function askForRatingAfterWin(reason: 'checkin' | 'pr') {
  if (Platform.OS === 'web' || process.env.EXPO_PUBLIC_DEMO) return;
  try {
    const last = Number(await AsyncStorage.getItem(KEY)) || 0;
    if (Date.now() - last < GAP_DAYS * 864e5) return;
    const StoreReview = require('expo-store-review');
    if (!(await StoreReview.isAvailableAsync()) || !(await StoreReview.hasAction())) return;
    await AsyncStorage.setItem(KEY, String(Date.now()));
    setTimeout(() => { StoreReview.requestReview().catch(() => {}); track('rating_asked', { reason }); }, 1500);
  } catch { /* never block the win screen */ }
}
