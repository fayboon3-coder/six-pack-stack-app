import { vi } from 'vitest';
// The app's logic files import phone-only modules. Tests swap in light stand-ins.
vi.mock('@react-native-async-storage/async-storage', () => {
  const m = new Map<string, string>();
  return { default: { getItem: async (k: string) => m.get(k) ?? null, setItem: async (k: string, v: string) => void m.set(k, v), removeItem: async (k: string) => void m.delete(k) } };
});
vi.mock('react-native', () => ({ Platform: { OS: 'web' } }));
