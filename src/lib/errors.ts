import { ApiError } from '../api/http';

const STATUS_MESSAGES: Record<number, string> = {
  400: 'Дані не пройшли перевірку.',
  404: 'Не знайдено.',
  409: 'Такий запис уже існує.',
  503: 'База даних недоступна.',
};

/** Human text for any error thrown by a query or mutation. */
export function errorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 0) return error.message;
    if (error.details.length > 0) return STATUS_MESSAGES[error.status] ?? error.message;
    return error.message || STATUS_MESSAGES[error.status] || 'Помилка сервера.';
  }
  return 'Щось пішло не так. Спробуйте ще раз.';
}

export function errorDetails(error: unknown): string[] {
  return error instanceof ApiError ? error.details : [];
}
