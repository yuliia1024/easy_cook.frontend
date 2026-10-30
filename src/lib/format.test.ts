import {
  formatDate,
  formatNumber,
  formatServings,
  hasMaxDecimals,
  parseOptionalNumber,
  servingsLabel,
} from './format';

describe('formatNumber', () => {
  it('shows unknown values as a dash, not 0', () => {
    expect(formatNumber(null)).toBe('—');
    expect(formatNumber(undefined)).toBe('—');
    expect(formatNumber(0)).toBe('0');
  });

  it('keeps one decimal with a dot as the separator', () => {
    expect(formatNumber(12.345)).toBe('12.3');
  });
});

describe('formatServings', () => {
  it('keeps the quarters of a serving', () => {
    expect(formatServings(1.25)).toBe('1.25');
    expect(formatServings(1.5)).toBe('1.5');
    expect(formatServings(2)).toBe('2');
  });

  it('names one serving and more', () => {
    expect(servingsLabel(1)).toBe('1 serving');
    expect(servingsLabel(0.75)).toBe('0.75 servings');
    expect(servingsLabel(1.25)).toBe('1.25 servings');
  });
});

describe('formatDate', () => {
  it('shows the date without the time', () => {
    expect(formatDate(new Date(2026, 0, 15, 23, 30).toISOString())).toBe('15 Jan 2026');
  });
});

describe('parseOptionalNumber', () => {
  it('treats empty input as null', () => {
    expect(parseOptionalNumber('')).toBeNull();
    expect(parseOptionalNumber('  ')).toBeNull();
    expect(parseOptionalNumber(undefined)).toBeNull();
  });

  it('accepts a comma as the decimal separator', () => {
    expect(parseOptionalNumber('3,5')).toBe(3.5);
    expect(parseOptionalNumber(7)).toBe(7);
  });

  it('returns NaN for garbage so validation can reject it', () => {
    expect(parseOptionalNumber('abc')).toBeNaN();
  });
});

describe('hasMaxDecimals', () => {
  it('is float safe', () => {
    expect(hasMaxDecimals(0.29, 2)).toBe(true);
    expect(hasMaxDecimals(1.1, 2)).toBe(true);
    expect(hasMaxDecimals(150, 2)).toBe(true);
    expect(hasMaxDecimals(1.234, 2)).toBe(false);
  });
});
