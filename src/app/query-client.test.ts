import { ApiError } from '../api/http';
import { createQueryClient } from './query-client';

describe('createQueryClient', () => {
  const retry = createQueryClient().getDefaultOptions().queries!.retry as (
    count: number,
    error: unknown,
  ) => boolean;

  it('does not retry client errors', () => {
    expect(retry(0, new ApiError(404, 'Not found'))).toBe(false);
  });

  it('retries network and server errors twice', () => {
    expect(retry(0, new ApiError(0, 'down'))).toBe(true);
    expect(retry(1, new ApiError(503, 'db'))).toBe(true);
    expect(retry(2, new ApiError(503, 'db'))).toBe(false);
  });
});
