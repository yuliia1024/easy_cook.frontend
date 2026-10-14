import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, useWatch } from 'react-hook-form';
import { Link } from 'react-router';
import type { DietaryPreference, DietTag } from '../../api/types';
import { Button } from '../../components/Button';
import { EmptyState } from '../../components/EmptyState';
import { ErrorAlert } from '../../components/ErrorAlert';
import { Field } from '../../components/Field';
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
          <Link to="/profile" className="text-green-800 hover:underline">
            Go to the profile
          </Link>
        </EmptyState>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
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
      <ul className="divide-y divide-stone-200 rounded-lg border border-stone-200 bg-white">
        {preferences.map((preference) => (
          <li key={preference.id} className="flex items-center justify-between gap-3 px-4 py-2">
            <span className="text-sm">
              <span className="text-xs uppercase tracking-wide text-stone-500">
                {PREFERENCE_TYPE_LABELS[preference.preferenceType]}
              </span>{' '}
              <span className="font-medium">{preferenceLabel(preference)}</span>
            </span>
            <Button
              variant="ghost"
              aria-label={`Delete ${preferenceLabel(preference)}`}
              disabled={remove.isPending}
              onClick={() => remove.mutate(preference.id)}
            >
              ✕
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
      className="space-y-3 rounded-lg border border-stone-200 bg-white p-4"
    >
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
      <Button type="submit" loading={add.isPending}>
        Add
      </Button>
    </form>
  );
}
