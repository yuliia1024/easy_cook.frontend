import { request, type CallOptions } from './http';
import type { Page, Recipe, RecipeNutrition, RecipeQuery } from './types';

export const recipesApi = {
  list: (query: RecipeQuery, { signal }: CallOptions = {}): Promise<Page<Recipe>> =>
    request('/recipes', { query: { ...query }, signal }),
  get: (id: string, { signal }: CallOptions = {}): Promise<Recipe> =>
    request(`/recipes/${encodeURIComponent(id)}`, { signal }),
  nutrition: (
    id: string,
    includeOptional: boolean,
    { signal }: CallOptions = {},
  ): Promise<RecipeNutrition> =>
    request(`/recipes/${encodeURIComponent(id)}/nutrition`, { query: { includeOptional }, signal }),
};
