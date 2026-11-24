import { ApiError } from '../../api/http';

export const TOO_MANY_ATTEMPTS = 'Too many sign-in attempts. Try again later.';

/** The headline of a failed sign-in; the alert shows the API message under it. */
export function signInErrorTitle(error: unknown): string {
  if (error instanceof ApiError && error.status === 429) return TOO_MANY_ATTEMPTS;
  if (error instanceof ApiError && error.status === 403) return 'This account has no access';
  if (error instanceof ApiError && error.status === 401) return 'Google sign-in failed';
  return 'Could not sign in';
}
