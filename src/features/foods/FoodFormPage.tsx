import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Link, useNavigate, useParams } from 'react-router';
import type { FoodItem } from '../../api/types';
import { Button } from '../../components/Button';
import { ErrorAlert } from '../../components/ErrorAlert';
import { Field } from '../../components/Field';
import { PageHeader } from '../../components/PageHeader';
import { Spinner } from '../../components/Spinner';
import { FOOD_STATE_LABELS, toOptions } from '../../lib/labels';
import {
  foodFormSchema,
  toFoodFormValues,
  toFoodInput,
  type FoodFormOutput,
  type FoodFormValues,
} from './food-form.schema';
import { useFood, useSaveFood } from './foods.queries';

const NUTRIENT_FIELDS = [
  { name: 'kcalPer100g', label: 'Калорії, ккал' },
  { name: 'proteinG', label: 'Білки, г' },
  { name: 'fatG', label: 'Жири, г' },
  { name: 'carbsG', label: 'Вуглеводи, г' },
] as const;

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
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FoodFormValues, unknown, FoodFormOutput>({
    resolver: zodResolver(foodFormSchema),
    defaultValues: toFoodFormValues(food),
  });

  const onSubmit = (values: FoodFormOutput): void => {
    save.mutate(toFoodInput(values), { onSuccess: (saved) => navigate(`/foods/${saved.id}`) });
  };

  const field = (name: keyof FoodFormValues) => ({
    id: name,
    'aria-invalid': errors[name] ? true : undefined,
    'aria-describedby': `${name}-msg`,
    ...register(name),
  });

  return (
    <>
      <Link
        to={food ? `/foods/${food.id}` : '/foods'}
        className="text-sm text-stone-600 hover:underline"
      >
        ← Назад
      </Link>
      <PageHeader title={food ? `Редагування: ${food.name}` : 'Новий продукт'} />

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="max-w-2xl space-y-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Назва" htmlFor="name" error={errors.name?.message}>
            <input className="input" {...field('name')} />
          </Field>
          <Field
            label="Назва англійською"
            htmlFor="nameEn"
            error={errors.nameEn?.message}
            hint="Необов'язково"
          >
            <input className="input" {...field('nameEn')} />
          </Field>
          <Field
            label="Стан"
            htmlFor="state"
            error={errors.state?.message}
            hint="Значення описують 100 г саме в цьому стані: сухий і варений рис — різні продукти."
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

        <fieldset className="rounded-lg border border-stone-200 bg-white p-4">
          <legend className="px-1 text-sm font-medium">КБЖВ на 100 г</legend>
          <p className="mb-3 text-xs text-stone-500">
            Залиште поле порожнім, якщо значення невідоме (не 0).
          </p>
          <div className="grid gap-4 sm:grid-cols-4">
            {NUTRIENT_FIELDS.map(({ name, label }) => (
              <Field key={name} label={label} htmlFor={name} error={errors[name]?.message}>
                <input className="input" inputMode="decimal" {...field(name)} />
              </Field>
            ))}
          </div>
        </fieldset>

        {save.isError && <ErrorAlert error={save.error} title="Не вдалося зберегти продукт" />}

        <div className="flex gap-2">
          <Button type="submit" loading={save.isPending}>
            Зберегти
          </Button>
          <Button variant="ghost" onClick={() => navigate(-1)}>
            Скасувати
          </Button>
        </div>
      </form>
    </>
  );
}
