import { screen, within } from '@testing-library/react';
import { buildNutrition, buildRecipe } from '../../test/fixtures';
import { renderPage } from '../../test/render';
import { api, apiError, http, HttpResponse, server } from '../../test/server';
import { RecipeDialog } from './RecipeDialog';

const recipe = buildRecipe();

describe('RecipeDialog', () => {
  it('shows the recipe in the amounts of the meal', async () => {
    server.use(
      http.get(api(`/recipes/${recipe.id}`), () => HttpResponse.json(recipe)),
      http.get(api(`/recipes/${recipe.id}/nutrition`), () => HttpResponse.json(buildNutrition())),
    );
    renderPage(<RecipeDialog recipeId={recipe.id} servings={1.25} onClose={vi.fn()} />);

    const dialog = await screen.findByRole('dialog', { name: 'Buckwheat with chicken' });
    expect(within(dialog).getByText('Lunch · 2 serv. · 30 min · high protein')).toBeInTheDocument();
    const meal = await within(dialog).findByRole('region', {
      name: 'For your menu (1.25 servings)',
    });
    expect(meal).toHaveTextContent('321.6');
    expect(within(dialog).getByText('Boil the buckwheat.')).toBeInTheDocument();
  });

  it('shows the allergens of the recipe', async () => {
    const withAllergens = buildRecipe({ source: 'seed', allergens: ['gluten', 'milk'] });
    server.use(
      http.get(api(`/recipes/${recipe.id}`), () => HttpResponse.json(withAllergens)),
      http.get(api(`/recipes/${recipe.id}/nutrition`), () => HttpResponse.json(buildNutrition())),
    );
    renderPage(<RecipeDialog recipeId={recipe.id} servings={1} onClose={vi.fn()} />);

    const dialog = await screen.findByRole('dialog', { name: 'Buckwheat with chicken' });
    const list = await within(dialog).findByRole('list', { name: 'Allergens' });
    expect(list).toHaveTextContent('glutenmilk');
  });

  it('shows an error when the recipe cannot be loaded', async () => {
    server.use(http.get(api(`/recipes/${recipe.id}`), () => apiError(404, 'Recipe not found')));
    renderPage(<RecipeDialog recipeId={recipe.id} servings={1} onClose={vi.fn()} />);

    expect(screen.getByRole('dialog', { name: 'Recipe' })).toBeInTheDocument();
    expect(await screen.findByRole('alert')).toHaveTextContent('Recipe not found');
  });
});
