import { z } from 'zod';
import type { DietaryPreferenceInput } from '../../api/types';
import { DIET_TAG_LABELS, PREFERENCE_TYPE_LABELS } from '../../lib/labels';
import { PREFERENCE_VALUE_MAX_LENGTH } from '../../lib/limits';

const keys = <T extends string>(labels: Record<T, string>) => Object.keys(labels) as [T, ...T[]];

/** A diet is picked from the known tags; anything else is free text. */
export const preferenceFormSchema = z
  .object({
    preferenceType: z.enum(keys(PREFERENCE_TYPE_LABELS)),
    diet: z.enum(keys(DIET_TAG_LABELS)),
    value: z.string().trim(),
  })
  .superRefine((form, ctx) => {
    // The text field is hidden for a diet (and not sent), whatever it still holds.
    if (form.preferenceType === 'diet') return;
    if (form.value === '') {
      ctx.addIssue({ code: 'custom', path: ['value'], message: 'Enter a value' });
    } else if (form.value.length > PREFERENCE_VALUE_MAX_LENGTH) {
      ctx.addIssue({
        code: 'custom',
        path: ['value'],
        message: `At most ${PREFERENCE_VALUE_MAX_LENGTH} characters`,
      });
    }
  });

export type PreferenceFormValues = z.input<typeof preferenceFormSchema>;
export type PreferenceFormOutput = z.output<typeof preferenceFormSchema>;

export const EMPTY_PREFERENCE_FORM: PreferenceFormValues = {
  preferenceType: 'allergy',
  diet: 'vegetarian',
  value: '',
};

export function toPreferenceInput(form: PreferenceFormOutput): DietaryPreferenceInput {
  return {
    preferenceType: form.preferenceType,
    value: form.preferenceType === 'diet' ? form.diet : form.value,
  };
}
