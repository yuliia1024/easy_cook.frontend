import type { Macros } from '../api/types';
import { formatNumber } from '../lib/format';
import { MACRO_LABELS } from '../lib/labels';

const CHIPS = [
  { macro: 'proteinG', short: 'P', className: 'bg-protein-bg text-protein-fg' },
  { macro: 'fatG', short: 'F', className: 'bg-fat-bg text-fat-fg' },
  { macro: 'carbsG', short: 'C', className: 'bg-carbs-bg text-carbs-fg' },
] as const;

/**
 * Protein, fat and carbs as colored chips: "P 9.8", or "P 9.8 g" with `unit`; the full nutrient
 * name is there for screen readers.
 */
export function MacroChips({ values, unit = false }: { values: Macros; unit?: boolean }) {
  return CHIPS.map(({ macro, short, className }) => (
    <span
      key={macro}
      title={MACRO_LABELS[macro]}
      className={`rounded-full px-2.5 py-1 text-xs font-medium tabular-nums ${className}`}
    >
      {/* Screen readers say "Protein 9.8", not "P 9.8". */}
      <span aria-hidden="true">{short}</span>
      <span className="sr-only">{MACRO_LABELS[macro]}</span> {formatNumber(values[macro])}
      {unit && ' g'}
    </span>
  ));
}
