import { Link, useParams } from 'react-router';
import { buttonClass } from '../../components/button-class';
import { EmptyState } from '../../components/EmptyState';
import { CalendarIcon } from '../../components/icons';
import { Spinner } from '../../components/Spinner';
import { MenuDetails } from './MenuDetails';
import { MenuSidebar } from './MenuSidebar';
import { useConfirmedMenus, useMenus } from './menus.queries';

/**
 * The saved menus in a side list like the chat's (confirmed and drafts, always shown) next to one opened menu: the one in the
 * URL (`/menus/:id`), otherwise the active menu, i.e. the one confirmed last.
 */
export function MenusPage() {
  const { id } = useParams();
  const confirmed = useConfirmedMenus();
  const drafts = useMenus('draft');
  const activeId = confirmed.data?.[0]?.id ?? null;
  const selectedId = id ?? activeId;

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[290px_minmax(0,1fr)]">
      <MenuSidebar
        confirmed={confirmed}
        drafts={drafts}
        selectedId={selectedId}
        activeId={activeId}
      />
      <div className="min-w-0">
        {selectedId ? (
          <MenuDetails key={selectedId} id={selectedId} />
        ) : confirmed.isPending ? (
          <Spinner />
        ) : confirmed.isError ? null : (
          <EmptyState
            title="No active menu yet"
            icon={<CalendarIcon size={26} />}
            action={
              <Link to="/chat" className={buttonClass()}>
                Open Chat
              </Link>
            }
          >
            {drafts.data?.length
              ? 'Open a draft and confirm one of its versions to make it your active menu.'
              : 'Ask the assistant in Chat to plan up to 7 days, and the result will be saved as a draft.'}
          </EmptyState>
        )}
      </div>
    </div>
  );
}
