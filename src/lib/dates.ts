import { z } from 'zod';

/** `yyyy-mm-dd` of the local day, as a date input holds it. */
export function toDateInputValue(date: Date): string {
  const pad = (value: number): string => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** Days that may be picked: today … today + `maxDaysAhead`, as date input `min` / `max`. */
export function upcomingDateRange(
  maxDaysAhead: number,
  now = new Date(),
): { min: string; max: string } {
  const last = new Date(now);
  last.setDate(last.getDate() + maxDaysAhead);
  return { min: toDateInputValue(now), max: toDateInputValue(last) };
}

/** An optional `yyyy-mm-dd` from a date input (empty = none) within `upcomingDateRange`. */
export const upcomingDateSchema = (maxDaysAhead: number) =>
  z.string().superRefine((day, ctx) => {
    if (!day) return;
    // Checked when validating, not when the schema is built, so "today" stays current.
    const { min, max } = upcomingDateRange(maxDaysAhead);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) {
      ctx.addIssue({ code: 'custom', message: 'Enter a date' });
    } else if (day < min) {
      ctx.addIssue({ code: 'custom', message: 'Cannot be in the past' });
    } else if (day > max) {
      ctx.addIssue({ code: 'custom', message: `At most ${maxDaysAhead} days ahead` });
    }
  });
