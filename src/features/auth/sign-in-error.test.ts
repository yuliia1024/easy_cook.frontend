import { ApiError } from '../../api/http';
import { signInErrorTitle, TOO_MANY_ATTEMPTS } from './sign-in-error';

describe('signInErrorTitle', () => {
  it('tells a refused account from a failed sign-in', () => {
    expect(signInErrorTitle(new ApiError(403, 'Email not allowed'))).toBe(
      'This account has no access',
    );
    expect(signInErrorTitle(new ApiError(401, 'Invalid token'))).toBe('Google sign-in failed');
    expect(signInErrorTitle(new ApiError(429, 'Too Many Requests'))).toBe(TOO_MANY_ATTEMPTS);
    expect(signInErrorTitle(new ApiError(0, 'Unavailable'))).toBe('Could not sign in');
    expect(signInErrorTitle(new Error('x'))).toBe('Could not sign in');
  });
});
