import { screen, within } from '@testing-library/react';
import { page } from '../test/fixtures';
import { renderRoutes } from '../test/render';
import { api, http, HttpResponse, server } from '../test/server';
import { routes } from './routes';

describe('routes', () => {
  it('opens the chat by default with the navigation', async () => {
    server.use(http.get(api('/conversations'), () => HttpResponse.json([])));
    const { router } = renderRoutes(routes, '/');

    expect(await screen.findByRole('heading', { name: 'New conversation', level: 1 })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/chat');
    const nav = screen.getByRole('navigation', { name: 'Main navigation' });
    expect(
      within(nav)
        .getAllByRole('link')
        .map((link) => link.textContent),
    ).toEqual(['Chat', 'Menus', 'Profile & goals', 'Preferences', 'Foods', 'Recipes']);
  });

  it('goes to the chat when the logo is clicked', async () => {
    server.use(
      http.get(api('/recipes'), () => HttpResponse.json(page([]))),
      http.get(api('/conversations'), () => HttpResponse.json([])),
    );
    const { router, user } = renderRoutes(routes, '/recipes');
    await screen.findByRole('heading', { name: 'Recipes', level: 1 });

    await user.click(screen.getByRole('link', { name: 'Easy Cook' }));

    expect(await screen.findByRole('heading', { name: 'New conversation', level: 1 })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/chat');
  });

  it.each([
    ['/chat', 'New conversation'],
    ['/preferences', 'Dietary preferences'],
  ])('opens %s', async (path, heading) => {
    server.use(
      http.get(api('/menus'), () => HttpResponse.json([])),
      http.get(api('/conversations'), () => HttpResponse.json([])),
      http.get(api('/preferences'), () => HttpResponse.json([])),
    );
    renderRoutes(routes, path);
    expect(await screen.findByRole('heading', { name: heading, level: 1 })).toBeInTheDocument();
  });

  it('opens /menus with the saved menus list', async () => {
    server.use(http.get(api('/menus'), () => HttpResponse.json([])));
    renderRoutes(routes, '/menus');
    expect(await screen.findByRole('navigation', { name: 'Saved menus' })).toBeInTheDocument();
    expect(await screen.findByText('No active menu yet')).toBeInTheDocument();
  });

  it('shows a not found page', async () => {
    renderRoutes(routes, '/nowhere');
    expect(await screen.findByText('Page not found')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Go to the chat' })).toHaveAttribute('href', '/');
  });
});
