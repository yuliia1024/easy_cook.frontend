import type { Location } from 'react-router';

export const LOGIN_PATH = '/login';

/** The login page that brings the user back to `from` once signed in. */
export function loginPath(from?: Pick<Location, 'pathname' | 'search' | 'hash'>): string {
  const next = from ? `${from.pathname}${from.search}${from.hash}` : '/';
  return next === '/' ? LOGIN_PATH : `${LOGIN_PATH}?next=${encodeURIComponent(next)}`;
}

/**
 * `next` when it is a page of this app, else `/` (no open redirect to another site). Parsed as the
 * browser does: it drops tabs and line breaks and reads `\` as `/`, so `/\t/evil.example` is
 * `//evil.example`, another site. Only a path of `origin` passes, rebuilt from the parsed URL.
 */
export function safeNextPath(next: string | null, origin = window.location.origin): string {
  if (!next?.startsWith('/')) return '/';
  let url: URL;
  try {
    url = new URL(next, origin);
  } catch {
    return '/';
  }
  if (url.origin !== origin) return '/';
  if (url.pathname.replace(/\/+$/, '') === LOGIN_PATH) return '/';
  return `${url.pathname}${url.search}${url.hash}`;
}
