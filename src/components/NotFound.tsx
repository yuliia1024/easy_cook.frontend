import { Link } from 'react-router';
import { buttonClass } from './button-class';
import { EmptyState } from './EmptyState';

export function NotFound() {
  return (
    <EmptyState
      title="Page not found"
      action={
        <Link to="/" className={buttonClass('secondary')}>
          Go to the chat
        </Link>
      }
    >
      The address may be mistyped, or the page was removed.
    </EmptyState>
  );
}
