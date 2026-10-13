import { Link } from 'react-router';
import { EmptyState } from './EmptyState';

export function NotFound() {
  return (
    <EmptyState title="Page not found">
      <Link to="/recipes" className="text-green-800 underline">
        Back to recipes
      </Link>
    </EmptyState>
  );
}
