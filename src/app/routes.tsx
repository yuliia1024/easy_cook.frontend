import { Navigate, type RouteObject } from 'react-router';
import { Layout } from '../components/Layout';
import { NotFound } from '../components/NotFound';
import { RouteError } from '../components/RouteError';
import { Spinner } from '../components/Spinner';

// Pages load on demand; the forms pull in zod and react-hook-form.
export const routes: RouteObject[] = [
  {
    element: <Layout />,
    errorElement: <RouteError />,
    hydrateFallbackElement: <Spinner />,
    children: [
      { index: true, element: <Navigate to="/recipes" replace /> },
      {
        path: 'foods',
        lazy: async () => ({ Component: (await import('../features/foods/FoodsPage')).FoodsPage }),
      },
      {
        path: 'foods/new',
        lazy: async () => ({
          Component: (await import('../features/foods/FoodFormPage')).FoodFormPage,
        }),
      },
      {
        path: 'foods/:id',
        lazy: async () => ({
          Component: (await import('../features/foods/FoodDetailsPage')).FoodDetailsPage,
        }),
      },
      {
        path: 'foods/:id/edit',
        lazy: async () => ({
          Component: (await import('../features/foods/FoodFormPage')).FoodFormPage,
        }),
      },
      {
        path: 'recipes',
        lazy: async () => ({
          Component: (await import('../features/recipes/RecipesPage')).RecipesPage,
        }),
      },
      {
        path: 'recipes/new',
        lazy: async () => ({
          Component: (await import('../features/recipes/RecipeFormPage')).RecipeFormPage,
        }),
      },
      {
        path: 'recipes/:id',
        lazy: async () => ({
          Component: (await import('../features/recipes/RecipeDetailsPage')).RecipeDetailsPage,
        }),
      },
      {
        path: 'recipes/:id/edit',
        lazy: async () => ({
          Component: (await import('../features/recipes/RecipeFormPage')).RecipeFormPage,
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
        path: 'menus/new',
        lazy: async () => ({
          Component: (await import('../features/menus/MenuFormPage')).MenuFormPage,
        }),
      },
      {
        path: 'menus/:id',
        lazy: async () => ({
          Component: (await import('../features/menus/MenuDetailsPage')).MenuDetailsPage,
        }),
      },
      {
        path: 'menus/:id/edit',
        lazy: async () => ({
          Component: (await import('../features/menus/MenuFormPage')).MenuFormPage,
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
];
