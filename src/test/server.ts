import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';

/** Handlers are added per test with `server.use(...)`; anything unhandled fails the test. */
export const server = setupServer();

export const api = (path: string): string => `*/api${path}`;

export const apiError = (statusCode: number, message: string | string[]) =>
  HttpResponse.json(
    { statusCode, message, error: 'Error', path: '/api', timestamp: '' },
    { status: statusCode },
  );

export { http, HttpResponse };
