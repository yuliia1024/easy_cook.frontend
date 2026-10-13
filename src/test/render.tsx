import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, type RenderResult } from '@testing-library/react';
import userEvent, { type UserEvent } from '@testing-library/user-event';
import type { ReactElement } from 'react';
import { createMemoryRouter, RouterProvider, type RouteObject } from 'react-router';

/** Renders `routes` at `path` with a fresh query client (no retries). */
export function renderRoutes(
  routes: RouteObject[],
  path: string,
): RenderResult & { user: UserEvent; router: ReturnType<typeof createMemoryRouter> } {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const router = createMemoryRouter(routes, { initialEntries: [path] });
  const user = userEvent.setup();
  const result = render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
  return { ...result, user, router };
}

export function renderPage(element: ReactElement, path = '/', pattern = '/') {
  return renderRoutes(
    [
      { path: pattern, element },
      { path: '*', element: <p>other page</p> },
    ],
    path,
  );
}
