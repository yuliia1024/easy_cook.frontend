import { buildPreference } from '../test/fixtures';
import { api, apiError, http, HttpResponse, server } from '../test/server';
import { preferencesApi } from './preferences';

describe('preferencesApi', () => {
  it('lists, adds and removes with an encoded id', async () => {
    const calls: string[] = [];
    server.use(
      http.get(api('/preferences'), () => {
        calls.push('GET /api/preferences');
        return HttpResponse.json([buildPreference()]);
      }),
      http.post(api('/preferences'), async ({ request }) => {
        calls.push(`POST /api/preferences ${JSON.stringify(await request.json())}`);
        return HttpResponse.json(buildPreference(), { status: 201 });
      }),
      http.delete(api('/preferences/*'), ({ request }) => {
        calls.push(`DELETE ${new URL(request.url).pathname}`);
        return new HttpResponse(null, { status: 204 });
      }),
    );

    await expect(preferencesApi.list()).resolves.toEqual([buildPreference()]);
    await preferencesApi.add({ preferenceType: 'allergy', value: 'peanut' });
    await expect(preferencesApi.remove('a/b')).resolves.toBeUndefined();

    expect(calls).toEqual([
      'GET /api/preferences',
      'POST /api/preferences {"preferenceType":"allergy","value":"peanut"}',
      'DELETE /api/preferences/a%2Fb',
    ]);
  });

  it('reports 404 before the profile is saved', async () => {
    server.use(http.get(api('/preferences'), () => apiError(404, 'Profile not found')));
    await expect(preferencesApi.list()).rejects.toMatchObject({ status: 404 });
  });

  it('passes the signal to fetch', async () => {
    const controller = new AbortController();
    controller.abort();
    await expect(preferencesApi.list({ signal: controller.signal })).rejects.toMatchObject({
      name: 'AbortError',
    });
  });
});
