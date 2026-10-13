import { Button } from './Button';

interface Props {
  page: number;
  limit: number;
  total: number;
  onChange: (page: number) => void;
}

export function Pagination({ page, limit, total, onChange }: Props) {
  const pages = Math.max(1, Math.ceil(total / limit));
  if (pages <= 1) return null;

  return (
    <nav aria-label="Сторінки" className="mt-4 flex items-center justify-between gap-2 text-sm">
      <span className="text-stone-600">
        Сторінка {page} з {pages} · {total} записів
      </span>
      <div className="flex gap-2">
        <Button variant="secondary" disabled={page <= 1} onClick={() => onChange(page - 1)}>
          Назад
        </Button>
        <Button variant="secondary" disabled={page >= pages} onClick={() => onChange(page + 1)}>
          Далі
        </Button>
      </div>
    </nav>
  );
}
