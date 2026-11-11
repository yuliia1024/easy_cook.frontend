import { act, renderHook, waitFor } from '@testing-library/react';
import { buildMenuSummary, buildNutrition, buildRecipe, page } from '../../test/fixtures';
import { createQueryWrapper } from '../../test/query-wrapper';
import { api, http, HttpResponse, server } from '../../test/server';
import { menuKeys } from '../menus/menus.queries';
import {
  recipeKeys,
  useDeleteRecipe,
  useRecipe,
  useRecipeNutrition,
  useRecipes,
} from './recipes.queries';

describe('useDeleteRecipe', () => {
  it('drops the recipe and refreshes the menus that link to it', async () => {
    server.use(http.delete(api('/recipes/r1'), () => new HttpResponse(null, { status: 204 })));
    const { queryClient, wrapper } = createQueryWrapper();
    queryClient.setQueryData(recipeKeys.detail('r1'), { id: 'r1' });
    queryClient.setQueryData(menuKeys.list(), [buildMenuSummary()]);
    const { result } = renderHook(() => useDeleteRecipe(), { wrapper });

    act(() => result.current.mutate('r1'));

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(queryClient.getQueryData(recipeKeys.detail('r1'))).toBeUndefined();
    expect(queryClient.getQueryState(menuKeys.list())?.isInvalidated).toBe(true);
  });

  it('does not refetch the deleted recipe still on screen, but refreshes the lists', async () => {
    const recipe = buildRecipe();
    const loads = { detail: 0, nutrition: 0, list: 0 };
    server.use(
      http.get(api(`/recipes/${recipe.id}`), () => {
        loads.detail += 1;
        return HttpResponse.json(recipe);
      }),
      http.get(api(`/recipes/${recipe.id}/nutrition`), () => {
        loads.nutrition += 1;
        return HttpResponse.json(buildNutrition());
      }),
      http.get(api('/recipes'), () => {
        loads.list += 1;
        return HttpResponse.json(page([recipe]));
      }),
      http.delete(api(`/recipes/${recipe.id}`), () => new HttpResponse(null, { status: 204 })),
    );
    const { queryClient, wrapper } = createQueryWrapper();
    const { result, unmount } = renderHook(
      () => ({
        detail: useRecipe(recipe.id),
        nutrition: useRecipeNutrition(recipe.id, false),
        list: useRecipes({}),
        remove: useDeleteRecipe(),
      }),
      { wrapper },
    );
    await waitFor(() => expect(result.current.nutrition.isSuccess).toBe(true));
    await waitFor(() => expect(result.current.list.isSuccess).toBe(true));
    await waitFor(() => expect(result.current.detail.isSuccess).toBe(true));

    act(() => result.current.remove.mutate(recipe.id));

    await waitFor(() => expect(result.current.remove.isSuccess).toBe(true));
    expect(loads).toEqual({ detail: 1, nutrition: 1, list: 2 });
    expect(result.current.detail.isError).toBe(false);
    // Kept while on screen, gone once the page has left (Back must not show it from the cache).
    expect(queryClient.getQueryData(recipeKeys.detail(recipe.id))).toEqual(recipe);
    unmount();
    expect(queryClient.getQueryData(recipeKeys.detail(recipe.id))).toBeUndefined();
    expect(queryClient.getQueryData(recipeKeys.nutrition(recipe.id, false))).toBeUndefined();
    expect(queryClient.getQueryData(recipeKeys.list({}))).toBeDefined();
  });
});
