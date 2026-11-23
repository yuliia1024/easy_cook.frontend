import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router';
import { authApi } from '../../api/auth';
import { ApiError } from '../../api/http';
import { clearSession, setSession } from '../../api/session';
import { LOGIN_PATH } from './login-path';

/** Signs in with the Google credential; the cache is cleared so no data of another user shows. */
export function useGoogleSignIn() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: authApi.google,
    onSuccess: (session) => {
      queryClient.removeQueries();
      setSession(session);
    },
  });
}

/**
 * Ends this session on the backend, then clears it and the query
 * cache here and goes to the login page. Only once the backend has ended it (or answers 401: it
 * had ended already): the cookie is httpOnly, so a session the backend kept would be back on the
 * next page load. Any other failure keeps the user signed in, with the error to try again.
 */
export function useSignOut() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  return useMutation({
    mutationFn: async (): Promise<void> => {
      try {
        await authApi.logout();
      } catch (error) {
        if (!(error instanceof ApiError && error.status === 401)) throw error;
      }
    },
    onSuccess: () => {
      clearSession('signedOut');
      queryClient.removeQueries();
      void navigate(LOGIN_PATH, { replace: true });
    },
  });
}
