import { act, renderHook } from '@testing-library/react';
import { TYPEWRITER_TICK_MS, useTypewriter } from './use-typewriter';

describe('useTypewriter', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  /** One step per `act`: every step is scheduled after the render of the previous one. */
  const tick = (times = 1): void => {
    for (let i = 0; i < times; i++) {
      act(() => {
        vi.advanceTimersByTime(TYPEWRITER_TICK_MS);
      });
    }
  };

  it('shows the whole text at once without animation', () => {
    const { result } = renderHook(() => useTypewriter('Here is your day.', false));

    expect(result.current).toEqual({ text: 'Here is your day.', done: true });
  });

  it('types the text out step by step until it is all shown', () => {
    const { result } = renderHook(() => useTypewriter('Here is your day.', true));

    expect(result.current).toEqual({ text: '', done: false });
    tick();
    expect(result.current.text).toBe('He');
    tick(30);
    expect(result.current).toEqual({ text: 'Here is your day.', done: true });
  });

  it('keeps typing as the text grows and after the animation is turned off', () => {
    const { result, rerender } = renderHook(({ text, animate }) => useTypewriter(text, animate), {
      initialProps: { text: '', animate: true },
    });

    rerender({ text: 'Here is your day.', animate: false });
    expect(result.current.done).toBe(false);
    tick(30);
    expect(result.current).toEqual({ text: 'Here is your day.', done: true });
  });

  it('shows the whole text at once with reduced motion', () => {
    vi.stubGlobal('matchMedia', (query: string) => ({ matches: query.includes('reduce') }));
    try {
      const { result } = renderHook(() => useTypewriter('Hi', true));

      expect(result.current).toEqual({ text: 'Hi', done: true });
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
