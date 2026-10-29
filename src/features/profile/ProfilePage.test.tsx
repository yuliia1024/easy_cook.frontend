import { screen, within } from '@testing-library/react';
import type { NutritionGoal } from '../../api/types';
import { formatNumber } from '../../lib/format';
import { buildGoal, buildProfile } from '../../test/fixtures';
import { renderPage } from '../../test/render';
import { toDateInputValue } from '../../lib/dates';
import { api, apiError, http, HttpResponse, server } from '../../test/server';
import { ProfilePage } from './ProfilePage';

/** As Testing Library normalises it: the narrow no-break thousands separator becomes a space. */
const num = (value: number): string => formatNumber(value).replace(/\s/g, ' ');

const render = () => renderPage(<ProfilePage />, '/profile', '/profile');

function withProfileAndGoals({
  current = buildGoal(),
  history = [buildGoal()],
}: { current?: NutritionGoal | null; history?: NutritionGoal[] } = {}) {
  server.use(
    http.get(api('/profile'), () => HttpResponse.json(buildProfile())),
    http.get(api('/nutrition/goals/current'), () =>
      current ? HttpResponse.json(current) : apiError(404, 'Nutrition goal not found'),
    ),
    http.get(api('/nutrition/goals'), () => HttpResponse.json(history)),
    http.get(api('/nutrition/goals/preview'), () =>
      HttpResponse.json({ caloriesKcal: 2200, proteinG: 105, fatG: 61, carbsG: 307 }),
    ),
  );
}

