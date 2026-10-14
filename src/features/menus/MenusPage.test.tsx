import { screen } from '@testing-library/react';
import { buildMenu, buildMenuSummary, MENU_ID } from '../../test/fixtures';
import { renderRoutes } from '../../test/render';
import { api, apiError, http, HttpResponse, server } from '../../test/server';
import { MenusPage } from './MenusPage';

const routes = [
  { path: '/menus', element: <MenusPage /> },
  { path: '/menus/:id', element: <p>menu details</p> },
];

describe('MenusPage', () => {
  it('lists menus with their status', async () => {
    server.use(
      http.get(api('/menus'), () =>
        HttpResponse.json([
          buildMenuSummary({ versionCount: 3, confirmedVersionId: 'v' }),
          buildMenuSummary({ id: 'other', title: 'Draft menu' }),
        ]),
      ),
    );
    renderRoutes(routes, '/menus');

    const confirmed = await screen.findByRole('link', { name: /Menu for 1 day/ });
    expect(confirmed).toHaveTextContent('3 versions');
    expect(confirmed).toHaveTextContent('confirmed');
    expect(screen.getByRole('link', { name: /Draft menu/ })).toHaveTextContent('draft');
  });

  it('generates a menu and opens it', async () => {
    let body: unknown;
    server.use(
      http.get(api('/menus'), () => HttpResponse.json([])),
      http.post(api('/menus/generate'), async ({ request }) => {
        body = await request.json();
        return HttpResponse.json(buildMenu());
      }),
    );
    const { user, router } = renderRoutes(routes, '/menus');

    expect(await screen.findByText('No menus yet')).toBeInTheDocument();
    await user.clear(screen.getByLabelText('Days (1–14)'));
    await user.type(screen.getByLabelText('Days (1–14)'), '2');
    await user.click(screen.getByLabelText('Snack'));
    await user.click(screen.getByRole('button', { name: 'Generate' }));

    expect(await screen.findByText('menu details')).toBeInTheDocument();
    expect(router.state.location.pathname).toBe(`/menus/${MENU_ID}`);
    expect(body).toEqual({
      title: null,
      days: 2,
      mealTypes: ['breakfast', 'lunch', 'dinner', 'snack'],
      startDate: null,
      instructions: null,
    });
  });

  it('explains why the planner failed', async () => {
    server.use(
      http.get(api('/menus'), () => HttpResponse.json([])),
      http.post(api('/menus/generate'), () =>
        apiError(422, 'No lunch recipes match the dietary preferences'),
      ),
    );
    const { user } = renderRoutes(routes, '/menus');

    await user.click(await screen.findByRole('button', { name: 'Generate' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('No lunch recipes match');
  });
});
