import { request, type CallOptions } from './http';
import type { FoodItem, FoodQuery, Page } from './types';

export const foodsApi = {
  list: (query: FoodQuery, { signal }: CallOptions = {}): Promise<Page<FoodItem>> =>
    request('/foods', { query: { ...query }, signal }),
  get: (id: string, { signal }: CallOptions = {}): Promise<FoodItem> =>
    request(`/foods/${encodeURIComponent(id)}`, { signal }),
};
