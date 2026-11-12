import { act, screen } from '@testing-library/react';
import { renderPage } from '../test/render';
import { MEAL_TYPE_LABELS } from './labels';
import { parseEnum, parseEnums, parsePage, useSearchAndPage } from './search-params';

describe('parsePage', () => {
  it.each([
    [null, 1],
    ['', 1],
    ['3', 3],
    ['0', 1],
    ['-2', 1],
    ['2.5', 1],
    ['abc', 1],
    ['10000', 10_000],
    ['10001', 1],
  ])('reads %j as %i', (value, expected) => {
    expect(parsePage(value)).toBe(expected);
  });
});

describe('parseEnum', () => {
  it('keeps only the keys of the labels', () => {
    expect(parseEnum('lunch', MEAL_TYPE_LABELS)).toBe('lunch');
    expect(parseEnum('brunch', MEAL_TYPE_LABELS)).toBeUndefined();
    expect(parseEnum('toString', MEAL_TYPE_LABELS)).toBeUndefined();
    expect(parseEnum(null, MEAL_TYPE_LABELS)).toBeUndefined();
    expect(parseEnums(['lunch', 'brunch', 'lunch', 'dinner'], MEAL_TYPE_LABELS)).toEqual([
      'lunch',
      'dinner',
    ]);
  });
});

function Probe() {
  const { search, debouncedSearch, page } = useSearchAndPage();
  return <p data-testid="probe">{JSON.stringify({ search, debouncedSearch, page })}</p>;
}

const probe = () => JSON.parse(screen.getByTestId('probe').textContent!) as object;

describe('useSearchAndPage', () => {
  it('keeps the page until the search is debounced, then starts from page 1', async () => {
    vi.useFakeTimers();
    try {
      const { router } = renderPage(<Probe />, '/?search=ri&page=3');
      expect(probe()).toEqual({ search: 'ri', debouncedSearch: 'ri', page: 3 });

      await act(() => router.navigate('/?search=rice&page=3', { replace: true }));
      expect(probe()).toEqual({ search: 'rice', debouncedSearch: 'ri', page: 3 });

      await act(() => vi.advanceTimersByTimeAsync(300));
      expect(probe()).toEqual({ search: 'rice', debouncedSearch: 'rice', page: 1 });
      expect(router.state.location.search).toBe('?search=rice');

      await act(() => router.navigate('/?search=rice&page=2'));
      expect(probe()).toEqual({ search: 'rice', debouncedSearch: 'rice', page: 2 });
    } finally {
      vi.useRealTimers();
    }
  });
});
