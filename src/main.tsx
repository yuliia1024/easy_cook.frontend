import { QueryClientProvider } from '@tanstack/react-query';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router';
import { createQueryClient } from './app/query-client';
import { routes } from './app/routes';
import { clearQueryCacheOnUserChange } from './app/session-cache';
import './index.css';

const router = createBrowserRouter(routes);
const queryClient = createQueryClient();
clearQueryCacheOnUserChange(queryClient);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </StrictMode>,
);
