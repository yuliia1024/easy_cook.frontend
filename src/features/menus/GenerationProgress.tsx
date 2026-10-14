import { formatNumber } from '../../lib/format';
import { MEAL_TYPE_LABELS } from '../../lib/labels';
import type { MenuGenerationProgress } from './use-menu-generation';

interface Props {
  progress: MenuGenerationProgress;
  /** False once the stream ended, e.g. with an error. */
  active: boolean;
}

/** What the assistant is proposing right now, streamed day by day. */
export function GenerationProgress({ progress, active }: Props) {
  return (
    <section
      aria-label="Generation progress"
      aria-live="polite"
      className="space-y-2 rounded-md bg-stone-50 p-3 text-sm"
    >
      <p className="font-medium">
        {active ? 'Planning' : 'Stopped at'} attempt {progress.attempt} of {progress.maxAttempts}
        {active && '…'}
      </p>
      {progress.rejection && (
        <div className="text-xs text-amber-800">
          <p>Attempt {progress.rejection.attempt} was rejected:</p>
          <ul className="list-disc pl-4">
            {progress.rejection.messages.map((message) => (
              <li key={message}>{message}</li>
            ))}
          </ul>
        </div>
      )}
      <ol className="space-y-2">
        {progress.days.map((day) => (
          <li key={day.dayIndex}>
            <p className="text-xs font-semibold text-stone-600">
              Day {day.dayIndex + 1}
              {day.date && ` · ${day.date}`}
            </p>
            <ul className="text-xs text-stone-700">
              {day.meals.map((meal, position) => (
                <li key={position}>
                  {MEAL_TYPE_LABELS[meal.mealType]}: {meal.recipeName ?? 'unknown recipe'} ×{' '}
                  {formatNumber(meal.servings)}
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ol>
    </section>
  );
}
