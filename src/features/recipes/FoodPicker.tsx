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
    <div className="rounded-lg border border-stone-200 bg-stone-50 p-3">
      <label htmlFor="food-search" className="text-sm font-medium">
        Додати інгредієнт з каталогу
      </label>
      <input
        id="food-search"
        type="search"
        className="input mt-1"
        placeholder="Почніть вводити назву продукту (мін. 2 символи)"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
      />
      {debounced.length >= 2 && (
        <div className="mt-2">
          {foods.isPending ? (
            <p className="text-sm text-stone-500">Шукаємо…</p>
          ) : foods.isError ? (
            <ErrorAlert error={foods.error} onRetry={() => void foods.refetch()} />
          ) : foods.data.items.length === 0 ? (
            <p className="text-sm text-stone-500">
              Нічого не знайдено. Спершу додайте продукт у каталог.
            </p>
          ) : (
            <ul
              aria-label="Результати пошуку"
              className="divide-y divide-stone-200 rounded-md border border-stone-200 bg-white"
            >
              {foods.data.items.map((food) => (
                <li
                  key={food.id}
                  className="flex items-center justify-between gap-3 px-3 py-2 text-sm"
                >
                  <span>
                    <span className="font-medium">{food.name}</span>{' '}
                    <span className="text-xs text-stone-500">
                      ({FOOD_STATE_LABELS[food.state]}) · {formatNumber(food.kcalPer100g)} ккал/100
                      г
                    </span>
                  </span>
                  <Button
                    variant="secondary"
                    aria-label={`Додати ${food.name}`}
                    onClick={() => {
                      onPick(food);
                      setSearch('');
                    }}
                  >
                    Додати
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
