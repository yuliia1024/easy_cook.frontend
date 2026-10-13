import { screen } from '@testing-library/react';
import { buildRecipe, page } from '../../test/fixtures';
import { renderPage } from '../../test/render';
import { api, http, HttpResponse, server } from '../../test/server';
import { RecipesPage } from './RecipesPage';

describe('RecipesPage', () => {
  it('shows recipes with КБЖВ per serving and flags incomplete data', async () => {
    server.use(
      http.get(api('/recipes'), () =>
        HttpResponse.json(page([buildRecipe({ nutritionComplete: false })])),
      ),
    );
    renderPage(<RecipesPage />, '/recipes', '/recipes');

    const card = await screen.findByRole('link', { name: /Гречка з куркою/ });
    expect(card).toHaveTextContent('257,3 ккал');
    expect(card).toHaveTextContent('Обід');
    expect(card).toHaveTextContent('багато білка');
    expect(screen.getByTitle('Є інгредієнти з невідомими значеннями')).toBeInTheDocument();
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
    await screen.findByText('Гречка з куркою');

    await user.selectOptions(screen.getByRole('combobox', { name: 'Прийом їжі' }), 'dinner');
    await user.click(screen.getByRole('button', { name: 'веганське' }));
    await user.click(screen.getByRole('button', { name: 'без глютену' }));

    await vi.waitFor(() => {
      const last = queries.at(-1)!;
      expect(last.get('mealType')).toBe('dinner');
      expect(last.getAll('dietType')).toEqual(['vegan', 'gluten_free']);
    });
    expect(screen.getByRole('button', { name: 'веганське' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });

  it('shows an empty state', async () => {
    server.use(http.get(api('/recipes'), () => HttpResponse.json(page([]))));
    renderPage(<RecipesPage />, '/recipes', '/recipes');
    expect(await screen.findByText('Рецептів не знайдено')).toBeInTheDocument();
  });
});
