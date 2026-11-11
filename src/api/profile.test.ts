import { buildGoal, buildProfile } from '../test/fixtures';
import { api, http, HttpResponse, server } from '../test/server';
import { nutritionGoalsApi, profileApi } from './profile';

const aborted = (): AbortSignal => {
  const controller = new AbortController();
  controller.abort();
  return controller.signal;
};

describe('profileApi', () => {
  it('reads and saves the profile', async () => {
    const methods: string[] = [];
    server.use(
      http.all(api('/profile'), async ({ request }) => {
        methods.push(request.method);
        if (request.method === 'PUT')
          return HttpResponse.json({ ...((await request.json()) as object) });
        return HttpResponse.json(buildProfile());
      }),
    );

    await expect(profileApi.get()).resolves.toEqual(buildProfile());
    const input = { ...buildProfile(), heightCm: 180 };
    await expect(profileApi.save(input)).resolves.toMatchObject({ heightCm: 180 });
    expect(methods).toEqual(['GET', 'PUT']);
  });

  it('passes the signal (e.g. a query context) to fetch', async () => {
    await expect(profileApi.get({ signal: aborted() })).rejects.toMatchObject({
      name: 'AbortError',
    });
  });
});

describe('nutritionGoalsApi', () => {
  it('builds the preview query only when calories are given', async () => {
    const urls: string[] = [];
    server.use(
      http.get(api('/nutrition/goals/preview'), ({ request }) => {
        const url = new URL(request.url);
        urls.push(url.pathname + url.search);
        return HttpResponse.json({ caloriesKcal: 2000, proteinG: 100, fatG: 70, carbsG: 240 });
      }),
    );

    await nutritionGoalsApi.preview();
    await nutritionGoalsApi.preview(1800);

    expect(urls).toEqual([
      '/api/nutrition/goals/preview',
      '/api/nutrition/goals/preview?caloriesKcal=1800',
    ]);
  });

  it('reads the history and the current goal, sets a manual one and calculates', async () => {
    const calls: string[] = [];
    const record = (request: Request) => {
      calls.push(`${request.method} ${new URL(request.url).pathname}`);
    };
    server.use(
      http.get(api('/nutrition/goals'), ({ request }) => {
        record(request);
        return HttpResponse.json([buildGoal()]);
      }),
      http.get(api('/nutrition/goals/current'), ({ request }) => {
        record(request);
        return HttpResponse.json(buildGoal());
      }),
      http.post(api('/nutrition/goals'), async ({ request }) => {
        record(request);
        return HttpResponse.json(buildGoal((await request.json()) as object), { status: 201 });
      }),
      http.post(api('/nutrition/goals/calculate'), ({ request }) => {
        record(request);
        return HttpResponse.json(buildGoal(), { status: 201 });
      }),
    );

    await expect(nutritionGoalsApi.history()).resolves.toHaveLength(1);
    await nutritionGoalsApi.current();
    await expect(
      nutritionGoalsApi.setManual({ caloriesKcal: 1900, proteinG: 120, fatG: 60, carbsG: 210 }),
    ).resolves.toMatchObject({ caloriesKcal: 1900 });
    await nutritionGoalsApi.calculate();

    expect(calls).toEqual([
      'GET /api/nutrition/goals',
      'GET /api/nutrition/goals/current',
      'POST /api/nutrition/goals',
      'POST /api/nutrition/goals/calculate',
    ]);
  });

  it('passes the signal of the reads to fetch', async () => {
    for (const read of [
      () => nutritionGoalsApi.history({ signal: aborted() }),
      () => nutritionGoalsApi.current({ signal: aborted() }),
      () => nutritionGoalsApi.preview(undefined, { signal: aborted() }),
    ]) {
      await expect(read()).rejects.toMatchObject({ name: 'AbortError' });
    }
  });
});
