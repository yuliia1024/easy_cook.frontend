import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate, useParams } from 'react-router';
import type { Menu, MenuDay, MenuIssue, MenuVersion } from '../../api/types';
import { Button } from '../../components/Button';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { ErrorAlert } from '../../components/ErrorAlert';
import { Field } from '../../components/Field';
import { MacrosSummary } from '../../components/MacrosSummary';
import { PageHeader } from '../../components/PageHeader';
import { Spinner } from '../../components/Spinner';
import { formatDate, formatNumber } from '../../lib/format';
import { MEAL_TYPE_LABELS, MENU_GENERATED_BY_LABELS } from '../../lib/labels';
import { menuTitleSchema, type MenuTitleOutput, type MenuTitleValues } from './menu-title.schema';
import { useConfirmMenuVersion, useDeleteMenu, useMenu, useRenameMenu } from './menus.queries';

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
  const [renaming, setRenaming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const failed = [rename, remove, confirm].find((mutation) => mutation.isError);

  const onDelete = (): void => {
    setDeleting(false);
    remove.mutate(menu.id, { onSuccess: () => navigate('/menus') });
  };

  return (
    <>
      <Link to="/menus" className="text-sm text-sage-600 hover:underline">
        ← All menus
      </Link>
      <PageHeader
        title={menu.title}
        actions={
          <>
            <Button
              variant="secondary"
              onClick={() => setRenaming(true)}
              disabled={renaming}
              loading={rename.isPending}
            >
              Rename
            </Button>
            <Button variant="danger" onClick={() => setDeleting(true)} loading={remove.isPending}>
              Delete
            </Button>
          </>
        }
      >
        {menu.confirmedAt
          ? `Confirmed ${formatDate(menu.confirmedAt)}`
          : 'Not confirmed yet: every version is a draft.'}
      </PageHeader>

      {renaming && (
        <RenameForm
          title={menu.title}
          onSave={(title) => {
            setRenaming(false);
            if (title !== menu.title) rename.mutate(title);
          }}
          onCancel={() => setRenaming(false)}
        />
      )}
      {deleting && (
        <ConfirmDialog
          title="Delete this menu?"
          confirmLabel="Delete"
          onConfirm={onDelete}
          onCancel={() => setDeleting(false)}
        >
          “{menu.title}” and all its versions will be permanently deleted. This can’t be undone.
        </ConfirmDialog>
      )}
      {failed && <ErrorAlert error={failed.error} title="The action failed" />}

      {version ? (
        <>
          <div className="mb-4 flex flex-wrap items-end gap-3">
            <label className="flex flex-col gap-1 text-sm font-medium text-sage-700">
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
          <VersionView version={version} />
        </>
      ) : (
        <p className="text-sm text-sage-500">This menu has no versions.</p>
      )}
    </>
  );
}

function RenameForm({
  title,
  onSave,
  onCancel,
}: {
  title: string;
  onSave: (title: string) => void;
  onCancel: () => void;
}) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<MenuTitleValues, unknown, MenuTitleOutput>({
    resolver: zodResolver(menuTitleSchema),
    defaultValues: { title },
  });

  return (
    <form
      onSubmit={handleSubmit((values) => onSave(values.title))}
      noValidate
      aria-label="Rename the menu"
      className="card mb-6 flex flex-wrap items-start gap-3"
    >
      <Field
        label="Menu title"
        htmlFor="menu-title"
        error={errors.title?.message}
        className="min-w-60 flex-1"
      >
        <input
          id="menu-title"
          className="input"
          autoFocus
          aria-invalid={errors.title ? true : undefined}
          aria-describedby="menu-title-msg"
          {...register('title')}
        />
      </Field>
      <div className="flex gap-2 sm:pt-6.5">
        <Button type="submit">Save</Button>
        <Button variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

function VersionView({ version }: { version: MenuVersion }) {
  const goal = version.nutritionGoal;

  return (
    <div className="space-y-6">
      {version.notes && <p className="text-sm text-sage-700">{version.notes}</p>}
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
          <p className="text-sm text-sage-500">No nutrition goal was set when this was built.</p>
        )}
      </div>
      <Issues issues={version.issues} />
      {version.days.map((day) => (
        <DayView
          key={day.id}
          day={day}
          goalKcal={goal?.caloriesKcal ?? null}
          issues={version.issues}
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
          className={`rounded-xl px-4 py-3 text-sm ${issue.severity === 'error' ? 'bg-red-50 text-red-800' : 'bg-note-bg text-note-fg'}`}
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
}

function DayView({ day, goalKcal, issues }: DayViewProps) {
  const title = `Day ${day.dayIndex + 1}${day.date ? ` · ${dayDate.format(new Date(day.date))}` : ''}`;
  const hasError = (position: number): boolean =>
    issues.some(
      (i) => i.severity === 'error' && i.dayIndex === day.dayIndex && i.position === position,
    );

  return (
    <section aria-label={title} className="card overflow-x-auto p-0">
      <h3 className="px-4 py-3.5 font-semibold">{title}</h3>
      <table className="data-table">
        <thead>
          <tr>
            <th>Meal</th>
            <th>Recipe</th>
            <th className="text-right">Servings</th>
            <th className="text-right">Kcal</th>
            <th className="text-right">P</th>
            <th className="text-right">F</th>
            <th className="text-right">C</th>
          </tr>
        </thead>
        <tbody>
          {day.meals.map((meal) => (
            <tr key={meal.id} className={hasError(meal.position) ? 'bg-red-50' : ''}>
              <td>{MEAL_TYPE_LABELS[meal.mealType]}</td>
              <td>
                {meal.recipeId ? (
                  <Link to={`/recipes/${meal.recipeId}`} className="hover:underline">
                    {meal.recipe.name}
                  </Link>
                ) : (
                  <span>
                    {meal.recipe.name}{' '}
                    <span className="text-xs text-sage-500">(deleted recipe)</span>
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
              <td className="text-right tabular-nums">{formatNumber(meal.servings)}</td>
              <td className="text-right tabular-nums">{formatNumber(meal.nutrition.kcal)}</td>
              <td className="text-right tabular-nums">{formatNumber(meal.nutrition.proteinG)}</td>
              <td className="text-right tabular-nums">{formatNumber(meal.nutrition.fatG)}</td>
              <td className="text-right tabular-nums">{formatNumber(meal.nutrition.carbsG)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot className="bg-sage-25 font-semibold">
          <tr>
            <td colSpan={3}>
              Day total
              {goalKcal !== null && (
                <span className="ml-2 text-xs font-normal text-sage-500">
                  goal {formatNumber(goalKcal)} kcal
                </span>
              )}
            </td>
            <td className="text-right tabular-nums">{formatNumber(day.totals.kcal)}</td>
            <td className="text-right tabular-nums">{formatNumber(day.totals.proteinG)}</td>
            <td className="text-right tabular-nums">{formatNumber(day.totals.fatG)}</td>
            <td className="text-right tabular-nums">{formatNumber(day.totals.carbsG)}</td>
          </tr>
        </tfoot>
      </table>
    </section>
  );
}
