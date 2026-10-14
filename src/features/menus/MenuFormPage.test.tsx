import { screen } from '@testing-library/react';
import {
  buildMenu,
  buildMenuMeal,
  buildMenuVersion,
  buildRecipe,
  MENU_ID,
  page,
} from '../../test/fixtures';
import { renderRoutes } from '../../test/render';
import { api, apiError, http, HttpResponse, server } from '../../test/server';
import { MenuFormPage } from './MenuFormPage';

const routes = [
  { path: '/menus/new', element: <MenuFormPage /> },
  { path: '/menus/:id/edit', element: <MenuFormPage /> },
  { path: '/menus/:id', element: <p>menu details</p> },
];
const recipe = buildRecipe();

describe('MenuFormPage', () => {
  it('creates a menu from recipes of the catalog', async () => {
    let body: unknown;
    server.use(
      http.get(api('/recipes'), () => HttpResponse.json(page([recipe]))),
      http.post(api('/menus'), async ({ request }) => {
        body = await request.json();
        return HttpResponse.json(buildMenu());
      }),
    );
    const { user } = renderRoutes(routes, '/menus/new');

    await user.type(screen.getByLabelText('Title'), 'Week');
    await user.selectOptions(screen.getByLabelText('Meal type of Day 1, meal 1'), 'dinner');
    await user.type(screen.getByLabelText('Search recipes'), 'buck');
    await user.click(await screen.findByRole('button', { name: `Choose ${recipe.name}` }));
    await user.clear(screen.getByLabelText('Servings of Day 1, meal 1'));
    await user.type(screen.getByLabelText('Servings of Day 1, meal 1'), '1.5');
    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(await screen.findByText('menu details')).toBeInTheDocument();
    expect(body).toEqual({
      title: 'Week',
      notes: null,
      days: [
        {
          dayIndex: 0,
          date: null,
          meals: [{ mealType: 'dinner', recipeId: recipe.id, servings: 1.5 }],
        },
      ],
    });
  });

  it('validates before sending and shows server rule violations', async () => {
    server.use(
      http.get(api('/recipes'), () => HttpResponse.json(page([recipe]))),
      http.post(api('/menus'), () =>
        apiError(400, 'The menu breaks the profile rules: Day 1, lunch: contains peanut'),
      ),
    );
    const { user } = renderRoutes(routes, '/menus/new');

    await user.click(screen.getByRole('button', { name: 'Save' }));
    expect(await screen.findByText('Enter a title')).toBeInTheDocument();
    expect(screen.getByText('Choose a recipe')).toBeInTheDocument();

    await user.type(screen.getByLabelText('Title'), 'Week');
    await user.type(screen.getByLabelText('Search recipes'), 'buck');
    await user.click(await screen.findByRole('button', { name: `Choose ${recipe.name}` }));
    await user.click(screen.getByRole('button', { name: 'Save' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('contains peanut');
  });

  it('adds and removes days and meals', async () => {
    const { user } = renderRoutes(routes, '/menus/new');

    await user.click(screen.getByRole('button', { name: 'Add day' }));
    await user.click(screen.getAllByRole('button', { name: 'Add meal' })[1]);
    expect(screen.getByRole('listitem', { name: 'Day 2, meal 2' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Remove day 1' }));
    expect(screen.queryByRole('listitem', { name: 'Day 2, meal 1' })).not.toBeInTheDocument();
    expect(screen.getByRole('listitem', { name: 'Day 1, meal 2' })).toBeInTheDocument();
  });

  it('saves the next version from the latest one, asking to replace deleted recipes', async () => {
    let body: unknown;
    const deleted = buildMenuMeal({ id: 'm2', position: 1, mealType: 'dinner', recipeId: null });
    const menu = buildMenu({
      versions: [
        buildMenuVersion({
          days: [{ ...buildMenuVersion().days[0], meals: [buildMenuMeal(), deleted] }],
        }),
      ],
    });
    server.use(
      http.get(api(`/menus/${MENU_ID}`), () => HttpResponse.json(menu)),
      http.get(api('/recipes'), () => HttpResponse.json(page([recipe]))),
      http.post(api(`/menus/${MENU_ID}/versions`), async ({ request }) => {
        body = await request.json();
        return HttpResponse.json(menu);
      }),
    );
    const { user } = renderRoutes(routes, `/menus/${MENU_ID}/edit`);

    expect(
      await screen.findByRole('heading', { name: 'New version: Menu for 1 day' }),
    ).toBeInTheDocument();
    expect(screen.queryByLabelText('Title')).not.toBeInTheDocument();
    expect(screen.getByText(/was deleted from the catalog/)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Save' }));
    expect(await screen.findByText('The recipe was deleted; choose another')).toBeInTheDocument();

    await user.type(screen.getByLabelText('Search recipes'), 'buck');
    await user.click(await screen.findByRole('button', { name: `Choose ${recipe.name}` }));
    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(await screen.findByText('menu details')).toBeInTheDocument();
    expect(body).toEqual({
      notes: null,
      days: [
        {
          dayIndex: 0,
          date: '2026-10-20',
          meals: [
            { mealType: 'lunch', recipeId: recipe.id, servings: 1 },
            { mealType: 'dinner', recipeId: recipe.id, servings: 1 },
          ],
        },
      ],
    });
  });
});
