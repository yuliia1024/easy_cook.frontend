import { zodResolver } from '@hookform/resolvers/zod';
import { useMemo, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import type { NutritionGoal, NutritionTargets, Sex } from '../../api/types';
import { Button } from '../../components/Button';
import { ErrorAlert } from '../../components/ErrorAlert';
import { Field } from '../../components/Field';
import { parseOptionalNumber } from '../../lib/format';
import { MACRO_LABELS } from '../../lib/labels';
import { GOAL_KCAL_TOLERANCE, MACRO_SHARE_LIMITS, MIN_DAILY_CALORIES_KCAL } from '../../lib/limits';
import { kcalFromMacros, macroShares } from '../../lib/nutrition';
import { useRecalculateMacros, useSetManualGoal } from './profile.queries';
import {
  caloriesSchema,
  effectiveFromRange,
  GOAL_MACROS,
  manualGoalSchema,
  percent,
  toManualGoalFormValues,
  toManualGoalInput,
  type ManualGoalFormOutput,
  type ManualGoalFormValues,
} from './profile.schemas';

const FIELDS = [
  { name: 'caloriesKcal', label: 'Calories, kcal' },
  { name: 'proteinG', label: 'Protein, g' },
  { name: 'fatG', label: 'Fat, g' },
  { name: 'carbsG', label: 'Carbs, g' },
] as const;

const FIELD_NAMES = FIELDS.map((field) => field.name);

const MACRO_RULES = `${GOAL_MACROS.map((macro) => {
  const { min, max } = MACRO_SHARE_LIMITS[macro];
  return `${MACRO_LABELS[macro]} ${percent(min)}–${percent(max)} %`;
}).join(', ')} of the calories; together within ${percent(GOAL_KCAL_TOLERANCE)} % of the goal.`;

export function ManualGoalForm({
  current,
  sex,
  onSaved,
}: {
  current: NutritionGoal | null;
  sex: Sex;
  onSaved: () => void;
}) {
  const setManual = useSetManualGoal();
  const recalculate = useRecalculateMacros();
  const schema = useMemo(() => manualGoalSchema(sex), [sex]);
  const defaultValues = useMemo(() => toManualGoalFormValues(current), [current]);
  const {
    register,
    control,
    handleSubmit,
    setValue,
    setError,
    trigger,
    formState: { errors },
  } = useForm<ManualGoalFormValues, unknown, ManualGoalFormOutput>({
    resolver: zodResolver(schema),
    defaultValues,
  });
  /** Calories the macros in the form were last set for. */
  const [macrosKcal, setMacrosKcal] = useState(defaultValues.caloriesKcal);
  const [kcal, protein, fat, carbs] = useWatch({
    control,
    name: ['caloriesKcal', 'proteinG', 'fatG', 'carbsG'],
  });
  const [proteinG, fatG, carbsG] = [protein, fat, carbs].map(parseOptionalNumber);
  const grams = [proteinG, fatG, carbsG].every((value) => value !== null && Number.isFinite(value))
    ? { proteinG: proteinG!, fatG: fatG!, carbsG: carbsG! }
    : null;
  const impliedKcal = grams && Math.round(kcalFromMacros(grams));
  const shares = grams && macroShares(grams);
  const target = parseOptionalNumber(kcal);
  const dateRange = effectiveFromRange();

  const caloriesChanged = target !== null && target !== parseOptionalNumber(macrosKcal);

  const onRecalculate = async (): Promise<void> => {
    // Only the calories themselves: the macros are about to be replaced.
    const calories = caloriesSchema(sex).safeParse(kcal);
    if (!calories.success) {
      setError('caloriesKcal', { message: calories.error.issues[0]?.message });
      return;
    }
    recalculate.mutate(calories.data, {
      onSuccess: (targets: NutritionTargets) => {
        GOAL_MACROS.forEach((name) => setValue(name, String(targets[name]), { shouldDirty: true }));
        setMacrosKcal(kcal);
        void trigger(FIELD_NAMES);
      },
    });
  };

  const onSubmit = (values: ManualGoalFormOutput): void => {
    setManual.mutate(toManualGoalInput(values), { onSuccess: onSaved });
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      noValidate
      className="space-y-4"
      aria-label="Manual goal"
    >
      <div className="grid gap-4 sm:grid-cols-4">
        {FIELDS.map(({ name, label }) => (
          <Field
            key={name}
            label={label}
            htmlFor={`goal-${name}`}
            error={errors[name]?.message}
            hint={
              name === 'caloriesKcal' ? `At least ${MIN_DAILY_CALORIES_KCAL[sex]} kcal` : undefined
            }
          >
            <input
              id={`goal-${name}`}
              className="input"
              inputMode="decimal"
              aria-invalid={errors[name] ? true : undefined}
              aria-describedby={`goal-${name}-msg`}
              // Macro rules span all four fields: re-check the others after a change.
              {...register(name, { deps: FIELD_NAMES.filter((other) => other !== name) })}
            />
          </Field>
        ))}
      </div>
      {caloriesChanged && (
        <div className="flex flex-wrap items-center gap-3">
          <p className="text-sm text-stone-600">
            Calories changed. Recalculate protein, fat and carbs for the new goal?
          </p>
          <Button
            variant="secondary"
            loading={recalculate.isPending}
            onClick={() => void onRecalculate()}
          >
            Recalculate macros
          </Button>
        </div>
      )}
      {recalculate.isError && (
        <ErrorAlert error={recalculate.error} title="Could not recalculate the macros" />
      )}
      {impliedKcal !== null && (
        <p className="text-sm text-stone-500">
          From macros (4/9/4 kcal/g): ≈ {impliedKcal} kcal
          {shares &&
            GOAL_MACROS.map((macro) => ` · ${MACRO_LABELS[macro]} ${percent(shares[macro])} %`)}
        </p>
      )}
      <p className="text-xs text-stone-500">{MACRO_RULES}</p>
      <Field
        label="Effective from"
        htmlFor="goal-effectiveFrom"
        error={errors.effectiveFrom?.message}
        hint="Empty means from now on. A future date (up to a year ahead) schedules the goal."
        className="max-w-xs"
      >
        <input
          id="goal-effectiveFrom"
          type="date"
          className="input"
          min={dateRange.min}
          max={dateRange.max}
          aria-invalid={errors.effectiveFrom ? true : undefined}
          aria-describedby="goal-effectiveFrom-msg"
          {...register('effectiveFrom')}
        />
      </Field>
      {setManual.isError && <ErrorAlert error={setManual.error} title="Could not save the goal" />}
      <Button type="submit" loading={setManual.isPending}>
        Save manual goal
      </Button>
    </form>
  );
}
