import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { foodsApi } from '../../api/foods';
import type { FoodQuery } from '../../api/types';

export const foodKeys = {
  all: ['foods'] as const,
  list: (query: FoodQuery) => [...foodKeys.all, 'list', query] as const,
  detail: (id: string) => [...foodKeys.all, 'detail', id] as const,
};

export function useFoods(query: FoodQuery) {
  return useQuery({
    queryKey: foodKeys.list(query),
    queryFn: ({ signal }) => foodsApi.list(query, { signal }),
    placeholderData: keepPreviousData,
  });
}

export function useFood(id: string | undefined) {
  return useQuery({
    queryKey: foodKeys.detail(id ?? ''),
    queryFn: ({ signal }) => foodsApi.get(id!, { signal }),
    enabled: Boolean(id),
  });
}
