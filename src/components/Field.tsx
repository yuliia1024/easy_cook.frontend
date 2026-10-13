import type { ReactNode } from 'react';

interface Props {
  label: string;
  htmlFor: string;
  error?: string;
  hint?: string;
  children: ReactNode;
  className?: string;
}

/** Label + control + hint/error. The control should set `aria-describedby={`${htmlFor}-msg`}`. */
export function Field({ label, htmlFor, error, hint, children, className = '' }: Props) {
  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      <label htmlFor={htmlFor} className="text-sm font-medium text-stone-700">
        {label}
      </label>
      {children}
      {(error || hint) && (
        <p id={`${htmlFor}-msg`} className={`text-xs ${error ? 'text-red-600' : 'text-stone-500'}`}>
          {error ?? hint}
        </p>
      )}
    </div>
  );
}
