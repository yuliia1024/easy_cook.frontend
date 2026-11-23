import { focusManager } from '@tanstack/react-query';
import { act, screen, waitFor, within } from '@testing-library/react';
import {
  buildMenu,
  buildMenuMeal,
  buildMenuVersion,
  buildNutrition,
  buildRecipe,
  MENU_ID,
  VERSION_ID,
} from '../../test/fixtures';
import { renderRoutes } from '../../test/render';
import { api, apiError, http, HttpResponse, server } from '../../test/server';
import { MenuDetails } from './MenuDetails';

const routes = [
  { path: '/menus/:id', element: <MenuDetails id={MENU_ID} /> },
  { path: '/menus', element: <p>menus list</p> },
];
const render = () => renderRoutes(routes, `/menus/${MENU_ID}`);

describe('MenuDetails', () => {
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
    expect(within(day).getByRole('button', { name: 'Buckwheat with chicken' })).toBeInTheDocument();
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

  it('does not show which model and prompt generated the version', async () => {
    const notes = 'model: gpt-4o-mini-2024-07-18; prompt: menu-plan@v1';
    server.use(
      http.get(api(`/menus/${MENU_ID}`), () =>
        HttpResponse.json(buildMenu({ versions: [buildMenuVersion({ notes })] })),
      ),
    );
    render();

    expect(await screen.findByRole('region', { name: 'Day 1 · 20 Oct 2026' })).toBeInTheDocument();
    expect(screen.queryByText(notes)).not.toBeInTheDocument();
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
      'Buckwheat with chicken',
    ]);
  });

  it('opens the recipe of a meal in a dialog', async () => {
    const recipe = buildRecipe({ id: '22222222-2222-4222-8222-222222222222' });
    server.use(
      http.get(api(`/menus/${MENU_ID}`), () => HttpResponse.json(buildMenu())),
      http.get(api(`/recipes/${recipe.id}`), () => HttpResponse.json(recipe)),
      http.get(api(`/recipes/${recipe.id}/nutrition`), () => HttpResponse.json(buildNutrition())),
    );
    const { user } = render();

    await user.click(await screen.findByRole('button', { name: 'Buckwheat with chicken' }));

    expect(
      await screen.findByRole('dialog', { name: 'Buckwheat with chicken' }),
    ).toBeInTheDocument();
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

  it('opens the confirmed version when the menu has newer drafts', async () => {
    server.use(
      http.get(api(`/menus/${MENU_ID}`), () =>
        HttpResponse.json(
          buildMenu({
            confirmedVersionId: 'v1',
            confirmedAt: '2026-10-21T10:00:00.000Z',
            versions: [
              buildMenuVersion({ id: 'v2', versionNumber: 2 }),
              buildMenuVersion({
                id: 'v1',
                versionNumber: 1,
                isConfirmed: true,
              }),
            ],
          }),
        ),
      ),
    );
    render();

    await waitFor(() => expect(screen.getByRole('combobox')).toHaveValue('v1'));
    expect(screen.getByRole('button', { name: 'Confirmed' })).toBeDisabled();
  });

  it('keeps the typed title and shows why a rename was rejected', async () => {
    server.use(
      http.get(api(`/menus/${MENU_ID}`), () => HttpResponse.json(buildMenu())),
      http.patch(api(`/menus/${MENU_ID}`), () => apiError(409, 'A menu with this title exists')),
    );
    const { user } = render();

    await user.click(await screen.findByRole('button', { name: 'Rename' }));
    const title = screen.getByLabelText('Menu title');
    await user.clear(title);
    await user.type(title, 'Week 43');
    await user.click(screen.getByRole('button', { name: 'Save' }));

    const form = screen.getByRole('form', { name: 'Rename the menu' });
    expect(await within(form).findByRole('alert')).toHaveTextContent(
      'A menu with this title exists',
    );
    expect(screen.getByLabelText('Menu title')).toHaveValue('Week 43');
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(buildMenu().title);

    // Cancelling drops the error with the form.
    await user.click(within(form).getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('keeps the menu on screen when a refresh fails', async () => {
    let calls = 0;
    server.use(
      http.get(api(`/menus/${MENU_ID}`), () => {
        calls += 1;
        return calls === 1 ? HttpResponse.json(buildMenu()) : apiError(500, 'Server is down');
      }),
    );
    render();

    expect(await screen.findByRole('heading', { level: 1 })).toHaveTextContent(buildMenu().title);
    try {
      // Coming back to the tab refetches the menu.
      act(() => {
        focusManager.setFocused(false);
        focusManager.setFocused(true);
      });

      expect(await screen.findByRole('alert')).toHaveTextContent('Could not refresh the menu');
      expect(screen.getByRole('alert')).toHaveTextContent('Server is down');
      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(buildMenu().title);
      expect(screen.getByRole('region', { name: 'Day 1 · 20 Oct 2026' })).toBeInTheDocument();
    } finally {
      focusManager.setFocused(undefined);
    }
  });

  it('stops showing a menu that is gone', async () => {
    let calls = 0;
    server.use(
      http.get(api(`/menus/${MENU_ID}`), () => {
        calls += 1;
        return calls === 1 ? HttpResponse.json(buildMenu()) : apiError(404, 'Menu not found');
      }),
    );
    render();

    expect(await screen.findByRole('heading', { level: 1 })).toHaveTextContent(buildMenu().title);
    try {
      act(() => {
        focusManager.setFocused(false);
        focusManager.setFocused(true);
      });

      expect(await screen.findByRole('alert')).toHaveTextContent('Menu not found');
      expect(screen.queryByRole('heading', { level: 1 })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Delete' })).not.toBeInTheDocument();
    } finally {
      focusManager.setFocused(undefined);
    }
  });
});
