import { screen, within } from '@testing-library/react';
import { buildFood, page } from '../../test/fixtures';
import { renderPage } from '../../test/render';
import { api, apiError, http, HttpResponse, server } from '../../test/server';
import { FoodsPage } from './FoodsPage';

describe('FoodsPage', () => {
  it('lists foods per 100 g and shows unknown values as a dash', async () => {
    server.use(http.get(api('/foods'), () => HttpResponse.json(page([buildFood({ fatG: null })]))));
    renderPage(<FoodsPage />, '/foods', '/foods');

    const row = (await screen.findByRole('link', { name: 'Гречка суха' })).closest('tr')!;
    expect(within(row).getByText('343')).toBeInTheDocument();
    expect(within(row).getByText('—')).toBeInTheDocument();
    expect(within(row).getByText('сухий')).toBeInTheDocument();
  });

  it('searches and filters through the query string', async () => {
    const queries: URLSearchParams[] = [];
    server.use(
      http.get(api('/foods'), ({ request }) => {
        queries.push(new URL(request.url).searchParams);
        return HttpResponse.json(page([buildFood()]));
      }),
    );
    const { user } = renderPage(<FoodsPage />, '/foods', '/foods');
    await screen.findByText('Гречка суха');

    await user.type(screen.getByRole('searchbox', { name: 'Пошук продуктів' }), 'рис');
    await user.selectOptions(screen.getByRole('combobox', { name: 'Стан' }), 'boiled');

    await vi.waitFor(() => {
      const last = queries.at(-1)!;
      expect(last.get('search')).toBe('рис');
      expect(last.get('state')).toBe('boiled');
    });
  });

  it('shows an empty state', async () => {
    server.use(http.get(api('/foods'), () => HttpResponse.json(page([]))));
    renderPage(<FoodsPage />, '/foods', '/foods');
    expect(await screen.findByText('Нічого не знайдено')).toBeInTheDocument();
  });

  it('shows an error and retries', async () => {
    let calls = 0;
    server.use(
      http.get(api('/foods'), () => {
        calls += 1;
        return calls === 1
          ? apiError(503, 'Database is unavailable')
          : HttpResponse.json(page([buildFood()]));
      }),
    );
    const { user } = renderPage(<FoodsPage />, '/foods', '/foods');

    expect(await screen.findByRole('alert')).toHaveTextContent('Database is unavailable');
    await user.click(screen.getByRole('button', { name: 'Спробувати ще раз' }));
    expect(await screen.findByText('Гречка суха')).toBeInTheDocument();
  });

  it('paginates', async () => {
    server.use(
      http.get(api('/foods'), ({ request }) => {
        const pageNo = Number(new URL(request.url).searchParams.get('page'));
        return HttpResponse.json(
          page([buildFood({ name: `Продукт ${pageNo}` })], { total: 45, page: pageNo }),
        );
      }),
    );
    const { user } = renderPage(<FoodsPage />, '/foods', '/foods');
    expect(await screen.findByText('Сторінка 1 з 3 · 45 записів')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Далі' }));
    expect(await screen.findByText('Продукт 2')).toBeInTheDocument();
  });
});
