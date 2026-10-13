import type { Macro } from '../api/types';
import { formatNumber } from '../lib/format';
import { MACRO_LABELS, MACRO_UNITS, MACROS } from '../lib/labels';

type Values = Record<Macro, number | null>;

interface Props {
  values: Values;
  caption?: string;
  /** Macros that are incomplete because an ingredient value is unknown. */
  missing?: Macro[];
}

/** КБЖВ as four tiles. Null = unknown, shown as a dash. */
export function MacrosSummary({ values, caption, missing = [] }: Props) {
  return (
    <section aria-label={caption} className="rounded-lg border border-stone-200 bg-white p-4">
      {caption && <h3 className="mb-3 text-sm font-medium text-stone-600">{caption}</h3>}
      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {MACROS.map((macro) => (
          <div key={macro} className="rounded-md bg-stone-50 p-3">
            <dt className="text-xs uppercase tracking-wide text-stone-500">
              {MACRO_LABELS[macro]}
            </dt>
            <dd className="mt-1 text-lg font-semibold tabular-nums">
              {formatNumber(values[macro])}
              <span className="ml-1 text-sm font-normal text-stone-500">{MACRO_UNITS[macro]}</span>
              {missing.includes(macro) && (
                <span className="ml-1 text-amber-600" title="Є інгредієнти з невідомим значенням">
                  *
                </span>
              )}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
