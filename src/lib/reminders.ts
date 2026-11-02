import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import type { Plan } from './types';

const KEY = 'sps:reminders';
export type ReminderPrefs = { on: boolean; hour: number; minute: number };
export const DEFAULT_PREFS: ReminderPrefs = { on: false, hour: 17, minute: 30 };

const DAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

Notifications.setNotificationHandler({
  handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: false, shouldSetBadge: false }) as any,
});

export async function readPrefs(): Promise<ReminderPrefs> {
  try { return { ...DEFAULT_PREFS, ...JSON.parse((await AsyncStorage.getItem(KEY)) || '{}') }; } catch { return DEFAULT_PREFS; }
}

/** Ask once; true if we may show reminders. */
export async function askPermission() {
  if (Platform.OS === 'web') return false;
  const cur = await Notifications.getPermissionsAsync();
  if (cur.granted) return true;
  const res = await Notifications.requestPermissionsAsync();
  return res.granted;
}

/** Re-create every reminder from the plan: each training day at their time, plus Sunday check-in at 9am. */
export async function applyReminders(plan: Plan | null, prefs: ReminderPrefs, opts: { free?: boolean } = {}) {
  await AsyncStorage.setItem(KEY, JSON.stringify(prefs));
  if (Platform.OS === 'web') return;
  await Notifications.cancelAllScheduledNotificationsAsync();
  if (!prefs.on || !plan) return;
  for (const d of plan.train.d) {
    const [dayName, type] = d.t.split('·').map((x) => x.trim());
    const weekday = DAYS.indexOf(dayName.toLowerCase()) + 1; // 1 = Sunday
    if (weekday < 1) continue;
    await Notifications.scheduleNotificationAsync({
      content: { title: `${type} day`, body: `${plan.name}, your ${type.toLowerCase()} workout is ready. Last time's numbers are waiting to be beaten.` },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.WEEKLY, weekday, hour: prefs.hour, minute: prefs.minute },
    });
  }
  await Notifications.scheduleNotificationAsync({
    content: { title: 'Sunday check-in', body: opts.free ? '2 minutes: log your weight and your week, and watch your trend move.' : '2 minutes: your numbers and your week. I review it within 24 hours.' },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.WEEKLY, weekday: 1, hour: 9, minute: 0 },
  });
}

export const timeLabel = (h: number, m: number) => `${((h + 11) % 12) + 1}:${String(m).padStart(2, '0')} ${h < 12 ? 'am' : 'pm'}`;
