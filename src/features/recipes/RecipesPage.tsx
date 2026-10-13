import { Link, useSearchParams } from 'react-router';
import type { DietTag, MealType } from '../../api/types';
import { buttonClass } from '../../components/button-class';
import { EmptyState } from '../../components/EmptyState';
import { ErrorAlert } from '../../components/ErrorAlert';
import { PageHeader } from '../../components/PageHeader';
import { Pagination } from '../../components/Pagination';
import { Spinner } from '../../components/Spinner';
import { formatNumber } from '../../lib/format';
import { DIET_TAG_LABELS, MEAL_TYPE_LABELS, toOptions } from '../../lib/labels';
import { useDebouncedValue } from '../../lib/use-debounced-value';
import { useRecipes } from './recipes.queries';

const PAGE_LIMIT = 12;

export function RecipesPage() {
  const [params, setParams] = useSearchParams();
  const search = params.get('search') ?? '';
  const mealType = (params.get('mealType') || undefined) as MealType | undefined;
  const dietType = params.getAll('dietType') as DietTag[];
  const page = Number(params.get('page')) || 1;
  const debouncedSearch = useDebouncedValue(search.trim());

  const recipes = useRecipes({
    search: debouncedSearch,
    mealType,
    dietType: dietType.length ? dietType : undefined,
    page,
    limit: PAGE_LIMIT,
  });

  const update = (change: (next: URLSearchParams) => void, resetPage = true): void => {
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        change(next);
        if (resetPage) next.delete('page');
        return next;
      },
      { replace: true },
    );
  };

  const toggleTag = (tag: DietTag): void =>
    update((next) => {
      const tags = next.getAll('dietType');
      next.delete('dietType');
      (tags.includes(tag) ? tags.filter((t) => t !== tag) : [...tags, tag]).forEach((t) =>
        next.append('dietType', t),
      );
    });

  return (
    <>
      <PageHeader
        title="Recipes"
        actions={
          <Link to="/recipes/new" className={buttonClass()}>
            Add recipe
          </Link>
        }
      >
        Calories and macros per serving: the sum of the ingredients, excluding optional ones.
      </PageHeader>

      <div className="mb-3 grid gap-3 sm:grid-cols-[1fr_auto]">
        <input
          type="search"
          className="input"
          placeholder="Search by name"
          aria-label="Search recipes"
          value={search}
          onChange={(event) =>
            update((next) =>
              event.target.value ? next.set('search', event.target.value) : next.delete('search'),
            )
          }
        />
        <select
          className="input"
          aria-label="Meal type"
          value={mealType ?? ''}
          onChange={(event) =>
            update((next) =>
              event.target.value
                ? next.set('mealType', event.target.value)
                : next.delete('mealType'),
            )
          }
        >
          <option value="">All meal types</option>
          {toOptions(MEAL_TYPE_LABELS).map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
      <div className="mb-5 flex flex-wrap gap-2" role="group" aria-label="Diet">
        {toOptions(DIET_TAG_LABELS).map((option) => {
          const active = dietType.includes(option.value);
          return (
            <button
              key={option.value}
              type="button"
              aria-pressed={active}
              onClick={() => toggleTag(option.value)}
              className={`rounded-full border px-3 py-1 text-xs ${active ? 'border-green-700 bg-green-700 text-white' : 'border-stone-300 bg-white text-stone-700 hover:bg-stone-100'}`}
            >
              {option.label}
            </button>
          );
        })}
      </div>

      {recipes.isPending ? (
        <Spinner />
      ) : recipes.isError ? (
        <ErrorAlert error={recipes.error} onRetry={() => void recipes.refetch()} />
      ) : recipes.data.items.length === 0 ? (
        <EmptyState title="No recipes found">Change the filters or add a recipe.</EmptyState>
      ) : (
        <>
          <ul
            className={`grid gap-4 sm:grid-cols-2 lg:grid-cols-3 ${recipes.isPlaceholderData ? 'opacity-60' : ''}`}
          >
            {recipes.data.items.map((recipe) => (
              <li key={recipe.id}>
                <Link
                  to={`/recipes/${recipe.id}`}
                  className="flex h-full flex-col rounded-lg border border-stone-200 bg-white p-4 hover:border-green-600 hover:shadow-sm"
                >
                  <span className="text-xs font-medium uppercase tracking-wide text-green-800">
                    {MEAL_TYPE_LABELS[recipe.mealType]}
                  </span>
                  <span className="mt-1 font-semibold">{recipe.name}</span>
                  <span className="mt-1 text-xs text-stone-500">
                    {recipe.servings} serv.
                    {recipe.prepTimeMinutes !== null && ` · ${recipe.prepTimeMinutes} min`}
                    {recipe.dietType.length > 0 &&
                      ` · ${recipe.dietType.map((t) => DIET_TAG_LABELS[t]).join(', ')}`}
                  </span>
                  <span className="mt-auto pt-3 text-sm tabular-nums text-stone-700">
                    <strong>{formatNumber(recipe.nutritionPerServing.kcal)} kcal</strong> · P{' '}
                    {formatNumber(recipe.nutritionPerServing.proteinG)} · F{' '}
                    {formatNumber(recipe.nutritionPerServing.fatG)} · C{' '}
                    {formatNumber(recipe.nutritionPerServing.carbsG)}
                    {!recipe.nutritionComplete && (
                      <span
                        className="ml-1 text-amber-600"
                        title="Some ingredients have unknown values"
                      >
                        *
                      </span>
                    )}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
          <Pagination
            page={page}
            limit={PAGE_LIMIT}
            total={recipes.data.total}
            onChange={(next) => update((params) => params.set('page', String(next)), false)}
          />
        </>
      )}
    </>
  );
}
