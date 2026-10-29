import type { ReactNode } from 'react';

interface Props {
  title: string;
  children?: ReactNode;
  icon?: ReactNode;
  /** A call to action under the text. */
  action?: ReactNode;
}

export function EmptyState({ title, children, icon, action }: Props) {
  return (
    <div className="flex flex-col items-center gap-2.5 rounded-3xl border-[1.5px] border-dashed border-sage-400 bg-white px-6 py-12 text-center">
      {icon && (
        <span className="mb-1 flex size-13 items-center justify-center rounded-2xl bg-brand-50 text-brand-700">
          {icon}
        </span>
      )}
      <p className="text-lg font-bold">{title}</p>
      {children && <div className="max-w-md text-sm/relaxed text-sage-500">{children}</div>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
