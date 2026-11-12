import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from '@tanstack/react-query';
import { recipesApi } from '../../api/recipes';
import type { Recipe, RecipeInput, RecipeQuery } from '../../api/types';
import { menuKeys } from '../menus/menus.queries';

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

/**
 * Drops the details and nutrition of a deleted recipe. One still on screen (the page that is
 * about to leave) is neither refetched (a 404 flash) nor kept: it goes once its last observer
 * does, so Back does not show the deleted recipe from the cache.
 */
function removeDeletedRecipe(queryClient: QueryClient, id: string): void {
  const cache = queryClient.getQueryCache();
  const queries = cache.findAll({
    queryKey: recipeKeys.all,
    predicate: (query) => query.queryKey.includes(id),
  });
  for (const query of queries) {
    void query.cancel();
    if (query.getObserversCount() === 0) {
      cache.remove(query);
      continue;
    }
    const unsubscribe = cache.subscribe((event) => {
      if (event.query !== query) return;
      if (event.type === 'removed') unsubscribe();
      else if (event.type === 'observerRemoved' && query.getObserversCount() === 0) {
        unsubscribe();
        cache.remove(query);
      }
    });
  }
}

export function useDeleteRecipe() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => recipesApi.remove(id),
    onSuccess: (_, id) => {
      removeDeletedRecipe(queryClient, id);
      return Promise.all([
        queryClient.invalidateQueries({
          queryKey: recipeKeys.all,
          predicate: (query) => !query.queryKey.includes(id),
        }),
        // Menus link their meals to the recipe.
        queryClient.invalidateQueries({ queryKey: menuKeys.all }),
      ]);
    },
  });
}
