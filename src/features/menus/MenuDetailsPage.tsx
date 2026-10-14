import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import type { Menu, MenuDay, MenuIssue, MenuVersion } from '../../api/types';
import { Button } from '../../components/Button';
import { buttonClass } from '../../components/button-class';
import { ErrorAlert } from '../../components/ErrorAlert';
import { MacrosSummary } from '../../components/MacrosSummary';
import { PageHeader } from '../../components/PageHeader';
import { Spinner } from '../../components/Spinner';
import { formatDate, formatNumber } from '../../lib/format';
import { MEAL_TYPE_LABELS, MENU_GENERATED_BY_LABELS } from '../../lib/labels';
import {
  useConfirmMenuVersion,
  useDeleteMenu,
  useMenu,
  useRenameMenu,
  useReplaceMeal,
} from './menus.queries';

const dayDate = new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeZone: 'UTC' });

export function MenuDetailsPage() {
  const { id } = useParams();
  const menu = useMenu(id);

  if (menu.isPending) return <Spinner />;
  if (menu.isError) return <ErrorAlert error={menu.error} onRetry={() => void menu.refetch()} />;
  return <MenuDetails menu={menu.data} />;
}

function MenuDetails({ menu }: { menu: Menu }) {
  const navigate = useNavigate();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const version = menu.versions.find((v) => v.id === selectedId) ?? menu.versions[0];
  const rename = useRenameMenu(menu.id);
  const remove = useDeleteMenu();
  const confirm = useConfirmMenuVersion(menu.id);
  const replace = useReplaceMeal(menu.id);
  const failed = [rename, remove, confirm, replace].find((mutation) => mutation.isError);

  const onRename = (): void => {
    const title = window.prompt('Menu title', menu.title)?.trim();
    if (title && title !== menu.title) rename.mutate(title);
  };

  const onDelete = (): void => {
    if (!window.confirm(`Delete the menu “${menu.title}” with all its versions?`)) return;
    remove.mutate(menu.id, { onSuccess: () => navigate('/menus') });
  };

  const onReplace = (dayIndex: number, position: number): void => {
    replace.mutate(
      { versionId: version.id, dayIndex, position },
      { onSuccess: (updated) => setSelectedId(updated.versions[0].id) },
    );
  };

  return (
    <>
      <Link to="/menus" className="text-sm text-stone-600 hover:underline">
        ← All menus
      </Link>
      <PageHeader
        title={menu.title}
        actions={
          <>
            <Button variant="secondary" onClick={onRename} loading={rename.isPending}>
              Rename
            </Button>
            <Link to={`/menus/${menu.id}/edit`} className={buttonClass('secondary')}>
              Edit as new version
            </Link>
            <Button variant="danger" onClick={onDelete} loading={remove.isPending}>
              Delete
            </Button>
          </>
        }
      >
        {menu.confirmedAt
          ? `Confirmed ${formatDate(menu.confirmedAt)}`
          : 'Not confirmed yet: every version is a draft.'}
      </PageHeader>

      {failed && <ErrorAlert error={failed.error} title="The action failed" />}

      {version ? (
        <>
          <div className="mb-4 flex flex-wrap items-end gap-3">
            <label className="flex flex-col gap-1 text-sm font-medium text-stone-700">
              Version
              <select
                className="input"
                value={version.id}
                onChange={(event) => setSelectedId(event.target.value)}
              >
                {menu.versions.map((v) => (
                  <option key={v.id} value={v.id}>
                    {`v${v.versionNumber} · ${MENU_GENERATED_BY_LABELS[v.generatedBy]} · ${formatDate(v.createdAt)}${v.isConfirmed ? ' · confirmed' : ''}`}
                  </option>
                ))}
              </select>
            </label>
            <Button
              onClick={() => confirm.mutate(version.id)}
              loading={confirm.isPending}
              disabled={version.isConfirmed}
            >
              {version.isConfirmed ? 'Confirmed' : 'Confirm this version'}
            </Button>
          </div>
          <VersionView version={version} onReplace={onReplace} replacing={replace.isPending} />
        </>
      ) : (
        <p className="text-sm text-stone-500">This menu has no versions.</p>
      )}
    </>
  );
}

interface VersionViewProps {
  version: MenuVersion;
  onReplace: (dayIndex: number, position: number) => void;
  replacing: boolean;
}

function VersionView({ version, onReplace, replacing }: VersionViewProps) {
  const goal = version.nutritionGoal;

  return (
    <div className="space-y-6">
      {version.notes && <p className="text-sm text-stone-700">{version.notes}</p>}
      <div className="grid gap-4 lg:grid-cols-2">
        <MacrosSummary caption="Daily average" values={version.dailyAverage} />
        {goal ? (
          <MacrosSummary
            caption="Daily goal (when built)"
            values={{
              kcal: goal.caloriesKcal,
              proteinG: goal.proteinG,
              fatG: goal.fatG,
              carbsG: goal.carbsG,
            }}
          />
        ) : (
          <p className="text-sm text-stone-500">No nutrition goal was set when this was built.</p>
        )}
      </div>
      <Issues issues={version.issues} />
      {version.days.map((day) => (
        <DayView
          key={day.id}
          day={day}
          goalKcal={goal?.caloriesKcal ?? null}
          issues={version.issues}
          onReplace={onReplace}
          replacing={replacing}
        />
      ))}
    </div>
  );
}

