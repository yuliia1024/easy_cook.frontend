import { Navigate, type RouteObject } from 'react-router';
import { Layout } from '../components/Layout';
import { NotFound } from '../components/NotFound';
import { RouteError } from '../components/RouteError';
import { Spinner } from '../components/Spinner';
import { RequireSession } from '../features/auth/RequireSession';
import { sessionLoader } from '../features/auth/session-loader';

// Pages load on demand; the forms pull in zod and react-hook-form. Every page but the login page
// needs a session: `sessionLoader` checks the cookie first, `RequireSession` sends to the login.
export const routes: RouteObject[] = [
  {
    path: 'login',
    loader: sessionLoader,
    errorElement: <RouteError />,
    hydrateFallbackElement: <Spinner />,
    lazy: async () => ({ Component: (await import('../features/auth/LoginPage')).LoginPage }),
  },
  {
    element: <RequireSession />,
    loader: sessionLoader,
    errorElement: <RouteError />,
    hydrateFallbackElement: <Spinner />,
    children: [
      {
        element: <Layout />,
        children: [
          { index: true, element: <Navigate to="/chat" replace /> },
          {
            path: 'foods',
            lazy: async () => ({
              Component: (await import('../features/foods/FoodsPage')).FoodsPage,
            }),
          },
          {
            path: 'foods/:id',
            lazy: async () => ({
              Component: (await import('../features/foods/FoodDetailsPage')).FoodDetailsPage,
            }),
          },
          {
            path: 'recipes',
            lazy: async () => ({
              Component: (await import('../features/recipes/RecipesPage')).RecipesPage,
            }),
          },
          {
            path: 'recipes/:id',
            lazy: async () => ({
              Component: (await import('../features/recipes/RecipeDetailsPage')).RecipeDetailsPage,
            }),
          },
          {
            path: 'profile',
            lazy: async () => ({
              Component: (await import('../features/profile/ProfilePage')).ProfilePage,
            }),
          },
          {
            path: 'menus',
            lazy: async () => ({
              Component: (await import('../features/menus/MenusPage')).MenusPage,
            }),
          },
          {
            path: 'menus/:id',
            lazy: async () => ({
              Component: (await import('../features/menus/MenusPage')).MenusPage,
            }),
          },
          {
            path: 'chat',
            lazy: async () => ({
              Component: (await import('../features/chat/ChatPage')).ChatPage,
            }),
          },
          {
            path: 'chat/:id',
            lazy: async () => ({
              Component: (await import('../features/chat/ChatPage')).ChatPage,
            }),
          },
          {
            path: 'preferences',
            lazy: async () => ({
              Component: (await import('../features/preferences/PreferencesPage')).PreferencesPage,
            }),
          },
          { path: '*', element: <NotFound /> },
        ],
      },
    ],
  },
];
