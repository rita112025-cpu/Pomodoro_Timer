import { describe, expect, it } from 'vitest';
import { computeEndTime, computeRemainingSeconds, formatTime } from './timer';

describe('computeEndTime', () => {
  it('anchors the deadline to the wall clock', () => {
    expect(computeEndTime(1_000_000, 60)).toBe(1_060_000);
  });
});

describe('computeRemainingSeconds', () => {
  it('counts remaining whole seconds from the deadline', () => {
    const end = computeEndTime(0, 60);
    expect(computeRemainingSeconds(end, 0)).toBe(60);
    expect(computeRemainingSeconds(end, 1_000)).toBe(59);
    expect(computeRemainingSeconds(end, 30_500)).toBe(30);
    expect(computeRemainingSeconds(end, 59_001)).toBe(1);
    expect(computeRemainingSeconds(end, 60_000)).toBe(0);
  });

  it('never reports a negative value after the deadline passes', () => {
    const end = computeEndTime(0, 60);
    expect(computeRemainingSeconds(end, 120_000)).toBe(0);
    expect(computeRemainingSeconds(end, 10 * 60 * 60 * 1000)).toBe(0);
  });

  it('does not drift when the tab was throttled (background/AutoCAD scenario)', () => {
    // 25-minute session; the browser only fires the interval after 10 minutes
    // because the tab was in the background.
    const durationSeconds = 25 * 60;
    const start = 1_700_000_000_000;
    const end = computeEndTime(start, durationSeconds);

    const remainingAfterThrottle = computeRemainingSeconds(end, start + 10 * 60 * 1000);
    expect(remainingAfterThrottle).toBe(durationSeconds - 10 * 60);

    // ...and the next callback fires only 3 ticks later (CPU busy).
    const remainingAfterJitter = computeRemainingSeconds(end, start + 10 * 60 * 1000 + 750);
    expect(remainingAfterJitter).toBe(durationSeconds - 10 * 60);

    // After the real deadline, the very first callback reports completion.
    expect(computeRemainingSeconds(end, start + durationSeconds * 1000 + 45_000)).toBe(0);
  });

  it('survives system sleep: wall clock decides, tick count does not', () => {
    const start = 1_700_000_000_000;
    const end = computeEndTime(start, 5 * 60);
    // Machine slept for "4 real seconds" but wall clock advanced 3 minutes.
    expect(computeRemainingSeconds(end, start + 3 * 60 * 1000)).toBe(120);
    expect(computeRemainingSeconds(end, start + 10 * 60 * 1000)).toBe(0);
  });
});

describe('formatTime', () => {
  it('formats seconds as mm:ss with zero padding', () => {
    expect(formatTime(0)).toBe('00:00');
    expect(formatTime(9)).toBe('00:09');
    expect(formatTime(65)).toBe('01:05');
    expect(formatTime(25 * 60)).toBe('25:00');
    expect(formatTime(9 * 60 + 7)).toBe('09:07');
  });

  it('clamps negative input to 00:00', () => {
    expect(formatTime(-1)).toBe('00:00');
  });
});
