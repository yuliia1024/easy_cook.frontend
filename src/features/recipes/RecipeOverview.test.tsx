import { screen, within } from '@testing-library/react';
import { buildNutrition, buildRecipe } from '../../test/fixtures';
import { renderPage } from '../../test/render';
import { api, http, HttpResponse, server } from '../../test/server';
import { RecipeOverview } from './RecipeOverview';

const recipe = buildRecipe();
const [ingredient] = recipe.ingredients;
const [line] = buildNutrition().ingredients;

describe('RecipeOverview', () => {
  it('offers optional ingredients only when the recipe has some', async () => {
    server.use(
      http.get(api(`/recipes/${recipe.id}/nutrition`), () => HttpResponse.json(buildNutrition())),
    );
    renderPage(<RecipeOverview recipe={recipe} menuServings={null} />);

    expect(await screen.findByRole('region', { name: 'Per serving' })).toBeInTheDocument();
    expect(screen.queryByLabelText('Include optional ingredients')).not.toBeInTheDocument();
  });

  it('counts optional ingredients on demand and marks unknown values', async () => {
    const withOptional = buildRecipe({
      ingredients: [
        ingredient,
        { ...ingredient, id: 'optional-line', isOptional: true, notes: 'to taste' },
      ],
    });
    const requested: string[] = [];
    server.use(
      http.get(api(`/recipes/${recipe.id}/nutrition`), ({ request }) => {
        const include = new URL(request.url).searchParams.get('includeOptional')!;
        requested.push(include);
        const optional = {
          ...line,
          ingredientId: 'optional-line',
          isOptional: true,
          counted: include === 'true',
          missing: include === 'true' ? (['fatG'] as const) : [],
        };
        return HttpResponse.json(
          buildNutrition({
            includeOptional: include === 'true',
            complete: include !== 'true',
            ingredients: [line, { ...optional, missing: [...optional.missing] }],
          }),
        );
      }),
    );
    const { user } = renderPage(<RecipeOverview recipe={withOptional} menuServings={null} />);

    const toggle = await screen.findByLabelText('Include optional ingredients');
    expect(toggle).not.toBeChecked();
    const rows = () => screen.getAllByRole('row').slice(1);
    await vi.waitFor(() => expect(rows()).toHaveLength(2));
    expect(rows()[1]).toHaveTextContent('optional');
    expect(rows()[1]).toHaveTextContent('to taste');
    expect(within(rows()[1]).getAllByText('—')).toHaveLength(4);

    await user.click(toggle);

    expect(await screen.findByText(/Incomplete data/)).toBeInTheDocument();
    expect(requested).toEqual(['false', 'true']);
    expect(toggle).toBeChecked();
    expect(within(rows()[1]).queryByText('—')).not.toBeInTheDocument();
    expect(within(rows()[1]).getByText('*')).toHaveClass('text-amber-600');
    expect(within(rows()[1]).getByText('*').parentElement).toHaveClass('text-fat-fg');
  });

  it.each(['seed', 'manual'])(
    'words an empty allergen list of a %s recipe neutrally',
    async (source) => {
      server.use(
        http.get(api(`/recipes/${recipe.id}/nutrition`), () => HttpResponse.json(buildNutrition())),
      );
      renderPage(
        <RecipeOverview recipe={buildRecipe({ source, allergens: [] })} menuServings={null} />,
      );

      expect(screen.getByText('No allergens recorded; check the ingredients.')).toBeInTheDocument();
      expect(screen.queryByRole('list', { name: 'Allergens' })).not.toBeInTheDocument();
      await screen.findByRole('region', { name: 'Per serving' });
    },
  );

  it('lists the allergens of the recipe', async () => {
    server.use(
      http.get(api(`/recipes/${recipe.id}/nutrition`), () => HttpResponse.json(buildNutrition())),
    );
    renderPage(
      <RecipeOverview
        recipe={buildRecipe({ source: 'seed', allergens: ['gluten', 'tree_nut'] })}
        menuServings={null}
      />,
    );

    const list = screen.getByRole('list', { name: 'Allergens' });
    expect(
      within(list)
        .getAllByRole('listitem')
        .map((item) => item.textContent),
    ).toEqual(['gluten', 'tree nuts']);
    expect(screen.queryByText(/No allergens recorded/)).not.toBeInTheDocument();
    await screen.findByRole('region', { name: 'Per serving' });
  });
});
