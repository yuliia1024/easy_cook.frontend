export const BASE_URL = import.meta.env.VITE_API_URL ?? '/api';

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

async function toApiError(response: Response): Promise<ApiError> {
  let body: ErrorBody = {};
  try {
    body = (await response.json()) as ErrorBody;
  } catch {
    // Not JSON (proxy error page, empty body).
  }
  const details = Array.isArray(body.message) ? body.message : [];
  const message =
    typeof body.message === 'string'
      ? body.message
      : (body.error ?? response.statusText ?? 'Request failed');
  return new ApiError(response.status, message, details);
}

const UNAVAILABLE = 'The server is unavailable. Check that the API is running.';

/** `fetch` for streamed endpoints: the same `ApiError`s as `request`, the body left unread. */
export async function streamFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  let response: Response;
  try {
    response = await fetch(input, init);
  } catch (error) {
    if (init?.signal?.aborted) throw error;
    throw new ApiError(0, UNAVAILABLE);
  }
  if (!response.ok) throw await toApiError(response);
  return response;
}

export async function request<T>(
  path: string,
  init: { method?: string; body?: unknown; query?: QueryParams } = {},
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${BASE_URL}${path}${toQueryString(init.query)}`, {
      method: init.method ?? 'GET',
      headers: init.body === undefined ? undefined : { 'Content-Type': 'application/json' },
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
    });
  } catch {
    throw new ApiError(0, UNAVAILABLE);
  }

  if (!response.ok) throw await toApiError(response);
  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}
