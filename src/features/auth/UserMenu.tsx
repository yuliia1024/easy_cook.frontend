import { Button } from '../../components/Button';
import { errorMessage } from '../../lib/errors';
import { useSignOut } from './auth.queries';
import { useSession } from './use-session';

/** The signed-in user in the header, with sign out (this device or everywhere). */
export function UserMenu() {
  const { user } = useSession();
  const signOut = useSignOut();
  if (!user) return null;

  const label = user.name ?? user.email;
  const signingOut = signOut.isPending ? signOut.variables : null;

  return (
    <div className="ml-auto flex flex-wrap items-center justify-end gap-3">
      {user.avatarUrl ? (
        <img
          src={user.avatarUrl}
          alt=""
          referrerPolicy="no-referrer"
          className="size-8 rounded-full object-cover"
        />
      ) : (
        <span
          aria-hidden
          className="inline-flex size-8 items-center justify-center rounded-full bg-brand-50 text-sm font-semibold text-brand-800"
        >
          {label.charAt(0).toUpperCase()}
        </span>
      )}
      <div className="hidden min-w-0 text-left sm:block">
        {user.name && <p className="truncate text-sm font-semibold text-sage-900">{user.name}</p>}
        <p className="truncate text-xs text-sage-500">{user.email}</p>
      </div>
      <Button
        variant="ghost"
        loading={signingOut === 'this'}
        disabled={signOut.isPending}
        onClick={() => signOut.mutate('this')}
      >
        Sign out
      </Button>
      <Button
        variant="ghost"
        loading={signingOut === 'everywhere'}
        disabled={signOut.isPending}
        onClick={() => signOut.mutate('everywhere')}
      >
        Sign out everywhere
      </Button>
      {signOut.isError && (
        <p role="alert" className="basis-full text-right text-xs text-red-700">
          Could not sign out, you are still signed in. {errorMessage(signOut.error)}
        </p>
      )}
    </div>
  );
}
