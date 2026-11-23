import { clearSession, getCsrfToken, setSession } from './session';
import type { AuthSession } from './types';

// `||`: an empty `VITE_API_URL=` in .env means the default too.
export const BASE_URL = import.meta.env.VITE_API_URL || '/api';

/** The backend error body: `{ statusCode, message, error, path, timestamp }`. */
interface ErrorBody {
  statusCode?: number;
  message?: string | string[];
  error?: string;
}

export class ApiError extends Error {
  readonly status: number;
  /** Validation messages, one per field problem. */
  readonly details: string[];

  constructor(status: number, message: string, details: string[] = []) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
  }

  get isNotFound(): boolean {
    return this.status === 404;
  }
}

export type QueryParams = Record<string, string | number | boolean | string[] | undefined>;

export function toQueryString(params: QueryParams = {}): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === '') continue;
    if (Array.isArray(value)) value.forEach((item) => search.append(key, item));
    else search.append(key, String(value));
  }
  const query = search.toString();
  return query ? `?${query}` : '';
}

const UNAVAILABLE = 'The server is unavailable. Check that the API is running.';

/**
 * Gateway statuses: the dev proxy answers 502 when the backend is down. A 503 is not here: the
 * backend sends its own (database or assistant unavailable) with a JSON message worth showing.
 */
const GATEWAY_STATUSES = new Set([502, 504]);

async function toApiError(response: Response, signal?: AbortSignal | null): Promise<ApiError> {
  if (GATEWAY_STATUSES.has(response.status)) return new ApiError(0, UNAVAILABLE);
  let body: ErrorBody | undefined;
  try {
    body = (await response.json()) as ErrorBody;
  } catch (error) {
    // Cancelled while the body was read: the abort error, not a fake API error.
    if (signal?.aborted) throw error;
    // Not JSON (proxy error page, empty body).
  }
  // A 5xx without the backend's JSON body (a 503 or 500 page, an empty body) comes from a proxy.
  if (response.status >= 500 && (typeof body !== 'object' || body === null)) {
    return new ApiError(0, UNAVAILABLE);
  }
  const errorBody: ErrorBody = body && typeof body === 'object' ? body : {};
  const details = Array.isArray(errorBody.message) ? errorBody.message : [];
  const message =
    typeof errorBody.message === 'string'
      ? errorBody.message
      : errorBody.error || response.statusText || 'Request failed';
  return new ApiError(response.status, message, details);
}

/** `fetch` turning a network failure into an `ApiError` (an abort is rethrown as it is). */
async function send(input: RequestInfo | URL, init: RequestInit): Promise<Response> {
  try {
    return await fetch(input, init);
  } catch (error) {
    if (init.signal?.aborted) throw error;
    throw new ApiError(0, UNAVAILABLE);
  }
}

export const SESSION_EXPIRED = 'Your session has ended. Sign in again.';

export const CSRF_HEADER = 'X-CSRF-Token';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

let refreshingCsrf: Promise<void> | null = null;

async function refetchCsrf(): Promise<void> {
  const response = await send(`${BASE_URL}/auth/session`, { credentials: 'include' });
  if (response.status === 401) {
    clearSession('expired');
    throw new ApiError(401, SESSION_EXPIRED);
  }
  if (!response.ok) throw await toApiError(response);
  setSession((await response.json()) as AuthSession);
}

/**
 * Gets a new CSRF token from `GET /auth/session`. Single flight: unsafe requests rejected at the
 * same time share one call.
 */
export function refreshCsrfToken(): Promise<void> {
  refreshingCsrf ??= refetchCsrf().finally(() => {
    refreshingCsrf = null;
  });
  return refreshingCsrf;
}

/** The session cookie always, the JSON content type with a body, the CSRF token on an unsafe method. */
function withSession(init: RequestInit): RequestInit {
  const headers = new Headers(init.headers);
  // The API refuses a body of an unsafe method that is not JSON (415).
  if (init.body != null && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  const csrf = getCsrfToken();
  if (!SAFE_METHODS.has((init.method ?? 'GET').toUpperCase()) && csrf) {
    headers.set(CSRF_HEADER, csrf);
  }
  return { ...init, headers, credentials: 'include' };
}

async function isCsrfRejection(response: Response): Promise<boolean> {
  if (response.status !== 403) return false;
  try {
    const body = (await response.clone().json()) as ErrorBody;
    const message = Array.isArray(body.message) ? body.message.join(' ') : (body.message ?? '');
    return /csrf/i.test(`${message} ${body.error ?? ''}`);
  } catch {
    return false;
  }
}

/**
 * `fetch` with the session. An unsafe request rejected for its CSRF token gets a new token and is
 * sent once more (the body must be re-sendable: a string, as here). A 401 ends the session.
 */
async function sendWithSession(input: string, init: RequestInit): Promise<Response> {
  let response = await send(input, withSession(init));
  if (
    !SAFE_METHODS.has((init.method ?? 'GET').toUpperCase()) &&
    (await isCsrfRejection(response))
  ) {
    await refreshCsrfToken();
    response = await send(input, withSession(init));
  }
  if (response.status === 401) clearSession('expired');
  return response;
}

/**
 * `fetch` for streamed endpoints (the AI SDK transport): the session, CSRF and 401 handling of
 * `request`, the same `ApiError`s, the body left unread.
 */
export async function streamFetch(
  input: RequestInfo | URL,
  init: RequestInit = {},
): Promise<Response> {
  const url = input instanceof Request ? input.url : String(input);
  const response = await sendWithSession(url, init);
  if (!response.ok) throw await toApiError(response, init.signal);
  return response;
}

export interface RequestOptions {
  method?: string;
  body?: unknown;
  query?: QueryParams;
  /** Cancels the request (e.g. TanStack Query's `signal`); the abort error is rethrown as it is. */
  signal?: AbortSignal;
  /**
   * Handle the session (default true): a 401 ends it, a CSRF rejection is retried with a new
   * token. False for the sign-in and the session probe, whose 401 / 403 mean something else.
   */
  session?: boolean;
}

/**
 * What a read endpoint function takes last: `{ signal }`. TanStack Query's context fits it, so
 * `queryFn: api.history` or `queryFn: (context) => api.get(id, context)` cancels the request.
 */
export type CallOptions = Pick<RequestOptions, 'signal'>;

export async function request<T>(path: string, init: RequestOptions = {}): Promise<T> {
  const url = `${BASE_URL}${path}${toQueryString(init.query)}`;
  const fetchInit: RequestInit = {
    method: init.method ?? 'GET',
    headers: init.body === undefined ? undefined : { 'Content-Type': 'application/json' },
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
    signal: init.signal,
  };
  const response =
    init.session === false
      ? await send(url, withSession(fetchInit))
      : await sendWithSession(url, fetchInit);

  if (!response.ok) throw await toApiError(response, init.signal);
  if (response.status === 204) return undefined as T;
  try {
    return (await response.json()) as T;
  } catch (error) {
    if (init.signal?.aborted) throw error;
    // An empty or non-JSON 2xx body (e.g. an HTML page served for the path).
    throw new ApiError(response.status, 'The server sent an unexpected response.');
  }
}
