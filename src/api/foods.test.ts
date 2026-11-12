import { api, http, HttpResponse, server } from '../test/server';
import { foodsApi } from './foods';

describe('foodsApi', () => {
  it('encodes the id in the path', async () => {
    let path = '';
    server.use(
      http.get(api('/foods/*'), ({ request }) => {
        path = new URL(request.url).pathname;
        return HttpResponse.json({});
      }),
    );

    await foodsApi.get('../profile');

    expect(path).toBe('/api/foods/..%2Fprofile');
  });
});

describe('foodsApi query and signal', () => {
  it('builds the list query string and passes the signal of the reads', async () => {
    let url = '';
    server.use(
      http.get(api('/foods'), ({ request }) => {
        const parsed = new URL(request.url);
        url = parsed.pathname + parsed.search;
        return HttpResponse.json({ items: [], total: 0, page: 1, limit: 20 });
      }),
    );

    await foodsApi.list({ search: 'rice', state: 'boiled', source: undefined, page: 1 });
    expect(url).toBe('/api/foods?search=rice&state=boiled&page=1');

    const controller = new AbortController();
    controller.abort();
    await expect(foodsApi.list({}, { signal: controller.signal })).rejects.toMatchObject({
      name: 'AbortError',
    });
    await expect(foodsApi.get('f1', { signal: controller.signal })).rejects.toMatchObject({
      name: 'AbortError',
    });
  });
});
