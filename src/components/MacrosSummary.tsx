import type { Macro } from '../api/types';
import { formatNumber } from '../lib/format';
import { MACRO_LABELS, MACRO_UNITS, MACROS } from '../lib/labels';

type Values = Record<Macro, number | null>;

const MISSING_NOTE = 'Some ingredients have unknown values';

/** Tile colors with `highlight`: the same tones as the macro chips. */
const MACRO_TONES: Record<Macro, string> = {
  kcal: 'bg-sage-900 text-white',
  proteinG: 'bg-protein-bg text-protein-fg',
  fatG: 'bg-fat-bg text-fat-fg',
  carbsG: 'bg-carbs-bg text-carbs-fg',
};

interface Props {
  values: Values;
  caption?: string;
  /** Macros that are incomplete because an ingredient value is unknown. */
  missing?: Macro[];
  /** False when the tiles already sit inside a card. */
  framed?: boolean;
  /** A color per value, so calories and each macro stand apart. */
  highlight?: boolean;
}

/** Calories and macros as four tiles. Null = unknown, shown as a dash. */
export function MacrosSummary({
  values,
  caption,
  missing = [],
  framed = true,
  highlight = false,
}: Props) {
  return (
    <section
      aria-label={caption}
      className={framed ? 'rounded-2xl border border-sage-200 bg-white p-4.5' : ''}
    >
      {caption && <h3 className="mb-3 text-sm font-semibold">{caption}</h3>}
      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {MACROS.map((macro) => (
          <div
            key={macro}
            className={`rounded-[14px] px-4 py-3.5 ${highlight ? MACRO_TONES[macro] : 'bg-sage-50'}`}
          >
            <dt className={`caption ${highlight ? 'text-current! opacity-75' : ''}`}>
              {MACRO_LABELS[macro]}
            </dt>
            <dd className="mt-1 flex flex-wrap items-baseline gap-x-1 text-2xl font-bold tabular-nums">
              {formatNumber(values[macro])}
              <span
                className={`text-[13px] font-medium ${highlight ? 'opacity-75' : 'text-sage-500'}`}
              >
                {MACRO_UNITS[macro]}
              </span>
              {missing.includes(macro) && (
                <>
                  <span
                    aria-hidden="true"
                    className={highlight ? undefined : 'text-amber-600'}
                    title={MISSING_NOTE}
                  >
                    *
                  </span>
                  <span className="sr-only">({MISSING_NOTE.toLowerCase()})</span>
                </>
              )}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
