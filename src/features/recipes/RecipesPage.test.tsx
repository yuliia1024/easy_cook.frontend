import { screen, within } from '@testing-library/react';
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

  it('shows the allergens on a card, and nothing for a recipe without them', async () => {
    server.use(
      http.get(api('/recipes'), () =>
        HttpResponse.json(
          page([
            buildRecipe({ allergens: ['milk', 'egg'] }),
            buildRecipe({ id: 'plain', name: 'Plain rice', allergens: [] }),
          ]),
        ),
      ),
    );
    renderPage(<RecipesPage />, '/recipes', '/recipes');

    const card = await screen.findByRole('link', { name: /Buckwheat with chicken/ });
    const list = within(card).getByRole('list', { name: 'Contains' });
    expect(
      within(list)
        .getAllByRole('listitem')
        .map((item) => item.textContent),
    ).toEqual(['milk', 'egg']);
    const plain = screen.getByRole('link', { name: /Plain rice/ });
    expect(within(plain).queryByRole('list')).not.toBeInTheDocument();
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
    expect(screen.getByRole('button', { name: 'vegan' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('shows an empty state', async () => {
    server.use(http.get(api('/recipes'), () => HttpResponse.json(page([]))));
    renderPage(<RecipesPage />, '/recipes', '/recipes');
    expect(await screen.findByText('No recipes found')).toBeInTheDocument();
  });

  it('ignores a page, a meal type and diet tags the API would not take', async () => {
    const queries: URLSearchParams[] = [];
    server.use(
      http.get(api('/recipes'), ({ request }) => {
        queries.push(new URL(request.url).searchParams);
        return HttpResponse.json(page([buildRecipe()]));
      }),
    );
    const { user } = renderPage(
      <RecipesPage />,
      '/recipes?page=abc&mealType=brunch&dietType=vegan&dietType=paleo&dietType=vegan',
      '/recipes',
    );

    await screen.findByText('Buckwheat with chicken');
    expect(queries).toHaveLength(1);
    expect(queries[0].get('page')).toBe('1');
    expect(queries[0].has('mealType')).toBe(false);
    expect(queries[0].getAll('dietType')).toEqual(['vegan']);
    expect(screen.getByRole('combobox', { name: 'Meal type' })).toHaveValue('');

    // A toggle drops the unknown tag from the URL too.
    await user.click(screen.getByRole('button', { name: 'gluten-free' }));
    await vi.waitFor(() =>
      expect(queries.at(-1)!.getAll('dietType')).toEqual(['vegan', 'gluten_free']),
    );
  });

  it('leads back to the first page from a page past the end', async () => {
    server.use(
      http.get(api('/recipes'), ({ request }) => {
        const pageNo = Number(new URL(request.url).searchParams.get('page'));
        return HttpResponse.json(
          pageNo === 1 ? page([buildRecipe()]) : page([], { total: 1, page: pageNo }),
        );
      }),
    );
    const { user, router } = renderPage(
      <RecipesPage />,
      '/recipes?page=4&mealType=lunch',
      '/recipes',
    );

    expect(await screen.findByText('No recipes on this page')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Go to the first page' }));

    expect(await screen.findByText('Buckwheat with chicken')).toBeInTheDocument();
    expect(router.state.location.search).toBe('?mealType=lunch');
  });

  it('asks for page 1 of a new search once, after the debounce', async () => {
    const queries: string[] = [];
    server.use(
      http.get(api('/recipes'), ({ request }) => {
        const params = new URL(request.url).searchParams;
        queries.push(`${params.get('search') ?? ''}@${params.get('page')}`);
        return HttpResponse.json(page([buildRecipe()], { total: 30 }));
      }),
    );
    const { user, router } = renderPage(<RecipesPage />, '/recipes?page=2', '/recipes');
    await screen.findByText('Buckwheat with chicken');

    await user.type(screen.getByRole('searchbox', { name: 'Search recipes' }), 'soup');

    await vi.waitFor(() => expect(queries).toEqual(['@2', 'soup@1']));
    await new Promise((resolve) => setTimeout(resolve, 400));
    expect(queries).toEqual(['@2', 'soup@1']);
    expect(router.state.location.search).toBe('?search=soup');
  });
});
