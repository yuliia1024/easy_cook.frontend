import { screen } from '@testing-library/react';
import { buildFood } from '../../test/fixtures';
import { renderRoutes } from '../../test/render';
import { api, apiError, http, HttpResponse, server } from '../../test/server';
import { FoodFormPage } from './FoodFormPage';

const routes = [
  { path: '/foods/new', element: <FoodFormPage /> },
  { path: '/foods/:id/edit', element: <FoodFormPage /> },
  { path: '/foods/:id', element: <p>details page</p> },
];

describe('FoodFormPage', () => {
  it('creates a food, sending empty values as unknown (null)', async () => {
    let body: unknown;
    server.use(
      http.post(api('/foods'), async ({ request }) => {
        body = await request.json();
        return HttpResponse.json(buildFood({ id: 'new-id' }));
      }),
    );
    const { user, router } = renderRoutes(routes, '/foods/new');

    await user.type(screen.getByLabelText('Name'), 'Rice, boiled');
    await user.selectOptions(screen.getByLabelText('State'), 'boiled');
    await user.type(screen.getByLabelText('Calories, kcal'), '130');
    await user.type(screen.getByLabelText('Protein, g'), '2,7');
    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(await screen.findByText('details page')).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/foods/new-id');
    expect(body).toEqual({
      name: 'Rice, boiled',
      nameEn: null,
      state: 'boiled',
      kcalPer100g: 130,
      proteinG: 2.7,
      fatG: null,
      carbsG: null,
    });
  });

  it('validates before sending', async () => {
    const { user } = renderRoutes(routes, '/foods/new');
    await user.type(screen.getByLabelText('Calories, kcal'), '1000');
    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(await screen.findByText('Enter a name')).toBeInTheDocument();
    expect(screen.getByText('At most 900')).toBeInTheDocument();
    expect(screen.getByLabelText('Calories, kcal')).toHaveAttribute('aria-invalid', 'true');
  });

  it('edits an existing food and shows server errors', async () => {
    const food = buildFood();
    let body: unknown;
    server.use(
      http.get(api(`/foods/${food.id}`), () => HttpResponse.json(food)),
      http.patch(api(`/foods/${food.id}`), async ({ request }) => {
        body = await request.json();
        return apiError(409, 'Food item seed:buckwheat-dry already exists');
      }),
    );
    const { user } = renderRoutes(routes, `/foods/${food.id}/edit`);

    const name = await screen.findByLabelText('Name');
    expect(name).toHaveValue('Buckwheat, dry');
    await user.clear(screen.getByLabelText('Fat, g'));
    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Could not save the food');
    expect(body).toMatchObject({ fatG: null, kcalPer100g: 343 });
  });

  it('checks the calories against the macros and re-checks after a fix', async () => {
    let body: unknown;
    server.use(
      http.post(api('/foods'), async ({ request }) => {
        body = await request.json();
        return HttpResponse.json(buildFood({ id: 'new-id' }));
      }),
    );
    const { user } = renderRoutes(routes, '/foods/new');

    await user.type(screen.getByLabelText('Name'), 'Chicken');
    await user.type(screen.getByLabelText('Calories, kcal'), '130');
    await user.type(screen.getByLabelText('Protein, g'), '20');
    await user.type(screen.getByLabelText('Fat, g'), '10');
    await user.type(screen.getByLabelText('Carbs, g'), '20');
    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(
      await screen.findByText(
        '130 kcal does not match protein, fat and carbs (≈ 250 kcal by 4/9/4)',
      ),
    ).toBeInTheDocument();
    expect(screen.getByLabelText('Calories, kcal')).toHaveAttribute('aria-invalid', 'true');

    // Lowering the carbs re-checks the calories: ≈ 170 kcal is close enough to 130.
    await user.clear(screen.getByLabelText('Carbs, g'));
    await user.type(screen.getByLabelText('Carbs, g'), '0');
    await vi.waitFor(() =>
      expect(screen.queryByText(/does not match protein/)).not.toBeInTheDocument(),
    );
    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(await screen.findByText('details page')).toBeInTheDocument();
    expect(body).toMatchObject({ kcalPer100g: 130, carbsG: 0 });
    expect(body).not.toHaveProperty('source');
  });

  it('shows the server message when the state of a used food cannot change', async () => {
    const food = buildFood();
    let body: unknown;
    server.use(
      http.get(api(`/foods/${food.id}`), () => HttpResponse.json(food)),
      http.patch(api(`/foods/${food.id}`), async ({ request }) => {
        body = await request.json();
        return apiError(409, 'The food is used in recipes; create a new food for another state');
      }),
    );
    const { user } = renderRoutes(routes, `/foods/${food.id}/edit`);

    await user.selectOptions(await screen.findByLabelText('State'), 'boiled');
    await user.click(screen.getByRole('button', { name: 'Save' }));

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Could not save the food');
    expect(alert).toHaveTextContent(
      'The food is used in recipes; create a new food for another state',
    );
    expect(body).toMatchObject({ state: 'boiled' });
    expect(body).not.toHaveProperty('source');
  });
});
