import { describe, expect, it } from 'vitest';
import {
  DEFAULT_DURATIONS,
  DURATIONS_STORAGE_KEY,
  STATS_STORAGE_KEY,
  loadDurations,
  loadStats,
  saveDurations,
  saveStats,
  type KeyValueStorage,
} from './storage';

function createMemoryStorage(initial: Record<string, string> = {}): KeyValueStorage & {
  data: Map<string, string>;
} {
  const data = new Map(Object.entries(initial));
  return {
    data,
    getItem: (key) => (data.has(key) ? data.get(key)! : null),
    setItem: (key, value) => {
      data.set(key, value);
    },
    removeItem: (key) => {
      data.delete(key);
    },
  };
}

function createThrowingStorage(): KeyValueStorage {
  return {
    getItem: () => {
      throw new Error('storage disabled');
    },
    setItem: () => {
      throw new Error('storage disabled');
    },
    removeItem: () => {
      throw new Error('storage disabled');
    },
  };
}

const TODAY = new Date(2026, 9, 7, 12, 0, 0); // 2026-10-07 local time
const TODAY_KEY = '2026-10-07';

describe('loadStats', () => {
  it('returns a zeroed record when nothing is stored', () => {
    const storage = createMemoryStorage();
    expect(loadStats(storage, TODAY)).toEqual({
      date: TODAY_KEY,
      focusSessions: 0,
      totalFocusMinutes: 0,
    });
  });

  it("returns today's stored record when it is valid", () => {
    const storage = createMemoryStorage({
      [STATS_STORAGE_KEY]: JSON.stringify({
        date: TODAY_KEY,
        focusSessions: 3,
        totalFocusMinutes: 75,
      }),
    });
    expect(loadStats(storage, TODAY)).toEqual({
      date: TODAY_KEY,
      focusSessions: 3,
      totalFocusMinutes: 75,
    });
  });

  it('does not throw on corrupted JSON and clears the broken value', () => {
    const storage = createMemoryStorage({ [STATS_STORAGE_KEY]: '{broken json' });
    expect(() => loadStats(storage, TODAY)).not.toThrow();
    expect(loadStats(storage, TODAY)).toEqual({
      date: TODAY_KEY,
      focusSessions: 0,
      totalFocusMinutes: 0,
    });
    expect(storage.getItem(STATS_STORAGE_KEY)).toBeNull();
  });

  it('does not throw on a wrong schema (e.g. string counters)', () => {
    const storage = createMemoryStorage({
      [STATS_STORAGE_KEY]: JSON.stringify({
        date: TODAY_KEY,
        focusSessions: 'three',
        totalFocusMinutes: 75,
      }),
    });
    expect(loadStats(storage, TODAY)).toEqual({
      date: TODAY_KEY,
      focusSessions: 0,
      totalFocusMinutes: 0,
    });
    expect(storage.getItem(STATS_STORAGE_KEY)).toBeNull();
  });

  it("ignores yesterday's valid record", () => {
    const storage = createMemoryStorage({
      [STATS_STORAGE_KEY]: JSON.stringify({
        date: '2026-10-06',
        focusSessions: 9,
        totalFocusMinutes: 225,
      }),
    });
    expect(loadStats(storage, TODAY)).toEqual({
      date: TODAY_KEY,
      focusSessions: 0,
      totalFocusMinutes: 0,
    });
  });

  it('survives a storage implementation that throws', () => {
    expect(() => loadStats(createThrowingStorage(), TODAY)).not.toThrow();
    expect(loadStats(createThrowingStorage(), TODAY)).toEqual({
      date: TODAY_KEY,
      focusSessions: 0,
      totalFocusMinutes: 0,
    });
  });
});

describe('saveStats', () => {
  it('round-trips through loadStats', () => {
    const storage = createMemoryStorage();
    saveStats({ date: TODAY_KEY, focusSessions: 2, totalFocusMinutes: 50 }, storage);
    expect(loadStats(storage, TODAY)).toEqual({
      date: TODAY_KEY,
      focusSessions: 2,
      totalFocusMinutes: 50,
    });
  });

  it('does not throw when storage is unavailable', () => {
    expect(() =>
      saveStats(
        { date: TODAY_KEY, focusSessions: 1, totalFocusMinutes: 25 },
        createThrowingStorage(),
      ),
    ).not.toThrow();
  });
});

describe('loadDurations', () => {
  it('returns defaults when nothing is stored', () => {
    expect(loadDurations(createMemoryStorage())).toEqual(DEFAULT_DURATIONS);
  });

  it('returns stored durations when valid', () => {
    const storage = createMemoryStorage({
      [DURATIONS_STORAGE_KEY]: JSON.stringify({ focus: 40, shortBreak: 10, longBreak: 20 }),
    });
    expect(loadDurations(storage)).toEqual({ focus: 40, shortBreak: 10, longBreak: 20 });
  });

  it('falls back to defaults on corrupted JSON without throwing', () => {
    const storage = createMemoryStorage({ [DURATIONS_STORAGE_KEY]: '{"focus":' });
    expect(() => loadDurations(storage)).not.toThrow();
    expect(loadDurations(storage)).toEqual(DEFAULT_DURATIONS);
    expect(storage.getItem(DURATIONS_STORAGE_KEY)).toBeNull();
  });

  it('falls back per key when individual values are invalid', () => {
    const storage = createMemoryStorage({
      [DURATIONS_STORAGE_KEY]: JSON.stringify({
        focus: 40,
        shortBreak: -5,
        longBreak: null,
      }),
    });
    expect(loadDurations(storage)).toEqual({
      focus: 40,
      shortBreak: DEFAULT_DURATIONS.shortBreak,
      longBreak: DEFAULT_DURATIONS.longBreak,
    });
  });

  it('survives a storage implementation that throws', () => {
    expect(() => loadDurations(createThrowingStorage())).not.toThrow();
    expect(loadDurations(createThrowingStorage())).toEqual(DEFAULT_DURATIONS);
  });
});

describe('saveDurations', () => {
  it('round-trips through loadDurations', () => {
    const storage = createMemoryStorage();
    saveDurations({ focus: 50, shortBreak: 8, longBreak: 18 }, storage);
    expect(loadDurations(storage)).toEqual({ focus: 50, shortBreak: 8, longBreak: 18 });
  });

  it('does not throw when storage is unavailable', () => {
    expect(() =>
      saveDurations({ focus: 50, shortBreak: 8, longBreak: 18 }, createThrowingStorage()),
    ).not.toThrow();
  });
});
