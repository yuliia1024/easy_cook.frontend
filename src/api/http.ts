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

/** `fetch` for streamed endpoints: the same `ApiError`s as `request`, the body left unread. */
export async function streamFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  let response: Response;
  try {
    response = await fetch(input, init);
  } catch (error) {
    if (init?.signal?.aborted) throw error;
    throw new ApiError(0, UNAVAILABLE);
  }
  if (!response.ok) throw await toApiError(response, init?.signal);
  return response;
}

export interface RequestOptions {
  method?: string;
  body?: unknown;
  query?: QueryParams;
  /** Cancels the request (e.g. TanStack Query's `signal`); the abort error is rethrown as it is. */
  signal?: AbortSignal;
}

/**
 * What a read endpoint function takes last: `{ signal }`. TanStack Query's context fits it, so
 * `queryFn: api.history` or `queryFn: (context) => api.get(id, context)` cancels the request.
 */
export type CallOptions = Pick<RequestOptions, 'signal'>;

export async function request<T>(path: string, init: RequestOptions = {}): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${BASE_URL}${path}${toQueryString(init.query)}`, {
      method: init.method ?? 'GET',
      headers: init.body === undefined ? undefined : { 'Content-Type': 'application/json' },
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
      signal: init.signal,
    });
  } catch (error) {
    if (init.signal?.aborted) throw error;
    throw new ApiError(0, UNAVAILABLE);
  }

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
