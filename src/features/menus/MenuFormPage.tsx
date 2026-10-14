import { zodResolver } from '@hookform/resolvers/zod';
import { useMemo } from 'react';
import {
  useFieldArray,
  useForm,
  useWatch,
  type Control,
  type FieldErrors,
  type UseFormRegister,
  type UseFormSetValue,
} from 'react-hook-form';
import { Link, useNavigate, useParams } from 'react-router';
import type { Menu } from '../../api/types';
import { Button } from '../../components/Button';
import { ErrorAlert } from '../../components/ErrorAlert';
import { Field } from '../../components/Field';
import { PageHeader } from '../../components/PageHeader';
import { Spinner } from '../../components/Spinner';
import { MEAL_TYPE_LABELS, toOptions } from '../../lib/labels';
import { upcomingDateRange } from '../../lib/dates';
import {
  MAX_MEALS_PER_DAY,
  MAX_MENU_DAYS,
  MENU_DATE_MAX_FUTURE_DAYS,
  MENU_MEAL_SERVINGS,
} from '../../lib/limits';
import {
  emptyMeal,
  menuFormSchema,
  toMenuFormValues,
  toMenuInput,
  toMenuVersionInput,
  type MenuFormOutput,
  type MenuFormValues,
} from './menu-form.schema';
import { useMenu, useSaveMenu } from './menus.queries';
import { RecipePicker } from './RecipePicker';

/** `/menus/new` and `/menus/:id/edit` (saves the next version). */
export function MenuFormPage() {
  const { id } = useParams();
  const menu = useMenu(id);

  if (!id) return <MenuForm />;
  if (menu.isPending) return <Spinner />;
  if (menu.isError) return <ErrorAlert error={menu.error} onRetry={() => void menu.refetch()} />;
  return <MenuForm menu={menu.data} />;
}

