export type Variant = 'primary' | 'secondary' | 'danger' | 'ghost';

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-green-700 text-white hover:bg-green-800',
  secondary: 'border border-stone-300 bg-white text-stone-800 hover:bg-stone-100',
  danger: 'bg-red-600 text-white hover:bg-red-700',
  ghost: 'text-stone-700 hover:bg-stone-100',
};

export const buttonClass = (variant: Variant = 'primary'): string =>
  `inline-flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${VARIANTS[variant]}`;
