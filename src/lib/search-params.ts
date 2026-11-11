import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router';
import { MAX_PAGE } from './limits';
import { useDebouncedValue } from './use-debounced-value';

/** `page` from the URL: a whole number in 1…`MAX_PAGE`, else 1. */
export function parsePage(value: string | null): number {
  const page = Number(value);
  return Number.isInteger(page) && page >= 1 && page <= MAX_PAGE ? page : 1;
}

/** `value` when it is a key of `labels` (an enum value), else undefined. */
export function parseEnum<T extends string>(
  value: string | null,
  labels: Record<T, string>,
): T | undefined {
  return value !== null && Object.hasOwn(labels, value) ? (value as T) : undefined;
}

/** The values that are keys of `labels`, without repeats. */
export function parseEnums<T extends string>(values: string[], labels: Record<T, string>): T[] {
  return [...new Set(values)].filter((value): value is T => parseEnum(value, labels) !== undefined);
}

/**
 * `search` (as typed, for the input) and `page` of a list from the URL, with the search debounced
 * for the query. Typing keeps the page in the URL until the debounced search changes; from that
 * render on the query asks for page 1 and the URL drops `page`, so the old page is never requested
 * with the new search.
 */
export function useSearchAndPage(): { search: string; debouncedSearch: string; page: number } {
  const [params, setParams] = useSearchParams();
  const search = params.get('search') ?? '';
  const hasPage = params.has('page');
  const urlPage = parsePage(params.get('page'));
  const debouncedSearch = useDebouncedValue(search.trim());
  /** The search the page in the URL belongs to. */
  const [pageSearch, setPageSearch] = useState(debouncedSearch);
  const searchChanged = pageSearch !== debouncedSearch;
  // Without a page in the URL there is nothing to drop: the new search owns page 1 at once.
  if (searchChanged && !hasPage) setPageSearch(debouncedSearch);

  useEffect(() => {
    if (!searchChanged || !hasPage) return;
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.delete('page');
        return next;
      },
      { replace: true },
    );
  }, [searchChanged, hasPage, setParams]);

  return { search, debouncedSearch, page: searchChanged ? 1 : urlPage };
}
