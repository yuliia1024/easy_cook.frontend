import { useState } from 'react';
import type { NutritionGoal } from '../../api/types';
import { Button } from '../../components/Button';
import { EmptyState } from '../../components/EmptyState';
import { ErrorAlert } from '../../components/ErrorAlert';
import { MacrosSummary } from '../../components/MacrosSummary';
import { PageHeader } from '../../components/PageHeader';
import { Spinner } from '../../components/Spinner';
import { formatDate, formatNumber } from '../../lib/format';
import { CALCULATION_MODE_LABELS } from '../../lib/labels';
import { ManualGoalForm } from './ManualGoalForm';
import { ProfileForm } from './ProfileForm';
import {
  useCalculateGoal,
  useCurrentGoal,
  useGoalHistory,
  useGoalPreview,
  useProfile,
} from './profile.queries';

const toMacros = (goal: Pick<NutritionGoal, 'caloriesKcal' | 'proteinG' | 'fatG' | 'carbsG'>) => ({
  kcal: goal.caloriesKcal,
  proteinG: goal.proteinG,
  fatG: goal.fatG,
  carbsG: goal.carbsG,
});

export function ProfilePage() {
  const profile = useProfile();

  return (
    <>
      <PageHeader title="Profile & nutrition goals">
        Profile data is used to calculate daily calorie and macro targets.
      </PageHeader>

      <section
        aria-labelledby="profile-heading"
        className="mb-10 rounded-lg border border-stone-200 bg-white p-5"
      >
        <h2 id="profile-heading" className="mb-4 text-lg font-semibold">
          Profile
        </h2>
        {profile.isPending ? (
          <Spinner />
        ) : profile.isError ? (
          <ErrorAlert error={profile.error} onRetry={() => void profile.refetch()} />
        ) : (
          <>
            {!profile.data && (
              <p className="mb-4 text-sm text-stone-600">
                The profile is not filled in yet. Goals cannot be calculated without it.
              </p>
            )}
            <ProfileForm key={profile.data?.updatedAt ?? 'new'} profile={profile.data} />
          </>
        )}
      </section>

      {profile.data && <GoalsSection />}
    </>
  );
}

function GoalsSection() {
  const [mode, setMode] = useState<'rules' | 'manual'>('rules');
  const current = useCurrentGoal(true);
  const history = useGoalHistory(true);

  return (
    <section aria-labelledby="goals-heading" className="space-y-6">
      <div>
        <h2 id="goals-heading" className="text-lg font-semibold">
          Daily nutrition goals
        </h2>
        <p className="mt-1 rounded-md bg-amber-50 p-3 text-sm text-amber-900">
          Calculated values are guidelines for menu planning, not medical advice. If you have a
          medical condition, are pregnant or have special needs, consult a doctor or dietitian.
        </p>
      </div>

      <div>
        <h3 className="mb-2 text-sm font-medium text-stone-600">Current goal</h3>
        {current.isPending ? (
          <Spinner />
        ) : current.isError ? (
          <ErrorAlert error={current.error} onRetry={() => void current.refetch()} />
        ) : current.data ? (
          <>
            <MacrosSummary values={toMacros(current.data)} />
            <p className="mt-2 text-xs text-stone-500">
              Set {CALCULATION_MODE_LABELS[current.data.calculationMode]}
              {current.data.ruleVersion && ` (rules ${current.data.ruleVersion})`}, effective from{' '}
              {formatDate(current.data.effectiveFrom)}.
            </p>
          </>
        ) : (
          <EmptyState title="No goal set yet">
            Calculate it from the profile or set it manually.
          </EmptyState>
        )}
      </div>

      <div className="rounded-lg border border-stone-200 bg-white p-5">
        <div role="group" aria-label="Goal mode" className="mb-4 flex gap-2">
          {(
            [
              ['rules', 'By formula'],
              ['manual', 'Manual'],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              aria-pressed={mode === value}
              onClick={() => setMode(value)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium ${mode === value ? 'bg-green-700 text-white' : 'bg-stone-100 text-stone-700 hover:bg-stone-200'}`}
            >
              {label}
            </button>
          ))}
        </div>
        {mode === 'rules' ? (
          <RuleBasedGoal />
        ) : (
          <ManualGoalForm current={current.data ?? null} onSaved={() => setMode('rules')} />
        )}
      </div>

      <div>
        <h3 className="mb-2 text-sm font-medium text-stone-600">Goal history</h3>
        {history.isPending ? (
          <Spinner />
        ) : history.isError ? (
          <ErrorAlert error={history.error} onRetry={() => void history.refetch()} />
        ) : history.data.length === 0 ? (
          <p className="text-sm text-stone-500">Empty.</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-stone-200 bg-white">
            <table className="w-full text-sm">
              <thead className="bg-stone-100 text-left text-xs uppercase tracking-wide text-stone-600">
                <tr>
                  <th className="px-3 py-2">Effective from</th>
                  <th className="px-3 py-2">Mode</th>
                  <th className="px-3 py-2 text-right">Kcal</th>
                  <th className="px-3 py-2 text-right">P, g</th>
                  <th className="px-3 py-2 text-right">F, g</th>
                  <th className="px-3 py-2 text-right">C, g</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {history.data.map((goal) => (
                  <tr key={goal.id} className={goal.id === current.data?.id ? 'bg-green-50' : ''}>
                    <td className="px-3 py-2">{formatDate(goal.effectiveFrom)}</td>
                    <td className="px-3 py-2">
                      {CALCULATION_MODE_LABELS[goal.calculationMode]}
                      {goal.ruleVersion && (
                        <span className="text-xs text-stone-500"> · {goal.ruleVersion}</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      {formatNumber(goal.caloriesKcal)}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      {formatNumber(goal.proteinG)}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">{formatNumber(goal.fatG)}</td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      {formatNumber(goal.carbsG)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}

function RuleBasedGoal() {
  const preview = useGoalPreview(true);
  const calculate = useCalculateGoal();

  return (
    <div className="space-y-3">
      <p className="text-sm text-stone-600">
        Basal metabolic rate (Mifflin-St Jeor) times the activity factor; −15% to lose weight,
        +10% to gain muscle. Protein 1.6–2.0 g per kg of body weight, fat 25% of calories, carbs the rest.
      </p>
      {preview.isPending ? (
        <Spinner label="Calculating…" />
      ) : preview.isError ? (
        <ErrorAlert error={preview.error} onRetry={() => void preview.refetch()} />
      ) : (
        <MacrosSummary caption="Calculated from the current profile" values={toMacros(preview.data)} />
      )}
      {calculate.isError && <ErrorAlert error={calculate.error} title="Could not save the goal" />}
      <Button
        onClick={() => calculate.mutate()}
        loading={calculate.isPending}
        disabled={!preview.data}
      >
        Set as current goal
      </Button>
    </div>
  );
}
