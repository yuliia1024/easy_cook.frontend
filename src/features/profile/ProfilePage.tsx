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
      <PageHeader title="Профіль і цілі харчування">
        Дані профілю використовуються для розрахунку денних орієнтирів КБЖВ.
      </PageHeader>

      <section
        aria-labelledby="profile-heading"
        className="mb-10 rounded-lg border border-stone-200 bg-white p-5"
      >
        <h2 id="profile-heading" className="mb-4 text-lg font-semibold">
          Профіль
        </h2>
        {profile.isPending ? (
          <Spinner />
        ) : profile.isError ? (
          <ErrorAlert error={profile.error} onRetry={() => void profile.refetch()} />
        ) : (
          <>
            {!profile.data && (
              <p className="mb-4 text-sm text-stone-600">
                Профіль ще не заповнено. Без нього цілі не розрахувати.
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
          Цілі харчування на день
        </h2>
        <p className="mt-1 rounded-md bg-amber-50 p-3 text-sm text-amber-900">
          Розраховані значення — орієнтири для планування меню, а не медичні призначення. За
          наявності захворювань, вагітності чи спеціальних потреб радьтеся з лікарем або дієтологом.
        </p>
      </div>

      <div>
        <h3 className="mb-2 text-sm font-medium text-stone-600">Поточна ціль</h3>
        {current.isPending ? (
          <Spinner />
        ) : current.isError ? (
          <ErrorAlert error={current.error} onRetry={() => void current.refetch()} />
        ) : current.data ? (
          <>
            <MacrosSummary values={toMacros(current.data)} />
            <p className="mt-2 text-xs text-stone-500">
              Встановлено {CALCULATION_MODE_LABELS[current.data.calculationMode]}
              {current.data.ruleVersion && ` (правила ${current.data.ruleVersion})`}, діє з{' '}
              {formatDate(current.data.effectiveFrom)}.
            </p>
          </>
        ) : (
          <EmptyState title="Ціль ще не встановлено">
            Розрахуйте її за профілем або задайте вручну.
          </EmptyState>
        )}
      </div>

      <div className="rounded-lg border border-stone-200 bg-white p-5">
        <div role="group" aria-label="Режим цілі" className="mb-4 flex gap-2">
          {(
            [
              ['rules', 'За формулою'],
              ['manual', 'Вручну'],
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
        <h3 className="mb-2 text-sm font-medium text-stone-600">Історія цілей</h3>
        {history.isPending ? (
          <Spinner />
        ) : history.isError ? (
          <ErrorAlert error={history.error} onRetry={() => void history.refetch()} />
        ) : history.data.length === 0 ? (
          <p className="text-sm text-stone-500">Порожньо.</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-stone-200 bg-white">
            <table className="w-full text-sm">
              <thead className="bg-stone-100 text-left text-xs uppercase tracking-wide text-stone-600">
                <tr>
                  <th className="px-3 py-2">Діє з</th>
                  <th className="px-3 py-2">Режим</th>
                  <th className="px-3 py-2 text-right">Ккал</th>
                  <th className="px-3 py-2 text-right">Б, г</th>
                  <th className="px-3 py-2 text-right">Ж, г</th>
                  <th className="px-3 py-2 text-right">В, г</th>
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
        Базовий обмін — Mifflin-St Jeor, помножений на коефіцієнт активності; −15 % для схуднення,
        +10 % для набору маси. Білок 1,6–2,0 г на кг ваги, жири 25 % калорій, вуглеводи — решта.
      </p>
      {preview.isPending ? (
        <Spinner label="Рахуємо…" />
      ) : preview.isError ? (
        <ErrorAlert error={preview.error} onRetry={() => void preview.refetch()} />
      ) : (
        <MacrosSummary caption="Розрахунок за поточним профілем" values={toMacros(preview.data)} />
      )}
      {calculate.isError && <ErrorAlert error={calculate.error} title="Не вдалося зберегти ціль" />}
      <Button
        onClick={() => calculate.mutate()}
        loading={calculate.isPending}
        disabled={!preview.data}
      >
        Встановити як поточну ціль
      </Button>
    </div>
  );
}
