import { screen, within } from '@testing-library/react';
import { formatNumber } from '../../lib/format';
import { buildGoal, buildProfile } from '../../test/fixtures';
import { renderPage } from '../../test/render';
import { api, apiError, http, HttpResponse, server } from '../../test/server';
import { ProfilePage } from './ProfilePage';

/** As Testing Library normalises it: the narrow no-break thousands separator becomes a space. */
const num = (value: number): string => formatNumber(value).replace(/\s/g, ' ');

const render = () => renderPage(<ProfilePage />, '/profile', '/profile');

function withProfileAndGoals({ current = buildGoal(), history = [buildGoal()] } = {}) {
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

  it('shows the current goal with its rule version, the history and the disclaimer', async () => {
    withProfileAndGoals({
      history: [
        buildGoal(),
        buildGoal({ id: 'old', calculationMode: 'manual', ruleVersion: null, caloriesKcal: 1800 }),
      ],
    });
    render();

    expect(
      await screen.findByText(/by formula \(rules mifflin-st-jeor-v1\)/),
    ).toBeInTheDocument();
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

    const preview = await screen.findByRole('region', { name: 'Calculated from the current profile' });
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
    await user.type(kcal, '1900');
    expect(screen.getByText(/≈ 2098 kcal — noticeably different/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Save manual goal' }));

    await vi.waitFor(() =>
      expect(body).toEqual({ caloriesKcal: 1900, proteinG: 105, fatG: 58, carbsG: 289 }),
    );
    expect(
      await screen.findByRole('button', { name: 'Set as current goal' }),
    ).toBeInTheDocument();
  });

  it('shows a load error', async () => {
    server.use(http.get(api('/profile'), () => apiError(503, 'Database is unavailable')));
    render();
    expect(await screen.findByRole('alert')).toHaveTextContent('Database is unavailable');
  });
});
