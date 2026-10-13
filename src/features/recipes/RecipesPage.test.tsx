import { screen } from '@testing-library/react';
import { buildRecipe, page } from '../../test/fixtures';
import { renderPage } from '../../test/render';
import { api, http, HttpResponse, server } from '../../test/server';
import { RecipesPage } from './RecipesPage';

describe('RecipesPage', () => {
  it('shows recipes with calories and macros per serving and flags incomplete data', async () => {
    server.use(
      http.get(api('/recipes'), () =>
        HttpResponse.json(page([buildRecipe({ nutritionComplete: false })])),
      ),
    );
    renderPage(<RecipesPage />, '/recipes', '/recipes');

    const card = await screen.findByRole('link', { name: /Buckwheat with chicken/ });
    expect(card).toHaveTextContent('257.3 kcal');
    expect(card).toHaveTextContent('Lunch');
    expect(card).toHaveTextContent('high protein');
    expect(screen.getByTitle('Some ingredients have unknown values')).toBeInTheDocument();
  });

  it('filters by meal type and diet tags', async () => {
    const queries: URLSearchParams[] = [];
    server.use(
      http.get(api('/recipes'), ({ request }) => {
        queries.push(new URL(request.url).searchParams);
        return HttpResponse.json(page([buildRecipe()]));
      }),
    );
    const { user } = renderPage(<RecipesPage />, '/recipes', '/recipes');
    await screen.findByText('Buckwheat with chicken');

    await user.selectOptions(screen.getByRole('combobox', { name: 'Meal type' }), 'dinner');
    await user.click(screen.getByRole('button', { name: 'vegan' }));
    await user.click(screen.getByRole('button', { name: 'gluten-free' }));

    await vi.waitFor(() => {
      const last = queries.at(-1)!;
      expect(last.get('mealType')).toBe('dinner');
      expect(last.getAll('dietType')).toEqual(['vegan', 'gluten_free']);
    });
    expect(screen.getByRole('button', { name: 'vegan' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });

  it('shows an empty state', async () => {
    server.use(http.get(api('/recipes'), () => HttpResponse.json(page([]))));
    renderPage(<RecipesPage />, '/recipes', '/recipes');
    expect(await screen.findByText('No recipes found')).toBeInTheDocument();
  });
});