function Issues({ issues }: { issues: MenuIssue[] }) {
  if (issues.length === 0) return null;
  return (
    <section aria-label="Issues" className="space-y-1">
      {issues.map((issue, index) => (
        <p
          key={index}
          className={`rounded-md px-3 py-2 text-sm ${issue.severity === 'error' ? 'bg-red-50 text-red-800' : 'bg-amber-50 text-amber-900'}`}
        >
          {issue.severity === 'error' ? 'Error: ' : 'Warning: '}
          {issue.message}
        </p>
      ))}
    </section>
  );
}

interface DayViewProps {
  day: MenuDay;
  goalKcal: number | null;
  issues: MenuIssue[];
  onReplace: (dayIndex: number, position: number) => void;
  replacing: boolean;
}

function DayView({ day, goalKcal, issues, onReplace, replacing }: DayViewProps) {
  const title = `Day ${day.dayIndex + 1}${day.date ? ` · ${dayDate.format(new Date(day.date))}` : ''}`;
  const hasError = (position: number): boolean =>
    issues.some(
      (i) => i.severity === 'error' && i.dayIndex === day.dayIndex && i.position === position,
    );

  return (
    <section
      aria-label={title}
      className="overflow-x-auto rounded-lg border border-stone-200 bg-white"
    >
      <h3 className="px-3 pt-3 font-semibold">{title}</h3>
      <table className="mt-2 w-full text-sm">
        <thead className="bg-stone-100 text-left text-xs uppercase tracking-wide text-stone-600">
          <tr>
            <th className="px-3 py-2">Meal</th>
            <th className="px-3 py-2">Recipe</th>
            <th className="px-3 py-2 text-right">Servings</th>
            <th className="px-3 py-2 text-right">Kcal</th>
            <th className="px-3 py-2 text-right">P</th>
            <th className="px-3 py-2 text-right">F</th>
            <th className="px-3 py-2 text-right">C</th>
            <th className="px-3 py-2">
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-stone-100">
          {day.meals.map((meal) => (
            <tr key={meal.id} className={hasError(meal.position) ? 'bg-red-50' : ''}>
              <td className="px-3 py-2">{MEAL_TYPE_LABELS[meal.mealType]}</td>
              <td className="px-3 py-2">
                {meal.recipeId ? (
                  <Link to={`/recipes/${meal.recipeId}`} className="hover:underline">
                    {meal.recipe.name}
                  </Link>
                ) : (
                  <span>
                    {meal.recipe.name}{' '}
                    <span className="text-xs text-stone-500">(deleted recipe)</span>
                  </span>
                )}
                {!meal.complete && (
                  <span
                    className="ml-1 text-amber-600"
                    title="Some ingredients have unknown values"
                  >
                    *
                  </span>
                )}
              </td>
              <td className="px-3 py-2 text-right tabular-nums">{formatNumber(meal.servings)}</td>
              <td className="px-3 py-2 text-right tabular-nums">
                {formatNumber(meal.nutrition.kcal)}
              </td>
              <td className="px-3 py-2 text-right tabular-nums">
                {formatNumber(meal.nutrition.proteinG)}
              </td>
              <td className="px-3 py-2 text-right tabular-nums">
                {formatNumber(meal.nutrition.fatG)}
              </td>
              <td className="px-3 py-2 text-right tabular-nums">
                {formatNumber(meal.nutrition.carbsG)}
              </td>
              <td className="px-3 py-2 text-right">
                <Button
                  variant="ghost"
                  disabled={replacing}
                  aria-label={`Replace ${MEAL_TYPE_LABELS[meal.mealType]} on day ${day.dayIndex + 1}`}
                  onClick={() => onReplace(day.dayIndex, meal.position)}
                >
                  Replace
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot className="font-medium">
          <tr>
            <td className="px-3 py-2" colSpan={3}>
              Day total
              {goalKcal !== null && (
                <span className="ml-2 text-xs font-normal text-stone-500">
                  goal {formatNumber(goalKcal)} kcal
                </span>
              )}
            </td>
            <td className="px-3 py-2 text-right tabular-nums">{formatNumber(day.totals.kcal)}</td>
            <td className="px-3 py-2 text-right tabular-nums">
              {formatNumber(day.totals.proteinG)}
            </td>
            <td className="px-3 py-2 text-right tabular-nums">{formatNumber(day.totals.fatG)}</td>
            <td className="px-3 py-2 text-right tabular-nums">{formatNumber(day.totals.carbsG)}</td>
            <td />
          </tr>
        </tfoot>
      </table>
    </section>
  );
}
