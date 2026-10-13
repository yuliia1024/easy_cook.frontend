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
        title="Продукти"
        actions={
          <Link to="/foods/new" className={buttonClass()}>
            Додати продукт
          </Link>
        }
      >
        КБЖВ на 100 г продукту в зазначеному стані. «—» означає, що значення невідоме.
      </PageHeader>

      <div className="mb-4 grid gap-3 sm:grid-cols-[1fr_auto_auto]">
        <input
          type="search"
          className="input"
          placeholder="Пошук за назвою (укр. або англ.)"
          aria-label="Пошук продуктів"
          value={search}
          onChange={(event) => setParam('search', event.target.value)}
        />
        <select
          className="input"
          aria-label="Стан"
          value={state ?? ''}
          onChange={(event) => setParam('state', event.target.value)}
        >
          <option value="">Усі стани</option>
          {toOptions(FOOD_STATE_LABELS).map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <select
          className="input"
          aria-label="Джерело"
          value={source ?? ''}
          onChange={(event) => setParam('source', event.target.value)}
        >
          <option value="">Усі джерела</option>
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
        <EmptyState title="Нічого не знайдено">Змініть пошук або додайте продукт.</EmptyState>
      ) : (
        <>
          <div
            className={`overflow-x-auto rounded-lg border border-stone-200 bg-white ${foods.isPlaceholderData ? 'opacity-60' : ''}`}
          >
            <table className="w-full text-sm">
              <thead className="bg-stone-100 text-left text-xs uppercase tracking-wide text-stone-600">
                <tr>
                  <th className="px-3 py-2">Назва</th>
                  <th className="px-3 py-2">Стан</th>
                  <th className="px-3 py-2 text-right">Ккал</th>
                  <th className="px-3 py-2 text-right">Б, г</th>
                  <th className="px-3 py-2 text-right">Ж, г</th>
                  <th className="px-3 py-2 text-right">В, г</th>
                  <th className="px-3 py-2">Джерело</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {foods.data.items.map((food) => (
                  <tr key={food.id} className="hover:bg-stone-50">
                    <td className="px-3 py-2">
                      <Link
                        to={`/foods/${food.id}`}
                        className="font-medium text-green-800 hover:underline"
                      >
                        {food.name}
                      </Link>
                      {food.nameEn && food.nameEn !== food.name && (
                        <div className="text-xs text-stone-500">{food.nameEn}</div>
                      )}
                    </td>
                    <td className="px-3 py-2">{FOOD_STATE_LABELS[food.state]}</td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      {formatNumber(food.kcalPer100g)}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      {formatNumber(food.proteinG)}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">{formatNumber(food.fatG)}</td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      {formatNumber(food.carbsG)}
                    </td>
                    <td className="px-3 py-2 text-stone-600">{FOOD_SOURCE_LABELS[food.source]}</td>
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
