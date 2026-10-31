import { Link, useSearchParams } from 'react-router';
import type { MenuStatus } from '../../api/types';
import { buttonClass } from '../../components/button-class';
import { EmptyState } from '../../components/EmptyState';
import { ErrorAlert } from '../../components/ErrorAlert';
import { CalendarIcon } from '../../components/icons';
import { PageHeader } from '../../components/PageHeader';
import { Spinner } from '../../components/Spinner';
import { formatDate } from '../../lib/format';
import { MENU_STATUS_LABELS, toOptions } from '../../lib/labels';
import { useMenus } from './menus.queries';

const EMPTY_TITLES: Record<MenuStatus, string> = {
  confirmed: 'No confirmed menus yet',
  draft: 'No draft menus',
  all: 'No menus yet',
};

const EMPTY_TEXTS: Record<MenuStatus, string> = {
  confirmed:
    'Menus the assistant plans in Chat are saved as drafts. Confirm a version of one to see it here.',
  draft: 'Ask the assistant in Chat to plan up to 7 days, and the result will be saved here.',
  all: 'Ask the assistant in Chat to plan up to 7 days, and the result will be saved as a draft.',
};

/** Shows the confirmed menus unless `?status=` asks for the drafts or all of them. */
export function MenusPage() {
  const [params, setParams] = useSearchParams();
  const requested = params.get('status');
  const status: MenuStatus = requested === 'draft' || requested === 'all' ? requested : 'confirmed';
  const menus = useMenus(status);

  return (
    <>
      <PageHeader title="Menus">
        Your saved menus. A menu stays a draft until you confirm one of its versions.
      </PageHeader>

      <div className="mb-5 flex flex-wrap gap-2" role="group" aria-label="Status">
        {toOptions(MENU_STATUS_LABELS).map((option) => {
          const active = status === option.value;
          return (
            <button
              key={option.value}
              type="button"
              aria-pressed={active}
              onClick={() =>
                setParams(option.value === 'confirmed' ? {} : { status: option.value }, {
                  replace: true,
                })
              }
              className={`rounded-full border px-3.5 py-1.5 text-[13px] ${active ? 'border-brand-700 bg-brand-700 font-medium text-white' : 'border-sage-300 bg-white text-sage-700 hover:bg-sage-100'}`}
            >
              {option.label}
            </button>
          );
        })}
      </div>

      <section aria-label="Saved menus">
        {menus.isPending ? (
          <Spinner />
        ) : menus.isError ? (
          <ErrorAlert error={menus.error} onRetry={() => void menus.refetch()} />
        ) : menus.data.length === 0 ? (
          <EmptyState
            title={EMPTY_TITLES[status]}
            icon={<CalendarIcon size={26} />}
            action={
              <Link to="/chat" className={buttonClass()}>
                Open Chat
              </Link>
            }
          >
            {EMPTY_TEXTS[status]}
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
