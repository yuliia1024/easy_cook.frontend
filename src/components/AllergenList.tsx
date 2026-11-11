import { useId } from 'react';
import type { Allergen } from '../api/types';
import { ALLERGEN_LABELS } from '../lib/labels';

interface Props {
  allergens: readonly Allergen[];
  /** Visible name of the list, also its accessible name. */
  label?: string;
  className?: string;
}

/** Allergens as chips in a labelled list; nothing when there are none. */
export function AllergenList({ allergens, label = 'Allergens', className = '' }: Props) {
  const id = useId();
  if (allergens.length === 0) return null;

  return (
    <div className={`flex flex-wrap items-center gap-1.5 ${className}`}>
      <span id={id} className="text-xs font-medium text-sage-600">
        {label}
      </span>
      <ul aria-labelledby={id} className="flex flex-wrap gap-1.5">
        {allergens.map((allergen) => (
          <li
            key={allergen}
            className="rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-800"
          >
            {/* A value newer than the labels is shown as sent. */}
            {ALLERGEN_LABELS[allergen] ?? allergen}
          </li>
        ))}
      </ul>
    </div>
  );
}
