export type TimerMode = 'focus' | 'shortBreak' | 'longBreak';

export type Durations = Record<TimerMode, number>;

/**
 * Anchor a countdown to a wall-clock deadline.
 * Storing the deadline (instead of decrementing a counter every second) is what
 * keeps the timer correct when the tab is throttled or the machine sleeps.
 */
export function computeEndTime(now: number, remainingSeconds: number): number {
  return now + remainingSeconds * 1000;
}

/**
 * Remaining whole seconds until `endTime`, based on wall-clock `now`.
 * Never returns a negative value.
 */
export function computeRemainingSeconds(endTime: number, now: number): number {
  return Math.max(0, Math.ceil((endTime - now) / 1000));
}

export function formatTime(seconds: number): string {
  const total = Math.max(0, Math.floor(seconds));
  const mins = Math.floor(total / 60);
  const secs = total % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}
