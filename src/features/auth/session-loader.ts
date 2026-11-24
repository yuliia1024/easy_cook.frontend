import { restoreSession } from '../../api/auth';

export interface SessionLoaderData {
  /** Why the session could not be checked (offline, 5xx); null once known. */
  error: unknown;
}

/** Checks the session cookie before the protected pages render (`GET /auth/session`). */
export async function sessionLoader(): Promise<SessionLoaderData> {
  try {
    await restoreSession();
    return { error: null };
  } catch (error) {
    return { error };
  }
}
