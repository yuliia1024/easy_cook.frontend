import { Link, useSearchParams } from 'react-router';
import type { FoodSource, FoodState } from '../../api/types';
import { buttonClass } from '../../components/button-class';
import { EmptyState } from '../../components/EmptyState';
import { ErrorAlert } from '../../components/ErrorAlert';
import { PageHeader } from '../../components/PageHeader';
import { Pagination } from '../../components/Pagination';
import { Spinner } from '../../components/Spinner';
import { formatNumber } from '../../lib/format';
import { FOOD_SOURCE_LABELS, FOOD_STATE_LABELS, toOptions } from '../../lib/labels';
import { useDebouncedValue } from '../../lib/use-debounced-value';
import { useFoods } from './foods.queries';

const PAGE_LIMIT = 20;

export function FoodsPage() {
  const [params, setParams] = useSearchParams();
  const search = params.get('search') ?? '';
  const state = (params.get('state') || undefined) as FoodState | undefined;
  const source = (params.get('source') || undefined) as FoodSource | undefined;
  const page = Number(params.get('page')) || 1;
  const debouncedSearch = useDebouncedValue(search.trim());

  const foods = useFoods({ search: debouncedSearch, state, source, page, limit: PAGE_LIMIT });

  const setParam = (key: string, value: string): void => {
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (value) next.set(key, value);
        else next.delete(key);
        if (key !== 'page') next.delete('page');
        return next;
      },
      { replace: true },
    );
  };

  return (
    <>
      <PageHeader
        title="Foods"
        actions={
          <Link to="/foods/new" className={buttonClass()}>
            Add food
          </Link>
        }
      >
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
        <EmptyState title="Nothing found">Change the search or add a food.</EmptyState>
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
                  <th>Source</th>
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
                    <td>
                      <span className="rounded-full bg-sage-100 px-2.5 py-0.5 text-xs whitespace-nowrap text-sage-700">
                        {FOOD_SOURCE_LABELS[food.source]}
                      </span>
                    </td>
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
