import { act, renderHook, waitFor } from '@testing-library/react';
import { buildMenuSummary } from '../../test/fixtures';
import { createQueryWrapper } from '../../test/query-wrapper';
import { api, http, HttpResponse, server } from '../../test/server';
import { menuKeys } from '../menus/menus.queries';
import { recipeKeys, useDeleteRecipe } from './recipes.queries';

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
});
