import type { MenuVersion } from '../../api/types';

/**
 * The version a menu page shows, for the details and the side list alike: the one `?version=N`
 * asks for when the menu has it, otherwise the confirmed one, otherwise the newest.
 * `versions` are newest first.
 */
export function shownVersion(
  versions: MenuVersion[],
  requested: string | null,
): MenuVersion | undefined {
  const number = requested === null ? NaN : Number(requested);
  return (
    versions.find((v) => v.versionNumber === number) ??
    versions.find((v) => v.isConfirmed) ??
    versions[0]
  );
}
