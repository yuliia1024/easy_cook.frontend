import { screen } from '@testing-library/react';
import { CSRF_HEADER } from '../../api/http';
import { getSessionState, setSession } from '../../api/session';
import { buildAuthSession, buildUser } from '../../test/fixtures';
import { renderRoutes } from '../../test/render';
import { api, apiError, http, HttpResponse, server } from '../../test/server';
import { UserMenu } from './UserMenu';

function renderMenu() {
  return renderRoutes(
    [
      { path: '/login', element: <p>login page</p> },
      { path: '*', element: <UserMenu /> },
    ],
    '/menus',
  );
}

describe('UserMenu', () => {
  it('shows the user with the avatar', () => {
    setSession(
      buildAuthSession({ user: buildUser({ avatarUrl: 'https://lh3.example/avatar.png' }) }),
    );
    const { container } = renderMenu();
    expect(screen.getByText('Olena Cook')).toBeInTheDocument();
    expect(screen.getByText('cook@example.com')).toBeInTheDocument();
    expect(container.querySelector('img')).toHaveAttribute('src', 'https://lh3.example/avatar.png');
  });

  it('shows an initial without a name or avatar', () => {
    setSession(buildAuthSession({ user: buildUser({ id: 'u2', name: null }) }));
    renderMenu();
    expect(screen.getByText('C')).toBeInTheDocument();
    expect(screen.getByText('cook@example.com')).toBeInTheDocument();
  });

  it.each([['Sign out', '/auth/logout']])(
    '%s ends the session, clears the cache and goes to the login page',
    async (name, path) => {
      let csrf: string | null = null;
      server.use(
        http.post(api(path), ({ request }) => {
          csrf = request.headers.get(CSRF_HEADER);
          return new HttpResponse(null, { status: 204 });
        }),
      );
      const { user, router } = renderMenu();

      await user.click(screen.getByRole('button', { name }));

      expect(await screen.findByText('login page')).toBeInTheDocument();
      expect(router.state.location.search).toBe('');
      expect(csrf).toBe('csrf-1');
      expect(getSessionState()).toMatchObject({ status: 'signedOut', endedBy: 'signedOut' });
    },
  );

  it('signs out when the backend answers 401 (the session had ended already)', async () => {
    server.use(http.post(api('/auth/logout'), () => apiError(401, 'Unauthorized')));
    const { user } = renderMenu();

    await user.click(screen.getByRole('button', { name: 'Sign out' }));

    expect(await screen.findByText('login page')).toBeInTheDocument();
    expect(getSessionState().endedBy).toBe('signedOut');
  });

  it.each([['Sign out', '/auth/logout', 500]])(
    '%s keeps the user signed in when the backend fails (%s %i), and can be tried again',
    async (name, path, status) => {
      let calls = 0;
      server.use(
        http.post(api(path), () => {
          calls += 1;
          return calls === 1
            ? apiError(status, 'Sessions are unavailable')
            : new HttpResponse(null, { status: 204 });
        }),
      );
      const { user, router } = renderMenu();

      await user.click(screen.getByRole('button', { name }));

      expect(await screen.findByRole('alert')).toHaveTextContent(
        'Could not sign out, you are still signed in. Sessions are unavailable',
      );
      expect(getSessionState().status).toBe('signedIn');
      expect(router.state.location.pathname).toBe('/menus');

      await user.click(screen.getByRole('button', { name }));

      expect(await screen.findByText('login page')).toBeInTheDocument();
      expect(getSessionState()).toMatchObject({ status: 'signedOut', endedBy: 'signedOut' });
    },
  );

  it('keeps the user signed in when the server cannot be reached', async () => {
    server.use(http.post(api('/auth/logout'), () => HttpResponse.error()));
    const { user } = renderMenu();

    await user.click(screen.getByRole('button', { name: 'Sign out' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('The server is unavailable');
    expect(getSessionState().status).toBe('signedIn');
    expect(screen.queryByText('login page')).not.toBeInTheDocument();
  });
});
