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

  it('falls back to the status text, then to a generic message, without a JSON body', async () => {
    server.use(
      http.get(
        api('/things'),
        () => new HttpResponse('nope', { status: 418, statusText: 'Teapot' }),
      ),
    );
    await expect(request('/things')).rejects.toMatchObject({ status: 418, message: 'Teapot' });

    // MSW fills in a default status text; a real HTTP/2 response has none.
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response(null, { status: 418, statusText: '' }));
    await expect(request('/things')).rejects.toMatchObject({
      status: 418,
      message: 'Request failed',
    });
    fetchSpy.mockRestore();
  });

  it('turns a non-JSON 2xx body into an ApiError', async () => {
    server.use(http.get(api('/things'), () => HttpResponse.text('<!doctype html>')));
    const error = await request('/things').catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ status: 200 });

    server.use(http.get(api('/things'), () => new HttpResponse(null, { status: 200 })));
    await expect(request('/things')).rejects.toBeInstanceOf(ApiError);
  });

  it.each([
    ['the dev proxy 502', () => new HttpResponse(null, { status: 502 })],
    ['a gateway timeout', () => HttpResponse.json({ message: 'Timeout' }, { status: 504 })],
    ['an empty 500', () => new HttpResponse(null, { status: 500 })],
    ['a 503 HTML page', () => HttpResponse.html('<h1>Down</h1>', { status: 503 })],
  ])('reports %s as an unavailable server', async (_name, resolver) => {
    server.use(http.get(api('/things'), resolver));
    await expect(request('/things')).rejects.toMatchObject({
      status: 0,
      message: 'The server is unavailable. Check that the API is running.',
    });
  });

  it('keeps the message of a 5xx sent by the backend', async () => {
    server.use(http.get(api('/things'), () => apiError(503, 'Database is unavailable')));
    await expect(request('/things')).rejects.toMatchObject({
      status: 503,
      message: 'Database is unavailable',
    });
  });

  it('passes the signal to fetch and rethrows an abort as it is', async () => {
    let aborted: boolean | undefined;
    server.use(
      http.get(api('/things'), ({ request: req }) => {
        aborted = req.signal.aborted;
        return HttpResponse.json({});
      }),
    );
    await request('/things', { signal: new AbortController().signal });
    expect(aborted).toBe(false);

    const controller = new AbortController();
    controller.abort();
    const error = await request('/things', { signal: controller.signal }).catch((e: unknown) => e);
    expect(error).not.toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ name: 'AbortError' });
  });
});

describe('an abort while the body is read', () => {
  afterEach(() => vi.restoreAllMocks());

  /** A response whose body read is cut off by `controller.abort()`. */
  const abortingResponse = (controller: AbortController, status: number) =>
    ({
      ok: status < 400,
      status,
      statusText: '',
      json: () => {
        controller.abort();
        return Promise.reject(new DOMException('The operation was aborted.', 'AbortError'));
      },
    }) as unknown as Response;

  it.each([200, 400])('is rethrown as it is, not as an ApiError (status %i)', async (status) => {
    const controller = new AbortController();
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(abortingResponse(controller, status));

    const error = await request('/things', { signal: controller.signal }).catch((e: unknown) => e);

    expect(error).not.toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ name: 'AbortError' });
  });

  it('is rethrown by streamFetch for an error response', async () => {
    const controller = new AbortController();
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(abortingResponse(controller, 400));

    const error = await streamFetch('/api/stream', { signal: controller.signal }).catch(
      (e: unknown) => e,
    );

    expect(error).toMatchObject({ name: 'AbortError' });
  });

  it('still reads a broken body without a signal as an ApiError', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(abortingResponse(new AbortController(), 200));
    await expect(request('/things')).rejects.toBeInstanceOf(ApiError);
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

describe('BASE_URL', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it('falls back to /api when VITE_API_URL is empty', async () => {
    vi.stubEnv('VITE_API_URL', '');
    vi.resetModules();
    expect((await import('./http')).BASE_URL).toBe('/api');

    vi.stubEnv('VITE_API_URL', 'http://localhost:3100/api');
    vi.resetModules();
    expect((await import('./http')).BASE_URL).toBe('http://localhost:3100/api');
  });
});
