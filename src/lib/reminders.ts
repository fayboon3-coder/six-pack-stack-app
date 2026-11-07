import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import type { Plan } from './types';

const KEY = 'sps:reminders';
const EVENING_ID = 'sps:checkin-evening';
const DONE_KEY = 'sps:checkin-done'; // the Sunday (YYYY-MM-DD) of the last week they checked in
const ASKED_KEY = 'sps:remind-asked';

/**
 * on = workout-day reminders. checkin = Sunday check-in reminders (9am, plus 6pm if not done).
 * weigh = morning weigh-in (feeds the trend weight). protein = evening protein check (skipped once the goal is hit).
 */
export type ReminderPrefs = { on: boolean; hour: number; minute: number; checkin: boolean; weigh?: boolean; weighHour?: number; protein?: boolean; proteinHour?: number };
export const DEFAULT_PREFS: ReminderPrefs = { on: false, hour: 17, minute: 30, checkin: true, weigh: false, weighHour: 7, protein: false, proteinHour: 19 };
const PROTEIN_ID = (d: string) => 'sps:protein:' + d;
const PROTEIN_HIT = 'sps:protein-hit';

const DAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

if (Platform.OS !== 'web') {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: false, shouldSetBadge: false }) as any,
  });
}

export async function readPrefs(): Promise<ReminderPrefs> {
  try { return { ...DEFAULT_PREFS, ...JSON.parse((await AsyncStorage.getItem(KEY)) || '{}') }; } catch { return DEFAULT_PREFS; }
}

export async function hasPermission() {
  if (Platform.OS === 'web') return false;
  return (await Notifications.getPermissionsAsync()).granted;
}

/** Ask once; true if we may show reminders. */
export async function askPermission() {
  if (Platform.OS === 'web') return false;
  const cur = await Notifications.getPermissionsAsync();
  if (cur.granted) return true;
  const res = await Notifications.requestPermissionsAsync();
  return res.granted;
}

/** Next Sunday at the given time (today counts if it's Sunday and the time hasn't passed). */
function nextSunday(hour: number, minute = 0, now = new Date()) {
  const d = new Date(now);
  d.setHours(hour, minute, 0, 0);
  d.setDate(d.getDate() + ((7 - d.getDay()) % 7));
  if (d <= now) d.setDate(d.getDate() + 7);
  return d;
}
const sundayOf = (d = new Date()) => {
  const s = new Date(d); s.setDate(s.getDate() - s.getDay());
  return `${s.getFullYear()}-${String(s.getMonth() + 1).padStart(2, '0')}-${String(s.getDate()).padStart(2, '0')}`;
};

/** The 6pm "still time" nudge for the coming Sunday, skipped if they already checked in this week. */
async function scheduleEvening(free: boolean) {
  await Notifications.cancelScheduledNotificationAsync(EVENING_ID).catch(() => {});
  const when = nextSunday(18);
  if ((await AsyncStorage.getItem(DONE_KEY)) === sundayOf(when)) return;
  await Notifications.scheduleNotificationAsync({
    identifier: EVENING_ID,
    content: { title: 'Still time for your check-in', body: free ? '2 minutes. Your weight trend only works if you log it.' : '2 minutes, and I review it within 24 hours.' },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: when },
  });
}

/** Re-create every reminder from the plan. */
export async function applyReminders(plan: Plan | null, prefs: ReminderPrefs, opts: { free?: boolean } = {}) {
  await AsyncStorage.setItem(KEY, JSON.stringify(prefs));
  if (Platform.OS === 'web' || !(await hasPermission())) return;
  await Notifications.cancelAllScheduledNotificationsAsync();
  if (!plan) return;
  if (prefs.on) {
    for (const d of plan.train.d) {
      const [dayName, type] = d.t.split('·').map((x) => x.trim());
      const weekday = DAYS.indexOf(dayName.toLowerCase()) + 1; // 1 = Sunday
      if (weekday < 1) continue;
      await Notifications.scheduleNotificationAsync({
        content: { title: `${type} day`, body: `${plan.name}, your ${type.toLowerCase()} workout is ready. Last time's numbers are waiting to be beaten.` },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.WEEKLY, weekday, hour: prefs.hour, minute: prefs.minute },
      });
    }
  }
  if (prefs.weigh) {
    await Notifications.scheduleNotificationAsync({
      content: { title: 'Weigh-in', body: 'Before breakfast, after the bathroom. One number, and your trend does the rest.' },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour: prefs.weighHour ?? 7, minute: 0 },
    });
  }
  if (prefs.protein) await scheduleProtein(plan, prefs.proteinHour ?? 19);
  if (prefs.checkin) {
    await Notifications.scheduleNotificationAsync({
      content: { title: 'Sunday check-in', body: opts.free ? '2 minutes: log your weight and your week, and watch your trend move.' : '2 minutes: your numbers and your week. I review it within 24 hours.' },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.WEEKLY, weekday: 1, hour: 9, minute: 0 },
    });
    await scheduleEvening(!!opts.free);
  }
}

const isoDay = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/** Evening protein check for the next 7 days, minus any day they've already hit it. */
async function scheduleProtein(plan: Plan, hour: number) {
  const goal = Number(String(plan.protein).replace(/[^\d.]/g, '')) || 150;
  const hitOn = await AsyncStorage.getItem(PROTEIN_HIT);
  const now = new Date();
  for (let k = 0; k < 7; k++) {
    const d = new Date(now); d.setDate(now.getDate() + k); d.setHours(hour, 0, 0, 0);
    if (d <= now || isoDay(d) === hitOn) continue;
    await Notifications.scheduleNotificationAsync({
      identifier: PROTEIN_ID(isoDay(d)),
      content: { title: 'Protein check', body: `${goal} g today. Where are you at? Log it in 2 taps, or grab a shake to close the gap.` },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: d },
    });
  }
}

/** Call whenever protein changes: once today's goal is hit, tonight's reminder is cancelled. */
export async function afterProtein(total: number, goal: number) {
  if (Platform.OS === 'web' || total < goal) return;
  const today = isoDay(new Date());
  if ((await AsyncStorage.getItem(PROTEIN_HIT)) === today) return;
  await AsyncStorage.setItem(PROTEIN_HIT, today);
  await Notifications.cancelScheduledNotificationAsync(PROTEIN_ID(today)).catch(() => {});
}

/** Call after a check-in is saved: no 6pm nudge this week, next week's is set. */
export async function markCheckinDone(free: boolean) {
  await AsyncStorage.setItem(DONE_KEY, sundayOf());
  if (Platform.OS === 'web' || !(await hasPermission())) return;
  const prefs = await readPrefs();
  if (prefs.checkin) await scheduleEvening(free);
}

/** Show the "turn on reminders" prompt? (Phone only, not yet allowed, not dismissed.) */
export async function shouldPrompt() {
  if (Platform.OS === 'web') return false;
  if ((await AsyncStorage.getItem(ASKED_KEY)) === '1') return false;
  return !(await hasPermission());
}
export const dismissPrompt = () => AsyncStorage.setItem(ASKED_KEY, '1');

export const timeLabel = (h: number, m: number) => `${((h + 11) % 12) + 1}:${String(m).padStart(2, '0')} ${h < 12 ? 'am' : 'pm'}`;
