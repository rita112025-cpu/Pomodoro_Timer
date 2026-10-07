import {
  createEmptyStats,
  getTodayKey,
  isValidStats,
  type TodayStats,
} from './stats';
import { type Durations, type TimerMode } from './timer';

export const STATS_STORAGE_KEY = 'pomodoro-stats';
export const DURATIONS_STORAGE_KEY = 'pomodoro-durations';

export const DEFAULT_DURATIONS: Durations = {
  focus: 25,
  shortBreak: 5,
  longBreak: 15,
};

/** Minimal storage surface so tests can inject an in-memory fake. */
export interface KeyValueStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

function isValidDuration(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0;
}

function removeQuietly(key: string, storage: KeyValueStorage): void {
  try {
    storage.removeItem(key);
  } catch {
    /* storage unavailable — the app still works with in-memory state */
  }
}

/**
 * Read today's stats safely: corrupted JSON or a wrong schema must never
 * throw during app startup — the stored value is dropped instead.
 */
export function loadStats(
  storage: KeyValueStorage = localStorage,
  now: Date = new Date(),
): TodayStats {
  const today = getTodayKey(now);

  try {
    const stored = storage.getItem(STATS_STORAGE_KEY);
    if (stored) {
      const parsed: unknown = JSON.parse(stored);
      if (isValidStats(parsed) && parsed.date === today) {
        return {
          date: parsed.date,
          focusSessions: parsed.focusSessions,
          totalFocusMinutes: parsed.totalFocusMinutes,
        };
      }
      if (!isValidStats(parsed)) {
        removeQuietly(STATS_STORAGE_KEY, storage);
      }
    }
  } catch {
    removeQuietly(STATS_STORAGE_KEY, storage);
  }

  return createEmptyStats(today);
}

export function saveStats(
  stats: TodayStats,
  storage: KeyValueStorage = localStorage,
): void {
  try {
    storage.setItem(STATS_STORAGE_KEY, JSON.stringify(stats));
  } catch {
    /* quota exceeded / private mode — ignore */
  }
}

/**
 * Read custom durations safely. Invalid keys fall back to the default one
 * at a time, corrupted JSON falls back to all defaults.
 */
export function loadDurations(
  storage: KeyValueStorage = localStorage,
): Durations {
  try {
    const stored = storage.getItem(DURATIONS_STORAGE_KEY);
    if (stored) {
      const parsed: unknown = JSON.parse(stored);
      if (typeof parsed === 'object' && parsed !== null) {
        const candidate = parsed as Partial<Record<TimerMode, unknown>>;
        return {
          focus: isValidDuration(candidate.focus)
            ? candidate.focus
            : DEFAULT_DURATIONS.focus,
          shortBreak: isValidDuration(candidate.shortBreak)
            ? candidate.shortBreak
            : DEFAULT_DURATIONS.shortBreak,
          longBreak: isValidDuration(candidate.longBreak)
            ? candidate.longBreak
            : DEFAULT_DURATIONS.longBreak,
        };
      }
      removeQuietly(DURATIONS_STORAGE_KEY, storage);
    }
  } catch {
    removeQuietly(DURATIONS_STORAGE_KEY, storage);
  }

  return { ...DEFAULT_DURATIONS };
}

export function saveDurations(
  durations: Durations,
  storage: KeyValueStorage = localStorage,
): void {
  try {
    storage.setItem(DURATIONS_STORAGE_KEY, JSON.stringify(durations));
  } catch {
    /* quota exceeded / private mode — ignore */
  }
}
