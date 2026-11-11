import { request, type CallOptions } from './http';
import type { FoodItem, FoodItemInput, FoodQuery, Page } from './types';

export const foodsApi = {
  list: (query: FoodQuery, { signal }: CallOptions = {}): Promise<Page<FoodItem>> =>
    request('/foods', { query: { ...query }, signal }),
  get: (id: string, { signal }: CallOptions = {}): Promise<FoodItem> =>
    request(`/foods/${encodeURIComponent(id)}`, { signal }),
  create: (input: FoodItemInput): Promise<FoodItem> =>
    request('/foods', { method: 'POST', body: input }),
  update: (id: string, input: Partial<FoodItemInput>): Promise<FoodItem> =>
    request(`/foods/${encodeURIComponent(id)}`, { method: 'PATCH', body: input }),
};
