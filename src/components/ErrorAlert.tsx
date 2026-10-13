import { errorDetails, errorMessage } from '../lib/errors';
import { Button } from './Button';

interface Props {
  error: unknown;
  onRetry?: () => void;
  title?: string;
}

export function ErrorAlert({ error, onRetry, title }: Props) {
  const details = errorDetails(error);

  return (
    <div
      role="alert"
      className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-800"
    >
      <p className="font-medium">{title ?? errorMessage(error)}</p>
      {title && <p>{errorMessage(error)}</p>}
      {details.length > 0 && (
        <ul className="mt-2 list-disc pl-5">
          {details.map((detail) => (
            <li key={detail}>{detail}</li>
          ))}
        </ul>
      )}
      {onRetry && (
        <Button variant="secondary" className="mt-3" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  );
}
