import { Link } from 'react-router';
import type { Macros, SuggestedMenu } from '../../api/types';
import { formatNumber } from '../../lib/format';
import { MACRO_LABELS, MACRO_UNITS, MACROS, MEAL_TYPE_LABELS } from '../../lib/labels';

function MacroCells({ values }: { values: Macros }) {
  return MACROS.map((macro) => (
    <td key={macro} className="px-3 py-2 text-right tabular-nums">
      {formatNumber(values[macro])}
    </td>
  ));
}

/** The meals of a suggested menu with their calories and macros, and the total of each day. */
export function SuggestedMenuTable({ menu }: { menu: SuggestedMenu }) {
  return (
    <div className="mt-3 space-y-3">
      {menu.days.map((day) => (
        <div key={day.dayIndex} className="overflow-x-auto rounded-md border border-stone-200">
          <table className="w-full text-sm">
            <caption className="sr-only">Suggested menu, day {day.dayIndex + 1}</caption>
            <thead className="bg-stone-100 text-left text-xs uppercase tracking-wide text-stone-600">
              <tr>
                <th className="px-3 py-2">Meal</th>
                <th className="px-3 py-2">Recipe</th>
                {MACROS.map((macro) => (
                  <th key={macro} className="px-3 py-2 text-right">
                    {MACRO_LABELS[macro]}, {MACRO_UNITS[macro]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {day.meals.map((meal) => (
                <tr key={meal.position} className="border-t border-stone-200">
                  <td className="px-3 py-2">{MEAL_TYPE_LABELS[meal.mealType]}</td>
                  <td className="px-3 py-2">
                    {meal.recipeId ? (
                      <Link
                        to={`/recipes/${meal.recipeId}`}
                        className="text-green-800 hover:underline"
                      >
                        {meal.recipeName}
                      </Link>
                    ) : (
                      meal.recipeName
                    )}
                  </td>
                  <MacroCells values={meal.nutrition} />
                </tr>
              ))}
            </tbody>
            <tfoot className="border-t border-stone-300 font-semibold">
              <tr>
                <td className="px-3 py-2" colSpan={2}>
                  Total
                </td>
                <MacroCells values={day.totals} />
              </tr>
            </tfoot>
          </table>
        </div>
      ))}
    </div>
  );
}
