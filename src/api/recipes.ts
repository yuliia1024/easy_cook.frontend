import { request } from './http';
import type { Page, Recipe, RecipeInput, RecipeNutrition, RecipeQuery } from './types';

export const recipesApi = {
  list: (query: RecipeQuery): Promise<Page<Recipe>> => request('/recipes', { query: { ...query } }),
  get: (id: string): Promise<Recipe> => request(`/recipes/${encodeURIComponent(id)}`),
  nutrition: (id: string, includeOptional: boolean): Promise<RecipeNutrition> =>
    request(`/recipes/${encodeURIComponent(id)}/nutrition`, { query: { includeOptional } }),
  create: (input: RecipeInput): Promise<Recipe> =>
    request('/recipes', { method: 'POST', body: input }),
  update: (id: string, input: Partial<RecipeInput>): Promise<Recipe> =>
    request(`/recipes/${encodeURIComponent(id)}`, { method: 'PATCH', body: input }),
  remove: (id: string): Promise<void> =>
    request(`/recipes/${encodeURIComponent(id)}`, { method: 'DELETE' }),
};
