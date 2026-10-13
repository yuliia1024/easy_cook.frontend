import { screen } from '@testing-library/react';
import { page } from '../test/fixtures';
import { renderRoutes } from '../test/render';
import { api, http, HttpResponse, server } from '../test/server';
import { routes } from './routes';

describe('routes', () => {
  it('opens the recipe catalog by default with the navigation', async () => {
    server.use(http.get(api('/recipes'), () => HttpResponse.json(page([]))));
    const { router } = renderRoutes(routes, '/');

    expect(await screen.findByRole('heading', { name: 'Recipes' })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/recipes');
    const nav = screen.getByRole('navigation', { name: 'Main navigation' });
    expect(nav).toHaveTextContent('Foods');
    expect(nav).toHaveTextContent('Profile & goals');
  });

  it('shows a not found page', async () => {
    renderRoutes(routes, '/nowhere');
    expect(await screen.findByText('Page not found')).toBeInTheDocument();
  });
});
