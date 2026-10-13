import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import type { Profile } from '../../api/types';
import { Button } from '../../components/Button';
import { ErrorAlert } from '../../components/ErrorAlert';
import { Field } from '../../components/Field';
import { ACTIVITY_LEVEL_LABELS, GOAL_LABELS, SEX_LABELS, toOptions } from '../../lib/labels';
import { useSaveProfile } from './profile.queries';
import {
  profileFormSchema,
  toProfileFormValues,
  type ProfileFormOutput,
  type ProfileFormValues,
} from './profile.schemas';

const NUMBER_FIELDS = [
  { name: 'age', label: 'Age, years', inputMode: 'numeric' },
  { name: 'heightCm', label: 'Height, cm', inputMode: 'decimal' },
  { name: 'weightKg', label: 'Weight, kg', inputMode: 'decimal' },
] as const;

const SELECT_FIELDS = [
  { name: 'sex', label: 'Sex (for the formula)', options: toOptions(SEX_LABELS) },
  { name: 'activityLevel', label: 'Activity level', options: toOptions(ACTIVITY_LEVEL_LABELS) },
  { name: 'goal', label: 'Goal', options: toOptions(GOAL_LABELS) },
] as const;

export function ProfileForm({ profile }: { profile: Profile | null }) {
  const save = useSaveProfile();
  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
    reset,
  } = useForm<ProfileFormValues, unknown, ProfileFormOutput>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: toProfileFormValues(profile),
  });

  const onSubmit = (values: ProfileFormOutput): void => {
    save.mutate(values, { onSuccess: (saved) => reset(toProfileFormValues(saved)) });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-3">
        {NUMBER_FIELDS.map(({ name, label, inputMode }) => (
          <Field key={name} label={label} htmlFor={name} error={errors[name]?.message}>
            <input
              id={name}
              className="input"
              inputMode={inputMode}
              aria-invalid={errors[name] ? true : undefined}
              aria-describedby={`${name}-msg`}
              {...register(name)}
            />
          </Field>
        ))}
        {SELECT_FIELDS.map(({ name, label, options }) => (
          <Field
            key={name}
            label={label}
            htmlFor={name}
            className={name === 'activityLevel' ? 'sm:col-span-2' : ''}
          >
            <select id={name} className="input" {...register(name)}>
              {options.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </Field>
        ))}
      </div>
      {save.isError && <ErrorAlert error={save.error} title="Could not save the profile" />}
      {save.isSuccess && !isDirty && (
        <p role="status" className="text-sm text-green-700">
          Profile saved.
        </p>
      )}
      <Button type="submit" loading={save.isPending}>
        {profile ? 'Save profile' : 'Create profile'}
      </Button>
    </form>
  );
}
