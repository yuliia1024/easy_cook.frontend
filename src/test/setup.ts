import '@testing-library/jest-dom/vitest';
import { cleanup, configure } from '@testing-library/react';
import { server } from './server';

// The first test of a file waits for its lazy routes to compile, which is slow on a cold CI runner
// with every file compiling at once; the default 1s of `findBy*` / `waitFor` can run out there.
configure({ asyncUtilTimeout: 3000 });

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => {
  cleanup();
  server.resetHandlers();
});
afterAll(() => server.close());
