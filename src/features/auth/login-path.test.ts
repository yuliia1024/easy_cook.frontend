import { loginPath, safeNextPath } from './login-path';

describe('loginPath', () => {
  it('keeps the page to come back to', () => {
    expect(loginPath({ pathname: '/menus/1', search: '?version=2', hash: '' })).toBe(
      '/login?next=%2Fmenus%2F1%3Fversion%3D2',
    );
    expect(loginPath({ pathname: '/', search: '', hash: '' })).toBe('/login');
    expect(loginPath()).toBe('/login');
  });
});

describe('safeNextPath', () => {
  it.each([
    ['/recipes?search=soup', '/recipes?search=soup'],
    ['/menus/1?version=2#day-3', '/menus/1?version=2#day-3'],
    [null, '/'],
    ['', '/'],
    ['recipes', '/'],
    ['https://evil.example', '/'],
    ['//evil.example', '/'],
    ['/\\evil.example', '/'],
    // The browser drops tabs and line breaks: these are `//evil.example`.
    ['/\t/evil.example', '/'],
    ['/\n/evil.example', '/'],
    ['/\r\n/evil.example', '/'],
    ['\\/evil.example', '/'],
    ['/login', '/'],
    ['/login/', '/'],
    ['/login?next=/x', '/'],
  ])('%j -> %s', (next, expected) => {
    expect(safeNextPath(next)).toBe(expected);
  });

  it('keeps an encoded path as it is (a path of this app)', () => {
    expect(safeNextPath('/%2F/evil.example')).toBe('/%2F/evil.example');
    expect(safeNextPath('/%5Cevil.example')).toBe('/%5Cevil.example');
  });

  it('allows the paths of the given origin only', () => {
    expect(safeNextPath('/chat', 'https://app.example')).toBe('/chat');
    expect(safeNextPath('/\t/evil.example', 'https://app.example')).toBe('/');
  });
});
