import { buildNutrition, buildRecipe } from '../test/fixtures';
import { api, http, HttpResponse, server } from '../test/server';
import { recipesApi } from './recipes';

/** Records the path and query string of every request. */
function recordRequests(): { urls: string[] } {
  const seen = { urls: [] as string[] };
  server.use(
    http.all(api('/recipes*'), ({ request }) => {
      const url = new URL(request.url);
      seen.urls.push(url.pathname + url.search);
      if (url.pathname.endsWith('/nutrition')) return HttpResponse.json(buildNutrition());
      if (url.pathname === '/api/recipes' && request.method === 'GET')
        return HttpResponse.json({ items: [buildRecipe()], total: 1, page: 1, limit: 20 });
      return HttpResponse.json(buildRecipe());
    }),
  );
  return seen;
}

const aborted = (): AbortSignal => {
  const controller = new AbortController();
  controller.abort();
  return controller.signal;
};

describe('recipesApi', () => {
  it('builds the list query string, repeating diet tags and skipping empty values', async () => {
    const seen = recordRequests();

    const page = await recipesApi.list({
      search: 'oat',
      mealType: 'breakfast',
      dietType: ['vegan', 'low_carb'],
      page: 2,
    });
    await recipesApi.list({ search: '' });

    expect(page.items[0]?.allergens).toEqual([]);
    expect(seen.urls).toEqual([
      '/api/recipes?search=oat&mealType=breakfast&dietType=vegan&dietType=low_carb&page=2',
      '/api/recipes',
    ]);
  });

  it('encodes the id and asks for the nutrition with or without optional ingredients', async () => {
    const seen = recordRequests();

    await recipesApi.get('a/b');
    await recipesApi.nutrition('r1', true);
    await recipesApi.nutrition('r1', false);

    expect(seen.urls).toEqual([
      '/api/recipes/a%2Fb',
      '/api/recipes/r1/nutrition?includeOptional=true',
      '/api/recipes/r1/nutrition?includeOptional=false',
    ]);
  });

  it('passes the signal of the reads to fetch', async () => {
    recordRequests();

    await expect(recipesApi.list({}, { signal: aborted() })).rejects.toMatchObject({
      name: 'AbortError',
    });
    await expect(recipesApi.get('r1', { signal: aborted() })).rejects.toMatchObject({
      name: 'AbortError',
    });
    await expect(recipesApi.nutrition('r1', true, { signal: aborted() })).rejects.toMatchObject({
      name: 'AbortError',
    });
  });
});
