import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, useSearchParams } from 'react-router';
import { ApiError } from '../../api/http';
import type { Macro, Menu, MenuDay, MenuIssue, MenuMeal, MenuVersion } from '../../api/types';
import { Button } from '../../components/Button';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { ErrorAlert } from '../../components/ErrorAlert';
import { Field } from '../../components/Field';
import { MACRO_TEXT_TONES } from '../../components/macro-tones';
import { MacrosSummary } from '../../components/MacrosSummary';
import { PageHeader } from '../../components/PageHeader';
import { Spinner } from '../../components/Spinner';
import { formatDate, formatNumber, formatServings } from '../../lib/format';
import { MEAL_TYPE_LABELS, MENU_GENERATED_BY_LABELS } from '../../lib/labels';
import { RecipeDialog } from '../recipes/RecipeDialog';
import { menuTitleSchema, type MenuTitleOutput, type MenuTitleValues } from './menu-title.schema';
import { useConfirmMenuVersion, useDeleteMenu, useMenu, useRenameMenu } from './menus.queries';
import { shownVersion } from './shown-version';

const MEAL_MACROS: Macro[] = ['kcal', 'proteinG', 'fatG', 'carbsG'];

const dayDate = new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeZone: 'UTC' });

/** One saved menu with its versions; the menus page shows it next to the menu list. */
export function MenuDetails({ id }: { id: string }) {
  const menu = useMenu(id);

  // A failed background refetch keeps the loaded menu on screen, with the error above it, unless
  // the menu is gone.
  const gone = menu.error instanceof ApiError && menu.error.isNotFound;
  if (menu.data && !gone)
    return (
      <>
        {menu.isError && (
          <div className="mb-4">
            <ErrorAlert
              error={menu.error}
              title="Could not refresh the menu"
              onRetry={() => void menu.refetch()}
            />
          </div>
        )}
        <MenuView menu={menu.data} />
      </>
    );
  if (menu.isError) return <ErrorAlert error={menu.error} onRetry={() => void menu.refetch()} />;
  return <Spinner />;
}

function MenuView({ menu }: { menu: Menu }) {
  const navigate = useNavigate();
  // `?version=<number>` picks the shown version (the side list links to it).
  const [params, setParams] = useSearchParams();
  const version = shownVersion(menu.versions, params.get('version'));
  const rename = useRenameMenu(menu.id);
  // Away from the menu before it leaves the cache: refetching it here would end in a 404.
  const remove = useDeleteMenu({ onDeleted: () => navigate('/menus') });
  const confirm = useConfirmMenuVersion(menu.id);
  const [renaming, setRenaming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  // A rename error shows in its form.
  const failed = [remove, confirm].find((mutation) => mutation.isError);

  const onDelete = (): void => {
    setDeleting(false);
    remove.mutate(menu.id);
  };

  return (
    <>
      <PageHeader
        title={menu.title}
        actions={
          <>
            <Button
              variant="secondary"
              onClick={() => {
                rename.reset();
                setRenaming(true);
              }}
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
          saving={rename.isPending}
          error={rename.isError ? rename.error : null}
          onSave={(title) => {
            // Closed only once saved: a rejected title stays in the form with the error.
            if (title === menu.title) setRenaming(false);
            else rename.mutate(title, { onSuccess: () => setRenaming(false) });
          }}
          onCancel={() => {
            rename.reset();
            setRenaming(false);
          }}
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
                onChange={(event) => {
                  const picked = menu.versions.find((v) => v.id === event.target.value);
                  if (picked)
                    setParams({ version: String(picked.versionNumber) }, { replace: true });
                }}
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
  saving,
  error,
  onSave,
  onCancel,
}: {
  title: string;
  saving: boolean;
  error: Error | null;
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
        <Button type="submit" loading={saving}>
          Save
        </Button>
        <Button variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
      </div>
      {error && (
        <div className="w-full">
          <ErrorAlert error={error} title="Could not rename the menu" />
        </div>
      )}
    </form>
  );
}

function VersionView({ version }: { version: MenuVersion }) {
  const goal = version.nutritionGoal;

  return (
    <div className="space-y-6">
      {version.notes && <p className="text-sm text-sage-700">{version.notes}</p>}
      <div className="grid gap-4 lg:grid-cols-2">
        <MacrosSummary caption="Daily average" values={version.dailyAverage} highlight />
        {goal ? (
          <MacrosSummary
            caption="Daily goal (when built)"
            values={{
              kcal: goal.caloriesKcal,
              proteinG: goal.proteinG,
              fatG: goal.fatG,
              carbsG: goal.carbsG,
            }}
            highlight
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
  const [opened, setOpened] = useState<MenuMeal | null>(null);
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
            <th className="text-right text-protein-fg!">P</th>
            <th className="text-right text-fat-fg!">F</th>
            <th className="text-right text-carbs-fg!">C</th>
          </tr>
        </thead>
        <tbody>
          {day.meals.map((meal) => (
            <tr key={meal.id} className={hasError(meal.position) ? 'bg-red-50' : ''}>
              <td>{MEAL_TYPE_LABELS[meal.mealType]}</td>
              <td>
                {meal.recipeId ? (
                  <button
                    type="button"
                    onClick={() => setOpened(meal)}
                    className="text-left font-medium text-brand-800 hover:underline"
                  >
                    {meal.recipe.name}
                  </button>
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
              <td className="text-right tabular-nums">{formatServings(meal.servings)}</td>
              {MEAL_MACROS.map((macro) => (
                <td key={macro} className={`text-right tabular-nums ${MACRO_TEXT_TONES[macro]}`}>
                  {formatNumber(meal.nutrition[macro])}
                </td>
              ))}
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
            {MEAL_MACROS.map((macro) => (
              <td key={macro} className={`text-right tabular-nums ${MACRO_TEXT_TONES[macro]}`}>
                {formatNumber(day.totals[macro])}
              </td>
            ))}
          </tr>
        </tfoot>
      </table>
      {opened?.recipeId && (
        <RecipeDialog
          recipeId={opened.recipeId}
          servings={opened.servings}
          onClose={() => setOpened(null)}
        />
      )}
    </section>
  );
}
