import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { recipesApi } from '../../api/recipes';
import type { RecipeQuery } from '../../api/types';

export const recipeKeys = {
  all: ['recipes'] as const,
  list: (query: RecipeQuery) => [...recipeKeys.all, 'list', query] as const,
  detail: (id: string) => [...recipeKeys.all, 'detail', id] as const,
  nutrition: (id: string, includeOptional: boolean) =>
    [...recipeKeys.all, 'nutrition', id, includeOptional] as const,
};

export function useRecipes(query: RecipeQuery, enabled = true) {
  return useQuery({
    queryKey: recipeKeys.list(query),
    queryFn: ({ signal }) => recipesApi.list(query, { signal }),
    placeholderData: keepPreviousData,
    enabled,
  });
}

export function useRecipe(id: string | undefined) {
  return useQuery({
    queryKey: recipeKeys.detail(id ?? ''),
    queryFn: ({ signal }) => recipesApi.get(id!, { signal }),
    enabled: Boolean(id),
  });
}

export function useRecipeNutrition(id: string, includeOptional: boolean) {
  return useQuery({
    queryKey: recipeKeys.nutrition(id, includeOptional),
    queryFn: ({ signal }) => recipesApi.nutrition(id, includeOptional, { signal }),
    placeholderData: keepPreviousData,
  });
}
