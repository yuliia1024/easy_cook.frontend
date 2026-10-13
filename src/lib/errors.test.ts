import { ApiError } from '../api/http';
import { errorDetails, errorMessage } from './errors';

describe('errorMessage', () => {
  it('uses the server message', () => {
    expect(errorMessage(new ApiError(404, 'Recipe not found'))).toBe('Recipe not found');
  });

  it('summarises validation errors and exposes the details', () => {
    const error = new ApiError(400, 'Bad Request', ['name should not be empty']);
    expect(errorMessage(error)).toBe('Дані не пройшли перевірку.');
    expect(errorDetails(error)).toEqual(['name should not be empty']);
  });

  it('explains a network failure', () => {
    expect(errorMessage(new ApiError(0, 'Сервер недоступний.'))).toBe('Сервер недоступний.');
  });

  it('has a fallback for unknown errors', () => {
    expect(errorMessage(new Error('boom'))).toMatch(/Щось пішло не так/);
    expect(errorDetails(new Error('boom'))).toEqual([]);
  });
});
