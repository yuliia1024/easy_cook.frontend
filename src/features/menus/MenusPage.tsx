import { Link } from 'react-router';
import { EmptyState } from '../../components/EmptyState';
import { ErrorAlert } from '../../components/ErrorAlert';
import { PageHeader } from '../../components/PageHeader';
import { Spinner } from '../../components/Spinner';
import { formatDate } from '../../lib/format';
import { useMenus } from './menus.queries';

export function MenusPage() {
  const menus = useMenus();

  return (
    <>
      <PageHeader title="Menus">
        Your saved menus. A menu stays a draft until you confirm one of its versions.
      </PageHeader>

      <section aria-label="Saved menus">
        {menus.isPending ? (
          <Spinner />
        ) : menus.isError ? (
          <ErrorAlert error={menus.error} onRetry={() => void menus.refetch()} />
        ) : menus.data.length === 0 ? (
          <EmptyState title="No menus yet" />
        ) : (
          <ul className="space-y-3">
            {menus.data.map((menu) => (
              <li key={menu.id}>
                <Link
                  to={`/menus/${menu.id}`}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-stone-200 bg-white p-4 hover:border-green-600 hover:shadow-sm"
                >
                  <span>
                    <span className="font-semibold">{menu.title}</span>
                    <span className="mt-1 block text-xs text-stone-500">
                      {menu.versionCount} {menu.versionCount === 1 ? 'version' : 'versions'} ·
                      updated {formatDate(menu.updatedAt)}
                    </span>
                  </span>
                  {menu.confirmedVersionId ? (
                    <span className="rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-800">
                      confirmed
                    </span>
                  ) : (
                    <span className="rounded-full bg-stone-100 px-2 py-0.5 text-xs text-stone-600">
                      draft
                    </span>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
