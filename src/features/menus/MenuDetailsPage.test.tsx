import { screen, within } from '@testing-library/react';
import {
  buildMenu,
  buildMenuMeal,
  buildMenuVersion,
  MENU_ID,
  VERSION_ID,
} from '../../test/fixtures';
import { renderRoutes } from '../../test/render';
import { api, apiError, http, HttpResponse, server } from '../../test/server';
import { MenuDetailsPage } from './MenuDetailsPage';

const routes = [
  { path: '/menus/:id', element: <MenuDetailsPage /> },
  { path: '/menus', element: <p>menus list</p> },
];
const render = () => renderRoutes(routes, `/menus/${MENU_ID}`);

describe('MenuDetailsPage', () => {
  it('shows the latest version with days, meals, servings, totals, goal and issues', async () => {
    const version = buildMenuVersion({
      issues: [
        {
          severity: 'warning',
          code: 'calories_off_target',
          message: 'Day 1: 257 kcal is 88 % below',
          dayIndex: 0,
        },
        {
          severity: 'error',
          code: 'allergen',
          message: 'Day 1, lunch: contains peanut',
          dayIndex: 0,
          position: 1,
        },
      ],
      days: [
        {
          ...buildMenuVersion().days[0],
          meals: [
            buildMenuMeal(),
            buildMenuMeal({
              id: 'm2',
              position: 1,
              mealType: 'dinner',
              recipeId: null,
              servings: 1.25,
              recipe: { ...buildMenuMeal().recipe, name: 'Old stew' },
            }),
          ],
        },
      ],
    });
    server.use(
      http.get(api(`/menus/${MENU_ID}`), () =>
        HttpResponse.json(buildMenu({ versions: [version] })),
      ),
    );
    render();

    const day = await screen.findByRole('region', { name: 'Day 1 · 20 Oct 2026' });
    expect(within(day).getByRole('link', { name: 'Buckwheat with chicken' })).toHaveAttribute(
      'href',
      '/recipes/22222222-2222-4222-8222-222222222222?servings=1',
    );
    expect(within(day).getByText('(deleted recipe)')).toBeInTheDocument();
    expect(within(day).getByRole('cell', { name: '1.25' })).toBeInTheDocument();
    expect(within(day).getByText('Day total')).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Daily goal (when built)' })).toHaveTextContent(
      '2,100',
    );
    const issues = screen.getByRole('region', { name: 'Issues' });
    expect(issues).toHaveTextContent('Warning: Day 1: 257 kcal');
    expect(issues).toHaveTextContent('Error: Day 1, lunch: contains peanut');
    expect(screen.getByRole('combobox')).toHaveTextContent('v1 · stub planner');
  });

  it('offers no way to edit the menu or replace a meal', async () => {
    server.use(http.get(api(`/menus/${MENU_ID}`), () => HttpResponse.json(buildMenu())));
    render();

    await screen.findByRole('region', { name: 'Day 1 · 20 Oct 2026' });
    expect(screen.queryByRole('link', { name: /edit/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /replace/i })).not.toBeInTheDocument();
    expect(screen.getAllByRole('button').map((button) => button.textContent)).toEqual([
      'Rename',
      'Delete',
      'Confirm this version',
    ]);
  });

  it('confirms a version and shows a rejection', async () => {
    server.use(
      http.get(api(`/menus/${MENU_ID}`), () => HttpResponse.json(buildMenu())),
      http.post(api(`/menus/${MENU_ID}/versions/${VERSION_ID}/confirm`), () =>
        apiError(400, 'The menu breaks the profile rules: Day 1, lunch: contains peanut'),
      ),
    );
    const { user } = render();

    await user.click(await screen.findByRole('button', { name: 'Confirm this version' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('contains peanut');
  });

  it('marks the confirmed version', async () => {
    const confirmed = buildMenuVersion({ isConfirmed: true });
    server.use(
      http.get(api(`/menus/${MENU_ID}`), () =>
        HttpResponse.json(
          buildMenu({
            versions: [confirmed],
            confirmedVersionId: VERSION_ID,
            confirmedAt: confirmed.createdAt,
          }),
        ),
      ),
    );
    render();

    expect(await screen.findByRole('button', { name: 'Confirmed' })).toBeDisabled();
    expect(screen.getByText(/^Confirmed /)).toBeInTheDocument();
  });

  it('renames and deletes', async () => {
    let renamed: unknown;
    server.use(
      http.get(api(`/menus/${MENU_ID}`), () => HttpResponse.json(buildMenu())),
      http.patch(api(`/menus/${MENU_ID}`), async ({ request }) => {
        renamed = await request.json();
        return HttpResponse.json(buildMenu({ title: 'Week 43' }));
      }),
      http.delete(api(`/menus/${MENU_ID}`), () => new HttpResponse(null, { status: 204 })),
    );
    const { user } = render();

    await user.click(await screen.findByRole('button', { name: 'Rename' }));
    const title = screen.getByLabelText('Menu title');
    expect(title).toHaveFocus();
    await user.clear(title);
    await user.click(screen.getByRole('button', { name: 'Save' }));
    expect(screen.getByText('Enter a title')).toBeInTheDocument();
    await user.type(title, '  Week 43 ');
    await user.click(screen.getByRole('button', { name: 'Save' }));
    expect(await screen.findByRole('heading', { name: 'Week 43' })).toBeInTheDocument();
    expect(renamed).toEqual({ title: 'Week 43' });
    expect(screen.queryByLabelText('Menu title')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Delete' }));
    const dialog = screen.getByRole('alertdialog', { name: 'Delete this menu?' });
    expect(dialog).toHaveTextContent('“Week 43” and all its versions will be permanently deleted.');
    await user.click(within(dialog).getByRole('button', { name: 'Delete' }));
    expect(await screen.findByText('menus list')).toBeInTheDocument();
  });

  it('keeps the title when the rename is cancelled', async () => {
    server.use(http.get(api(`/menus/${MENU_ID}`), () => HttpResponse.json(buildMenu())));
    const { user } = render();

    await user.click(await screen.findByRole('button', { name: 'Rename' }));
    await user.type(screen.getByLabelText('Menu title'), ' changed');
    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(screen.queryByLabelText('Menu title')).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(buildMenu().title);
  });

  it('shows a not found error', async () => {
    server.use(http.get(api(`/menus/${MENU_ID}`), () => apiError(404, 'Menu not found')));
    render();
    expect(await screen.findByRole('alert')).toHaveTextContent('Menu not found');
  });
});
