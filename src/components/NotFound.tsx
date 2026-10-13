import { Link } from 'react-router';
import { EmptyState } from './EmptyState';

export function NotFound() {
  return (
    <EmptyState title="Сторінку не знайдено">
      <Link to="/recipes" className="text-green-800 underline">
        До рецептів
      </Link>
    </EmptyState>
  );
}
