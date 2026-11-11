import { useState } from 'react';
import type { FoodItem } from '../../api/types';
import { Button } from '../../components/Button';
import { ErrorAlert } from '../../components/ErrorAlert';
import { formatNumber } from '../../lib/format';
import { FOOD_STATE_LABELS } from '../../lib/labels';
import { useDebouncedValue } from '../../lib/use-debounced-value';
import { useFoods } from '../foods/foods.queries';

/** Searches the food catalog and hands the chosen food to `onPick`. */
export function FoodPicker({ onPick }: { onPick: (food: FoodItem) => void }) {
  const [search, setSearch] = useState('');
  const debounced = useDebouncedValue(search.trim());
  const foods = useFoods({ search: debounced, limit: 8 }, debounced.length >= 2);

  return (
    <div className="rounded-2xl border border-sage-200 bg-sage-25 p-4">
      <label htmlFor="food-search" className="text-sm font-medium">
        Add an ingredient from the catalog
      </label>
      <input
        id="food-search"
        type="search"
        className="input mt-1"
        placeholder="Start typing a food name (min. 2 characters)"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        // The picker sits inside the recipe form: Enter must not submit (and save) the recipe.
        onKeyDown={(event) => {
          if (event.key === 'Enter') event.preventDefault();
        }}
      />
      {debounced.length >= 2 && (
        <div className="mt-2">
          {foods.isPending ? (
            <p className="text-sm text-sage-500">Searching…</p>
          ) : foods.isError ? (
            <ErrorAlert error={foods.error} onRetry={() => void foods.refetch()} />
          ) : foods.data.items.length === 0 ? (
            <p className="text-sm text-sage-500">
              Nothing found. Add the food to the catalog first.
            </p>
          ) : (
            <ul
              aria-label="Search results"
              className="divide-y divide-sage-200 overflow-hidden rounded-xl border border-sage-200 bg-white"
            >
              {foods.data.items.map((food) => (
                <li
                  key={food.id}
                  className="flex items-center justify-between gap-3 px-3 py-2 text-sm"
                >
                  <span>
                    <span className="font-medium">{food.name}</span>{' '}
                    <span className="text-xs text-sage-500">
                      ({FOOD_STATE_LABELS[food.state]}) · {formatNumber(food.kcalPer100g)} kcal/100
                      g
                    </span>
                  </span>
                  <Button
                    variant="secondary"
                    aria-label={`Add ${food.name}`}
                    onClick={() => {
                      onPick(food);
                      setSearch('');
                    }}
                  >
                    Add
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
