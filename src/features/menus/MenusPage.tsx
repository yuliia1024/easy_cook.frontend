import { Link } from 'react-router';
import { buttonClass } from '../../components/button-class';
import { EmptyState } from '../../components/EmptyState';
import { ErrorAlert } from '../../components/ErrorAlert';
import { CalendarIcon } from '../../components/icons';
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
          <EmptyState
            title="No menus yet"
            icon={<CalendarIcon size={26} />}
            action={
              <Link to="/chat" className={buttonClass()}>
                Open Chat
              </Link>
            }
          >
            Ask the assistant in Chat to plan up to 7 days, and the result will be saved here as a
            draft.
          </EmptyState>
        ) : (
          <ul className="space-y-3">
            {menus.data.map((menu) => (
              <li key={menu.id}>
                <Link
                  to={`/menus/${menu.id}`}
                  className="card flex flex-wrap items-center justify-between gap-2 px-6 py-4.5 transition-colors hover:border-brand-100"
                >
                  <span>
                    <span className="text-base font-semibold">{menu.title}</span>
                    <span className="mt-1 block text-xs text-sage-500">
                      {menu.versionCount} {menu.versionCount === 1 ? 'version' : 'versions'} ·
                      updated {formatDate(menu.updatedAt)}
                    </span>
                  </span>
                  {menu.confirmedVersionId ? (
                    <span className="rounded-full bg-brand-50 px-2.5 py-1 text-xs font-medium text-brand-800">
                      confirmed
                    </span>
                  ) : (
                    <span className="rounded-full bg-sage-100 px-2.5 py-1 text-xs font-medium text-sage-700">
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
