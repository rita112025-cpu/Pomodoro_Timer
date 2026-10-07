import { describe, expect, it } from 'vitest';
import {
  createEmptyStats,
  getTodayKey,
  incrementFocusSession,
  isValidStats,
} from './stats';

describe('getTodayKey', () => {
  it('formats the local date as YYYY-MM-DD', () => {
    expect(getTodayKey(new Date(2026, 0, 5))).toBe('2026-01-05');
    expect(getTodayKey(new Date(2026, 11, 31))).toBe('2026-12-31');
  });
});

describe('isValidStats', () => {
  it('accepts a well-formed record', () => {
    expect(
      isValidStats({ date: '2026-10-07', focusSessions: 3, totalFocusMinutes: 75 }),
    ).toBe(true);
    expect(
      isValidStats({ date: '2026-10-07', focusSessions: 0, totalFocusMinutes: 0 }),
    ).toBe(true);
  });

  it('rejects malformed records', () => {
    expect(isValidStats(null)).toBe(false);
    expect(isValidStats(undefined)).toBe(false);
    expect(isValidStats('2026-10-07')).toBe(false);
    expect(isValidStats({ date: '2026-10-07', focusSessions: '3', totalFocusMinutes: 75 })).toBe(false);
    expect(isValidStats({ date: '2026-10-07', focusSessions: Number.NaN, totalFocusMinutes: 75 })).toBe(false);
    expect(isValidStats({ date: '2026-10-07', focusSessions: -1, totalFocusMinutes: 75 })).toBe(false);
    expect(isValidStats({ date: '2026-10-07', focusSessions: 1 })).toBe(false);
    expect(isValidStats({ focusSessions: 1, totalFocusMinutes: 25 })).toBe(false);
  });
});

describe('createEmptyStats', () => {
  it('creates a zeroed record for the given day', () => {
    expect(createEmptyStats('2026-10-07')).toEqual({
      date: '2026-10-07',
      focusSessions: 0,
      totalFocusMinutes: 0,
    });
  });
});

describe('incrementFocusSession', () => {
  it('accumulates within the same day', () => {
    const now = new Date(2026, 9, 7, 10, 0, 0);
    const prev = { date: '2026-10-07', focusSessions: 2, totalFocusMinutes: 50 };
    expect(incrementFocusSession(prev, 25, now)).toEqual({
      date: '2026-10-07',
      focusSessions: 3,
      totalFocusMinutes: 75,
    });
  });

  it('rolls over to a fresh day when the session crossed midnight', () => {
    // Stats still belong to 10/06, but the session completed on 10/07.
    const now = new Date(2026, 9, 7, 0, 5, 0);
    const prev = { date: '2026-10-06', focusSessions: 8, totalFocusMinutes: 200 };
    expect(incrementFocusSession(prev, 25, now)).toEqual({
      date: '2026-10-07',
      focusSessions: 1,
      totalFocusMinutes: 25,
    });
  });

  it('does not mutate the previous record', () => {
    const now = new Date(2026, 9, 7, 10, 0, 0);
    const prev = { date: '2026-10-07', focusSessions: 1, totalFocusMinutes: 25 };
    incrementFocusSession(prev, 25, now);
    expect(prev).toEqual({ date: '2026-10-07', focusSessions: 1, totalFocusMinutes: 25 });
  });
});
