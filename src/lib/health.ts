import type { WeighIn } from './trend';

/**
 * Apple Health sync. This file is the web/Android version (nothing to connect);
 * the iPhone version lives in health.ios.ts and has the same shape.
 */
export type HealthToday = { steps: number | null; sleepMin: number | null; activeKcal: number | null };
export type HealthWorkout = { date: string; minutes: number; kind: string };

export type HealthApi = {
  /** Apple Health exists on this device. */
  available: () => boolean;
  /** They turned the sync on in the app (and allowed it in the Health prompt). */
  isOn: () => Promise<boolean>;
  /** Show Apple's Health permission sheet. True if the sync is now on. */
  connect: () => Promise<boolean>;
  disconnect: () => Promise<void>;
  today: () => Promise<HealthToday>;
  /** Steps for a day (all sources, deduped by Health: phone + watch). */
  steps: (d: Date) => Promise<number | null>;
  /** Body weight samples, one per day (latest that day), last `days` days. */
  weights: (days: number) => Promise<WeighIn[]>;
  workouts: (days: number) => Promise<HealthWorkout[]>;
  saveWeight: (lbs: number) => Promise<void>;
  saveWorkout: (start: Date, end: Date) => Promise<void>;
};

export const health: HealthApi = {
  available: () => false,
  isOn: async () => false,
  connect: async () => false,
  disconnect: async () => {},
  today: async () => ({ steps: null, sleepMin: null, activeKcal: null }),
  steps: async () => null,
  weights: async () => [],
  workouts: async () => [],
  saveWeight: async () => {},
  saveWorkout: async () => {},
};
