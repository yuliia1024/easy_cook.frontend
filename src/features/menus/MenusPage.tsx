import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router';
import { Button } from '../../components/Button';
import { buttonClass } from '../../components/button-class';
import { EmptyState } from '../../components/EmptyState';
import { ErrorAlert } from '../../components/ErrorAlert';
import { Field } from '../../components/Field';
import { PageHeader } from '../../components/PageHeader';
import { Spinner } from '../../components/Spinner';
import { upcomingDateRange } from '../../lib/dates';
import { formatDate } from '../../lib/format';
import { MEAL_TYPE_LABELS, toOptions } from '../../lib/labels';
import { MAX_MENU_DAYS, MENU_DATE_MAX_FUTURE_DAYS } from '../../lib/limits';
import {
  DEFAULT_GENERATE_VALUES,
  generateMenuSchema,
  toGenerateInput,
  type GenerateMenuOutput,
  type GenerateMenuValues,
} from './generate-menu.schema';
import { GenerationProgress } from './GenerationProgress';
import { useMenus } from './menus.queries';
import { useMenuGeneration } from './use-menu-generation';

export function MenusPage() {
  const menus = useMenus();

  return (
    <>
      <PageHeader
        title="Menus"
        actions={
          <Link to="/menus/new" className={buttonClass('secondary')}>
            Create manually
          </Link>
        }
      >
        Every change saves a new version; a version becomes your menu only when you confirm it.
      </PageHeader>

      <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
        <section aria-label="Saved menus">
          {menus.isPending ? (
            <Spinner />
          ) : menus.isError ? (
            <ErrorAlert error={menus.error} onRetry={() => void menus.refetch()} />
          ) : menus.data.length === 0 ? (
            <EmptyState title="No menus yet">Generate one or create it manually.</EmptyState>
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
        <GenerateMenuForm />
      </div>
    </>
  );
}

function GenerateMenuForm() {
  const navigate = useNavigate();
  const generation = useMenuGeneration((menu) => navigate(`/menus/${menu.id}`));
  const dateRange = upcomingDateRange(MENU_DATE_MAX_FUTURE_DAYS);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<GenerateMenuValues, unknown, GenerateMenuOutput>({
    resolver: zodResolver(generateMenuSchema),
    defaultValues: DEFAULT_GENERATE_VALUES,
  });

  const onSubmit = (values: GenerateMenuOutput): void => {
    generation.generate(toGenerateInput(values));
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      noValidate
      aria-labelledby="generate-heading"
      className="space-y-3 rounded-lg border border-stone-200 bg-white p-4"
    >
      <h2 id="generate-heading" className="font-semibold">
        Generate a menu
      </h2>
      <p className="text-xs text-stone-500">
        For your current goal and preferences. Planned by a placeholder (stub) planner until the AI
        assistant arrives.
      </p>
      <Field label={`Days (1–${MAX_MENU_DAYS})`} htmlFor="days" error={errors.days?.message}>
        <input
          id="days"
          className="input"
          inputMode="numeric"
          aria-invalid={errors.days ? true : undefined}
          aria-describedby="days-msg"
          {...register('days')}
        />
      </Field>
      <fieldset>
        <legend className="text-sm font-medium text-stone-700">Meals of the day</legend>
        <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1">
          {toOptions(MEAL_TYPE_LABELS).map((option) => (
            <label key={option.value} className="flex items-center gap-1.5 text-sm">
              <input type="checkbox" value={option.value} {...register('mealTypes')} />
              {option.label}
            </label>
          ))}
        </div>
        {errors.mealTypes && <p className="text-xs text-red-600">{errors.mealTypes.message}</p>}
      </fieldset>
      <Field
        label="First day"
        htmlFor="startDate"
        error={errors.startDate?.message}
        hint="Optional; today up to a year ahead"
      >
        <input
          id="startDate"
          type="date"
          className="input"
          min={dateRange.min}
          max={dateRange.max}
          aria-invalid={errors.startDate ? true : undefined}
          aria-describedby="startDate-msg"
          {...register('startDate')}
        />
      </Field>
      <Field label="Title" htmlFor="title" error={errors.title?.message} hint="Optional">
        <input id="title" className="input" {...register('title')} />
      </Field>
      <Field
        label="Wishes"
        htmlFor="instructions"
        error={errors.instructions?.message}
        hint="Optional; the stub planner ignores them"
      >
        <textarea id="instructions" rows={2} className="input" {...register('instructions')} />
      </Field>
      {generation.progress && (
        <GenerationProgress progress={generation.progress} active={generation.isGenerating} />
      )}
      {generation.error && <ErrorAlert error={generation.error} title="Could not plan the menu" />}
      <div className="flex gap-2">
        <Button type="submit" loading={generation.isGenerating}>
          Generate
        </Button>
        {generation.isGenerating && (
          <Button variant="secondary" onClick={() => void generation.stop()}>
            Stop
          </Button>
        )}
      </div>
    </form>
  );
}
