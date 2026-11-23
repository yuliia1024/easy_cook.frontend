import { api, apiError, http, HttpResponse, server } from '../test/server';
import { buildAuthSession } from '../test/fixtures';
import { ApiError, CSRF_HEADER, request, streamFetch, toQueryString } from './http';
import { getCsrfToken, getSessionState } from './session';

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

describe('the session', () => {
  const csrfRejected = () => apiError(403, 'Invalid CSRF token');

  it('sends the cookie with every request and no Authorization header', async () => {
    let seen: Request | undefined;
    server.use(
      http.get(api('/things'), ({ request: req }) => {
        seen = req;
        return HttpResponse.json({});
      }),
    );
    await request('/things');
    expect(seen?.credentials).toBe('include');
    expect(seen?.headers.get('Authorization')).toBeNull();
  });

  it('sends the CSRF token with unsafe methods only', async () => {
    const tokens: Record<string, string | null> = {};
    const record = ({ request: req }: { request: Request }) => {
      tokens[req.method] = req.headers.get(CSRF_HEADER);
      return HttpResponse.json({});
    };
    server.use(
      http.get(api('/things'), record),
      http.post(api('/things'), record),
      http.put(api('/things'), record),
      http.patch(api('/things'), record),
      http.delete(api('/things'), record),
    );
    for (const method of ['GET', 'POST', 'PUT', 'PATCH', 'DELETE']) {
      await request('/things', { method, body: method === 'GET' ? undefined : {} });
    }
    expect(tokens).toEqual({
      GET: null,
      POST: 'csrf-1',
      PUT: 'csrf-1',
      PATCH: 'csrf-1',
      DELETE: 'csrf-1',
    });
  });

  it('sends a body as JSON, the stream included', async () => {
    const types: (string | null)[] = [];
    server.use(
      http.post(api('/things'), ({ request: req }) => {
        types.push(req.headers.get('Content-Type'));
        return HttpResponse.json({});
      }),
    );
    await request('/things', { method: 'POST', body: { a: 1 } });
    await streamFetch('/api/things', { method: 'POST', body: '{}' });
    expect(types).toEqual(['application/json', 'application/json']);
  });

  it('gets a new CSRF token once for requests rejected together and retries each once', async () => {
    let probes = 0;
    server.use(
      http.get(api('/auth/session'), async () => {
        probes += 1;
        await new Promise((resolve) => setTimeout(resolve, 10));
        return HttpResponse.json(buildAuthSession({ csrfToken: 'csrf-2' }));
      }),
      http.post(api('/things'), async ({ request: req }) =>
        req.headers.get(CSRF_HEADER) === 'csrf-2'
          ? HttpResponse.json({ got: await req.json() })
          : csrfRejected(),
      ),
    );

    const results = await Promise.all([
      request('/things', { method: 'POST', body: { n: 1 } }),
      request('/things', { method: 'POST', body: { n: 2 } }),
    ]);

    expect(results).toEqual([{ got: { n: 1 } }, { got: { n: 2 } }]);
    expect(probes).toBe(1);
    expect(getCsrfToken()).toBe('csrf-2');
    expect(getSessionState().status).toBe('signedIn');
  });

  it('retries a CSRF rejection only once and keeps other 403s as they are', async () => {
    let posts = 0;
    server.use(
      http.get(api('/auth/session'), () => HttpResponse.json(buildAuthSession())),
      http.post(api('/things'), () => {
        posts += 1;
        return csrfRejected();
      }),
      http.post(api('/other'), () => apiError(403, 'Forbidden')),
    );
    await expect(request('/things', { method: 'POST', body: {} })).rejects.toMatchObject({
      status: 403,
    });
    expect(posts).toBe(2);

    await expect(request('/other', { method: 'POST', body: {} })).rejects.toMatchObject({
      status: 403,
      message: 'Forbidden',
    });
  });

  it('ends the session on a 401', async () => {
    server.use(http.get(api('/things'), () => apiError(401, 'Unauthorized')));
    await expect(request('/things')).rejects.toMatchObject({ status: 401 });
    expect(getSessionState()).toMatchObject({
      status: 'signedOut',
      user: null,
      endedBy: 'expired',
    });
    expect(getCsrfToken()).toBeNull();
  });

  it('ends the session when the CSRF token cannot be re-fetched for a 401', async () => {
    server.use(
      http.get(api('/auth/session'), () => apiError(401, 'Unauthorized')),
      http.delete(api('/things/1'), () => csrfRejected()),
    );
    await expect(request('/things/1', { method: 'DELETE' })).rejects.toMatchObject({
      status: 401,
    });
    expect(getSessionState().endedBy).toBe('expired');
  });

  it('leaves the session alone without session handling', async () => {
    server.use(http.post(api('/auth/google'), () => apiError(401, 'Invalid Google token')));
    await expect(
      request('/auth/google', { method: 'POST', body: {}, session: false }),
    ).rejects.toMatchObject({ status: 401 });
    expect(getSessionState().status).toBe('signedIn');
  });

  it('gives the stream the cookie, the CSRF token and the same 401 handling', async () => {
    let seen: Request | undefined;
    server.use(
      http.post(api('/stream'), ({ request: req }) => {
        seen = req;
        return new HttpResponse('data: 1\n\n');
      }),
    );
    await streamFetch('/api/stream', { method: 'POST', body: '{}' });
    expect(seen?.credentials).toBe('include');
    expect(seen?.headers.get(CSRF_HEADER)).toBe('csrf-1');

    server.use(http.post(api('/stream'), () => apiError(401, 'Unauthorized')));
    await expect(streamFetch('/api/stream', { method: 'POST', body: '{}' })).rejects.toMatchObject({
      status: 401,
    });
    expect(getSessionState().status).toBe('signedOut');
  });

  it('retries the stream after a CSRF rejection', async () => {
    server.use(
      http.get(api('/auth/session'), () =>
        HttpResponse.json(buildAuthSession({ csrfToken: 'csrf-2' })),
      ),
      http.post(api('/stream'), async ({ request: req }) =>
        req.headers.get(CSRF_HEADER) === 'csrf-2' && (await req.text()) === '{"a":1}'
          ? new HttpResponse('data: 1\n\n')
          : csrfRejected(),
      ),
    );
    const response = await streamFetch(new URL('http://localhost/api/stream'), {
      method: 'POST',
      body: '{"a":1}',
    });
    expect(await response.text()).toBe('data: 1\n\n');
  });
});
