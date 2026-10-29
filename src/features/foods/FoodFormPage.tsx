import { zodResolver } from '@hookform/resolvers/zod';
import { useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate, useParams } from 'react-router';
import type { FoodItem } from '../../api/types';
import { Button } from '../../components/Button';
import { buttonClass } from '../../components/button-class';
import { ErrorAlert } from '../../components/ErrorAlert';
import { Field } from '../../components/Field';
import { PageHeader } from '../../components/PageHeader';
import { Spinner } from '../../components/Spinner';
import { FOOD_STATE_LABELS, toOptions } from '../../lib/labels';
import {
  createFoodFormSchema,
  toFoodFormValues,
  toFoodInput,
  type FoodFormOutput,
  type FoodFormValues,
} from './food-form.schema';
import { useFood, useSaveFood } from './foods.queries';

const NUTRIENT_FIELDS = [
  { name: 'kcalPer100g', label: 'Calories, kcal' },
  { name: 'proteinG', label: 'Protein, g' },
  { name: 'fatG', label: 'Fat, g' },
  { name: 'carbsG', label: 'Carbs, g' },
] as const;

/** Cross-field checks put their error on kcal (4/9/4) and carbs (sum ≤ 100 g). */
const DEPS: Partial<Record<keyof FoodFormValues, (keyof FoodFormValues)[]>> = {
  proteinG: ['kcalPer100g', 'carbsG'],
  fatG: ['kcalPer100g', 'carbsG'],
  carbsG: ['kcalPer100g'],
};

/** `/foods/new` and `/foods/:id/edit`. */
export function FoodFormPage() {
  const { id } = useParams();
  const food = useFood(id);

  if (!id) return <FoodForm />;
  if (food.isPending) return <Spinner />;
  if (food.isError) return <ErrorAlert error={food.error} onRetry={() => void food.refetch()} />;
  return <FoodForm food={food.data} />;
}

function FoodForm({ food }: { food?: FoodItem }) {
  const navigate = useNavigate();
  const save = useSaveFood(food?.id);
  const schema = useMemo(() => createFoodFormSchema(food), [food]);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FoodFormValues, unknown, FoodFormOutput>({
    resolver: zodResolver(schema),
    defaultValues: toFoodFormValues(food),
  });

  const onSubmit = (values: FoodFormOutput): void => {
    save.mutate(toFoodInput(values), { onSuccess: (saved) => navigate(`/foods/${saved.id}`) });
  };

  const field = (name: keyof FoodFormValues) => ({
    id: name,
    'aria-invalid': errors[name] ? true : undefined,
    'aria-describedby': `${name}-msg`,
    ...register(name, { deps: DEPS[name] }),
  });

  return (
    <>
      <Link
        to={food ? `/foods/${food.id}` : '/foods'}
        className="text-sm text-sage-600 hover:underline"
      >
        ← Back
      </Link>
      <PageHeader title={food ? `Edit: ${food.name}` : 'New food'} />

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="max-w-2xl space-y-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Name" htmlFor="name" error={errors.name?.message}>
            <input className="input" {...field('name')} />
          </Field>
          <Field
            label="English name"
            htmlFor="nameEn"
            error={errors.nameEn?.message}
            hint="Optional"
          >
            <input className="input" {...field('nameEn')} />
          </Field>
          <Field
            label="State"
            htmlFor="state"
            error={errors.state?.message}
            hint="Values describe 100 g in exactly this state: dry and boiled rice are different foods."
            className="sm:col-span-2"
          >
            <select className="input" {...field('state')}>
              {toOptions(FOOD_STATE_LABELS).map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <fieldset className="card">
          <legend className="px-1 text-sm font-medium">Calories and macros per 100 g</legend>
          <p className="mb-3 text-xs text-sage-500">
            Leave a field empty if the value is unknown (not 0).
          </p>
          <div className="grid gap-4 sm:grid-cols-4">
            {NUTRIENT_FIELDS.map(({ name, label }) => (
              <Field key={name} label={label} htmlFor={name} error={errors[name]?.message}>
                <input className="input" inputMode="decimal" {...field(name)} />
              </Field>
            ))}
          </div>
        </fieldset>

        {save.isError && <ErrorAlert error={save.error} title="Could not save the food" />}

        <div className="flex gap-2">
          <Button type="submit" loading={save.isPending}>
            Save
          </Button>
          {/* Not `navigate(-1)`: a form opened by a direct link has no page to go back to. */}
          <Link to={food ? `/foods/${food.id}` : '/foods'} className={buttonClass('ghost')}>
            Cancel
          </Link>
        </div>
      </form>
    </>
  );
}
