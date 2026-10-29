const numberFormat = new Intl.NumberFormat('en-GB', { maximumFractionDigits: 1 });
const servingsFormat = new Intl.NumberFormat('en-GB', { maximumFractionDigits: 2 });
const dateFormat = new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium' });

/** A nutrient value; null is unknown and shown as a dash, never as 0. */
export function formatNumber(value: number | null | undefined): string {
  return value === null || value === undefined ? '—' : numberFormat.format(value);
}

/** Servings of a menu meal, in quarters (1.25), so two decimals. */
export function formatServings(value: number): string {
  return servingsFormat.format(value);
}

/** "1 serving", "1.25 servings". */
export function servingsLabel(value: number): string {
  return `${formatServings(value)} ${value === 1 ? 'serving' : 'servings'}`;
}

export function formatDate(iso: string): string {
  return dateFormat.format(new Date(iso));
}

/** `''` for an empty input, a number otherwise (NaN for garbage, left to validation). */
export function parseOptionalNumber(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  const text = String(value).trim().replace(',', '.');
  return text === '' ? null : Number(text);
}

/** Float-safe "at most `places` decimals" (0.29 * 100 is 28.999…). */
export function hasMaxDecimals(value: number, places: number): boolean {
  const scaled = value * 10 ** places;
  return Math.abs(scaled - Math.round(scaled)) < 1e-6;
}
