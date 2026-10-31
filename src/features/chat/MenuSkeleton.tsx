import type { PendingMenu } from '../../api/types';
import { MEAL_TYPE_LABELS } from '../../lib/labels';

const bar = 'animate-pulse rounded-md bg-sage-200';

/**
 * Placeholders of the menu being planned, laid out like `SuggestedMenuDays`: the day tabs, a card
 * per meal of the first day and the total of the day.
 */
export function MenuSkeleton({ menu }: { menu: PendingMenu }) {
  return (
    <div aria-label="Menu being planned" role="group" className="flex flex-col gap-4">
      {menu.days > 1 && (
        <ul aria-label="Days" className="flex gap-2 overflow-x-auto pb-0.5">
          {Array.from({ length: menu.days }, (_, index) => (
            <li
              key={index}
              className="flex-none rounded-full border border-sage-200 px-4 py-2 text-[13px] text-sage-400"
            >
              Day {index + 1}
            </li>
          ))}
        </ul>
      )}
      <ul className="grid grid-cols-[repeat(auto-fit,minmax(11rem,1fr))] gap-3">
        {menu.mealTypes.map((mealType) => (
          <li key={mealType} className="flex flex-col gap-2 rounded-2xl bg-sage-50 p-4">
            <span className="caption text-xs">{MEAL_TYPE_LABELS[mealType]}</span>
            <span aria-hidden className={`${bar} h-5 w-4/5`} />
            <span aria-hidden className={`${bar} h-3.5 w-1/3`} />
            <span aria-hidden className={`${bar} mt-1 h-7 w-1/2`} />
            <span aria-hidden className="flex gap-1.5">
              <span className={`${bar} h-5 w-12 rounded-full`} />
              <span className={`${bar} h-5 w-12 rounded-full`} />
              <span className={`${bar} h-5 w-12 rounded-full`} />
            </span>
          </li>
        ))}
      </ul>
      <div aria-hidden className="h-12 animate-pulse rounded-[14px] bg-sage-200" />
    </div>
  );
}
