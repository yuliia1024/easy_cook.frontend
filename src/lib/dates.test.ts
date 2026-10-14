import { toDateInputValue, upcomingDateRange, upcomingDateSchema } from './dates';

describe('toDateInputValue', () => {
  it('formats the local day', () => {
    expect(toDateInputValue(new Date(2026, 0, 5, 23, 30))).toBe('2026-01-05');
  });
});

describe('upcomingDateRange', () => {
  it('spans today up to the given days ahead', () => {
    expect(upcomingDateRange(365, new Date(2026, 9, 14, 12))).toEqual({
      min: '2026-10-14',
      max: '2027-10-14',
    });
  });
});

describe('upcomingDateSchema', () => {
  const schema = upcomingDateSchema(30);
  const message = (day: string) => schema.safeParse(day).error?.issues[0].message;
  const shifted = (days: number) => {
    const date = new Date();
    date.setDate(date.getDate() + days);
    return toDateInputValue(date);
  };

  it('accepts no date and the days in range', () => {
    expect(message('')).toBeUndefined();
    expect(message(shifted(0))).toBeUndefined();
    expect(message(shifted(30))).toBeUndefined();
  });

  it('rejects past, too distant and malformed dates', () => {
    expect(message(shifted(-1))).toBe('Cannot be in the past');
    expect(message(shifted(31))).toBe('At most 30 days ahead');
    expect(message('14.10.2026')).toBe('Enter a date');
  });
});
