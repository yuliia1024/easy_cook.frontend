import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { foodsApi } from '../../api/foods';
import type { FoodItem, FoodItemInput, FoodQuery } from '../../api/types';

export const foodKeys = {
  all: ['foods'] as const,
  list: (query: FoodQuery) => [...foodKeys.all, 'list', query] as const,
  detail: (id: string) => [...foodKeys.all, 'detail', id] as const,
};

export function useFoods(query: FoodQuery, enabled = true) {
  return useQuery({
    queryKey: foodKeys.list(query),
    queryFn: () => foodsApi.list(query),
    placeholderData: keepPreviousData,
    enabled,
  });
}

export function useFood(id: string | undefined) {
  return useQuery({
    queryKey: foodKeys.detail(id ?? ''),
    queryFn: () => foodsApi.get(id!),
    enabled: Boolean(id),
  });
}

/** Creates the food, or updates it when `id` is given. */
export function useSaveFood(id?: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: FoodItemInput): Promise<FoodItem> =>
      id ? foodsApi.update(id, input) : foodsApi.create(input),
    onSuccess: (food) => {
      queryClient.setQueryData(foodKeys.detail(food.id), food);
      // Recipes embed the food values.
      return Promise.all([
        queryClient.invalidateQueries({ queryKey: foodKeys.all }),
        queryClient.invalidateQueries({ queryKey: ['recipes'] }),
      ]);
    },
  });
}
