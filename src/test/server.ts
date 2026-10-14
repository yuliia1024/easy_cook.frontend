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

/** An AI SDK UI message stream (SSE) response made of `chunks`. */
export const uiMessageStream = (chunks: object[]) =>
  new HttpResponse(
    [...chunks.map((chunk) => `data: ${JSON.stringify(chunk)}\n\n`), 'data: [DONE]\n\n'].join(''),
    {
      status: 201,
      headers: { 'Content-Type': 'text/event-stream', 'x-vercel-ai-ui-message-stream': 'v1' },
    },
  );

export { http, HttpResponse };
