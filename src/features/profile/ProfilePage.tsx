import { useState } from 'react';
import type { NutritionGoal, Sex } from '../../api/types';
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

      <section aria-labelledby="profile-heading" className="card mb-9">
        <h2 id="profile-heading" className="mb-4 text-lg font-bold">
          Profile
        </h2>
        {profile.isPending ? (
          <Spinner />
        ) : profile.isError ? (
          <ErrorAlert error={profile.error} onRetry={() => void profile.refetch()} />
        ) : (
          <>
            {!profile.data && (
              <p className="mb-4 text-sm text-sage-600">
                The profile is not filled in yet. Goals cannot be calculated without it.
              </p>
            )}
            {/* Not keyed by the saved data: a remount after a save would drop "Profile saved.";
                the form follows newer profile data itself. */}
            <ProfileForm profile={profile.data} />
          </>
        )}
      </section>

      {profile.data && <GoalsSection sex={profile.data.sex} />}
    </>
  );
}

type GoalMode = 'rules' | 'manual';

function GoalsSection({ sex }: { sex: Sex }) {
  /** The mode picked on the switch; until then it follows the newest goal in the history. */
  const [picked, setPicked] = useState<GoalMode | null>(null);
  const current = useCurrentGoal(true);
  const history = useGoalHistory(true);
  const latest = history.data?.[0]?.calculationMode;
  // Null while the history loads, so the switch does not flip once it arrives.
  const mode: GoalMode | null =
    picked ?? (history.isPending ? null : latest === 'manual' ? 'manual' : 'rules');

  return (
    <section aria-labelledby="goals-heading" className="space-y-4">
      <div>
        <h2 id="goals-heading" className="mb-3 text-lg font-bold">
          Daily nutrition goals
        </h2>
        <p className="rounded-[14px] bg-note-bg px-4.5 py-3.5 text-sm/normal text-note-fg">
          Calculated values are guidelines for menu planning, not medical advice. If you have a
          medical condition, are pregnant or have special needs, consult a doctor or dietitian.
        </p>
      </div>

      <div className="card">
        <h3 className="caption mb-3">Current goal</h3>
        {current.isPending ? (
          <Spinner />
        ) : current.isError ? (
          <ErrorAlert error={current.error} onRetry={() => void current.refetch()} />
        ) : current.data ? (
          <>
            <MacrosSummary values={toMacros(current.data)} framed={false} />
            <p className="mt-3 text-xs text-sage-500">
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

      <div className="card">
        <div
          role="group"
          aria-label="Goal mode"
          className="mb-4 inline-flex gap-1 rounded-xl bg-sage-100 p-1"
        >
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
              onClick={() => setPicked(value)}
              className={`h-8.5 rounded-[10px] px-4 text-sm ${mode === value ? 'bg-brand-700 font-semibold text-white' : 'font-medium text-sage-700 hover:bg-white'}`}
            >
              {label}
            </button>
          ))}
        </div>
        {mode === null ? (
          <Spinner />
        ) : mode === 'rules' ? (
          <RuleBasedGoal />
        ) : current.isPending ? (
          // The form starts from the current goal: wait for it.
          <Spinner />
        ) : (
          <ManualGoalForm
            key={current.data?.id ?? 'none'}
            current={current.data ?? null}
            sex={sex}
            // The saved goal is now the newest one: follow the history again.
            onSaved={() => setPicked(null)}
          />
        )}
      </div>

      <div className="pt-5">
        <h3 className="mb-3 text-base font-bold">Goal history</h3>
        {history.isPending ? (
          <Spinner />
        ) : history.isError ? (
          <ErrorAlert error={history.error} onRetry={() => void history.refetch()} />
        ) : history.data.length === 0 ? (
          <p className="text-sm text-sage-500">Empty.</p>
        ) : (
          <div className="card overflow-x-auto p-0">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Effective from</th>
                  <th>Mode</th>
                  <th className="text-right">Kcal</th>
                  <th className="text-right">P, g</th>
                  <th className="text-right">F, g</th>
                  <th className="text-right">C, g</th>
                </tr>
              </thead>
              <tbody>
                {history.data.map((goal) => (
                  <tr
                    key={goal.id}
                    className={goal.id === current.data?.id ? 'bg-brand-50/60' : ''}
                  >
                    <td>{formatDate(goal.effectiveFrom)}</td>
                    <td>
                      {CALCULATION_MODE_LABELS[goal.calculationMode]}
                      {goal.ruleVersion && (
                        <span className="text-xs text-sage-500"> · {goal.ruleVersion}</span>
                      )}
                    </td>
                    <td className="text-right tabular-nums">{formatNumber(goal.caloriesKcal)}</td>
                    <td className="text-right tabular-nums">{formatNumber(goal.proteinG)}</td>
                    <td className="text-right tabular-nums">{formatNumber(goal.fatG)}</td>
                    <td className="text-right tabular-nums">{formatNumber(goal.carbsG)}</td>
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
    <div className="space-y-4">
      <p className="text-sm/relaxed text-sage-500">
        Basal metabolic rate (Mifflin-St Jeor) times the activity factor; −15% to lose weight, +10%
        to gain muscle. Protein 1.6–2.0 g per kg of body weight, fat 25% of calories, carbs the
        rest.
      </p>
      {preview.isPending ? (
        <Spinner label="Calculating…" />
      ) : preview.isError ? (
        <ErrorAlert error={preview.error} onRetry={() => void preview.refetch()} />
      ) : (
        <MacrosSummary
          caption="Calculated from the current profile"
          values={toMacros(preview.data)}
        />
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
