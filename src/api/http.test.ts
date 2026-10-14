import { api, apiError, http, HttpResponse, server } from '../test/server';
import { ApiError, request, streamFetch, toQueryString } from './http';

describe('toQueryString', () => {
  it('skips empty values and repeats arrays', () => {
    expect(
      toQueryString({ search: '', page: 2, dietType: ['vegan', 'low_carb'], x: undefined }),
    ).toBe('?page=2&dietType=vegan&dietType=low_carb');
    expect(toQueryString({})).toBe('');
  });
});

describe('request', () => {
  it('sends JSON and parses the response', async () => {
    server.use(
      http.post(api('/things'), async ({ request: req }) =>
        HttpResponse.json({ received: await req.json() }),
      ),
    );
    await expect(request('/things', { method: 'POST', body: { a: 1 } })).resolves.toEqual({
      received: { a: 1 },
    });
  });

  it('returns undefined for 204', async () => {
    server.use(http.delete(api('/things/1'), () => new HttpResponse(null, { status: 204 })));
    await expect(request('/things/1', { method: 'DELETE' })).resolves.toBeUndefined();
  });

  it('turns the backend error body into an ApiError', async () => {
    server.use(http.post(api('/things'), () => apiError(400, ['name should not be empty'])));
    const error = await request('/things', { method: 'POST', body: {} }).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ status: 400, details: ['name should not be empty'] });
  });

  it('keeps the message of a non-validation error', async () => {
    server.use(http.get(api('/things/1'), () => apiError(404, 'Thing not found')));
    const error = (await request('/things/1').catch((e: unknown) => e)) as ApiError;
    expect(error.message).toBe('Thing not found');
    expect(error.isNotFound).toBe(true);
  });

  it('reports an unreachable server as status 0', async () => {
    server.use(http.get(api('/things'), () => HttpResponse.error()));
    await expect(request('/things')).rejects.toMatchObject({ status: 0 });
  });
});

describe('streamFetch', () => {
  it('returns the response unread', async () => {
    server.use(http.post(api('/stream'), () => new HttpResponse('data: 1\n\n')));
    const response = await streamFetch('/api/stream', { method: 'POST' });
    expect(await response.text()).toBe('data: 1\n\n');
  });

  it('throws the same ApiErrors as request', async () => {
    server.use(http.post(api('/stream'), () => apiError(404, 'No goal')));
    await expect(streamFetch('/api/stream', { method: 'POST' })).rejects.toMatchObject({
      status: 404,
      message: 'No goal',
    });

    server.use(http.post(api('/stream'), () => HttpResponse.error()));
    await expect(streamFetch('/api/stream', { method: 'POST' })).rejects.toMatchObject({
      status: 0,
    });
  });

  it('rethrows an abort as it is', async () => {
    const controller = new AbortController();
    controller.abort();
    await expect(
      streamFetch('/api/stream', { method: 'POST', signal: controller.signal }),
    ).rejects.not.toBeInstanceOf(ApiError);
  });
});