describe('ProfilePage', () => {
  it('creates the profile when there is none yet', async () => {
    let body: unknown;
    server.use(
      http.get(api('/profile'), () => apiError(404, 'Profile not found')),
      http.put(api('/profile'), async ({ request }) => {
        body = await request.json();
        return HttpResponse.json(buildProfile());
      }),
      http.get(api('/nutrition/goals/current'), () => apiError(404, 'Nutrition goal not found')),
      http.get(api('/nutrition/goals'), () => HttpResponse.json([])),
      http.get(api('/nutrition/goals/preview'), () =>
        HttpResponse.json({ caloriesKcal: 2000, proteinG: 105, fatG: 56, carbsG: 269 }),
      ),
    );
    const { user } = render();

    expect(await screen.findByText(/The profile is not filled in yet/)).toBeInTheDocument();
    expect(
      screen.queryByRole('heading', { name: 'Daily nutrition goals' }),
    ).not.toBeInTheDocument();

    await user.type(screen.getByLabelText('Age, years'), '30');
    await user.type(screen.getByLabelText('Height, cm'), '170');
    await user.type(screen.getByLabelText('Weight, kg'), '65.5');
    await user.click(screen.getByRole('button', { name: 'Create profile' }));

    expect(
      await screen.findByRole('heading', { name: 'Daily nutrition goals' }),
    ).toBeInTheDocument();
    expect(body).toEqual({
      age: 30,
      heightCm: 170,
      weightKg: 65.5,
      sex: 'female',
      activityLevel: 'moderate',
      goal: 'maintain',
    });
    expect(screen.getByText('No goal set yet')).toBeInTheDocument();
  });

  it('validates the profile against the backend limits', async () => {
    server.use(http.get(api('/profile'), () => apiError(404, 'Profile not found')));
    const { user } = render();

    await user.type(await screen.findByLabelText('Age, years'), '5');
    await user.click(screen.getByRole('button', { name: 'Create profile' }));
    expect(await screen.findByText('At least 14')).toBeInTheDocument();
  });

  it('shows the BMI and applies the BMI rules, re-checking after a fix', async () => {
    let saved = false;
    server.use(
      http.get(api('/profile'), () => HttpResponse.json(buildProfile())),
      http.put(api('/profile'), () => {
        saved = true;
        return HttpResponse.json(buildProfile());
      }),
      http.get(api('/nutrition/goals/current'), () => apiError(404, 'Nutrition goal not found')),
      http.get(api('/nutrition/goals'), () => HttpResponse.json([])),
      http.get(api('/nutrition/goals/preview'), () =>
        HttpResponse.json({ caloriesKcal: 2000, proteinG: 105, fatG: 56, carbsG: 269 }),
      ),
    );
    const { user } = render();

    expect(await screen.findByText('BMI 22.7')).toBeInTheDocument();
    const weight = screen.getByLabelText('Weight, kg');
    await user.clear(weight);
    await user.type(weight, '50');
    await user.selectOptions(screen.getByLabelText('Goal'), 'lose_weight');
    expect(screen.getByText('BMI 17.3')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Save profile' }));

    expect(
      await screen.findByText('Losing weight is not allowed with a BMI below 18.5'),
    ).toBeInTheDocument();
    expect(screen.getByLabelText('Goal')).toHaveAttribute('aria-invalid', 'true');

    await user.clear(weight);
    await user.type(weight, '300');
    expect(
      await screen.findByText(
        'Weight and height give an implausible BMI (103.8); check the values',
      ),
    ).toBeInTheDocument();
    expect(
      screen.queryByText('Losing weight is not allowed with a BMI below 18.5'),
    ).not.toBeInTheDocument();

    await user.clear(weight);
    await user.type(weight, '60');
    await vi.waitFor(() => expect(screen.queryByText(/implausible BMI/)).not.toBeInTheDocument());
    expect(saved).toBe(false);
  });

  it('shows the current goal with its rule version, the history and the disclaimer', async () => {
    withProfileAndGoals({
      history: [
        buildGoal(),
        buildGoal({ id: 'old', calculationMode: 'manual', ruleVersion: null, caloriesKcal: 1800 }),
      ],
    });
    render();

    expect(await screen.findByText(/by formula \(rules mifflin-st-jeor-v1\)/)).toBeInTheDocument();
    expect(screen.getByText(/not medical advice/)).toBeInTheDocument();
    const rows = screen.getAllByRole('row');
    expect(rows).toHaveLength(3);
    expect(rows[2]).toHaveTextContent('manually');
    expect(rows[2]).toHaveTextContent(num(1800));
  });

  it('previews and saves a rule based goal', async () => {
    withProfileAndGoals({ current: null as never, history: [] });
    let calculated = false;
    server.use(
      http.post(api('/nutrition/goals/calculate'), () => {
        calculated = true;
        return HttpResponse.json(buildGoal({ caloriesKcal: 2200 }));
      }),
    );
    const { user } = render();

    const preview = await screen.findByRole('region', {
      name: 'Calculated from the current profile',
    });
    expect(within(preview).getByText(num(2200))).toBeInTheDocument();
    server.use(
      http.get(api('/nutrition/goals/current'), () =>
        HttpResponse.json(buildGoal({ caloriesKcal: 2200 })),
      ),
    );
    await user.click(screen.getByRole('button', { name: 'Set as current goal' }));

    await vi.waitFor(() => expect(calculated).toBe(true));
    expect(await screen.findByText(/effective from/)).toBeInTheDocument();
  });

  it('sets a manual goal', async () => {
    withProfileAndGoals();
    let body: unknown;
    server.use(
      http.post(api('/nutrition/goals'), async ({ request }) => {
        body = await request.json();
        return HttpResponse.json(buildGoal({ calculationMode: 'manual', ruleVersion: null }));
      }),
    );
    const { user } = render();

    await user.click(await screen.findByRole('button', { name: 'Manual' }));
    const kcal = screen.getByLabelText('Calories, kcal');
    expect(kcal).toHaveValue('2100');
    await user.clear(kcal);
    await user.type(kcal, '2000');
    expect(
      screen.getByText(
        'From macros (4/9/4 kcal/g): ≈ 2098 kcal · Protein 20 % · Fat 25 % · Carbs 55 %',
      ),
    ).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Save manual goal' }));

    await vi.waitFor(() =>
      expect(body).toEqual({ caloriesKcal: 2000, proteinG: 105, fatG: 58, carbsG: 289 }),
    );
    expect(await screen.findByRole('button', { name: 'Set as current goal' })).toBeInTheDocument();
  });

  it('blocks a manual goal whose macros do not fit the calories or the healthy shares', async () => {
    withProfileAndGoals();
    let posted = false;
    server.use(
      http.post(api('/nutrition/goals'), () => {
        posted = true;
        return HttpResponse.json(buildGoal());
      }),
    );
    const { user } = render();

    await user.click(await screen.findByRole('button', { name: 'Manual' }));
    expect(screen.getByText(/Protein 10–35 %, Fat 20–35 %, Carbs 45–65 %/)).toBeInTheDocument();
    const kcal = screen.getByLabelText('Calories, kcal');
    await user.clear(kcal);
    await user.type(kcal, '1900');
    await user.click(screen.getByRole('button', { name: 'Save manual goal' }));

    expect(
      await screen.findByText(
        'Protein, fat and carbs give 2098 kcal, more than 10 % away from the 1900 kcal goal',
      ),
    ).toBeInTheDocument();

    // 200 / 58 / 210 g: 2162 kcal, protein 37 %, carbs 39 %.
    await user.clear(kcal);
    await user.type(kcal, '2100');
    await user.clear(screen.getByLabelText('Protein, g'));
    await user.type(screen.getByLabelText('Protein, g'), '200');
    await user.clear(screen.getByLabelText('Carbs, g'));
    await user.type(screen.getByLabelText('Carbs, g'), '210');
    await user.click(screen.getByRole('button', { name: 'Save manual goal' }));

    expect(
      await screen.findByText('Protein must be 10–35 % of the calories (now 37 %)'),
    ).toBeInTheDocument();
    expect(
      screen.getByText('Carbs must be 45–65 % of the calories (now 39 %)'),
    ).toBeInTheDocument();
    expect(screen.queryByText(/more than 10 % away/)).not.toBeInTheDocument();

    // Fixing the protein re-checks the carbs too.
    await user.clear(screen.getByLabelText('Protein, g'));
    await user.type(screen.getByLabelText('Protein, g'), '105');
    await user.clear(screen.getByLabelText('Carbs, g'));
    await user.type(screen.getByLabelText('Carbs, g'), '289');
    await vi.waitFor(() => expect(screen.queryByText(/must be/)).not.toBeInTheDocument());
    expect(posted).toBe(false);
  });

  it('limits the start date to today … a year ahead', async () => {
    withProfileAndGoals();
    const { user } = render();

    await user.click(await screen.findByRole('button', { name: 'Manual' }));
    const date = screen.getByLabelText('Effective from');
    const today = new Date();
    const yearAhead = new Date();
    yearAhead.setDate(yearAhead.getDate() + 365);
    expect(date).toHaveAttribute('min', toDateInputValue(today));
    expect(date).toHaveAttribute('max', toDateInputValue(yearAhead));

    await user.type(date, '2020-01-01');
    await user.click(screen.getByRole('button', { name: 'Save manual goal' }));
    expect(await screen.findByText('Cannot be in the past')).toBeInTheDocument();
    expect(date).toHaveAttribute('aria-invalid', 'true');
  });

  it('recalculates the macros after the calories change', async () => {
    withProfileAndGoals();
    let requested: string | null = null;
    server.use(
      http.get(api('/nutrition/goals/preview'), ({ request }) => {
        requested = new URL(request.url).searchParams.get('caloriesKcal');
        return HttpResponse.json({ caloriesKcal: 1500, proteinG: 104, fatG: 42, carbsG: 177 });
      }),
    );
    const { user } = render();

    await user.click(await screen.findByRole('button', { name: 'Manual' }));
    expect(screen.queryByRole('button', { name: 'Recalculate macros' })).not.toBeInTheDocument();
    const kcal = screen.getByLabelText('Calories, kcal');
    await user.clear(kcal);
    await user.type(kcal, '1500');
    await user.click(screen.getByRole('button', { name: 'Recalculate macros' }));

    await vi.waitFor(() => expect(screen.getByLabelText('Protein, g')).toHaveValue('104'));
    expect(requested).toBe('1500');
    expect(screen.getByLabelText('Fat, g')).toHaveValue('42');
    expect(screen.getByLabelText('Carbs, g')).toHaveValue('177');
    expect(screen.queryByRole('button', { name: 'Recalculate macros' })).not.toBeInTheDocument();
  });

  it('enforces the calorie minimum for the profile sex', async () => {
    withProfileAndGoals();
    const { user } = render();

    await user.click(await screen.findByRole('button', { name: 'Manual' }));
    expect(screen.getByText('At least 1200 kcal')).toBeInTheDocument();
    const kcal = screen.getByLabelText('Calories, kcal');
    await user.clear(kcal);
    await user.type(kcal, '1150');
    await user.click(screen.getByRole('button', { name: 'Recalculate macros' }));

    expect(await screen.findByText('At least 1200 kcal')).toHaveClass('text-red-600');
    expect(screen.getByLabelText('Protein, g')).toHaveValue('105');
  });

  it('shows a load error', async () => {
    server.use(http.get(api('/profile'), () => apiError(503, 'Database is unavailable')));
    render();
    expect(await screen.findByRole('alert')).toHaveTextContent('Database is unavailable');
  });

  it('opens the goal mode of the newest goal in the history', async () => {
    withProfileAndGoals({
      history: [
        buildGoal({ id: 'newest', calculationMode: 'manual', ruleVersion: null }),
        buildGoal({ id: 'older', calculationMode: 'rule_based' }),
      ],
    });
    const { user } = render();

    expect(await screen.findByRole('form', { name: 'Manual goal' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Manual' })).toHaveAttribute('aria-pressed', 'true');

    // A pick on the switch wins over the history.
    await user.click(screen.getByRole('button', { name: 'By formula' }));
    expect(screen.getByRole('button', { name: 'By formula' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(screen.queryByRole('form', { name: 'Manual goal' })).not.toBeInTheDocument();
  });

  it('opens the formula when the newest goal was calculated or there is none', async () => {
    withProfileAndGoals({
      history: [
        buildGoal({ id: 'newest', calculationMode: 'rule_based' }),
        buildGoal({ id: 'older', calculationMode: 'manual', ruleVersion: null }),
      ],
    });
    const { unmount } = render();

    expect(await screen.findByRole('button', { name: 'Set as current goal' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'By formula' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    unmount();

    withProfileAndGoals({ current: null, history: [] });
    render();
    expect(await screen.findByRole('button', { name: 'Set as current goal' })).toBeInTheDocument();
  });
});
