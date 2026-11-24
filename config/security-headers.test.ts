import { describe, expect, it } from 'vitest';
import {
  apiOrigin,
  contentSecurityPolicy,
  pageHeaders,
  SECURITY_HEADERS,
} from './security-headers';

/** The CSP as `{ directive: sources }`. */
function parse(policy: string): Record<string, string[]> {
  return Object.fromEntries(
    policy.split('; ').map((directive) => {
      const [name, ...sources] = directive.split(' ');
      return [name, sources];
    }),
  );
}

describe('apiOrigin', () => {
  it.each([
    [undefined, null],
    ['', null],
    ['/api', null],
    ['http://localhost:3100/api', 'http://localhost:3100'],
    ['https://api.example.com/v1/api', 'https://api.example.com'],
  ])('%s -> %s', (url, origin) => {
    expect(apiOrigin(url)).toBe(origin);
  });
});

describe('contentSecurityPolicy', () => {
  it('allows the app, the Google button, the font and Google avatars only', () => {
    expect(parse(contentSecurityPolicy('/api'))).toEqual({
      'default-src': ["'self'"],
      'script-src': ["'self'", 'https://accounts.google.com/gsi/client'],
      'style-src': [
        "'self'",
        "'unsafe-inline'",
        'https://fonts.googleapis.com',
        'https://accounts.google.com/gsi/style',
      ],
      'font-src': ['https://fonts.gstatic.com'],
      'img-src': ["'self'", 'data:', 'https://*.googleusercontent.com'],
      'connect-src': ["'self'", 'https://accounts.google.com/gsi/'],
      'frame-src': ['https://accounts.google.com/gsi/'],
      'object-src': ["'none'"],
      'base-uri': ["'self'"],
      'form-action': ["'self'"],
      'frame-ancestors': ["'none'"],
    });
  });

  it('lets the page call an API on another origin', () => {
    expect(parse(contentSecurityPolicy('https://api.example.com/api'))['connect-src']).toEqual([
      "'self'",
      'https://api.example.com',
      'https://accounts.google.com/gsi/',
    ]);
  });

  it('never allows inline or eval scripts, nor any source with a bare *', () => {
    const policy = parse(contentSecurityPolicy());
    expect(policy['script-src'].join(' ')).not.toMatch(/unsafe|data:|\*/);
    expect(policy['default-src']).toEqual(["'self'"]);
    expect(contentSecurityPolicy()).not.toMatch(/unsafe-eval|\s\*(\s|;|$)/);
  });
});

describe('pageHeaders', () => {
  it('adds the CSP to the other security headers', () => {
    expect(pageHeaders('/api')).toEqual({
      ...SECURITY_HEADERS,
      'Content-Security-Policy': contentSecurityPolicy('/api'),
    });
    expect(SECURITY_HEADERS).toMatchObject({
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'Cross-Origin-Opener-Policy': 'same-origin-allow-popups',
    });
  });
});
