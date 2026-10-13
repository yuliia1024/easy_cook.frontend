import { screen } from '@testing-library/react';
import { buildFood } from '../../test/fixtures';
import { renderPage } from '../../test/render';
import { api, apiError, http, HttpResponse, server } from '../../test/server';
import { FoodDetailsPage } from './FoodDetailsPage';

const food = buildFood({ carbsG: null });

describe('FoodDetailsPage', () => {
  it('shows calories and macros per 100 g and warns about unknown values', async () => {
    server.use(http.get(api(`/foods/${food.id}`), () => HttpResponse.json(food)));
    renderPage(<FoodDetailsPage />, `/foods/${food.id}`, '/foods/:id');

    expect(await screen.findByRole('heading', { name: 'Buckwheat, dry' })).toBeInTheDocument();
    expect(screen.getByText('13.3')).toBeInTheDocument();
    expect(screen.getByText(/Some values are unknown/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Edit' })).toHaveAttribute(
      'href',
      `/foods/${food.id}/edit`,
    );
  });

  it('shows a not found error', async () => {
    server.use(http.get(api(`/foods/${food.id}`), () => apiError(404, 'Food item not found')));
    renderPage(<FoodDetailsPage />, `/foods/${food.id}`, '/foods/:id');
    expect(await screen.findByRole('alert')).toHaveTextContent('Food item not found');
  });
});
