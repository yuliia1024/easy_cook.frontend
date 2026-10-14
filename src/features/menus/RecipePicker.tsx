import { useState } from 'react';
import type { Recipe } from '../../api/types';
import { Button } from '../../components/Button';
import { ErrorAlert } from '../../components/ErrorAlert';
import { formatNumber } from '../../lib/format';
import { MEAL_TYPE_LABELS } from '../../lib/labels';
import { useDebouncedValue } from '../../lib/use-debounced-value';
import { useRecipes } from '../recipes/recipes.queries';

/** Searches the recipe catalog and hands the chosen recipe to `onPick`. */
export function RecipePicker({ id, onPick }: { id: string; onPick: (recipe: Recipe) => void }) {
  const [search, setSearch] = useState('');
  const debounced = useDebouncedValue(search.trim());
  const recipes = useRecipes({ search: debounced, limit: 8 }, debounced.length >= 2);

  return (
    <div>
      <label htmlFor={id} className="sr-only">
        Search recipes
      </label>
      <input
        id={id}
        type="search"
        className="input"
        placeholder="Search a recipe (min. 2 characters)"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
      />
      {debounced.length >= 2 && (
        <div className="mt-2">
          {recipes.isPending ? (
            <p className="text-sm text-stone-500">Searching…</p>
          ) : recipes.isError ? (
            <ErrorAlert error={recipes.error} onRetry={() => void recipes.refetch()} />
          ) : recipes.data.items.length === 0 ? (
            <p className="text-sm text-stone-500">Nothing found.</p>
          ) : (
            <ul
              aria-label="Recipe search results"
              className="divide-y divide-stone-200 rounded-md border border-stone-200 bg-white"
            >
              {recipes.data.items.map((recipe) => (
                <li
                  key={recipe.id}
                  className="flex items-center justify-between gap-3 px-3 py-2 text-sm"
                >
                  <span>
                    <span className="font-medium">{recipe.name}</span>{' '}
                    <span className="text-xs text-stone-500">
                      ({MEAL_TYPE_LABELS[recipe.mealType]}) ·{' '}
                      {formatNumber(recipe.nutritionPerServing.kcal)} kcal/serving
                    </span>
                  </span>
                  <Button
                    variant="secondary"
                    aria-label={`Choose ${recipe.name}`}
                    onClick={() => {
                      onPick(recipe);
                      setSearch('');
                    }}
                  >
                    Choose
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
