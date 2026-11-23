/**
 * Security headers of the pages Vite serves. The production host must send the same ones
 * (see README, "Security headers"); `npm run preview` serves the build with them, so a script,
 * style or request the policy would block shows up before the deploy.
 */

/** Google Identity Services: the sign-in button script, its styles, iframe and requests. */
const GOOGLE_IDENTITY = 'https://accounts.google.com/gsi/';

/** The origin of an absolute `VITE_API_URL`; null for a path on this origin (`/api`). */
export function apiOrigin(apiUrl: string | undefined): string | null {
  if (!apiUrl || !/^https?:\/\//i.test(apiUrl)) return null;
  return new URL(apiUrl).origin;
}

/**
 * Only what the app loads: its own files, the Google button, the Inter font and Google avatars.
 * Scripts: no `unsafe-inline` or `unsafe-eval` (the build has no inline script). Styles allow
 * `unsafe-inline`: the GIS script adds a `<style>` and `style` attributes, whose hashes Google
 * may change with any release; an injected style cannot run code.
 */
export function contentSecurityPolicy(apiUrl?: string): string {
  const api = apiOrigin(apiUrl);
  const directives: Record<string, string[]> = {
    'default-src': ["'self'"],
    'script-src': ["'self'", `${GOOGLE_IDENTITY}client`],
    'style-src': [
      "'self'",
      "'unsafe-inline'",
      'https://fonts.googleapis.com',
      `${GOOGLE_IDENTITY}style`,
    ],
    'font-src': ['https://fonts.gstatic.com'],
    // The user's Google avatar (`picture` of the ID token).
    'img-src': ["'self'", 'data:', 'https://*.googleusercontent.com'],
    'connect-src': ["'self'", ...(api ? [api] : []), GOOGLE_IDENTITY],
    'frame-src': [GOOGLE_IDENTITY],
    'object-src': ["'none'"],
    'base-uri': ["'self'"],
    'form-action': ["'self'"],
    // No page of the app inside a frame of another site (clickjacking).
    'frame-ancestors': ["'none'"],
  };
  return Object.entries(directives)
    .map(([name, sources]) => `${name} ${sources.join(' ')}`)
    .join('; ');
}

/** The headers without the CSP: the dev server sends these (its React Refresh script is inline). */
export const SECURITY_HEADERS: Readonly<Record<string, string>> = {
  'X-Content-Type-Options': 'nosniff',
  // For browsers without `frame-ancestors`.
  'X-Frame-Options': 'DENY',
  // The `next` page of the login URL never reaches another site.
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  // `same-origin` would break the Google sign-in popup.
  'Cross-Origin-Opener-Policy': 'same-origin-allow-popups',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=(), usb=()',
};

/** Every header of a built page: `SECURITY_HEADERS` and the CSP. */
export function pageHeaders(apiUrl?: string): Record<string, string> {
  return { ...SECURITY_HEADERS, 'Content-Security-Policy': contentSecurityPolicy(apiUrl) };
}
