import { Link, useSearchParams } from 'react-router';
import type { DietTag } from '../../api/types';
import { Button } from '../../components/Button';
import { AllergenList } from '../../components/AllergenList';
import { EmptyState } from '../../components/EmptyState';
import { MacroChips } from '../../components/MacroChips';
import { ErrorAlert } from '../../components/ErrorAlert';
import { PageHeader } from '../../components/PageHeader';
import { Pagination } from '../../components/Pagination';
import { Spinner } from '../../components/Spinner';
import { formatNumber } from '../../lib/format';
import { DIET_TAG_LABELS, MEAL_TYPE_LABELS, toOptions } from '../../lib/labels';
import { parseEnum, parseEnums, useSearchAndPage } from '../../lib/search-params';
import { useRecipes } from './recipes.queries';

const PAGE_LIMIT = 12;

export function RecipesPage() {
  const [params, setParams] = useSearchParams();
  const { search, debouncedSearch, page } = useSearchAndPage();
  const mealType = parseEnum(params.get('mealType'), MEAL_TYPE_LABELS);
  const dietType = parseEnums(params.getAll('dietType'), DIET_TAG_LABELS);

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
      const tags = parseEnums(next.getAll('dietType'), DIET_TAG_LABELS);
      next.delete('dietType');
      (tags.includes(tag) ? tags.filter((t) => t !== tag) : [...tags, tag]).forEach((t) =>
        next.append('dietType', t),
      );
    });

  return (
    <>
      <PageHeader title="Recipes">
        Calories and macros per serving: the sum of the ingredients, excluding optional ones.
      </PageHeader>

      <div className="mb-3 grid gap-3 sm:grid-cols-[1fr_11rem]">
        <input
          type="search"
          className="input"
          placeholder="Search by name"
          aria-label="Search recipes"
          value={search}
          onChange={(event) =>
            update(
              (next) =>
                event.target.value ? next.set('search', event.target.value) : next.delete('search'),
              // A new search starts from page 1 once it is debounced (`useSearchAndPage`).
              false,
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
              className={`rounded-full border px-3.5 py-1.5 text-[13px] ${active ? 'border-brand-700 bg-brand-700 font-medium text-white' : 'border-sage-300 bg-white text-sage-700 hover:bg-sage-100'}`}
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
        page > 1 ? (
          <EmptyState
            title="No recipes on this page"
            action={
              <Button variant="secondary" onClick={() => update(() => undefined)}>
                Go to the first page
              </Button>
            }
          >
            The list is shorter now.
          </EmptyState>
        ) : (
          <EmptyState title="No recipes found">Change the search or the filters.</EmptyState>
        )
      ) : (
        <>
          <ul
            className={`grid gap-4 sm:grid-cols-2 lg:grid-cols-3 ${recipes.isPlaceholderData ? 'opacity-60' : ''}`}
          >
            {recipes.data.items.map((recipe) => (
              <li key={recipe.id}>
                <Link
                  to={`/recipes/${recipe.id}`}
                  className="card flex h-full flex-col gap-1.5 p-4.5 transition-colors hover:border-brand-100"
                >
                  <span className="caption text-brand-800">
                    {MEAL_TYPE_LABELS[recipe.mealType]}
                  </span>
                  <span className="text-base/snug font-semibold">{recipe.name}</span>
                  <span className="text-xs text-sage-500">
                    {recipe.servings} serv.
                    {recipe.prepTimeMinutes !== null && ` · ${recipe.prepTimeMinutes} min`}
                    {recipe.dietType.length > 0 &&
                      ` · ${recipe.dietType.map((t) => DIET_TAG_LABELS[t]).join(', ')}`}
                  </span>
                  <AllergenList allergens={recipe.allergens} label="Contains" />
                  <span className="mt-auto flex flex-wrap items-center gap-1.5 pt-2 tabular-nums">
                    <b className="text-lg">{formatNumber(recipe.nutritionPerServing.kcal)}</b>{' '}
                    <span className="mr-1 text-xs text-sage-500">kcal</span>
                    <MacroChips values={recipe.nutritionPerServing} />
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
