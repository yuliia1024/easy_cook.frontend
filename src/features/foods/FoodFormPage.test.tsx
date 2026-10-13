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

    await user.type(screen.getByLabelText('Назва'), 'Рис варений');
    await user.selectOptions(screen.getByLabelText('Стан'), 'boiled');
    await user.type(screen.getByLabelText('Калорії, ккал'), '130');
    await user.type(screen.getByLabelText('Білки, г'), '2,7');
    await user.click(screen.getByRole('button', { name: 'Зберегти' }));

    expect(await screen.findByText('details page')).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/foods/new-id');
    expect(body).toEqual({
      name: 'Рис варений',
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
    await user.type(screen.getByLabelText('Калорії, ккал'), '1000');
    await user.click(screen.getByRole('button', { name: 'Зберегти' }));

    expect(await screen.findByText('Вкажіть назву')).toBeInTheDocument();
    expect(screen.getByText('Не більше 900')).toBeInTheDocument();
    expect(screen.getByLabelText('Калорії, ккал')).toHaveAttribute('aria-invalid', 'true');
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

    const name = await screen.findByLabelText('Назва');
    expect(name).toHaveValue('Гречка суха');
    await user.clear(screen.getByLabelText('Жири, г'));
    await user.click(screen.getByRole('button', { name: 'Зберегти' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Не вдалося зберегти продукт');
    expect(body).toMatchObject({ fatG: null, kcalPer100g: 343 });
  });
});
