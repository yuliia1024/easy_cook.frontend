import { useId, useState, type KeyboardEvent } from 'react';
import { Link } from 'react-router';
import type { SuggestedDay, SuggestedMenu } from '../../api/types';
import { MacroChips } from '../../components/MacroChips';
import { formatNumber, servingsLabel } from '../../lib/format';
import { MACRO_LABELS, MACRO_UNITS, MEAL_TYPE_LABELS } from '../../lib/labels';
import { menuRecipePath } from '../../lib/menu-servings';

const GRAM_MACROS = ['proteinG', 'fatG', 'carbsG'] as const;

const dayLabel = (day: SuggestedDay): string => `Day ${day.dayIndex + 1}`;

/** A suggested menu one day at a time: a card per meal with its servings and the total of the day. */
export function SuggestedMenuDays({ menu }: { menu: SuggestedMenu }) {
  const id = useId();
  const [selected, setSelected] = useState(0);
  const day = menu.days[Math.min(selected, menu.days.length - 1)];
  if (!day) return null;

  // Arrow keys move between the day tabs, as in any tab list.
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>): void => {
    const step = { ArrowRight: 1, ArrowLeft: -1 }[event.key];
    if (!step) return;
    const next = (selected + step + menu.days.length) % menu.days.length;
    setSelected(next);
    event.currentTarget.querySelectorAll('button')[next]?.focus();
  };

  return (
    <div className="flex flex-col gap-4">
      {menu.days.length > 1 && (
        <div
          role="tablist"
          aria-label="Days"
          className="flex gap-2 overflow-x-auto pb-0.5"
          onKeyDown={onKeyDown}
        >
          {menu.days.map((item, index) => (
            <button
              key={item.dayIndex}
              type="button"
              role="tab"
              aria-selected={index === selected}
              aria-controls={`${id}-panel`}
              tabIndex={index === selected ? 0 : -1}
              onClick={() => setSelected(index)}
              className={`flex-none rounded-full border px-4 py-2 text-[13px] ${index === selected ? 'border-brand-700 bg-brand-700 font-semibold text-white' : 'border-sage-300 bg-white font-medium text-sage-700 hover:bg-sage-100'}`}
            >
              {dayLabel(item)}
            </button>
          ))}
        </div>
      )}

      <section
        id={`${id}-panel`}
        role={menu.days.length > 1 ? 'tabpanel' : undefined}
        aria-label={`Suggested menu, ${dayLabel(day).toLowerCase()}`}
        className="flex flex-col gap-4"
      >
        <ul className="grid grid-cols-[repeat(auto-fit,minmax(11rem,1fr))] gap-3">
          {day.meals.map((meal) => (
            <li key={meal.position} className="flex flex-col gap-2 rounded-2xl bg-sage-50 p-4">
              <span className="caption text-xs">{MEAL_TYPE_LABELS[meal.mealType]}</span>
              {meal.recipeId ? (
                <Link
                  to={menuRecipePath(meal.recipeId, meal.servings)}
                  className="text-base/snug font-semibold text-brand-800 hover:underline"
                >
                  {meal.recipeName}
                </Link>
              ) : (
                <span className="text-base/snug font-semibold">{meal.recipeName}</span>
              )}
              <span className="text-[13px] text-sage-500">{servingsLabel(meal.servings)}</span>
              <span className="mt-1 text-[26px] font-bold tabular-nums">
                {formatNumber(meal.nutrition.kcal)}
                <span className="text-[13px] font-medium text-sage-500"> kcal</span>
              </span>
              <span className="flex flex-wrap gap-1.5">
                <MacroChips values={meal.nutrition} unit />
              </span>
            </li>
          ))}
        </ul>

        <div className="flex flex-wrap items-center justify-between gap-4 rounded-[14px] bg-sage-900 px-4.5 py-3.5 text-sm text-white">
          <span className="font-semibold">{dayLabel(day)} total</span>
          <span className="flex flex-wrap gap-x-5.5 gap-y-1 tabular-nums">
            <span>
              <b className="text-lg">{formatNumber(day.totals.kcal)}</b> kcal
            </span>
            {GRAM_MACROS.map((macro) => (
              <span key={macro}>
                {MACRO_LABELS[macro]}{' '}
                <b>
                  {formatNumber(day.totals[macro])} {MACRO_UNITS[macro]}
                </b>
              </span>
            ))}
          </span>
        </div>
      </section>
    </div>
  );
}
