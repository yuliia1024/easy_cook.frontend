import { request } from './http';
import type { FoodItem, FoodItemInput, FoodQuery, Page } from './types';

export const foodsApi = {
  list: (query: FoodQuery): Promise<Page<FoodItem>> => request('/foods', { query: { ...query } }),
  get: (id: string): Promise<FoodItem> => request(`/foods/${id}`),
  create: (input: FoodItemInput): Promise<FoodItem> =>
    request('/foods', { method: 'POST', body: input }),
  update: (id: string, input: Partial<FoodItemInput>): Promise<FoodItem> =>
    request(`/foods/${id}`, { method: 'PATCH', body: input }),
};
