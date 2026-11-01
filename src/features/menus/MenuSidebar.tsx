import type { UseQueryResult } from '@tanstack/react-query';
import { useId, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import type { MenuSummary } from '../../api/types';
import { ErrorAlert } from '../../components/ErrorAlert';
import { ChevronIcon } from '../../components/icons';
import { Spinner } from '../../components/Spinner';
import { formatDate } from '../../lib/format';
import { MENU_STATUS_LABELS } from '../../lib/labels';

/** How many menus a group shows before "Show all". */
export const MENU_GROUP_LIMIT = 5;

type GroupQuery = UseQueryResult<MenuSummary[]>;

interface Props {
  /** Newest confirmation first; the first one is the active menu. */
  confirmed: GroupQuery;
  drafts: GroupQuery;
  selectedId: string | null;
  activeId: string | null;
}

/** The saved menus, laid out like the chat's conversation list: confirmed, then drafts. */
export function MenuSidebar({ confirmed, drafts, selectedId, activeId }: Props) {
  return (
    <nav aria-label="Saved menus" className="flex flex-col gap-1">
      <MenuGroup
        label={MENU_STATUS_LABELS.confirmed}
        query={confirmed}
        selectedId={selectedId}
        activeId={activeId}
        emptyText="No confirmed menus yet."
      />
      <MenuGroup
        label={MENU_STATUS_LABELS.draft}
        query={drafts}
        selectedId={selectedId}
        activeId={activeId}
        emptyText="No draft menus."
      />
    </nav>
  );
}

interface GroupProps {
  label: string;
  query: GroupQuery;
  selectedId: string | null;
  activeId: string | null;
  emptyText: string;
}

function MenuGroup({ label, query, selectedId, activeId, emptyText }: GroupProps) {
  const [showAll, setShowAll] = useState(false);
  const menus = query.data ?? [];
  // A selection further down the list keeps the whole list shown, so it stays visible.
  const forcedAll = menus.findIndex((menu) => menu.id === selectedId) >= MENU_GROUP_LIMIT;
  const visible = showAll || forcedAll ? menus : menus.slice(0, MENU_GROUP_LIMIT);

  return (
    <section aria-label={label} className="flex flex-col gap-1 pb-3">
      <h2 className="caption flex items-center justify-between px-1.5 pt-3 pb-1 text-xs">
        {label}
        {query.data && <span className="font-medium normal-case">{query.data.length}</span>}
      </h2>
      {query.isPending ? (
        <Spinner />
      ) : query.isError ? (
        <ErrorAlert error={query.error} onRetry={() => void query.refetch()} />
      ) : menus.length === 0 ? (
        <p className="px-1.5 text-sm text-sage-500">{emptyText}</p>
      ) : (
        <>
          <ul className="flex flex-col gap-1">
            {visible.map((menu) => (
              <li key={menu.id}>
                <MenuItem
                  menu={menu}
                  selected={menu.id === selectedId}
                  active={menu.id === activeId}
                />
              </li>
            ))}
          </ul>
          {menus.length > MENU_GROUP_LIMIT && !forcedAll && (
            <button
              type="button"
              onClick={() => setShowAll(!showAll)}
              className="self-start rounded-lg px-3.5 py-1.5 text-xs font-medium text-brand-800 hover:bg-white"
            >
              {showAll ? 'Show less' : `Show all (${menus.length})`}
            </button>
          )}
        </>
      )}
    </section>
  );
}

function MenuItem({
  menu,
  selected,
  active,
}: {
  menu: MenuSummary;
  selected: boolean;
  active: boolean;
}) {
  const versionsId = useId();
  const [params] = useSearchParams();
  const hasVersions = !menu.confirmedVersionId && menu.versionCount > 1;
  // Null until toggled: the open draft shows its versions on its own.
  const [openChoice, setOpenChoice] = useState<boolean | null>(null);
  const open = hasVersions && (openChoice ?? selected);
  const shownVersion = selected ? Number(params.get('version')) || menu.versionCount : null;

  return (
    <div
      className={`rounded-xl border ${selected ? 'border-brand-100 bg-brand-50' : 'border-transparent text-sage-600 hover:bg-white'}`}
    >
      <div className="flex items-start">
        <Link
          to={`/menus/${menu.id}`}
          aria-current={selected ? 'page' : undefined}
          className="block min-w-0 flex-1 px-3.5 py-2.5"
        >
          <span className="flex items-center gap-2">
            <span
              className={`min-w-0 flex-1 truncate text-sm ${selected ? 'font-semibold text-brand-800' : ''}`}
            >
              {menu.title}
            </span>
            {active && (
              <span className="rounded-full bg-brand-700 px-2 py-0.5 text-[11px] font-medium text-white">
                active
              </span>
            )}
          </span>
          <span className="mt-0.5 block text-xs font-normal text-sage-500">
            {menu.confirmedAt
              ? `confirmed ${formatDate(menu.confirmedAt)}`
              : `${menu.versionCount} ${menu.versionCount === 1 ? 'version' : 'versions'} · updated ${formatDate(menu.updatedAt)}`}
          </span>
        </Link>
        {hasVersions && (
          <button
            type="button"
            aria-expanded={open}
            aria-controls={versionsId}
            aria-label={`Versions of ${menu.title}`}
            onClick={() => setOpenChoice(!open)}
            className="m-1.5 rounded-lg p-1.5 text-sage-500 hover:bg-sage-100 hover:text-sage-900"
          >
            <ChevronIcon className={`transition-transform ${open ? 'rotate-90' : ''}`} />
          </button>
        )}
      </div>
      {open && (
        <ul id={versionsId} className="flex flex-col gap-0.5 px-2 pb-2">
          {Array.from({ length: menu.versionCount }, (_, i) => menu.versionCount - i).map((n) => (
            <li key={n}>
              <Link
                to={`/menus/${menu.id}?version=${n}`}
                aria-current={shownVersion === n ? 'true' : undefined}
                className={`block rounded-lg px-3 py-1.5 text-xs ${shownVersion === n ? 'bg-white font-semibold text-brand-800' : 'text-sage-600 hover:bg-white'}`}
              >
                Version {n}
                {n === menu.versionCount && <span className="text-sage-500"> · latest</span>}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
