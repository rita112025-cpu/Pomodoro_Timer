export interface TodayStats {
  date: string;
  focusSessions: number;
  totalFocusMinutes: number;
}

/** Local calendar day key, e.g. `2026-10-07`. */
export function getTodayKey(now: Date = new Date()): string {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** Structural validation for data coming out of localStorage. */
export function isValidStats(value: unknown): value is TodayStats {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const candidate = value as Partial<TodayStats>;
  return (
    typeof candidate.date === 'string' &&
    typeof candidate.focusSessions === 'number' &&
    Number.isFinite(candidate.focusSessions) &&
    candidate.focusSessions >= 0 &&
    typeof candidate.totalFocusMinutes === 'number' &&
    Number.isFinite(candidate.totalFocusMinutes) &&
    candidate.totalFocusMinutes >= 0
  );
}

export function createEmptyStats(date: string): TodayStats {
  return { date, focusSessions: 0, totalFocusMinutes: 0 };
}

/**
 * Record one completed focus session.
 * If `stats` belongs to a previous day (page stayed open across midnight),
 * the counters restart from zero for the new day instead of accumulating.
 */
export function incrementFocusSession(
  stats: TodayStats,
  focusMinutes: number,
  now: Date = new Date(),
): TodayStats {
  const today = getTodayKey(now);
  const base = stats.date === today ? stats : createEmptyStats(today);
  return {
    date: today,
    focusSessions: base.focusSessions + 1,
    totalFocusMinutes: base.totalFocusMinutes + focusMinutes,
  };
}
