import { act, screen } from '@testing-library/react';
import { clearSession, resetSession } from '../../api/session';
import { buildAuthSession } from '../../test/fixtures';
import { renderRoutes } from '../../test/render';
import { api, apiError, http, HttpResponse, server } from '../../test/server';
import { RequireSession } from './RequireSession';
import { sessionLoader } from './session-loader';

function renderGuard(path: string) {
  return renderRoutes(
    [
      { path: '/login', element: <p>login page</p> },
      {
        element: <RequireSession />,
        loader: sessionLoader,
        children: [{ path: '*', element: <p>protected page</p> }],
      },
    ],
    path,
  );
}

describe('RequireSession', () => {
  it('renders the page for a signed-in user', async () => {
    renderGuard('/menus');
    expect(await screen.findByText('protected page')).toBeInTheDocument();
  });

  it('checks the session cookie before rendering', async () => {
    resetSession();
    server.use(http.get(api('/auth/session'), () => HttpResponse.json(buildAuthSession())));
    renderGuard('/menus');
    expect(await screen.findByText('protected page')).toBeInTheDocument();
  });

  it('sends to the login page and remembers the page without a session', async () => {
    resetSession();
    server.use(http.get(api('/auth/session'), () => apiError(401, 'Unauthorized')));
    const { router } = renderGuard('/menus/1?version=2');

    expect(await screen.findByText('login page')).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/login');
    expect(router.state.location.search).toBe('?next=%2Fmenus%2F1%3Fversion%3D2');
  });

  it('sends to the login page when the session ends on a page', async () => {
    const { router } = renderGuard('/recipes');
    await screen.findByText('protected page');

    act(() => clearSession('expired'));

    expect(await screen.findByText('login page')).toBeInTheDocument();
    expect(router.state.location.search).toBe('?next=%2Frecipes');
  });

  it('goes to the plain login page after signing out', async () => {
    const { router } = renderGuard('/recipes');
    await screen.findByText('protected page');

    act(() => clearSession('signedOut'));

    expect(await screen.findByText('login page')).toBeInTheDocument();
    expect(router.state.location.search).toBe('');
  });

  it('offers to try again when the session cannot be checked', async () => {
    resetSession();
    server.use(http.get(api('/auth/session'), () => HttpResponse.error()));
    const { user } = renderGuard('/menus');

    expect(await screen.findByText('Could not check your session')).toBeInTheDocument();

    server.use(http.get(api('/auth/session'), () => HttpResponse.json(buildAuthSession())));
    await user.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByText('protected page')).toBeInTheDocument();
  });
});
