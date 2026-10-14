import { toDateInputValue } from '../lib/dates';

/** `yyyy-mm-dd` of the local day `offset` days from today, for dates that must not be past. */
export const dayFromToday = (offset: number): string => {
  const date = new Date();
  date.setDate(date.getDate() + offset);
  return toDateInputValue(date);
};
