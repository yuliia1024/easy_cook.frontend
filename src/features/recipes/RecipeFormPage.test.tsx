import { screen, within } from '@testing-library/react';
import { buildFood, buildRecipe, page } from '../../test/fixtures';
import { renderRoutes } from '../../test/render';
import { api, apiError, http, HttpResponse, server } from '../../test/server';
import { RecipeFormPage } from './RecipeFormPage';

const routes = [
  { path: '/recipes/new', element: <RecipeFormPage /> },
  { path: '/recipes/:id/edit', element: <RecipeFormPage /> },
  { path: '/recipes/:id', element: <p>details page</p> },
];

const rice = buildFood({
  id: '66666666-6666-4666-8666-666666666666',
  name: 'Rice, dry',
  kcalPer100g: 360,
  proteinG: 7,
  fatG: null,
  carbsG: 80,
});

describe('RecipeFormPage', () => {
  it('adds ingredients from the catalog, previews calories and macros and creates the recipe', async () => {
    let body: unknown;
    server.use(
      http.get(api('/foods'), () => HttpResponse.json(page([rice]))),
      http.post(api('/recipes'), async ({ request }) => {
        body = await request.json();
        return HttpResponse.json(buildRecipe({ id: 'new-recipe' }));
      }),
    );
    const { user, router } = renderRoutes(routes, '/recipes/new');

    await user.type(screen.getByLabelText('Name'), 'Rice');
    await user.type(screen.getByLabelText('Instructions'), 'Boil.');
    await user.clear(screen.getByLabelText('Servings'));
    await user.type(screen.getByLabelText('Servings'), '3');
    await user.click(screen.getByLabelText('vegan'));

    await user.type(screen.getByLabelText('Add an ingredient from the catalog'), 'ri');
    await user.click(await screen.findByRole('button', { name: 'Add Rice, dry' }));
    const quantity = screen.getByLabelText('Weight of Rice, dry, g');
    await user.clear(quantity);
    await user.type(quantity, '150');

    const perServing = screen.getByRole('region', { name: 'Per serving' });
    expect(within(perServing).getByText('180')).toBeInTheDocument();
    expect(screen.getByText(/Some ingredient values are unknown/)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(await screen.findByText('details page')).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/recipes/new-recipe');
    expect(body).toEqual({
      name: 'Rice',
      description: null,
      instructions: 'Boil.',
      mealType: 'lunch',
      dietType: ['vegan'],
      servings: 3,
      prepTimeMinutes: null,
      ingredients: [{ foodItemId: rice.id, quantityG: 150, isOptional: false, notes: null }],
    });
  });

  it('requires at least one ingredient', async () => {
    const { user } = renderRoutes(routes, '/recipes/new');
    await user.click(screen.getByRole('button', { name: 'Save' }));
    expect(await screen.findByText('Add at least one ingredient')).toBeInTheDocument();
    expect(screen.getByText('Enter a name')).toBeInTheDocument();
  });

  it('edits a recipe: reorders, removes and replaces the ingredient list', async () => {
    const recipe = buildRecipe();
    const second = {
      ...recipe.ingredients[0],
      id: 'i2',
      foodItemId: rice.id,
      foodItem: rice,
      position: 1,
      quantityG: 50,
    };
    const full = buildRecipe({ ingredients: [...recipe.ingredients, second] });
    let body: { ingredients: { foodItemId: string }[] } | undefined;
    server.use(
      http.get(api(`/recipes/${recipe.id}`), () => HttpResponse.json(full)),
      http.patch(api(`/recipes/${recipe.id}`), async ({ request }) => {
        body = (await request.json()) as typeof body;
        return HttpResponse.json(full);
      }),
    );
    const { user } = renderRoutes(routes, `/recipes/${recipe.id}/edit`);

    await user.click(await screen.findByRole('button', { name: 'Move up: Rice, dry' }));
    await user.click(screen.getByRole('button', { name: 'Remove Buckwheat, dry' }));
    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(await screen.findByText('details page')).toBeInTheDocument();
    expect(body?.ingredients.map((i) => i.foodItemId)).toEqual([rice.id]);
  });

  it('shows server validation errors', async () => {
    const recipe = buildRecipe();
    server.use(
      http.get(api(`/recipes/${recipe.id}`), () => HttpResponse.json(recipe)),
      http.patch(api(`/recipes/${recipe.id}`), () => apiError(400, ['Food item not found: x'])),
    );
    const { user } = renderRoutes(routes, `/recipes/${recipe.id}/edit`);

    await user.click(await screen.findByRole('button', { name: 'Save' }));
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Could not save the recipe');
    expect(alert).toHaveTextContent('Food item not found: x');
  });
});
