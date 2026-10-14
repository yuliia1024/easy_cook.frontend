import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { recipesApi } from '../../api/recipes';
import type { Recipe, RecipeInput, RecipeQuery } from '../../api/types';

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
    queryFn: () => recipesApi.list(query),
    placeholderData: keepPreviousData,
    enabled,
  });
}

export function useRecipe(id: string | undefined) {
  return useQuery({
    queryKey: recipeKeys.detail(id ?? ''),
    queryFn: () => recipesApi.get(id!),
    enabled: Boolean(id),
  });
}

export function useRecipeNutrition(id: string, includeOptional: boolean) {
  return useQuery({
    queryKey: recipeKeys.nutrition(id, includeOptional),
    queryFn: () => recipesApi.nutrition(id, includeOptional),
    placeholderData: keepPreviousData,
  });
}

/** Creates the recipe, or replaces its fields and ingredient list when `id` is given. */
export function useSaveRecipe(id?: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: RecipeInput): Promise<Recipe> =>
      id ? recipesApi.update(id, input) : recipesApi.create(input),
    onSuccess: (recipe) => {
      queryClient.setQueryData(recipeKeys.detail(recipe.id), recipe);
      return queryClient.invalidateQueries({ queryKey: recipeKeys.all });
    },
  });
}

export function useDeleteRecipe() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => recipesApi.remove(id),
    onSuccess: (_, id) => {
      queryClient.removeQueries({ queryKey: recipeKeys.detail(id) });
      return queryClient.invalidateQueries({ queryKey: recipeKeys.all });
    },
  });
}
