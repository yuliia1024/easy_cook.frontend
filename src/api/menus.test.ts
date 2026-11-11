import { buildMenu } from '../test/fixtures';
import { api, http, HttpResponse, server } from '../test/server';
import { menusApi } from './menus';

describe('menusApi', () => {
  it('lists by status in the query string', async () => {
    let url = '';
    server.use(
      http.get(api('/menus'), ({ request }) => {
        const parsed = new URL(request.url);
        url = parsed.pathname + parsed.search;
        return HttpResponse.json([]);
      }),
    );

    await menusApi.list('draft');

    expect(url).toBe('/api/menus?status=draft');
  });

  it('encodes the ids in the paths', async () => {
    const paths: string[] = [];
    server.use(
      http.get(api('/menus/*'), ({ request }) => {
        paths.push(new URL(request.url).pathname);
        return HttpResponse.json(buildMenu());
      }),
      http.post(api('/menus/*'), ({ request }) => {
        paths.push(new URL(request.url).pathname);
        return HttpResponse.json(buildMenu());
      }),
    );

    await menusApi.get('a/b');
    await menusApi.confirm('a/b', 'v?1');

    expect(paths).toEqual(['/api/menus/a%2Fb', '/api/menus/a%2Fb/versions/v%3F1/confirm']);
  });

  it('passes the signal of the reads to fetch', async () => {
    const controller = new AbortController();
    controller.abort();

    await expect(menusApi.list('all', { signal: controller.signal })).rejects.toMatchObject({
      name: 'AbortError',
    });
    await expect(menusApi.get('m1', { signal: controller.signal })).rejects.toMatchObject({
      name: 'AbortError',
    });
  });
});
