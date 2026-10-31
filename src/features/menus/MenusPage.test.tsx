import { screen } from '@testing-library/react';
import { buildMenuSummary } from '../../test/fixtures';
import { renderRoutes } from '../../test/render';
import { api, apiError, http, HttpResponse, server } from '../../test/server';
import { MenusPage } from './MenusPage';

const routes = [
  { path: '/menus', element: <MenusPage /> },
  { path: '/menus/:id', element: <p>menu details</p> },
];

describe('MenusPage', () => {
  it('lists menus with their status and links to them', async () => {
    server.use(
      http.get(api('/menus'), () =>
        HttpResponse.json([
          buildMenuSummary({ versionCount: 3, confirmedVersionId: 'v' }),
          buildMenuSummary({ id: 'other', title: 'Draft menu' }),
        ]),
      ),
    );
    const { user, router } = renderRoutes(routes, '/menus?status=all');

    const confirmed = await screen.findByRole('link', { name: /Menu for 1 day/ });
    expect(confirmed).toHaveTextContent('3 versions');
    expect(confirmed).toHaveTextContent('confirmed');
    const draft = screen.getByRole('link', { name: /Draft menu/ });
    expect(draft).toHaveTextContent('1 version ·');
    expect(draft).toHaveTextContent('draft');

    await user.click(draft);
    expect(await screen.findByText('menu details')).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/menus/other');
  });

  it('shows the confirmed menus first and the drafts on request', async () => {
    const statuses: Array<string | null> = [];
    server.use(
      http.get(api('/menus'), ({ request }) => {
        const status = new URL(request.url).searchParams.get('status');
        statuses.push(status);
        return HttpResponse.json(
          status === 'draft' ? [buildMenuSummary({ id: 'd', title: 'Draft menu' })] : [],
        );
      }),
    );
    const { user, router } = renderRoutes(routes, '/menus');

    expect(await screen.findByText('No confirmed menus yet')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Confirmed' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );

    await user.click(screen.getByRole('button', { name: 'Drafts' }));

    expect(await screen.findByRole('link', { name: /Draft menu/ })).toBeInTheDocument();
    expect(router.state.location.search).toBe('?status=draft');
    expect(statuses).toEqual(['confirmed', 'draft']);

    await user.click(screen.getByRole('button', { name: 'Confirmed' }));
    expect(await screen.findByText('No confirmed menus yet')).toBeInTheDocument();
    expect(router.state.location.search).toBe('');
  });

  it('shows an empty state that sends to the chat instead of creating a menu', async () => {
    server.use(http.get(api('/menus'), () => HttpResponse.json([])));
    renderRoutes(routes, '/menus?status=all');

    expect(await screen.findByText('No menus yet')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /generate|create/i })).not.toBeInTheDocument();
    expect(screen.getByRole('link')).toHaveAttribute('href', '/chat');
    expect(screen.getByRole('link')).toHaveTextContent('Open Chat');
    expect(screen.queryByText(/generate/i)).not.toBeInTheDocument();
  });

  it('shows an error and retries', async () => {
    let calls = 0;
    server.use(
      http.get(api('/menus'), () => {
        calls += 1;
        return calls === 1
          ? apiError(500, 'Server is down')
          : HttpResponse.json([buildMenuSummary()]);
      }),
    );
    const { user } = renderRoutes(routes, '/menus');

    expect(await screen.findByRole('alert')).toHaveTextContent('Server is down');
    await user.click(screen.getByRole('button', { name: 'Try again' }));

    expect(await screen.findByRole('link', { name: /Menu for 1 day/ })).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
