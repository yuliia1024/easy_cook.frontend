import { act, renderHook } from '@testing-library/react';
import { useDebouncedValue } from './use-debounced-value';

describe('useDebouncedValue', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('returns the first value at once and a new one after the delay', () => {
    const { result, rerender } = renderHook(({ value }) => useDebouncedValue(value, 300), {
      initialProps: { value: 'o' },
    });
    expect(result.current).toBe('o');

    rerender({ value: 'oa' });
    act(() => vi.advanceTimersByTime(299));
    expect(result.current).toBe('o');
    act(() => vi.advanceTimersByTime(1));
    expect(result.current).toBe('oa');
  });

  it('keeps only the last of quick changes', () => {
    const { result, rerender } = renderHook(({ value }) => useDebouncedValue(value), {
      initialProps: { value: 'o' },
    });

    rerender({ value: 'oa' });
    act(() => vi.advanceTimersByTime(200));
    rerender({ value: 'oat' });
    act(() => vi.advanceTimersByTime(200));
    expect(result.current).toBe('o');
    act(() => vi.advanceTimersByTime(100));
    expect(result.current).toBe('oat');
  });
});
