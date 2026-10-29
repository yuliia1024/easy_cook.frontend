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
