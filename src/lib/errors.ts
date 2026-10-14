import { ApiError } from '../api/http';

const STATUS_MESSAGES: Record<number, string> = {
  400: 'Validation failed.',
  404: 'Not found.',
  409: 'This record already exists.',
  422: 'The request could not be completed.',
  503: 'The database is unavailable.',
};

/** Human text for any error thrown by a query or mutation. */
export function errorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 0) return error.message;
    if (error.details.length > 0) return STATUS_MESSAGES[error.status] ?? error.message;
    return error.message || STATUS_MESSAGES[error.status] || 'Server error.';
  }
  return 'Something went wrong. Please try again.';
}

export function errorDetails(error: unknown): string[] {
  return error instanceof ApiError ? error.details : [];
}