function MenuForm({ menu }: { menu?: Menu }) {
  const navigate = useNavigate();
  const save = useSaveMenu(menu?.id);
  const schema = useMemo(() => menuFormSchema(!menu), [menu]);
  const {
    register,
    control,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<MenuFormValues, unknown, MenuFormOutput>({
    resolver: zodResolver(schema),
    defaultValues: toMenuFormValues(menu),
  });
  const days = useFieldArray({ control, name: 'days' });

  const onSubmit = (values: MenuFormOutput): void => {
    const input = menu ? toMenuVersionInput(values) : toMenuInput(values);
    save.mutate(input, { onSuccess: (saved) => navigate(`/menus/${saved.id}`) });
  };

  return (
    <>
      <Link
        to={menu ? `/menus/${menu.id}` : '/menus'}
        className="text-sm text-stone-600 hover:underline"
      >
        ← Back
      </Link>
      <PageHeader title={menu ? `New version: ${menu.title}` : 'New menu'}>
        {menu
          ? 'Starts from the latest version; saving adds a new draft version.'
          : 'Every recipe must follow your dietary preferences.'}
      </PageHeader>

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2">
          {!menu && (
            <Field label="Title" htmlFor="title" error={errors.title?.message}>
              <input
                id="title"
                className="input"
                aria-invalid={errors.title ? true : undefined}
                aria-describedby="title-msg"
                {...register('title')}
              />
            </Field>
          )}
          <Field label="Notes" htmlFor="notes" error={errors.notes?.message} hint="Optional">
            <input id="notes" className="input" {...register('notes')} />
          </Field>
        </div>

        {days.fields.map((day, dayIndex) => (
          <DayFields
            key={day.id}
            dayIndex={dayIndex}
            control={control}
            register={register}
            setValue={setValue}
            errors={errors}
            onRemove={days.fields.length > 1 ? () => days.remove(dayIndex) : undefined}
          />
        ))}
        {errors.days?.message && <p className="text-sm text-red-600">{errors.days.message}</p>}
        <Button
          variant="secondary"
          disabled={days.fields.length >= MAX_MENU_DAYS}
          onClick={() => days.append({ date: '', meals: [emptyMeal()] })}
        >
          Add day
        </Button>

        {save.isError && <ErrorAlert error={save.error} title="Could not save the menu" />}

        <div className="flex gap-2">
          <Button type="submit" loading={save.isPending}>
            Save
          </Button>
          <Button variant="ghost" onClick={() => navigate(-1)}>
            Cancel
          </Button>
        </div>
      </form>
    </>
  );
}

interface DayFieldsProps {
  dayIndex: number;
  control: Control<MenuFormValues, unknown, MenuFormOutput>;
  register: UseFormRegister<MenuFormValues>;
  setValue: UseFormSetValue<MenuFormValues>;
  errors: FieldErrors<MenuFormValues>;
  onRemove?: () => void;
}

function DayFields({ dayIndex, control, register, setValue, errors, onRemove }: DayFieldsProps) {
  const meals = useFieldArray({ control, name: `days.${dayIndex}.meals` });
  const watched = useWatch({ control, name: `days.${dayIndex}.meals` });
  const dayErrors = errors.days?.[dayIndex];
  const label = `Day ${dayIndex + 1}`;
  const dateRange = upcomingDateRange(MENU_DATE_MAX_FUTURE_DAYS);

  return (
    <fieldset className="space-y-3 rounded-lg border border-stone-200 bg-white p-4">
      <legend className="px-1 font-semibold">{label}</legend>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <Field
          label={`Date of day ${dayIndex + 1}`}
          htmlFor={`days.${dayIndex}.date`}
          error={dayErrors?.date?.message}
          hint="Optional; today up to a year ahead"
        >
          <input
            id={`days.${dayIndex}.date`}
            type="date"
            className="input"
            min={dateRange.min}
            max={dateRange.max}
            aria-invalid={dayErrors?.date ? true : undefined}
            aria-describedby={`days.${dayIndex}.date-msg`}
            {...register(`days.${dayIndex}.date`)}
          />
        </Field>
        {onRemove && (
          <Button variant="ghost" onClick={onRemove} aria-label={`Remove day ${dayIndex + 1}`}>
            Remove day
          </Button>
        )}
      </div>

      <ol className="space-y-3">
        {meals.fields.map((item, mealIndex) => {
          const path = `days.${dayIndex}.meals.${mealIndex}` as const;
          const meal = watched?.[mealIndex] ?? item;
          const error = dayErrors?.meals?.[mealIndex];
          const name = `${label}, meal ${mealIndex + 1}`;
          return (
            <li
              key={item.id}
              aria-label={name}
              className="grid gap-2 rounded-md border border-stone-100 bg-stone-50 p-3 sm:grid-cols-[9rem_1fr_7rem_auto]"
            >
              <div>
                <label htmlFor={`${path}.mealType`} className="sr-only">
                  Meal type of {name}
                </label>
                <select id={`${path}.mealType`} className="input" {...register(`${path}.mealType`)}>
                  {toOptions(MEAL_TYPE_LABELS).map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                {meal.recipe ? (
                  <p className="flex items-center gap-2 text-sm">
                    <span className="font-medium">{meal.recipe.name}</span>
                    <Button
                      variant="ghost"
                      aria-label={`Change recipe of ${name}`}
                      onClick={() => setValue(`${path}.recipe`, null)}
                    >
                      Change
                    </Button>
                  </p>
                ) : (
                  <>
                    {meal.deletedName && (
                      <p className="text-xs text-amber-700">
                        “{meal.deletedName}” was deleted from the catalog; choose another recipe.
                      </p>
                    )}
                    <RecipePicker
                      id={`${path}.search`}
                      onPick={(recipe) =>
                        setValue(
                          `${path}.recipe`,
                          { id: recipe.id, name: recipe.name },
                          { shouldValidate: true },
                        )
                      }
                    />
                  </>
                )}
                {error?.recipe && <p className="text-xs text-red-600">{error.recipe.message}</p>}
              </div>
              <div>
                <label htmlFor={`${path}.servings`} className="sr-only">
                  Servings of {name}
                </label>
                <input
                  id={`${path}.servings`}
                  className="input"
                  type="number"
                  step={MENU_MEAL_SERVINGS.min}
                  min={MENU_MEAL_SERVINGS.min}
                  max={MENU_MEAL_SERVINGS.max}
                  aria-invalid={error?.servings ? true : undefined}
                  {...register(`${path}.servings`)}
                />
                {error?.servings && (
                  <p className="text-xs text-red-600">{error.servings.message}</p>
                )}
              </div>
              <Button
                variant="ghost"
                aria-label={`Remove ${name}`}
                onClick={() => meals.remove(mealIndex)}
              >
                ✕
              </Button>
            </li>
          );
        })}
      </ol>
      {dayErrors?.meals?.message && (
        <p className="text-sm text-red-600">{dayErrors.meals.message}</p>
      )}
      {dayErrors?.meals?.root?.message && (
        <p className="text-sm text-red-600">{dayErrors.meals.root.message}</p>
      )}
      <Button
        variant="secondary"
        disabled={meals.fields.length >= MAX_MEALS_PER_DAY}
        onClick={() => meals.append(emptyMeal())}
      >
        Add meal
      </Button>
    </fieldset>
  );
}
