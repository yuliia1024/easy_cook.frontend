export function Spinner({ label = 'Loading…' }: { label?: string }) {
  return (
    <div role="status" className="flex items-center gap-2 py-8 text-sm text-sage-500">
      <span
        className="size-4 animate-spin rounded-full border-2 border-brand-700 border-t-transparent"
        aria-hidden
      />
      {label}
    </div>
  );
}
