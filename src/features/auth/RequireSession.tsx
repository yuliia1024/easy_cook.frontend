import { Navigate, Outlet, useLoaderData, useLocation, useRevalidator } from 'react-router';
import { ErrorAlert } from '../../components/ErrorAlert';
import { Spinner } from '../../components/Spinner';
import { LOGIN_PATH, loginPath } from './login-path';
import type { SessionLoaderData } from './session-loader';
import { useSession } from './use-session';

/**
 * Renders the protected routes for a signed-in user. Otherwise sends to the login page, which
 * brings the user back here, unless the user signed out.
 */
export function RequireSession() {
  const { status, endedBy } = useSession();
  const location = useLocation();
  const data = useLoaderData<SessionLoaderData | undefined>();
  const revalidator = useRevalidator();

  if (status === 'signedIn') return <Outlet />;
  if (status === 'signedOut') {
    return <Navigate to={endedBy === 'signedOut' ? LOGIN_PATH : loginPath(location)} replace />;
  }
  if (data?.error && revalidator.state === 'idle') {
    return (
      <div className="mx-auto max-w-xl p-6">
        <ErrorAlert
          error={data.error}
          title="Could not check your session"
          onRetry={() => void revalidator.revalidate()}
        />
      </div>
    );
  }
  return <Spinner />;
}
