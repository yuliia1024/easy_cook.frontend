export type Variant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'icon' | 'chip';

const SOLID = 'h-10.5 rounded-xl px-5 text-sm';

const VARIANTS: Record<Variant, string> = {
  primary: `${SOLID} bg-brand-700 font-semibold text-white hover:bg-brand-800`,
  secondary: `${SOLID} border border-sage-300 bg-white font-medium text-sage-700 hover:bg-sage-100`,
  danger: `${SOLID} bg-danger font-semibold text-white hover:bg-danger/90`,
  ghost:
    'rounded-lg px-2.5 py-1.5 text-sm font-medium text-sage-500 hover:bg-sage-100 hover:text-sage-900',
  /** A square primary button that holds only an icon; give it an `aria-label`. */
  icon: 'size-11 rounded-[14px] bg-brand-700 text-white hover:bg-brand-800',
  /** A rounded suggestion or filter. */
  chip: 'rounded-full border border-sage-300 bg-white px-3.5 py-2 text-left text-[13px] text-sage-700 hover:bg-sage-100',
};

export const buttonClass = (variant: Variant = 'primary'): string =>
  `inline-flex shrink-0 items-center justify-center gap-2 transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${VARIANTS[variant]}`;
