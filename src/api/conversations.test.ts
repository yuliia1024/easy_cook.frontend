import { buildConversation } from '../test/fixtures';
import { api, http, HttpResponse, server } from '../test/server';
import { conversationsApi } from './conversations';

describe('conversationsApi', () => {
  it('encodes the id in the path', async () => {
    let path = '';
    server.use(
      http.get(api('/conversations/*'), ({ request }) => {
        path = new URL(request.url).pathname;
        return HttpResponse.json(buildConversation());
      }),
    );

    await conversationsApi.get('../menus');

    expect(path).toBe('/api/conversations/..%2Fmenus');
  });

  it('passes the signal of the reads to fetch', async () => {
    const controller = new AbortController();
    controller.abort();

    await expect(conversationsApi.list({ signal: controller.signal })).rejects.toMatchObject({
      name: 'AbortError',
    });
    await expect(conversationsApi.get('c1', { signal: controller.signal })).rejects.toMatchObject({
      name: 'AbortError',
    });
  });

  it('confirms a preference change with the change as the body', async () => {
    const change = { action: 'add', preferenceType: 'allergy', value: 'peanut' } as const;
    let body: unknown;
    let path = '';
    server.use(
      http.post(api('/conversations/:id/preference-change/confirm'), async ({ request }) => {
        path = new URL(request.url).pathname;
        body = await request.json();
        return HttpResponse.json({ status: 'applied', change });
      }),
    );

    await expect(conversationsApi.confirmPreferenceChange('c1', change)).resolves.toEqual({
      status: 'applied',
      change,
    });
    expect(path).toBe('/api/conversations/c1/preference-change/confirm');
    expect(body).toEqual(change);
  });
});
