import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, useWatch } from 'react-hook-form';
import { Link } from 'react-router';
import type { DietaryPreference, DietTag, PreferenceType } from '../../api/types';
import { Button } from '../../components/Button';
import { EmptyState } from '../../components/EmptyState';
import { ErrorAlert } from '../../components/ErrorAlert';
import { Field } from '../../components/Field';
import { CloseIcon } from '../../components/icons';
import { PageHeader } from '../../components/PageHeader';
import { Spinner } from '../../components/Spinner';
import { DIET_TAG_LABELS, PREFERENCE_TYPE_LABELS, toOptions } from '../../lib/labels';
import {
  EMPTY_PREFERENCE_FORM,
  preferenceFormSchema,
  toPreferenceInput,
  type PreferenceFormOutput,
  type PreferenceFormValues,
} from './preference-form.schema';
import { useAddPreference, usePreferences, useRemovePreference } from './preferences.queries';

const preferenceLabel = (preference: DietaryPreference): string =>
  preference.preferenceType === 'diet'
    ? (DIET_TAG_LABELS[preference.value as DietTag] ?? preference.value)
    : preference.value;

const TYPE_CHIP_CLASSES: Record<PreferenceType, string> = {
  diet: 'bg-brand-50 text-brand-800',
  allergy: 'bg-danger-bg text-danger',
  excluded_ingredient: 'bg-sage-100 text-sage-700',
  disliked_food: 'bg-fat-bg text-fat-fg',
};

export function PreferencesPage() {
  const preferences = usePreferences();

  return (
    <>
      <PageHeader title="Dietary preferences">
        Menus follow them: every recipe must match your diets and contain no allergens or excluded
        ingredients; disliked foods only give a warning.
      </PageHeader>
      {preferences.isPending ? (
        <Spinner />
      ) : preferences.isError ? (
        <ErrorAlert error={preferences.error} onRetry={() => void preferences.refetch()} />
      ) : preferences.data === null ? (
        <EmptyState title="Fill in the profile first">
          <Link to="/profile" className="text-brand-800 hover:underline">
            Go to the profile
          </Link>
        </EmptyState>
      ) : (
        <div className="grid items-start gap-6 lg:grid-cols-[1fr_330px]">
          <PreferenceList preferences={preferences.data} />
          <PreferenceForm />
        </div>
      )}
    </>
  );
}

function PreferenceList({ preferences }: { preferences: DietaryPreference[] }) {
  const remove = useRemovePreference();

  if (preferences.length === 0) {
    return <EmptyState title="No preferences yet">Menus can use any recipe.</EmptyState>;
  }
  return (
    <section aria-label="Saved preferences">
      {remove.isError && <ErrorAlert error={remove.error} title="Could not delete" />}
      <ul className="card p-2">
        {preferences.map((preference) => (
          <li
            key={preference.id}
            className="flex items-center justify-between gap-3 rounded-[14px] px-4 py-3 hover:bg-sage-25"
          >
            <span className="flex flex-wrap items-center gap-3">
              <span
                className={`rounded-full px-2.5 py-1 text-xs font-medium ${TYPE_CHIP_CLASSES[preference.preferenceType]}`}
              >
                {PREFERENCE_TYPE_LABELS[preference.preferenceType]}
              </span>{' '}
              <span className="font-semibold">{preferenceLabel(preference)}</span>
            </span>
            <Button
              variant="ghost"
              aria-label={`Delete ${preferenceLabel(preference)}`}
              disabled={remove.isPending}
              onClick={() => remove.mutate(preference.id)}
            >
              <CloseIcon size={18} />
            </Button>
          </li>
        ))}
      </ul>
    </section>
  );
}

function PreferenceForm() {
  const add = useAddPreference();
  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<PreferenceFormValues, unknown, PreferenceFormOutput>({
    resolver: zodResolver(preferenceFormSchema),
    defaultValues: EMPTY_PREFERENCE_FORM,
  });
  const type = useWatch({ control, name: 'preferenceType' });

  const onSubmit = (values: PreferenceFormOutput): void => {
    add.mutate(toPreferenceInput(values), {
      onSuccess: () => reset({ ...EMPTY_PREFERENCE_FORM, preferenceType: values.preferenceType }),
    });
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      noValidate
      aria-label="Add a preference"
      className="card flex flex-col gap-4"
    >
      <h2 className="text-base font-bold">Add preference</h2>
      <Field label="Type" htmlFor="preferenceType">
        <select id="preferenceType" className="input" {...register('preferenceType')}>
          {toOptions(PREFERENCE_TYPE_LABELS).map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </Field>
      {type === 'diet' ? (
        <Field label="Diet" htmlFor="diet">
          <select id="diet" className="input" {...register('diet')}>
            {toOptions(DIET_TAG_LABELS).map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </Field>
      ) : (
        <Field
          label="Food"
          htmlFor="value"
          error={errors.value?.message}
          hint="Matched against ingredient names, e.g. peanut, mushroom"
        >
          <input
            id="value"
            className="input"
            aria-invalid={errors.value ? true : undefined}
            aria-describedby="value-msg"
            {...register('value')}
          />
        </Field>
      )}
      {add.isError && <ErrorAlert error={add.error} title="Could not add the preference" />}
      <Button type="submit" className="self-start" loading={add.isPending}>
        Add
      </Button>
    </form>
  );
}
