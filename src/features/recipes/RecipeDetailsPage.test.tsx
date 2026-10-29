import { screen, within } from '@testing-library/react';
import { buildNutrition, buildRecipe } from '../../test/fixtures';
import { renderRoutes } from '../../test/render';
import { api, apiError, http, HttpResponse, server } from '../../test/server';
import { RecipeDetailsPage } from './RecipeDetailsPage';

const recipe = buildRecipe();
const routes = [
  { path: '/recipes/:id', element: <RecipeDetailsPage /> },
  { path: '/recipes', element: <p>recipes list</p> },
];

describe('RecipeDetailsPage', () => {
  it('shows calories and macros for the whole recipe, per serving and per ingredient', async () => {
    server.use(
      http.get(api(`/recipes/${recipe.id}`), () => HttpResponse.json(recipe)),
      http.get(api(`/recipes/${recipe.id}/nutrition`), () => HttpResponse.json(buildNutrition())),
    );
    renderRoutes(routes, `/recipes/${recipe.id}`);

    const perServing = await screen.findByRole('region', { name: 'Per serving' });
    expect(within(perServing).getByText('257.3')).toBeInTheDocument();
    const total = screen.getByRole('region', { name: 'Whole recipe (2 serv.)' });
    expect(within(total).getByText('514.5')).toBeInTheDocument();
    const row = screen.getByRole('link', { name: 'Buckwheat, dry' }).closest('tr')!;
    expect(row).toHaveTextContent('150');
    expect(screen.getByText('Boil the buckwheat.')).toBeInTheDocument();
  });

  it('shows the calories and the ingredients of a menu meal opened with its servings', async () => {
    server.use(
      http.get(api(`/recipes/${recipe.id}`), () => HttpResponse.json(recipe)),
      http.get(api(`/recipes/${recipe.id}/nutrition`), () => HttpResponse.json(buildNutrition())),
    );
    renderRoutes(routes, `/recipes/${recipe.id}?servings=1.25`);

    const meal = await screen.findByRole('region', { name: 'For your menu (1.25 servings)' });
    expect(within(meal).getByText('321.6')).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Per serving' })).toHaveTextContent('257.3');
    expect(
      screen.getByText('Ingredients for 1.25 servings; the recipe makes 2.'),
    ).toBeInTheDocument();
    const row = screen.getByRole('link', { name: 'Buckwheat, dry' }).closest('tr')!;
    expect(row).toHaveTextContent('93.8');
  });

  it('ignores servings a menu meal cannot have', async () => {
    server.use(
      http.get(api(`/recipes/${recipe.id}`), () => HttpResponse.json(recipe)),
      http.get(api(`/recipes/${recipe.id}/nutrition`), () => HttpResponse.json(buildNutrition())),
    );
    renderRoutes(routes, `/recipes/${recipe.id}?servings=9`);

    await screen.findByRole('region', { name: 'Per serving' });
    expect(screen.queryByRole('region', { name: /For your menu/ })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Buckwheat, dry' }).closest('tr')).toHaveTextContent(
      '150',
    );
  });

  it('recalculates with optional ingredients and marks missing values', async () => {
    const withOptional = buildRecipe({
      ingredients: [{ ...recipe.ingredients[0], isOptional: true }],
    });
    const requested: string[] = [];
    server.use(
      http.get(api(`/recipes/${recipe.id}`), () => HttpResponse.json(withOptional)),
      http.get(api(`/recipes/${recipe.id}/nutrition`), ({ request }) => {
        const include = new URL(request.url).searchParams.get('includeOptional')!;
        requested.push(include);
        return HttpResponse.json(buildNutrition({ complete: include === 'true' ? false : true }));
      }),
    );
    const { user } = renderRoutes(routes, `/recipes/${recipe.id}`);

    await user.click(await screen.findByLabelText('Include optional ingredients'));
    expect(await screen.findByText(/Incomplete data/)).toBeInTheDocument();
    expect(requested).toEqual(['false', 'true']);
  });

  it('deletes after confirmation', async () => {
    server.use(
      http.get(api(`/recipes/${recipe.id}`), () => HttpResponse.json(recipe)),
      http.get(api(`/recipes/${recipe.id}/nutrition`), () => HttpResponse.json(buildNutrition())),
      http.delete(api(`/recipes/${recipe.id}`), () => new HttpResponse(null, { status: 204 })),
    );
    const { user } = renderRoutes(routes, `/recipes/${recipe.id}`);

    await user.click(await screen.findByRole('button', { name: 'Delete' }));
    const dialog = screen.getByRole('alertdialog', { name: 'Delete this recipe?' });
    await user.click(within(dialog).getByRole('button', { name: 'Delete' }));
    expect(await screen.findByText('recipes list')).toBeInTheDocument();
  });

  it('shows a not found error', async () => {
    server.use(http.get(api(`/recipes/${recipe.id}`), () => apiError(404, 'Recipe not found')));
    renderRoutes(routes, `/recipes/${recipe.id}`);
    expect(await screen.findByRole('alert')).toHaveTextContent('Recipe not found');
  });
});
