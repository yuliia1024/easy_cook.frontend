import { buildMenuVersion } from '../../test/fixtures';
import { shownVersion } from './shown-version';

const versions = [3, 2, 1].map((n) =>
  buildMenuVersion({ id: `v${n}`, versionNumber: n, isConfirmed: n === 2 }),
);

describe('shownVersion', () => {
  it('takes the requested version', () => {
    expect(shownVersion(versions, '1')?.id).toBe('v1');
  });

  it('falls back to the confirmed version when none or a missing one is requested', () => {
    expect(shownVersion(versions, null)?.id).toBe('v2');
    expect(shownVersion(versions, '9')?.id).toBe('v2');
    expect(shownVersion(versions, 'abc')?.id).toBe('v2');
  });

  it('falls back to the newest version of a draft', () => {
    const drafts = versions.map((v) => ({ ...v, isConfirmed: false }));
    expect(shownVersion(drafts, '0')?.id).toBe('v3');
  });

  it('has nothing to show without versions', () => {
    expect(shownVersion([], '1')).toBeUndefined();
  });
});
