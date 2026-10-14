import { screen } from '@testing-library/react';
import { buildMenu, buildMenuSummary, MENU_ID } from '../../test/fixtures';
import { renderRoutes } from '../../test/render';
import { api, apiError, http, HttpResponse, server, uiMessageStream } from '../../test/server';
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

  it('generates a menu from the stream and opens it', async () => {
    let body: unknown;
    server.use(
      http.get(api('/menus'), () => HttpResponse.json([])),
      http.post(api('/menus/generate'), async ({ request }) => {
        body = await request.json();
        return uiMessageStream([
          { type: 'start' },
          { type: 'data-status', id: 'status', data: { attempt: 1, maxAttempts: 3 } },
          { type: 'data-menu', id: 'menu', data: buildMenu() },
          { type: 'finish' },
        ]);
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

  it('shows the proposal while it streams and why the planner gave up', async () => {
    server.use(
      http.get(api('/menus'), () => HttpResponse.json([])),
      http.post(api('/menus/generate'), () =>
        uiMessageStream([
          { type: 'start' },
          { type: 'data-status', id: 'status', data: { attempt: 2, maxAttempts: 3 } },
          {
            type: 'data-issues',
            id: 'issues',
            data: { attempt: 1, messages: ['Day 1, dinner: contains peanut'] },
          },
          {
            type: 'data-day',
            id: 'day-0',
            data: {
              attempt: 2,
              dayIndex: 0,
              date: '2026-10-20',
              meals: [{ mealType: 'lunch', recipeId: 'r', recipeName: 'Fish soup', servings: 1.5 }],
            },
          },
          { type: 'error', errorText: 'No valid menu after 3 attempts' },
        ]),
      ),
    );
    const { user } = renderRoutes(routes, '/menus');

    await user.click(await screen.findByRole('button', { name: 'Generate' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('No valid menu after 3 attempts');
    const progress = screen.getByRole('region', { name: 'Generation progress' });
    expect(progress).toHaveTextContent('Stopped at attempt 2 of 3');
    expect(progress).toHaveTextContent('Attempt 1 was rejected:Day 1, dinner: contains peanut');
    expect(progress).toHaveTextContent('Day 1 · 2026-10-20');
    expect(progress).toHaveTextContent('Lunch: Fish soup × 1.5');
  });

  it('explains why planning could not start', async () => {
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
