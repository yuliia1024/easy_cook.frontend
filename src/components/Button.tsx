import type { ComponentProps } from 'react';

import { buttonClass, type Variant } from './button-class';

interface Props extends ComponentProps<'button'> {
  variant?: Variant;
  loading?: boolean;
}

export function Button({
  variant,
  loading,
  disabled,
  children,
  type = 'button',
  className = '',
  ...rest
}: Props) {
  return (
    <button
      type={type}
      className={`${buttonClass(variant)} ${className}`}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading && (
        <span
          className="size-3 animate-spin rounded-full border-2 border-current border-t-transparent"
          aria-hidden
        />
      )}
      {children}
    </button>
  );
}
