import { useEffect, useEffectEvent, useRef, useState } from 'react';
import { Navigate, useSearchParams } from 'react-router';
import { authApi } from '../../api/auth';
import { ApiError } from '../../api/http';
import { ErrorAlert } from '../../components/ErrorAlert';
import { BowlIcon } from '../../components/icons';
import { Spinner } from '../../components/Spinner';
import { useGoogleSignIn } from './auth.queries';
import { loadGoogleIdentity } from './google-identity';
import { safeNextPath } from './login-path';
import { signInErrorTitle } from './sign-in-error';
import { useSession } from './use-session';

/** A nonce lives 10 minutes: a new one (and a new button) a little before. */
export const NONCE_RENEW_MS = 9 * 60_000;

export const NOT_CONFIGURED =
  'Google sign-in is not configured (VITE_GOOGLE_CLIENT_ID is not set).';

/** Sign-in with the Google button (Google Identity Services); then back to `?next=`. */
export function LoginPage() {
  const { status, endedBy } = useSession();
  const [params] = useSearchParams();
  const next = safeNextPath(params.get('next'));
  const signIn = useGoogleSignIn();
  const buttonRef = useRef<HTMLDivElement>(null);
  const [loadError, setLoadError] = useState<unknown>(null);
  const [attempt, setAttempt] = useState(0);
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  const signedIn = status === 'signedIn';

  const renewNonce = (): void => setAttempt((count) => count + 1);

  // A nonce is single-use: a failed attempt needs a new one before the next.
  const onCredential = useEffectEvent((credential: string) =>
    signIn.mutate(credential, { onError: renewNonce }),
  );

  // Every `attempt`: a new nonce from the backend, then GIS initialized with it and the button.
  useEffect(() => {
    if (!clientId || signedIn) return;
    let cancelled = false;
    const renewTimer = setTimeout(() => setAttempt((count) => count + 1), NONCE_RENEW_MS);
    Promise.all([loadGoogleIdentity(), authApi.nonce()]).then(
      ([google, { nonce }]) => {
        if (cancelled || !buttonRef.current) return;
        google.initialize({
          client_id: clientId,
          callback: (response) => onCredential(response.credential),
          nonce,
          ux_mode: 'popup',
        });
        google.renderButton(buttonRef.current, {
          type: 'standard',
          theme: 'outline',
          size: 'large',
          text: 'signin_with',
          shape: 'pill',
          width: 280,
        });
      },
      (error: unknown) => {
        if (!cancelled) setLoadError(error);
      },
    );
    return () => {
      cancelled = true;
      clearTimeout(renewTimer);
    };
  }, [clientId, signedIn, attempt]);

  const retryLoad = (): void => {
    setLoadError(null);
    renewNonce();
  };

  if (signedIn) return <Navigate to={next} replace />;

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="flex w-full max-w-md flex-col items-center gap-5 rounded-3xl border border-sage-200 bg-white px-8 py-10 text-center">
        <span className="inline-flex size-12 items-center justify-center rounded-2xl bg-brand-700 text-white">
          <BowlIcon size={26} />
        </span>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Sign in to Easy Cook</h1>
          <p className="mt-1.5 text-sm/relaxed text-sage-500">
            {endedBy === 'expired'
              ? 'Your session has ended. Sign in again to continue.'
              : 'Use your Google account to plan menus and chat with the assistant.'}
          </p>
        </div>
        {!clientId ? (
          <ErrorAlert error={new ApiError(0, NOT_CONFIGURED)} />
        ) : (
          <>
            <div
              ref={buttonRef}
              className="flex min-h-11 justify-center"
              hidden={signIn.isPending}
            />
            {signIn.isPending && <Spinner label="Signing in…" />}
            {loadError != null && <ErrorAlert error={loadError} onRetry={retryLoad} />}
            {signIn.error && (
              <div className="w-full text-left">
                <ErrorAlert error={signIn.error} title={signInErrorTitle(signIn.error)} />
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}
