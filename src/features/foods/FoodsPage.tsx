import { Link, useSearchParams } from 'react-router';
import { Button } from '../../components/Button';
import { EmptyState } from '../../components/EmptyState';
import { ErrorAlert } from '../../components/ErrorAlert';
import { PageHeader } from '../../components/PageHeader';
import { Pagination } from '../../components/Pagination';
import { Spinner } from '../../components/Spinner';
import { formatNumber } from '../../lib/format';
import { FOOD_SOURCE_LABELS, FOOD_STATE_LABELS, toOptions } from '../../lib/labels';
import { parseEnum, useSearchAndPage } from '../../lib/search-params';
import { useFoods } from './foods.queries';

const PAGE_LIMIT = 20;

export function FoodsPage() {
  const [params, setParams] = useSearchParams();
  const { search, debouncedSearch, page } = useSearchAndPage();
  const state = parseEnum(params.get('state'), FOOD_STATE_LABELS);
  const source = parseEnum(params.get('source'), FOOD_SOURCE_LABELS);

  const foods = useFoods({ search: debouncedSearch, state, source, page, limit: PAGE_LIMIT });

  const setParam = (key: string, value: string): void => {
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (value) next.set(key, value);
        else next.delete(key);
        // A new search starts from page 1 once it is debounced (`useSearchAndPage`).
        if (key !== 'page' && key !== 'search') next.delete('page');
        return next;
      },
      { replace: true },
    );
  };

  return (
    <>
      <PageHeader title="Foods">
        Calories and macros per 100 g of the food in the given state. “—” means the value is
        unknown.
      </PageHeader>

      <div className="mb-4 grid gap-3 sm:grid-cols-[1fr_9rem_9rem]">
        <input
          type="search"
          className="input"
          placeholder="Search by name"
          aria-label="Search foods"
          value={search}
          onChange={(event) => setParam('search', event.target.value)}
        />
        <select
          className="input"
          aria-label="State"
          value={state ?? ''}
          onChange={(event) => setParam('state', event.target.value)}
        >
          <option value="">All states</option>
          {toOptions(FOOD_STATE_LABELS).map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <select
          className="input"
          aria-label="Source"
          value={source ?? ''}
          onChange={(event) => setParam('source', event.target.value)}
        >
          <option value="">All sources</option>
          {toOptions(FOOD_SOURCE_LABELS).map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      {foods.isPending ? (
        <Spinner />
      ) : foods.isError ? (
        <ErrorAlert error={foods.error} onRetry={() => void foods.refetch()} />
      ) : foods.data.items.length === 0 ? (
        page > 1 ? (
          <EmptyState
            title="No foods on this page"
            action={
              <Button variant="secondary" onClick={() => setParam('page', '')}>
                Go to the first page
              </Button>
            }
          >
            The list is shorter now.
          </EmptyState>
        ) : (
          <EmptyState title="Nothing found">Change the search or the filters.</EmptyState>
        )
      ) : (
        <>
          <div
            className={`card overflow-x-auto p-0 ${foods.isPlaceholderData ? 'opacity-60' : ''}`}
          >
            <table className="data-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>State</th>
                  <th className="text-right">Kcal</th>
                  <th className="text-right">P, g</th>
                  <th className="text-right">F, g</th>
                  <th className="text-right">C, g</th>
                </tr>
              </thead>
              <tbody>
                {foods.data.items.map((food) => (
                  <tr key={food.id} className="hover:bg-sage-25">
                    <td>
                      <Link
                        to={`/foods/${food.id}`}
                        className="font-medium text-brand-800 hover:underline"
                      >
                        {food.name}
                      </Link>
                      {food.nameEn && food.nameEn !== food.name && (
                        <div className="mt-0.5 text-xs text-sage-500">{food.nameEn}</div>
                      )}
                    </td>
                    <td>{FOOD_STATE_LABELS[food.state]}</td>
                    <td className="text-right tabular-nums">{formatNumber(food.kcalPer100g)}</td>
                    <td className="text-right tabular-nums">{formatNumber(food.proteinG)}</td>
                    <td className="text-right tabular-nums">{formatNumber(food.fatG)}</td>
                    <td className="text-right tabular-nums">{formatNumber(food.carbsG)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination
            page={page}
            limit={PAGE_LIMIT}
            total={foods.data.total}
            onChange={(next) => setParam('page', String(next))}
          />
        </>
      )}
    </>
  );
}
