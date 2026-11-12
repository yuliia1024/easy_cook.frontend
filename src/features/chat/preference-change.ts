import type { DietaryPreference, DietTag, PreferenceChange } from '../../api/types';
import {
  DIET_TAG_LABELS,
  PREFERENCE_CHANGE_ACTION_LABELS,
  PREFERENCE_TYPE_LABELS,
} from '../../lib/labels';

/** "Add allergy: peanut", "Remove diet: gluten-free". */
export function preferenceChangeText({ action, preferenceType, value }: PreferenceChange): string {
  const shown = preferenceType === 'diet' ? (DIET_TAG_LABELS[value as DietTag] ?? value) : value;
  return `${PREFERENCE_CHANGE_ACTION_LABELS[action]} ${PREFERENCE_TYPE_LABELS[preferenceType].toLowerCase()}: ${shown}`;
}

/** Saved values are trimmed and lower-cased; the backend compares them so. */
const normalize = (value: string): string => value.trim().toLowerCase();

/** The same change, values compared as saved. */
export function sameChange(a: PreferenceChange, b: PreferenceChange): boolean {
  return (
    a.action === b.action &&
    a.preferenceType === b.preferenceType &&
    normalize(a.value) === normalize(b.value)
  );
}

/** Whether the saved preferences already have the change: an added one is there, a removed one is not. */
export function isInEffect(change: PreferenceChange, preferences: DietaryPreference[]): boolean {
  const saved = preferences.some(
    (p) =>
      p.preferenceType === change.preferenceType && normalize(p.value) === normalize(change.value),
  );
  return change.action === 'add' ? saved : !saved;
}
