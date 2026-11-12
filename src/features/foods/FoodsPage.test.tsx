import { screen, within } from '@testing-library/react';
import { buildFood, page } from '../../test/fixtures';
import { renderPage } from '../../test/render';
import { api, apiError, http, HttpResponse, server } from '../../test/server';
import { FoodsPage } from './FoodsPage';

describe('FoodsPage', () => {
  it('lists foods per 100 g and shows unknown values as a dash', async () => {
    server.use(http.get(api('/foods'), () => HttpResponse.json(page([buildFood({ fatG: null })]))));
    renderPage(<FoodsPage />, '/foods', '/foods');

    const row = (await screen.findByRole('link', { name: 'Buckwheat, dry' })).closest('tr')!;
    expect(within(row).getByText('343')).toBeInTheDocument();
    expect(within(row).getByText('—')).toBeInTheDocument();
    expect(within(row).getByText('dry')).toBeInTheDocument();
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
    await screen.findByText('Buckwheat, dry');

    await user.type(screen.getByRole('searchbox', { name: 'Search foods' }), 'rice');
    await user.selectOptions(screen.getByRole('combobox', { name: 'State' }), 'boiled');

    await vi.waitFor(() => {
      const last = queries.at(-1)!;
      expect(last.get('search')).toBe('rice');
      expect(last.get('state')).toBe('boiled');
    });
  });

  it('shows an empty state', async () => {
    server.use(http.get(api('/foods'), () => HttpResponse.json(page([]))));
    renderPage(<FoodsPage />, '/foods', '/foods');
    expect(await screen.findByText('Nothing found')).toBeInTheDocument();
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
    await user.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByText('Buckwheat, dry')).toBeInTheDocument();
  });

  it('paginates', async () => {
    server.use(
      http.get(api('/foods'), ({ request }) => {
        const pageNo = Number(new URL(request.url).searchParams.get('page'));
        return HttpResponse.json(
          page([buildFood({ name: `Food ${pageNo}` })], { total: 45, page: pageNo }),
        );
      }),
    );
    const { user } = renderPage(<FoodsPage />, '/foods', '/foods');
    expect(await screen.findByText('Page 1 of 3 · 45 records')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Next' }));
    expect(await screen.findByText('Food 2')).toBeInTheDocument();
  });

  it('ignores a page and filters the API would not take', async () => {
    const queries: URLSearchParams[] = [];
    server.use(
      http.get(api('/foods'), ({ request }) => {
        queries.push(new URL(request.url).searchParams);
        return HttpResponse.json(page([buildFood()]));
      }),
    );
    renderPage(<FoodsPage />, '/foods?page=-1.5&state=melted&source=seed', '/foods');

    await screen.findByText('Buckwheat, dry');
    expect(queries).toHaveLength(1);
    expect(queries[0].get('page')).toBe('1');
    expect(queries[0].has('state')).toBe(false);
    expect(queries[0].get('source')).toBe('seed');
    expect(screen.getByRole('combobox', { name: 'State' })).toHaveValue('');
  });

  it('leads back to the first page from a page past the end', async () => {
    server.use(
      http.get(api('/foods'), ({ request }) => {
        const pageNo = Number(new URL(request.url).searchParams.get('page'));
        return HttpResponse.json(
          pageNo === 1 ? page([buildFood()]) : page([], { total: 1, page: pageNo }),
        );
      }),
    );
    const { user, router } = renderPage(<FoodsPage />, '/foods?page=5', '/foods');

    expect(await screen.findByText('No foods on this page')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Go to the first page' }));

    expect(await screen.findByText('Buckwheat, dry')).toBeInTheDocument();
    expect(router.state.location.search).toBe('');
  });

  it('asks for page 1 of a new search once, after the debounce', async () => {
    const queries: string[] = [];
    server.use(
      http.get(api('/foods'), ({ request }) => {
        const params = new URL(request.url).searchParams;
        queries.push(`${params.get('search') ?? ''}@${params.get('page')}`);
        return HttpResponse.json(page([buildFood()], { total: 45 }));
      }),
    );
    const { user, router } = renderPage(<FoodsPage />, '/foods?page=2', '/foods');
    await screen.findByText('Buckwheat, dry');

    await user.type(screen.getByRole('searchbox', { name: 'Search foods' }), 'rice');

    await vi.waitFor(() => expect(queries).toEqual(['@2', 'rice@1']));
    await new Promise((resolve) => setTimeout(resolve, 400));
    expect(queries).toEqual(['@2', 'rice@1']);
    expect(router.state.location.search).toBe('?search=rice');
  });
});
