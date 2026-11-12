import { screen, within } from '@testing-library/react';
import { renderRoutes } from '../test/render';
import { Layout } from './Layout';

function renderLayout(path: string) {
  return renderRoutes(
    [{ element: <Layout />, children: [{ path: '*', element: <p>page content</p> }] }],
    path,
  );
}

describe('Layout', () => {
  it('shows the navigation with the current page marked', () => {
    renderLayout('/foods');

    const nav = screen.getByRole('navigation', { name: 'Main navigation' });
    expect(within(nav).getByRole('link', { name: 'Foods' })).toHaveAttribute(
      'aria-current',
      'page',
    );
    expect(within(nav).getByRole('link', { name: 'Recipes' })).not.toHaveAttribute('aria-current');
    expect(screen.getByRole('main')).toHaveTextContent('page content');
  });

  it.each([
    ['/chat/123', 'max-w-7xl'],
    ['/menus', 'max-w-7xl'],
    ['/recipes', 'max-w-[1120px]'],
  ])('gives %s the right width', (path, width) => {
    renderLayout(path);

    expect(screen.getByRole('main')).toHaveClass(width);
  });

  it('links the logo to the home page', () => {
    renderLayout('/foods');

    expect(screen.getByRole('link', { name: 'Easy Cook' })).toHaveAttribute('href', '/');
  });
});
