import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, useWatch } from 'react-hook-form';
import type { NutritionGoal } from '../../api/types';
import { Button } from '../../components/Button';
import { ErrorAlert } from '../../components/ErrorAlert';
import { Field } from '../../components/Field';
import { parseOptionalNumber } from '../../lib/format';
import { useSetManualGoal } from './profile.queries';
import {
  kcalFromMacros,
  manualGoalSchema,
  toManualGoalFormValues,
  toManualGoalInput,
  type ManualGoalFormOutput,
  type ManualGoalFormValues,
} from './profile.schemas';

const FIELDS = [
  { name: 'caloriesKcal', label: 'Калорії, ккал' },
  { name: 'proteinG', label: 'Білки, г' },
  { name: 'fatG', label: 'Жири, г' },
  { name: 'carbsG', label: 'Вуглеводи, г' },
] as const;

export function ManualGoalForm({
  current,
  onSaved,
}: {
  current: NutritionGoal | null;
  onSaved: () => void;
}) {
  const setManual = useSetManualGoal();
  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<ManualGoalFormValues, unknown, ManualGoalFormOutput>({
    resolver: zodResolver(manualGoalSchema),
    defaultValues: toManualGoalFormValues(current),
  });
  const [kcal, protein, fat, carbs] = useWatch({
    control,
    name: ['caloriesKcal', 'proteinG', 'fatG', 'carbsG'],
  });
  const macros = [protein, fat, carbs].map(parseOptionalNumber);
  const impliedKcal = macros.every((value) => value !== null && Number.isFinite(value))
    ? kcalFromMacros(macros[0]!, macros[1]!, macros[2]!)
    : null;
  const target = parseOptionalNumber(kcal);
  const mismatch =
    impliedKcal !== null && target !== null && Math.abs(impliedKcal - target) > target * 0.1;

  const onSubmit = (values: ManualGoalFormOutput): void => {
    setManual.mutate(toManualGoalInput(values), { onSuccess: onSaved });
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      noValidate
      className="space-y-4"
      aria-label="Ручна ціль"
    >
      <div className="grid gap-4 sm:grid-cols-4">
        {FIELDS.map(({ name, label }) => (
          <Field key={name} label={label} htmlFor={`goal-${name}`} error={errors[name]?.message}>
            <input
              id={`goal-${name}`}
              className="input"
              inputMode="decimal"
              aria-invalid={errors[name] ? true : undefined}
              aria-describedby={`goal-${name}-msg`}
              {...register(name)}
            />
          </Field>
        ))}
      </div>
      {impliedKcal !== null && (
        <p className={`text-sm ${mismatch ? 'text-amber-700' : 'text-stone-500'}`}>
          За макронутрієнтами (4/9/4 ккал/г): ≈ {impliedKcal} ккал
          {mismatch && ' — помітно відрізняється від цілі за калоріями.'}
        </p>
      )}
      <Field
        label="Діє з"
        htmlFor="goal-effectiveFrom"
        hint="Порожньо — з цього моменту. Майбутня дата запланує ціль."
        className="max-w-xs"
      >
        <input
          id="goal-effectiveFrom"
          type="date"
          className="input"
          {...register('effectiveFrom')}
        />
      </Field>
      {setManual.isError && <ErrorAlert error={setManual.error} title="Не вдалося зберегти ціль" />}
      <Button type="submit" loading={setManual.isPending}>
        Зберегти ручну ціль
      </Button>
    </form>
  );
}
