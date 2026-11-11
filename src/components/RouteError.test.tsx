import { screen } from '@testing-library/react';
import { renderRoutes } from '../test/render';
import { RouteError } from './RouteError';

function Broken(): never {
  throw new Error('render failed');
}

describe('RouteError', () => {
  it('shows the error with a way home', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const { user, router } = renderRoutes(
      [
        { path: '/', element: <p>home page</p> },
        { path: '/broken', element: <Broken />, errorElement: <RouteError /> },
      ],
      '/broken',
    );

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Something broke on this pageSomething went wrong. Please try again.',
    );

    await user.click(screen.getByRole('link', { name: 'Go to home page' }));
    expect(router.state.location.pathname).toBe('/');
    expect(await screen.findByText('home page')).toBeInTheDocument();
    vi.restoreAllMocks();
  });
});
